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
