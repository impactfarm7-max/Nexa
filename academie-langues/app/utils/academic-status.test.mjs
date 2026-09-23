import { test } from "node:test";
import assert from "node:assert/strict";

const {
  isAcademicStatus,
  isAcademicStatusReadonly,
  normalizeAcademicStatus,
  academicStatusAfterPassage,
  defaultAcademicStatus,
} = await import("./academic-status.ts");

test("isAcademicStatus accepte les 5 valeurs", () => {
  for (const s of ["inscrit", "redoublant", "suspendu", "diplome", "transfere"]) {
    assert.equal(isAcademicStatus(s), true);
  }
  assert.equal(isAcademicStatus("active"), false);
  assert.equal(isAcademicStatus(null), false);
});

test("isAcademicStatusReadonly bloque suspendu/diplome/transfere", () => {
  assert.equal(isAcademicStatusReadonly("inscrit"), false);
  assert.equal(isAcademicStatusReadonly("redoublant"), false);
  assert.equal(isAcademicStatusReadonly("suspendu"), true);
  assert.equal(isAcademicStatusReadonly("diplome"), true);
  assert.equal(isAcademicStatusReadonly("transfere"), true);
  assert.equal(isAcademicStatusReadonly(null), false);
});

test("normalizeAcademicStatus et défauts passage", () => {
  assert.equal(normalizeAcademicStatus("inscrit"), "inscrit");
  assert.equal(normalizeAcademicStatus("nope"), null);
  assert.equal(defaultAcademicStatus(), "inscrit");
  assert.equal(academicStatusAfterPassage("admis"), "inscrit");
  assert.equal(academicStatusAfterPassage("redouble"), "redoublant");
  assert.equal(academicStatusAfterPassage("ajourne"), null);
});
