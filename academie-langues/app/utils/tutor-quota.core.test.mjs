import test from "node:test";
import assert from "node:assert/strict";
import { TUTOR_EXCHANGE_QUOTA, resolveTutorQuota } from "./tutor-quota.core.mjs";

test("legacy null total → fallback 15", () => {
  const q = resolveTutorQuota({ role: "student", tutor_ia_total: null, tutor_ia_used: 3 });
  assert.equal(q.total, TUTOR_EXCHANGE_QUOTA);
  assert.equal(q.used, 3);
  assert.equal(q.remaining, 12);
  assert.equal(q.exhausted, false);
  assert.equal(q.hasAccess, true);
});

test("profile total 36 used 15 → still allowed", () => {
  const q = resolveTutorQuota({ role: "student", tutor_ia_total: 36, tutor_ia_used: 15 });
  assert.equal(q.total, 36);
  assert.equal(q.used, 15);
  assert.equal(q.remaining, 21);
  assert.equal(q.exhausted, false);
});

test("used >= total → exhausted", () => {
  const q = resolveTutorQuota({ role: "student", tutor_ia_total: 36, tutor_ia_used: 36 });
  assert.equal(q.exhausted, true);
  assert.equal(q.remaining, 0);
});

test("explicit total 0 → exhausted immediately", () => {
  const q = resolveTutorQuota({ role: "student", tutor_ia_total: 0, tutor_ia_used: 0 });
  assert.equal(q.total, 0);
  assert.equal(q.exhausted, true);
});

test("top-up total 56 used 15 → allowed past old 15 cap", () => {
  const q = resolveTutorQuota({ role: "student", tutor_ia_total: 56, tutor_ia_used: 15 });
  assert.equal(q.exhausted, false);
  assert.equal(q.remaining, 41);
});

test("admin → unlimited", () => {
  const q = resolveTutorQuota({ role: "admin", tutor_ia_total: 15, tutor_ia_used: 99 });
  assert.equal(q.unlimited, true);
  assert.equal(q.exhausted, false);
  assert.equal(q.total, null);
});

test("staff roles → no access", () => {
  for (const role of ["center_manager", "trainer", "superadmin"]) {
    const q = resolveTutorQuota({ role, tutor_ia_total: 40, tutor_ia_used: 0 });
    assert.equal(q.hasAccess, false);
  }
});
