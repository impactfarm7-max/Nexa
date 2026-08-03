import test from "node:test";
import assert from "node:assert/strict";
import { TRAINER_DEFAULT_PERMISSIONS, resolveTrainerPermissions } from "./trainer-defaults.mjs";

test("defaults are pedagogical modules", () => {
  assert.deepEqual([...TRAINER_DEFAULT_PERMISSIONS], ["cours", "communaute", "examens", "lives"]);
});

test("empty stored → defaults", () => {
  assert.deepEqual(resolveTrainerPermissions([]), ["cours", "communaute", "examens", "lives"]);
  assert.deepEqual(resolveTrainerPermissions(null), ["cours", "communaute", "examens", "lives"]);
});

test("non-empty stored → kept as-is", () => {
  assert.deepEqual(resolveTrainerPermissions(["cours", "lives"]), ["cours", "lives"]);
});
