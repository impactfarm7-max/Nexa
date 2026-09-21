import { test } from "node:test";
import assert from "node:assert/strict";
import { diplomaBlockers, emptyAcademicCase, parseAcademicCase } from "./lmd-academic.ts";

const doctoral = { ...emptyAcademicCase, degree: "doctorat", thesisTitle: "Sujet", supervisor: "Directeur", milestones: [{ title: "Rapport annuel", date: "2026-01-01", report: "Validé", completed: true }], defenseDate: "2026-09-20", jury: "Président, rapporteurs", juryDecision: "accepted", minutes: "Le jury valide la soutenance." };
test("degree and jury decision must be explicitly valid", () => {
  assert.throws(() => parseAcademicCase({ ...doctoral, degree: "other" }));
  assert.throws(() => parseAcademicCase({ ...doctoral, juryDecision: "approved" }));
  assert.deepEqual(parseAcademicCase(doctoral), doctoral);
});
test("invalid dates and malformed milestones are rejected", () => {
  assert.throws(() => parseAcademicCase({ ...doctoral, defenseDate: "2026-02-30" }));
  assert.throws(() => parseAcademicCase({ ...doctoral, milestones: [{ title: "x" }] }));
});
test("Licence and Master require all program UE, even with a good average", () => {
  for (const degree of ["licence", "master"]) {
    assert.equal(diplomaBlockers({ ...emptyAcademicCase, degree }, { complete: false, results: [1] }, "2026-09-21").length, 1);
    assert.equal(diplomaBlockers({ ...emptyAcademicCase, degree }, { complete: true, results: [1] }, "2026-09-21").length, 0);
  }
});
test("a doctorate requires past defense, accepted jury, minutes and validated milestones", () => {
  for (const patch of [{ defenseDate: "2027-01-01" }, { juryDecision: "revisions" }, { minutes: "" }, { milestones: [] }, { supervisor: "" }]) {
    assert.ok(diplomaBlockers({ ...doctoral, ...patch }, { complete: true, results: [1] }, "2026-09-21").length > 0);
  }
  assert.deepEqual(diplomaBlockers(doctoral, { complete: true, results: [1] }, "2026-09-21"), []);
});
test("a research-only doctorate may finish without taught UE, not a Licence", () => {
  assert.deepEqual(diplomaBlockers(doctoral, { complete: false, results: [] }, "2026-09-21"), []);
  assert.ok(diplomaBlockers(emptyAcademicCase, { complete: false, results: [] }, "2026-09-21").length);
});
