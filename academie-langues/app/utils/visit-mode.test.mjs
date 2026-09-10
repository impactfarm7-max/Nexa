import { test } from "node:test";
import assert from "node:assert/strict";

// Stub minimal de sessionStorage + window pour un environnement node --test (pas de DOM).
function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
}

globalThis.window = globalThis;
globalThis.sessionStorage = makeSessionStorage();
globalThis.dispatchEvent = () => {};
globalThis.Event = class Event { constructor(name) { this.name = name; } };

const { readVisitMode, writeVisitMode, clearVisitMode, isVisitMode } = await import("./visit-mode.ts");

test("readVisitMode renvoie null si rien n'est stocké", () => {
  clearVisitMode();
  assert.equal(readVisitMode(), null);
  assert.equal(isVisitMode(), false);
});

test("writeVisitMode puis readVisitMode round-trip", () => {
  const state = { centerKind: "tcf", viewAs: "student", centerName: "Centre TCF Démo", startedAt: "2026-09-10T00:00:00.000Z" };
  writeVisitMode(state);
  assert.deepEqual(readVisitMode(), state);
  assert.equal(isVisitMode(), true);
});

test("writeVisitMode(null) efface l'état", () => {
  writeVisitMode({ centerKind: "libre", viewAs: "center", centerName: "x", startedAt: "x" });
  writeVisitMode(null);
  assert.equal(readVisitMode(), null);
});

test("readVisitMode ignore un état malformé (JSON invalide)", () => {
  sessionStorage.setItem("nexa_visit_mode", "{ invalide");
  assert.equal(readVisitMode(), null);
});

test("readVisitMode ignore un état incomplet", () => {
  sessionStorage.setItem("nexa_visit_mode", JSON.stringify({ centerKind: "tcf" }));
  assert.equal(readVisitMode(), null);
});
