import { applyGrantDebit, emptyWallet, isAiCreditType } from "../../../data/aiCredits.core.mjs";

export function parseGrantInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const beneficiaryId = typeof body.beneficiary_id === "string" ? body.beneficiary_id.trim() : "";
  if (!beneficiaryId || !isAiCreditType(body.credit_type)) return null;
  if (body.source !== "generic" && body.source !== "typed") return null;

  try {
    applyGrantDebit(
      {
        ...emptyWallet(),
        generic: Number.MAX_SAFE_INTEGER,
        [body.credit_type]: Number.MAX_SAFE_INTEGER,
      },
      {
        source: body.source,
        type: body.credit_type,
        quantity: body.quantity,
      },
    );
  } catch {
    return null;
  }

  let paymentAmount = null;
  let paymentReason = null;
  if (body.record_payment === true) {
    const reason = typeof body.payment_reason === "string" ? body.payment_reason.trim() : "";
    if (!Number.isInteger(body.payment_amount) || body.payment_amount < 1 || !reason) return null;
    paymentAmount = body.payment_amount;
    paymentReason = reason;
  }

  return {
    beneficiaryId,
    creditType: body.credit_type,
    quantity: body.quantity,
    source: body.source,
    paymentAmount,
    paymentReason,
  };
}
