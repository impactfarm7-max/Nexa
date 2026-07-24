# Communauté hub inbox (centre libre) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le hub cartes/accordéons de `/centre/communaute` par une inbox 1 colonne (pastilles + lignes de salles), sans toucher à la vue chat.

**Architecture:** Extraire la construction de la liste (filtre, recherche, sections) dans un module pur testable (`communauteHubInbox.core.mjs`). Brancher un composant hub React (`CommunauteHubInbox.tsx`) dans la branche `!activeRoom` de `page.tsx`. Réutiliser `lastMessages`, `unreadCounts`, `openRoom`, modal `+ Groupe`.

**Tech Stack:** Next.js App Router, React client components, Tailwind, Lucide, tests `node --test` sur `.mjs`.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-24-communaute-centre-hub-inbox-design.md`.
- Liste **1 colonne** uniquement (pas de grille 2–3 cols pour les salles).
- Pastilles : `Tout | Annonces | Filières | Classes | Groupes` (mutuellement exclusives).
- Pas d’accordéon niveau : classes d’une filière listées à plat sous l’en-tête filière.
- Chat / Realtime / RPC / schéma : **hors scope** (inchangés).
- Couleurs centre : `BLUE` `#11224E`, `ORANGE` `#eb670e` via imports existants de `../center-page-ui`.
- Empty states : aucune salle / aucun résultat recherche-filtre.

## File map

| Fichier | Rôle |
|---|---|
| `app/centre/communaute/communauteHubInbox.core.mjs` | Logique pure : filtre + sections inbox |
| `app/centre/communaute/communauteHubInbox.core.d.ts` | Types TS pour le core |
| `app/centre/communaute/communauteHubInbox.core.test.mjs` | Tests `node --test` |
| `app/centre/communaute/CommunauteHubInbox.tsx` | UI hub (header toolbar + liste) |
| `app/centre/communaute/page.tsx` | Remplacer la branche hub `!activeRoom` ; alléger états expand/filter filiere |

---

### Task 1: Core builder + tests

**Files:**
- Create: `app/centre/communaute/communauteHubInbox.core.mjs`
- Create: `app/centre/communaute/communauteHubInbox.core.d.ts`
- Create: `app/centre/communaute/communauteHubInbox.core.test.mjs`

**Interfaces:**
- Consumes: rien (données passées en argument).
- Produces:
  - `HUB_FILTERS`: `[{ id, label }, ...]`
  - `buildCommunauteInbox(input) → { sections, emptyReason }`
  - Types documentés dans `.d.ts` (voir Step 3)

- [ ] **Step 1: Write the failing test**

Create `app/centre/communaute/communauteHubInbox.core.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCommunauteInbox, HUB_FILTERS } from "./communauteHubInbox.core.mjs";

const rooms = {
  center: { id: "r-center", name: "Général · ECOLES", type: "announcement", filiere_id: null },
  forum: { id: "r-forum", name: "CNPS COURT", type: "announcement", filiere_id: "f1" },
  class1: { id: "r-c1", name: "Salle 1", type: "classroom", groupe_id: "g1" },
  class2: { id: "r-c2", name: "Salle 2", type: "classroom", groupe_id: "g2" },
  group: { id: "r-g", name: "Alumni", type: "study_group" },
};

const base = {
  centerAnnouncements: [rooms.center],
  freeGroups: [rooms.group],
  programmes: [
    {
      prog: { id: "f1", name: "CNPS COURT" },
      forum: rooms.forum,
      forumUnread: 2,
      niveaux: [
        {
          niveau: { id: "n1", annee: 1, nom: "Année 1" },
          classes: [
            { groupe: { id: "g1", nom: "Salle 1" }, room: rooms.class1, unread: 1 },
            { groupe: { id: "g2", nom: "Salle 2" }, room: rooms.class2, unread: 0 },
          ],
          unread: 1,
        },
      ],
      orphanClasses: [],
      unread: 3,
      hasContent: true,
    },
  ],
  lastMessages: {
    "r-center": { text: "Bienvenue", time: "2026-07-24T10:00:00.000Z" },
    "r-c1": { text: "Devoir pour lundi", time: "2026-07-24T09:00:00.000Z" },
  },
  unreadCounts: { "r-center": 0, "r-forum": 2, "r-c1": 1, "r-c2": 0, "r-g": 0 },
  searchQuery: "",
  filter: "all",
};

test("HUB_FILTERS a 5 pastilles dans l’ordre spec", () => {
  assert.deepEqual(
    HUB_FILTERS.map((f) => f.id),
    ["all", "announcements", "forums", "classes", "groups"],
  );
});

test("filter all → Centre + filière à plat + groupes", () => {
  const { sections, emptyReason } = buildCommunauteInbox(base);
  assert.equal(emptyReason, null);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].id, "center");
  assert.equal(sections[0].rows.length, 1);
  assert.equal(sections[1].id, "filiere:f1");
  assert.deepEqual(
    sections[1].rows.map((r) => r.kind),
    ["forum", "classroom", "classroom"],
  );
  assert.equal(sections[1].rows[1].title, "Salle 1");
  assert.equal(sections[1].rows[1].meta, "Année 1");
  assert.equal(sections[2].id, "groups");
});

test("filter classes → uniquement salles classroom, groupées par filière", () => {
  const { sections } = buildCommunauteInbox({ ...base, filter: "classes" });
  assert.equal(sections.length, 1);
  assert.ok(sections.every((s) => s.rows.every((r) => r.kind === "classroom")));
});

test("filter announcements → Centre seulement", () => {
  const { sections } = buildCommunauteInbox({ ...base, filter: "announcements" });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].id, "center");
});

test("filter forums → forums filière seulement", () => {
  const { sections } = buildCommunauteInbox({ ...base, filter: "forums" });
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].rows.map((r) => r.kind), ["forum"]);
});

test("filter groups → groupes libres seulement", () => {
  const { sections } = buildCommunauteInbox({ ...base, filter: "groups" });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].id, "groups");
});

test("search matche nom salle et masque sections vides", () => {
  const { sections } = buildCommunauteInbox({ ...base, searchQuery: "alumni" });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].rows[0].id, "r-g");
});

test("search matche nom filière → conserve forum + classes de la filière", () => {
  const { sections } = buildCommunauteInbox({ ...base, searchQuery: "cnps" });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].id, "filiere:f1");
  assert.ok(sections[0].rows.length >= 1);
});

test("aucun résultat → emptyReason search", () => {
  const { sections, emptyReason } = buildCommunauteInbox({
    ...base,
    searchQuery: "zzzz-inexistant",
  });
  assert.equal(sections.length, 0);
  assert.equal(emptyReason, "search");
});

test("aucune salle → emptyReason none", () => {
  const { sections, emptyReason } = buildCommunauteInbox({
    centerAnnouncements: [],
    freeGroups: [],
    programmes: [],
    lastMessages: {},
    unreadCounts: {},
    searchQuery: "",
    filter: "all",
  });
  assert.equal(sections.length, 0);
  assert.equal(emptyReason, "none");
});

test("row preview utilise lastMessages ou fallback", () => {
  const { sections } = buildCommunauteInbox(base);
  const centerRow = sections[0].rows[0];
  assert.equal(centerRow.preview, "Bienvenue");
  assert.ok(centerRow.time);
  const forumRow = sections[1].rows[0];
  assert.equal(forumRow.preview, "Aucun message");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "app/centre/communaute/communauteHubInbox.core.test.mjs"`

Expected: FAIL (`ERR_MODULE_NOT_FOUND` for `communauteHubInbox.core.mjs`)

- [ ] **Step 3: Write minimal implementation**

Create `app/centre/communaute/communauteHubInbox.core.mjs`:

```js
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
```

Create `app/centre/communaute/communauteHubInbox.core.d.ts`:

```ts
export type HubFilterId = "all" | "announcements" | "forums" | "classes" | "groups";

export type HubFilter = { id: HubFilterId; label: string };

export type InboxRowKind = "announcement" | "forum" | "classroom" | "group";

export type InboxRow = {
  id: string;
  room: any;
  kind: InboxRowKind;
  title: string;
  meta: string | null;
  preview: string;
  time: string | null;
  unread: number;
};

export type InboxSection = {
  id: string;
  title: string;
  summary: string | null;
  unread: number;
  rows: InboxRow[];
};

export type BuildCommunauteInboxInput = {
  centerAnnouncements?: any[];
  freeGroups?: any[];
  programmes?: any[];
  lastMessages?: Record<string, { text: string; time: string; sender?: string }>;
  unreadCounts?: Record<string, number>;
  searchQuery?: string;
  filter?: HubFilterId;
};

export type BuildCommunauteInboxResult = {
  sections: InboxSection[];
  emptyReason: null | "none" | "search" | "filter";
};

export const HUB_FILTERS: HubFilter[];
export function buildCommunauteInbox(input: BuildCommunauteInboxInput): BuildCommunauteInboxResult;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test "app/centre/communaute/communauteHubInbox.core.test.mjs"`

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/centre/communaute/communauteHubInbox.core.mjs app/centre/communaute/communauteHubInbox.core.d.ts app/centre/communaute/communauteHubInbox.core.test.mjs
git commit -m "feat(communaute): inbox list builder + tests"
```

---

### Task 2: UI `CommunauteHubInbox`

**Files:**
- Create: `app/centre/communaute/CommunauteHubInbox.tsx`
- Test: manual (voir Step 4) ; logique déjà couverte Task 1

**Interfaces:**
- Consumes: `buildCommunauteInbox`, `HUB_FILTERS`, types du core ; `ToolbarSearch`, `OutlineHeaderButton`, `BLUE`, `ORANGE` depuis `../center-page-ui` ; `formatSidebarTime` passé en prop ou importé localement
- Produces: `<CommunauteHubInbox … />` contrôlé

- [ ] **Step 1: Create the component**

Create `app/centre/communaute/CommunauteHubInbox.tsx`:

```tsx
"use client";

import {
  Plus, Search, GraduationCap, UsersRound, Hash, Megaphone, ChevronRight, Bell,
} from "lucide-react";
import {
  BLUE,
  ORANGE,
  OutlineHeaderButton,
  ToolbarSearch,
} from "../center-page-ui";
import {
  buildCommunauteInbox,
  HUB_FILTERS,
  type HubFilterId,
  type InboxRow,
  type InboxSection,
} from "./communauteHubInbox.core.mjs";

type Props = {
  centerName: string;
  totalUnread: number;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filter: HubFilterId;
  onFilterChange: (f: HubFilterId) => void;
  centerAnnouncements: any[];
  freeGroups: any[];
  programmes: any[];
  lastMessages: Record<string, { text: string; time: string; sender?: string }>;
  unreadCounts: Record<string, number>;
  onOpenRoom: (room: any) => void;
  onCreateGroup: () => void;
  formatSidebarTime: (iso: string) => string;
};

function kindIcon(kind: InboxRow["kind"]) {
  if (kind === "announcement") return <Megaphone size={16} style={{ color: BLUE }} />;
  if (kind === "forum") return <Hash size={16} style={{ color: BLUE }} />;
  if (kind === "classroom") return <GraduationCap size={16} style={{ color: BLUE }} />;
  return <UsersRound size={16} style={{ color: ORANGE }} />;
}

function kindLabel(kind: InboxRow["kind"]) {
  if (kind === "announcement") return "Annonces";
  if (kind === "forum") return "Forum";
  if (kind === "classroom") return "Classe";
  return "Groupe";
}

function RoomRow({
  row,
  onOpen,
  formatSidebarTime,
}: {
  row: InboxRow;
  onOpen: (room: any) => void;
  formatSidebarTime: (iso: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.room)}
      className="w-full flex items-center gap-3 px-3 sm:px-4 h-16 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 transition-colors"
    >
      <div className="h-10 w-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
        {kindIcon(row.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate" style={{ color: BLUE }}>
            {row.title}
          </p>
          {row.meta ? (
            <span className="text-[10px] font-bold text-neutral-400 truncate shrink-0">{row.meta}</span>
          ) : null}
        </div>
        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
          {row.preview}
          {row.time ? ` · ${formatSidebarTime(row.time)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row.unread > 0 ? (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ backgroundColor: ORANGE }}>
            {row.unread > 99 ? "99+" : row.unread}
          </span>
        ) : null}
        <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded-full px-2 py-0.5">
          {kindLabel(row.kind)}
        </span>
        <ChevronRight size={14} className="text-neutral-300" />
      </div>
    </button>
  );
}

function SectionBlock({
  section,
  onOpen,
  formatSidebarTime,
}: {
  section: InboxSection;
  onOpen: (room: any) => void;
  formatSidebarTime: (iso: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50/80">
        <h2 className="text-xs font-black uppercase tracking-wider flex-1 truncate" style={{ color: BLUE }}>
          {section.title}
        </h2>
        {section.summary ? (
          <span className="text-[11px] font-medium text-neutral-500 truncate">{section.summary}</span>
        ) : null}
        {section.unread > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600">
            <Bell size={11} /> {section.unread}
          </span>
        ) : null}
      </div>
      <div>
        {section.rows.map((row) => (
          <RoomRow key={row.id} row={row} onOpen={onOpen} formatSidebarTime={formatSidebarTime} />
        ))}
      </div>
    </section>
  );
}

export default function CommunauteHubInbox(props: Props) {
  const {
    centerName,
    totalUnread,
    searchQuery,
    onSearchChange,
    filter,
    onFilterChange,
    centerAnnouncements,
    freeGroups,
    programmes,
    lastMessages,
    unreadCounts,
    onOpenRoom,
    onCreateGroup,
    formatSidebarTime,
  } = props;

  const { sections, emptyReason } = buildCommunauteInbox({
    centerAnnouncements,
    freeGroups,
    programmes,
    lastMessages,
    unreadCounts,
    searchQuery,
    filter,
  });

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">
      <header className="shrink-0 h-[68px] border-b border-black/[0.06] bg-white z-10">
        <div className="nexa-center-shell h-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate" style={{ color: BLUE }}>
              Communauté
            </h1>
            <p className="text-[11px] font-medium text-neutral-500 truncate">
              {centerName}
              {totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <OutlineHeaderButton onClick={onCreateGroup}>
            <Plus size={14} /> Groupe
          </OutlineHeaderButton>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="nexa-center-shell py-5 space-y-4">
          <ToolbarSearch
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Rechercher une filière, un niveau, une salle…"
          />

          <div className="flex gap-2 overflow-x-auto pb-1">
            {HUB_FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFilterChange(f.id)}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                  }`}
                  style={active ? { backgroundColor: BLUE } : undefined}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              onOpen={onOpenRoom}
              formatSidebarTime={formatSidebarTime}
            />
          ))}

          {emptyReason === "none" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucune salle disponible.
            </p>
          )}
          {emptyReason === "search" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucun résultat pour « {searchQuery.trim()} ».
            </p>
          )}
          {emptyReason === "filter" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucune salle dans ce filtre.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

Remove unused `Search` import if the linter flags it (ToolbarSearch already has the icon).

- [ ] **Step 2: Commit UI component**

```bash
git add app/centre/communaute/CommunauteHubInbox.tsx
git commit -m "feat(communaute): hub inbox UI component"
```

---

### Task 3: Brancher dans `page.tsx`

**Files:**
- Modify: `app/centre/communaute/page.tsx`

**Interfaces:**
- Consumes: `CommunauteHubInbox`, `HubFilterId`
- Produces: hub branch remplacée ; chat inchangé

- [ ] **Step 1: Replace hub state + render**

In `page.tsx`:

1. Add imports:

```tsx
import CommunauteHubInbox from "./CommunauteHubInbox";
import type { HubFilterId } from "./communauteHubInbox.core.mjs";
```

2. Replace:

```tsx
const [viewMode, setViewMode] = useState<"all" | "pilotage" | "classes" | "groupes">("all");
const [filterFiliereId, setFilterFiliereId] = useState<string>("all");
const [expandedFilieres, setExpandedFilieres] = useState<Record<string, boolean>>({});
const [expandedNiveaux, setExpandedNiveaux] = useState<Record<string, boolean>>({});
```

with:

```tsx
const [hubFilter, setHubFilter] = useState<HubFilterId>("all");
```

3. Remove helpers only used by old hub UI: `MODE_TABS`, `toggleFiliere`, `toggleNiveau`, `isProgExpanded`, `isNiveauExpanded`, `showPilotage` / `showClasses` / `showGroupes` derived from `viewMode`, and the old `RoomCard` / accordion hub JSX. Keep `programmeTree` / `filteredTree` **or** pass `programmeTree` (unfiltered by filiere select) into the hub — remove `filterFiliereId` filtering from `programmeTree` so all programmes flow to the builder:

Change:

```tsx
.filter((p) => filterFiliereId === "all" || p.id === filterFiliereId)
```

to no filiere filter (keep all programmes). Search/filter handled by `buildCommunauteInbox`.

4. Replace the entire `if (!activeRoom) { … return (… old hub …) }` block with:

```tsx
if (!activeRoom) {
  return (
    <>
      <CommunauteHubInbox
        centerName={centerName}
        totalUnread={totalUnread}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={hubFilter}
        onFilterChange={setHubFilter}
        centerAnnouncements={centerAnnouncements}
        freeGroups={freeGroups}
        programmes={programmeTree}
        lastMessages={lastMessages}
        unreadCounts={unreadCounts}
        onOpenRoom={openRoom}
        onCreateGroup={() => setShowCreateGroup(true)}
        formatSidebarTime={formatSidebarTime}
      />
      {showCreateGroup && (
        /* keep existing create-group modal JSX exactly as before */
        ...
      )}
    </>
  );
}
```

Keep the create-group modal markup already in the file (move it so it still renders over the hub).

5. Keep conversation view (`activeRoom`) untouched.

- [ ] **Step 2: Smoke-check TypeScript / lint on touched files**

Run IDE diagnostics or:

```bash
npx tsc --noEmit --pretty false 2>&1 | Select-String -Pattern "communaute" | Select-Object -First 40
```

(or project’s usual check). Fix any import / unused symbol errors in `page.tsx` / `CommunauteHubInbox.tsx`.

- [ ] **Step 3: Manual verification checklist**

With `npm run dev`, open `/centre/communaute` (centre libre with data):

1. Liste 1 colonne, sections Centre / filières / Groupes libres  
2. Pastilles filtrent Annonces / Filières / Classes / Groupes / Tout  
3. Recherche « Salle » ou nom filière filtre correctement  
4. Clic ligne → chat ; flèche retour → hub  
5. Non-lus visibles sur ligne + total header  
6. `+ Groupe` crée toujours un groupe  
7. Empty search shows « Aucun résultat pour … »

- [ ] **Step 4: Commit wire-up**

```bash
git add app/centre/communaute/page.tsx app/centre/communaute/CommunauteHubInbox.tsx
git commit -m "feat(communaute): wire inbox hub on centre page"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|---|---|
| Header + CTA Groupe | Task 2–3 |
| Recherche + pastilles | Task 1–2 |
| Liste 1 colonne / rows | Task 1–2 |
| Groupes Centre / filière à plat / groupes libres | Task 1 |
| Empty states | Task 1–2 |
| Chat hors scope | Task 3 (non modifié) |
| Acceptance criteria 1–7 | Task 3 Step 3 |

No placeholders left. Types `HubFilterId` / `InboxRow` consistent across tasks.
