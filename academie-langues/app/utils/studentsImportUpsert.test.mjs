import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function moduleUrl(name) {
  const source = fs.readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
    .replace(/from "\.\/(.*?)"/g, (_, dependency) => `from "${moduleUrl(dependency)}"`);
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}

const {
  pickEnrollmentForImportUpsert,
  isGroupeValidForPlacement,
} = await import(moduleUrl("studentsImportUpsert"));

test("pickEnrollment préfère active même filière", () => {
  const { target, refuseReadonly } = pickEnrollmentForImportUpsert(
    [
      { id: "a", status: "completed", filiere_id: "f1", academic_status: "inscrit" },
      { id: "b", status: "active", filiere_id: "f1", academic_status: "inscrit" },
      { id: "c", status: "active", filiere_id: "f2", academic_status: "inscrit" },
    ],
    "f1",
  );
  assert.equal(target?.id, "b");
  assert.equal(refuseReadonly, false);
});

test("pickEnrollment refuse readonly active", () => {
  const { target, refuseReadonly } = pickEnrollmentForImportUpsert(
    [
      { id: "a", status: "active", filiere_id: "f1", academic_status: "diplome" },
    ],
    "f1",
  );
  assert.equal(target, null);
  assert.equal(refuseReadonly, true);
});

test("pickEnrollment ignore completed / passage_decision", () => {
  const { target, refuseReadonly } = pickEnrollmentForImportUpsert(
    [
      {
        id: "a",
        status: "active",
        filiere_id: "f1",
        academic_status: "inscrit",
        passage_decision: "ajourne",
      },
      { id: "b", status: "completed", filiere_id: "f1", academic_status: "inscrit" },
    ],
    "f1",
  );
  assert.equal(target, null);
  assert.equal(refuseReadonly, false);
});

test("pickEnrollment crée nouvelle fiche si année différente", () => {
  const { target, refuseReadonly } = pickEnrollmentForImportUpsert(
    [
      {
        id: "a",
        status: "active",
        filiere_id: "f1",
        academic_status: "inscrit",
        academic_year: "2024-2025",
      },
    ],
    "f1",
    "2025-2026",
  );
  assert.equal(target, null);
  assert.equal(refuseReadonly, false);
});

test("pickEnrollment matche année scolaire", () => {
  const { target } = pickEnrollmentForImportUpsert(
    [
      {
        id: "old",
        status: "active",
        filiere_id: "f1",
        academic_status: "inscrit",
        academic_year: "2024-2025",
      },
      {
        id: "cur",
        status: "draft",
        filiere_id: "f1",
        academic_status: "inscrit",
        academic_year: "2025-2026",
      },
    ],
    "f1",
    "2025-2026",
  );
  assert.equal(target?.id, "cur");
});

test("isGroupeValidForPlacement exige filière + niveau cohérent", () => {
  assert.equal(
    isGroupeValidForPlacement({
      groupeFiliereId: "f1",
      groupeNiveauId: "n1",
      filiereId: "f1",
      niveauId: "n1",
    }),
    true,
  );
  assert.equal(
    isGroupeValidForPlacement({
      groupeFiliereId: "f1",
      groupeNiveauId: "n2",
      filiereId: "f1",
      niveauId: "n1",
    }),
    false,
  );
  assert.equal(
    isGroupeValidForPlacement({
      groupeFiliereId: "f2",
      groupeNiveauId: "n1",
      filiereId: "f1",
      niveauId: "n1",
    }),
    false,
  );
  assert.equal(
    isGroupeValidForPlacement({
      groupeFiliereId: "f1",
      groupeNiveauId: null,
      filiereId: "f1",
      niveauId: "n1",
    }),
    true,
  );
});
