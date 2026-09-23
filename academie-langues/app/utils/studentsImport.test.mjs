import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

/** Compile studentsImport.ts with stubbed xlsx + cursus-passage (birth/genre only). */
function loadStudentsImportHelpers() {
  const source = fs.readFileSync(new URL("./studentsImport.ts", import.meta.url), "utf8");
  const stubbed = source
    .replace(
      /import \* as XLSX from "xlsx";/,
      `const XLSX = { utils: { sheet_to_json: () => [], aoa_to_sheet: () => ({}), book_new: () => ({}), book_append_sheet: () => {} }, read: () => ({ SheetNames: [], Sheets: {} }), writeFile: () => {} };`,
    )
    .replace(
      /import \{ defaultAcademicYear \} from "@\/app\/utils\/cursus-passage";/,
      `function defaultAcademicYear() { return "2025-2026"; }`,
    );
  const js = ts.transpileModule(stubbed, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}

const { normalizeBirthDate, mapImportGenre } = await import(loadStudentsImportHelpers());

test("normalizeBirthDate conserve ISO", () => {
  assert.equal(normalizeBirthDate("2005-03-12"), "2005-03-12");
});

test("normalizeBirthDate accepte D/M/Y non ambigu (jour > 12)", () => {
  assert.equal(normalizeBirthDate("25/03/2005"), "2005-03-25");
  assert.equal(normalizeBirthDate("25-03-2005"), "2005-03-25");
});

test("normalizeBirthDate accepte M/D/Y non ambigu (jour en second > 12)", () => {
  assert.equal(normalizeBirthDate("03/25/2005"), "2005-03-25");
});

test("normalizeBirthDate refuse dates ambiguës (les deux ≤ 12)", () => {
  assert.equal(normalizeBirthDate("03/04/2005"), "");
  assert.equal(normalizeBirthDate("12/01/2005"), "");
});

test("normalizeBirthDate convertit serial Excel", () => {
  const out = normalizeBirthDate("38412");
  assert.match(out, /^\d{4}-\d{2}-\d{2}$/);
});

test("mapImportGenre normalise H/F", () => {
  assert.equal(mapImportGenre("h"), "Homme");
  assert.equal(mapImportGenre("f"), "Femme");
  assert.equal(mapImportGenre("autre"), "Autre");
  assert.equal(mapImportGenre(""), "");
});
