import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyWallet,
  applyPurchase,
  applyGrantDebit,
  PROFILE_TOTAL_COLUMN,
} from "./aiCredits.core.mjs";

test("purchase generic increases generic only", () => {
  const w = applyPurchase(emptyWallet(), { mode: "generic", quantity: 100 });
  assert.equal(w.generic, 100);
  assert.equal(w.tutor_ia, 0);
});

test("purchase typed increases that type", () => {
  const w = applyPurchase(emptyWallet(), { mode: "typed", type: "tutor_ia", quantity: 50 });
  assert.equal(w.tutor_ia, 50);
});

test("grant from typed debits typed stock", () => {
  const stocked = applyPurchase(emptyWallet(), { mode: "typed", type: "tutor_ia", quantity: 50 });
  const next = applyGrantDebit(stocked, { source: "typed", type: "tutor_ia", quantity: 10 });
  assert.equal(next.tutor_ia, 40);
});

test("grant from generic debits generic", () => {
  const stocked = applyPurchase(emptyWallet(), { mode: "generic", quantity: 20 });
  const next = applyGrantDebit(stocked, { source: "generic", type: "exam_sim", quantity: 5 });
  assert.equal(next.generic, 15);
});

test("grant fails when insufficient", () => {
  assert.throws(
    () => applyGrantDebit(emptyWallet(), { source: "typed", type: "tutor_ia", quantity: 1 }),
    /INSUFFICIENT_STOCK/,
  );
});

test("profile column map covers all types", () => {
  for (const key of ["tutor_ia", "exam_sim", "ai_corrections", "course_builder"]) {
    assert.equal(typeof PROFILE_TOTAL_COLUMN[key], "string");
  }
});
