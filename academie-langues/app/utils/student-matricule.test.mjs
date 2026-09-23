import { test } from "node:test";
import assert from "node:assert/strict";

const {
  DEFAULT_STUDENT_ID_PREFIX,
  resolveStudentIdPrefix,
  formatMatricule,
  parseMatriculeForPrefix,
} = await import("./student-matricule.ts");

test("DEFAULT_STUDENT_ID_PREFIX vaut ETU", () => {
  assert.equal(DEFAULT_STUDENT_ID_PREFIX, "ETU");
});

test("resolveStudentIdPrefix renvoie le defaut si null/undefined/vide", () => {
  assert.equal(resolveStudentIdPrefix(null), "ETU");
  assert.equal(resolveStudentIdPrefix(undefined), "ETU");
  assert.equal(resolveStudentIdPrefix("   "), "ETU");
});

test("resolveStudentIdPrefix renvoie le prefixe personnalise trim", () => {
  assert.equal(resolveStudentIdPrefix("  UNIV-DKR  "), "UNIV-DKR");
});

test("resolveStudentIdPrefixForCenter refuse le vide pour universite", async () => {
  const { resolveStudentIdPrefixForCenter, isUniversityCenter, assertMatriculeForOfficialDocument } =
    await import("./student-matricule.ts");
  assert.equal(isUniversityCenter("universite"), true);
  assert.equal(isUniversityCenter("ecole"), false);
  assert.equal(resolveStudentIdPrefixForCenter("UADB", "universite"), "UADB");
  assert.throws(() => resolveStudentIdPrefixForCenter("", "universite"));
  assert.equal(resolveStudentIdPrefixForCenter("", "ecole"), "ETU");
  assert.equal(assertMatriculeForOfficialDocument("UADB-2026-0001"), "UADB-2026-0001");
  assert.throws(() => assertMatriculeForOfficialDocument(""));
});

test("formatMatricule compose prefixe-annee-seq avec padding 4 chiffres", () => {
  assert.equal(formatMatricule("ETU", 2026, 1), "ETU-2026-0001");
  assert.equal(formatMatricule("UNIV-DKR", 2026, 47), "UNIV-DKR-2026-0047");
  assert.equal(formatMatricule("ETU", 2026, 10000), "ETU-2026-10000");
});

test("parseMatriculeForPrefix extrait annee/seq quand ca correspond exactement", () => {
  assert.deepEqual(parseMatriculeForPrefix("ETU-2026-0050", "ETU"), { year: 2026, seq: 50 });
  assert.deepEqual(parseMatriculeForPrefix("UNIV-DKR-2024-0003", "UNIV-DKR"), { year: 2024, seq: 3 });
});

test("parseMatriculeForPrefix renvoie null si le prefixe ne correspond pas", () => {
  assert.equal(parseMatriculeForPrefix("STU2019-4521", "ETU"), null);
});

test("parseMatriculeForPrefix renvoie null si le format general ne correspond pas", () => {
  assert.equal(parseMatriculeForPrefix("ETU-26-1", "ETU"), null);
  assert.equal(parseMatriculeForPrefix("ETU-2026", "ETU"), null);
  assert.equal(parseMatriculeForPrefix("", "ETU"), null);
});

test("parseMatriculeForPrefix echappe les caracteres speciaux du prefixe", () => {
  // Un prefixe contenant un caractere regex special (ex. un point) ne doit
  // pas etre interprete comme un pattern.
  assert.equal(parseMatriculeForPrefix("ETUX2026-0001", "ETU."), null);
  assert.deepEqual(parseMatriculeForPrefix("ETU.-2026-0001", "ETU."), { year: 2026, seq: 1 });
});
