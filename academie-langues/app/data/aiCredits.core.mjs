export const AI_CREDIT_TYPES = ["tutor_ia", "exam_sim", "ai_corrections", "course_builder"];

export const PROFILE_TOTAL_COLUMN = {
  tutor_ia: "tutor_ia_total",
  exam_sim: "exam_total",
  ai_corrections: "ai_corrections_total",
  course_builder: "course_builder_total",
};

export function emptyWallet() {
  return { generic: 0, tutor_ia: 0, exam_sim: 0, ai_corrections: 0, course_builder: 0 };
}

export function isAiCreditType(value) {
  return typeof value === "string" && AI_CREDIT_TYPES.includes(value);
}

function assertQty(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error("INVALID_QUANTITY");
}

export function applyPurchase(wallet, { mode, type, quantity }) {
  assertQty(quantity);
  const next = { ...wallet };
  if (mode === "generic") {
    next.generic += quantity;
    return next;
  }
  if (mode !== "typed" || !isAiCreditType(type)) throw new Error("INVALID_PURCHASE");
  next[type] += quantity;
  return next;
}

export function applyGrantDebit(wallet, { source, type, quantity }) {
  assertQty(quantity);
  if (!isAiCreditType(type)) throw new Error("INVALID_TYPE");
  const next = { ...wallet };
  if (source === "typed") {
    if ((next[type] || 0) < quantity) throw new Error("INSUFFICIENT_STOCK");
    next[type] -= quantity;
    return next;
  }
  if (source !== "generic") throw new Error("INVALID_SOURCE");
  if ((next.generic || 0) < quantity) throw new Error("INSUFFICIENT_STOCK");
  next.generic -= quantity;
  return next;
}
