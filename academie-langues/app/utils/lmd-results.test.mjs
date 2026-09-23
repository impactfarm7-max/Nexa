import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function moduleUrl(name) {
  const source = fs.readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
    .replace(/from "\.\/(.*?)"/g, (_, dependency) => `from "${moduleUrl(dependency)}"`);
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const { evaluateLmdUe, computeLmdProgress } = await import(moduleUrl("lmd-results"));
const ue = { id: "u1", semestre_id: "s1", niveau_id: "n1", credits: 6, max_score: 20 };
const grade = (score, enrollment_id = "e1", title = null) => ({ score, max_score: 20, enrollment_id, title, filiere_matiere_id: "u1" });

test("LMD uses all normal notes and configured weights, not the first note", () => {
  assert.equal(evaluateLmdUe([grade(16), grade(2, "e1", "CC")], 20, null, 50).validated, false);
  assert.equal(evaluateLmdUe([grade(16), grade(2, "e1", "CC")], 20, { __principal__: 3, CC: 1 }, 50).finalScore, 12.5);
});
test("successful recovery replaces 8/20 by 12/20, not a mean of 10", () => {
  assert.deepEqual(evaluateLmdUe([grade(8), grade(12, "e1", " Rattrapage ")], 20, null, 50), { validated: true, finalScore: 12, finalMaxScore: 20 });
});
test("mixed scales are normalized and a failed recovery leaves the normal score", () => {
  assert.equal(evaluateLmdUe([{ score: 40, max_score: 100 }, grade(6, "e1", "Rattrapage")], 20, null, 50).finalScore, 8);
});
test("acquired credits survive repeats and are counted only once", () => {
  const result = computeLmdProgress([ue], [grade(12), grade(4, "e2")], 50, "n1", ["s1"]);
  assert.equal(result.acquiredCredits, 6);
  assert.equal(result.debts.length, 0);
  assert.equal(result.suggestion, "admis");
});
test("unassessed future UE are pending, not debts or repeat suggestions", () => {
  const result = computeLmdProgress([ue, { ...ue, id: "u2", semestre_id: "s2" }], [grade(8)], 50, "n1", ["s1"]);
  assert.equal(result.totalCredits, 12);
  assert.equal(result.debts.length, 1);
  assert.equal(result.pendingCount, 1);
  assert.equal(result.suggestion, null);
});
test("later recovery settles historical debt without copying the original normal grades", () => {
  const result = computeLmdProgress([ue], [grade(8), grade(12, "e2", "Rattrapage")], 50, "n2", ["s1"]);
  assert.equal(result.acquiredCredits, 6);
  assert.equal(result.debts.length, 0);
});
test("a recovery alone without any normal assessment cannot acquire credits", () => {
  assert.equal(computeLmdProgress([ue], [grade(18, "e2", "Rattrapage")], 50, "n1", []).acquiredCredits, 0);
});
test("transcript shows the validating recovery score, not the failed normal score", () => {
  const result = computeLmdProgress([ue], [grade(8), grade(12, "e1", "Rattrapage")], 50, "n1", []);
  const row = result.results.find(r => r.id === "u1");
  assert.equal(row.finalScore, 12);
  assert.equal(row.finalMaxScore, 20);
});
test("transcript shows the failed normal score when no recovery clears the threshold", () => {
  const result = computeLmdProgress([ue], [grade(8)], 50, "n1", []);
  const row = result.results.find(r => r.id === "u1");
  assert.equal(row.finalScore, 8);
});
test("unassessed UE has a null transcript score", () => {
  const result = computeLmdProgress([ue], [], 50, "n1", []);
  const row = result.results.find(r => r.id === "u1");
  assert.equal(row.finalScore, null);
});
test("failed UE on level suggests ajourne (rattrapage path), not redouble", () => {
  const result = computeLmdProgress([ue], [grade(8)], 50, "n1", []);
  assert.equal(result.level.failedCount, 1);
  assert.equal(result.suggestion, "ajourne");
});
test("all level UE validated suggests admis", () => {
  const result = computeLmdProgress([ue], [grade(12)], 50, "n1", []);
  assert.equal(result.suggestion, "admis");
});
