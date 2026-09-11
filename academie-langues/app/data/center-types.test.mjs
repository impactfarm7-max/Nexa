import { test } from "node:test";
import assert from "node:assert/strict";

const {
  CENTER_TYPES,
  normalizeCenterType,
  centerTypeLabel,
  isTcfCanadaCenter,
  isPluriannualCenter,
  resolveStudentExperienceMode,
} = await import("./center-types.ts");

test("CENTER_TYPES contient les 5 valeurs", () => {
  assert.deepEqual(
    [...CENTER_TYPES].sort(),
    ["ecole", "entreprise", "generic", "tcf_canada", "universite"].sort(),
  );
});

test("normalizeCenterType renvoie generic pour les 3 nouveaux types", () => {
  assert.equal(normalizeCenterType("ecole"), "generic");
  assert.equal(normalizeCenterType("universite"), "generic");
  assert.equal(normalizeCenterType("entreprise"), "generic");
});

test("centerTypeLabel renvoie le bon libellé FR pour les 3 nouveaux types", () => {
  assert.equal(centerTypeLabel("ecole", "fr"), "École");
  assert.equal(centerTypeLabel("universite", "fr"), "Université");
  assert.equal(centerTypeLabel("entreprise", "fr"), "Entreprise");
});

test("centerTypeLabel renvoie le bon libellé EN pour les 3 nouveaux types", () => {
  assert.equal(centerTypeLabel("ecole", "en"), "School");
  assert.equal(centerTypeLabel("universite", "en"), "University");
  assert.equal(centerTypeLabel("entreprise", "en"), "Company");
});

test("centerTypeLabel generic/inconnu reste inchangé", () => {
  assert.equal(centerTypeLabel("generic", "fr"), "Centre de formation libre");
  assert.equal(centerTypeLabel(null, "fr"), "Centre de formation libre");
  assert.equal(centerTypeLabel("tcf_canada", "fr"), "Formation native");
});

test("isPluriannualCenter reste true pour les 3 nouveaux types (clone comportemental)", () => {
  assert.equal(isPluriannualCenter("ecole"), true);
  assert.equal(isPluriannualCenter("universite"), true);
  assert.equal(isPluriannualCenter("entreprise"), true);
  assert.equal(isTcfCanadaCenter("ecole"), false);
});

test("resolveStudentExperienceMode reste pluriannual pour les 3 nouveaux types", () => {
  assert.equal(resolveStudentExperienceMode("center-1", "ecole"), "pluriannual");
  assert.equal(resolveStudentExperienceMode("center-1", "universite"), "pluriannual");
  assert.equal(resolveStudentExperienceMode("center-1", "entreprise"), "pluriannual");
});
