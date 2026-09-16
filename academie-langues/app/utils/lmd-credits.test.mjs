import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLmdValidationThreshold,
  isRattrapageGrade,
  computeUeFinalStatus,
  computeCreditsStatus,
} from "./lmd-credits.ts";

test("resolveLmdValidationThreshold defaults to 50 when null/undefined", () => {
  assert.equal(resolveLmdValidationThreshold(null), 50);
  assert.equal(resolveLmdValidationThreshold(undefined), 50);
});

test("resolveLmdValidationThreshold returns the configured value", () => {
  assert.equal(resolveLmdValidationThreshold(40), 40);
  assert.equal(resolveLmdValidationThreshold(0), 0);
});

test("isRattrapageGrade matches exact title, case/whitespace insensitive", () => {
  assert.equal(isRattrapageGrade("Rattrapage"), true);
  assert.equal(isRattrapageGrade("  rattrapage  "), true);
  assert.equal(isRattrapageGrade("RATTRAPAGE"), true);
  assert.equal(isRattrapageGrade("Rattrapage 2"), false);
  assert.equal(isRattrapageGrade(null), false);
  assert.equal(isRattrapageGrade(undefined), false);
  assert.equal(isRattrapageGrade(""), false);
});

test("computeUeFinalStatus: normal score above threshold validates directly", () => {
  const r = computeUeFinalStatus({
    normalScore: 12, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 12, finalMaxScore: 20, validated: true });
});

test("computeUeFinalStatus: normal below threshold, no rattrapage -> not validated, normal score kept", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 8, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: normal below threshold, rattrapage clears it -> validated with rattrapage score", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 11, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 11, finalMaxScore: 20, validated: true });
});

test("computeUeFinalStatus: normal below threshold, rattrapage also below -> not validated, normal score kept (not rattrapage)", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 9, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 8, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: no normal score at all -> not validated, null score", () => {
  const r = computeUeFinalStatus({
    normalScore: null, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: null, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: different max_score between normal and rattrapage normalizes correctly", () => {
  // normal 8/20 = 40% (below 50) ; rattrapage 60/100 = 60% (clears 50)
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 60, rattrapageMaxScore: 100,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 60, finalMaxScore: 100, validated: true });
});

test("computeCreditsStatus sums only validated UE credits into acquiredCredits", () => {
  const ues = [
    { filiere_matiere_id: "a", credits: 6 },
    { filiere_matiere_id: "b", credits: 5 },
    { filiere_matiere_id: "c", credits: 4 },
  ];
  const statuses = [
    { filiere_matiere_id: "a", validated: true },
    { filiere_matiere_id: "b", validated: false },
    { filiere_matiere_id: "c", validated: true },
  ];
  const r = computeCreditsStatus(ues, statuses);
  assert.equal(r.totalCredits, 15);
  assert.equal(r.acquiredCredits, 10);
  assert.deepEqual(r.validatedUeIds.sort(), ["a", "c"]);
  assert.deepEqual(r.pendingUeIds, ["b"]);
});

test("computeCreditsStatus treats a UE with no status entry as pending", () => {
  const ues = [{ filiere_matiere_id: "a", credits: 6 }];
  const r = computeCreditsStatus(ues, []);
  assert.equal(r.acquiredCredits, 0);
  assert.deepEqual(r.pendingUeIds, ["a"]);
});
