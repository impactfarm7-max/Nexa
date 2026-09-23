import { test } from "node:test";
import assert from "node:assert/strict";

const {
  normalizeGradeStatus,
  isOfficialGrade,
  filterOfficialGrades,
} = await import("./gradeStatus.ts");

test("normalizeGradeStatus: provisional explicite", () => {
  assert.equal(normalizeGradeStatus("provisional"), "provisional");
});

test("normalizeGradeStatus: validated + null/vide = validated (héritage)", () => {
  assert.equal(normalizeGradeStatus("validated"), "validated");
  assert.equal(normalizeGradeStatus(null), "validated");
  assert.equal(normalizeGradeStatus(""), "validated");
  assert.equal(normalizeGradeStatus(undefined), "validated");
});

test("normalizeGradeStatus: garbage → provisional", () => {
  assert.equal(normalizeGradeStatus("nope"), "provisional");
  assert.equal(normalizeGradeStatus(42), "provisional");
});

test("isOfficialGrade / filterOfficialGrades", () => {
  assert.equal(isOfficialGrade("validated"), true);
  assert.equal(isOfficialGrade(null), true);
  assert.equal(isOfficialGrade("provisional"), false);
  assert.deepEqual(
    filterOfficialGrades([
      { id: "a", status: "provisional" },
      { id: "b", status: "validated" },
      { id: "c", status: null },
    ]).map((g) => g.id),
    ["b", "c"],
  );
});
