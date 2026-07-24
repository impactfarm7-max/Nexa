export const HUB_FILTERS = [
  { id: "all", label: "Tout" },
  { id: "announcements", label: "Annonces" },
  { id: "forums", label: "Filières" },
  { id: "classes", label: "Classes" },
  { id: "groups", label: "Groupes" },
];

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function matchesQuery(q, ...parts) {
  if (!q) return true;
  return parts.some((p) => norm(p).includes(q));
}

function niveauLabel(niveau) {
  if (!niveau) return "";
  const nom = niveau.nom?.trim();
  if (nom) return nom;
  return `Niveau ${niveau.annee}`;
}

function rowFromRoom({ room, kind, title, meta, lastMessages, unreadCounts }) {
  const last = lastMessages[room.id];
  return {
    id: room.id,
    room,
    kind,
    title,
    meta: meta || null,
    preview: last?.text?.trim() ? last.text : "Aucun message",
    time: last?.time || null,
    unread: unreadCounts[room.id] || 0,
  };
}

/**
 * @param {object} input
 * @returns {{ sections: object[], emptyReason: null | "none" | "search" | "filter" }}
 */
export function buildCommunauteInbox(input) {
  const {
    centerAnnouncements = [],
    freeGroups = [],
    programmes = [],
    lastMessages = {},
    unreadCounts = {},
    searchQuery = "",
    filter = "all",
  } = input;

  const q = norm(searchQuery);
  const sections = [];

  const wantCenter = filter === "all" || filter === "announcements";
  const wantForums = filter === "all" || filter === "forums";
  const wantClasses = filter === "all" || filter === "classes";
  const wantGroups = filter === "all" || filter === "groups";

  if (wantCenter) {
    const rows = centerAnnouncements
      .filter((room) => matchesQuery(q, room.name, "Centre", "Annonces"))
      .map((room) =>
        rowFromRoom({
          room,
          kind: "announcement",
          title: room.name,
          lastMessages,
          unreadCounts,
        }),
      );
    if (rows.length) {
      sections.push({
        id: "center",
        title: "Centre",
        summary: null,
        unread: rows.reduce((s, r) => s + r.unread, 0),
        rows,
      });
    }
  }

  for (const branch of programmes) {
    if (!branch?.hasContent && !branch?.forum && !(branch?.niveaux?.length) && !(branch?.orphanClasses?.length)) {
      continue;
    }
    const progName = branch.prog?.name || "Filière";
    const filiereMatches = matchesQuery(q, progName);
    const rows = [];

    if (wantForums && branch.forum) {
      if (filiereMatches || matchesQuery(q, branch.forum.name, "Forum")) {
        rows.push(
          rowFromRoom({
            room: branch.forum,
            kind: "forum",
            title: branch.forum.name,
            lastMessages,
            unreadCounts,
          }),
        );
      }
    }

    if (wantClasses) {
      for (const niv of branch.niveaux || []) {
        const nLabel = niveauLabel(niv.niveau);
        for (const leaf of niv.classes || []) {
          const title = leaf.groupe?.nom || leaf.room?.name || "Classe";
          if (filiereMatches || matchesQuery(q, title, nLabel, leaf.room?.name)) {
            rows.push(
              rowFromRoom({
                room: leaf.room,
                kind: "classroom",
                title,
                meta: nLabel,
                lastMessages,
                unreadCounts,
              }),
            );
          }
        }
      }
      for (const leaf of branch.orphanClasses || []) {
        const title = leaf.groupe?.nom || leaf.room?.name || "Classe";
        if (filiereMatches || matchesQuery(q, title, leaf.room?.name)) {
          rows.push(
            rowFromRoom({
              room: leaf.room,
              kind: "classroom",
              title,
              meta: null,
              lastMessages,
              unreadCounts,
            }),
          );
        }
      }
    }

    if (!rows.length) continue;

    const classCount = rows.filter((r) => r.kind === "classroom").length;
    const hasForum = rows.some((r) => r.kind === "forum");
    const summaryParts = [
      hasForum ? "Forum" : null,
      classCount ? `${classCount} classe${classCount > 1 ? "s" : ""}` : null,
    ].filter(Boolean);

    sections.push({
      id: `filiere:${branch.prog.id}`,
      title: progName,
      summary: summaryParts.join(" · ") || null,
      unread: rows.reduce((s, r) => s + r.unread, 0),
      rows,
    });
  }

  if (wantGroups) {
    const rows = freeGroups
      .filter((room) => matchesQuery(q, room.name, "Groupe"))
      .map((room) =>
        rowFromRoom({
          room,
          kind: "group",
          title: room.name,
          lastMessages,
          unreadCounts,
        }),
      );
    if (rows.length) {
      sections.push({
        id: "groups",
        title: "Groupes libres",
        summary: null,
        unread: rows.reduce((s, r) => s + r.unread, 0),
        rows,
      });
    }
  }

  if (sections.length) return { sections, emptyReason: null };

  const hadAnyRoom =
    centerAnnouncements.length > 0 ||
    freeGroups.length > 0 ||
    programmes.some(
      (p) =>
        p.forum ||
        (p.niveaux || []).some((n) => (n.classes || []).length) ||
        (p.orphanClasses || []).length,
    );

  if (!hadAnyRoom) return { sections: [], emptyReason: "none" };
  if (q) return { sections: [], emptyReason: "search" };
  return { sections: [], emptyReason: "filter" };
}
