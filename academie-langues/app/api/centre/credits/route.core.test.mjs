import test from "node:test";
import assert from "node:assert/strict";
import { parseGrantInput } from "./route.core.mjs";

test("parses a grant without payment", () => {
  assert.deepEqual(
    parseGrantInput({
      beneficiary_id: "student-1",
      credit_type: "tutor_ia",
      quantity: 5,
      source: "typed",
    }),
    {
      beneficiaryId: "student-1",
      creditType: "tutor_ia",
      quantity: 5,
      source: "typed",
      paymentAmount: null,
      paymentReason: null,
    },
  );
});

test("parses payment details only when requested", () => {
  assert.deepEqual(
    parseGrantInput({
      beneficiary_id: "student-1",
      credit_type: "exam_sim",
      quantity: 2,
      source: "generic",
      record_payment: true,
      payment_amount: 1500,
      payment_reason: "Paiement espèces",
    }),
    {
      beneficiaryId: "student-1",
      creditType: "exam_sim",
      quantity: 2,
      source: "generic",
      paymentAmount: 1500,
      paymentReason: "Paiement espèces",
    },
  );
});

test("rejects invalid grants and incomplete payments", () => {
  const base = {
    beneficiary_id: "student-1",
    credit_type: "tutor_ia",
    quantity: 5,
    source: "typed",
  };

  assert.equal(parseGrantInput({ ...base, quantity: 0 }), null);
  assert.equal(parseGrantInput({ ...base, credit_type: "unknown" }), null);
  assert.equal(parseGrantInput({ ...base, source: "unknown" }), null);
  assert.equal(parseGrantInput({ ...base, record_payment: true, payment_amount: 0, payment_reason: "Cash" }), null);
  assert.equal(parseGrantInput({ ...base, record_payment: true, payment_amount: 1000, payment_reason: " " }), null);
});
