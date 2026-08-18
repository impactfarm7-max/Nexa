import test from "node:test";
import assert from "node:assert/strict";
import {
  FINANCE_METHODS,
  isFinanceMethod,
  validatePaymentInput,
  buildMonthlyRevenue,
  financeMethodLabel,
} from "./financePayments.core.mjs";

test("FINANCE_METHODS has the four expected keys", () => {
  assert.deepEqual(FINANCE_METHODS, ["virement", "mobile_money", "especes", "autre"]);
});

test("isFinanceMethod accepts known keys, rejects others", () => {
  assert.equal(isFinanceMethod("virement"), true);
  assert.equal(isFinanceMethod("bitcoin"), false);
  assert.equal(isFinanceMethod(null), false);
});

test("validatePaymentInput accepts a well-formed payload", () => {
  const result = validatePaymentInput({
    center_id: "c1",
    amount: 25000,
    method: "mobile_money",
    period_label: "Août 2026",
    paid_at: "2026-08-15T10:00:00.000Z",
    note: "Paiement partiel",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.center_id, "c1");
  assert.equal(result.value.amount, 25000);
  assert.equal(result.value.method, "mobile_money");
  assert.equal(result.value.period_label, "Août 2026");
  assert.equal(result.value.note, "Paiement partiel");
});

test("validatePaymentInput defaults paid_at to now when omitted", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 1000, method: "especes" });
  assert.equal(result.ok, true);
  assert.equal(typeof result.value.paid_at, "string");
  assert.equal(result.value.period_label, null);
  assert.equal(result.value.note, null);
});

test("validatePaymentInput rejects missing center_id", () => {
  const result = validatePaymentInput({ amount: 1000, method: "especes" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("center_id"));
});

test("validatePaymentInput rejects zero or negative amount", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 0, method: "especes" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("amount"));
});

test("validatePaymentInput rejects unknown method", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 1000, method: "bitcoin" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("method"));
});

test("buildMonthlyRevenue buckets payments into the right month", () => {
  const now = new Date(2026, 7, 15); // 15 août 2026
  const payments = [
    { amount: 1000, paid_at: "2026-08-01T00:00:00.000Z" },
    { amount: 500, paid_at: "2026-08-10T00:00:00.000Z" },
    { amount: 2000, paid_at: "2026-07-01T00:00:00.000Z" },
    { amount: 999, paid_at: "2025-01-01T00:00:00.000Z" }, // out of the 3-month window
  ];
  const months = buildMonthlyRevenue(payments, 3, now);
  assert.equal(months.length, 3);
  assert.equal(months[2].total, 1500); // août
  assert.equal(months[1].total, 2000); // juillet
  assert.equal(months[0].total, 0); // juin
});

test("financeMethodLabel returns FR and EN labels", () => {
  assert.equal(financeMethodLabel("mobile_money", "fr"), "Mobile Money");
  assert.equal(financeMethodLabel("especes", "en"), "Cash");
  assert.equal(financeMethodLabel("unknown_key", "fr"), "unknown_key");
});
