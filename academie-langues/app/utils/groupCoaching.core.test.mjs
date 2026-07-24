import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionToMs,
  computeEndsAt,
  isEligibleProfile,
  overlapsGroupWindow,
  reminderDueMinutes,
} from "./groupCoaching.core.mjs";

test("sessionToMs interprète date+heure en +01:00", () => {
  const ms = sessionToMs("2026-06-20", "14:00");
  // 14:00 +01:00 == 13:00 UTC
  assert.equal(new Date(ms).toISOString(), "2026-06-20T13:00:00.000Z");
});

test("sessionToMs tolère un session_time avec secondes", () => {
  const ms = sessionToMs("2026-06-20", "14:00:00");
  assert.equal(new Date(ms).toISOString(), "2026-06-20T13:00:00.000Z");
});

test("computeEndsAt ajoute la durée en minutes", () => {
  assert.equal(computeEndsAt(1_000_000, 60), 1_000_000 + 60 * 60000);
  assert.equal(computeEndsAt(0, 30), 30 * 60000);
});

test("isEligibleProfile: coaching dans le pack et actif", () => {
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "actif" }), true);
  assert.equal(isEligibleProfile({ coaching_total: 9999, tag_status: null }), true);
  assert.equal(isEligibleProfile({ coaching_total: 0, tag_status: "actif" }), false);
  assert.equal(isEligibleProfile({ coaching_total: null, tag_status: "actif" }), false);
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "revoque" }), false);
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "termine" }), false);
});

test("overlapsGroupWindow: chevauchement ±30min", () => {
  const gStart = sessionToMs("2026-06-20", "14:00");
  const gEnd = computeEndsAt(gStart, 60); // 14:00 -> 15:00
  // individuelle 14:30 (dure 30min) -> chevauche
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "14:30"), gStart, gEnd), true);
  // individuelle 13:45 (finit 14:15) -> chevauche le début
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "13:45"), gStart, gEnd), true);
  // individuelle 13:00 (finit 13:30) -> pas de chevauchement
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "13:00"), gStart, gEnd), false);
  // individuelle 15:00 (commence à la fin) -> pas de chevauchement
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "15:00"), gStart, gEnd), false);
});

test("reminderDueMinutes: fenêtre 0..15 min avant le départ", () => {
  const now = 1_000_000_000_000;
  assert.equal(reminderDueMinutes(now + 10 * 60000, now), true);
  assert.equal(reminderDueMinutes(now + 15 * 60000, now), true);
  assert.equal(reminderDueMinutes(now + 0, now), true);
  assert.equal(reminderDueMinutes(now + 16 * 60000, now), false);
  assert.equal(reminderDueMinutes(now - 1, now), false);
});
