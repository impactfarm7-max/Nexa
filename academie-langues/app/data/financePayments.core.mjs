export const FINANCE_METHODS = ["virement", "mobile_money", "especes", "autre"];

export function isFinanceMethod(value) {
  return typeof value === "string" && FINANCE_METHODS.includes(value);
}

function toTrimmedStringOrNull(value, maxLen) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export function validatePaymentInput(body) {
  const errors = [];

  const center_id = toTrimmedStringOrNull(body?.center_id);
  if (!center_id) errors.push("center_id");

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("amount");

  const method = body?.method;
  if (!isFinanceMethod(method)) errors.push("method");

  let paidAtDate = body?.paid_at ? new Date(body.paid_at) : new Date();
  if (Number.isNaN(paidAtDate.getTime())) errors.push("paid_at");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      center_id,
      amount: Math.trunc(amount),
      method,
      period_label: toTrimmedStringOrNull(body?.period_label, 120),
      paid_at: paidAtDate.toISOString(),
      note: toTrimmedStringOrNull(body?.note, 500),
    },
  };
}

export function buildMonthlyRevenue(payments, monthsCount, now) {
  const ref = now instanceof Date ? now : new Date();
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, year: d.getFullYear(), month: d.getMonth(), total: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const d = new Date(p.paid_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.total += Number(p.amount) || 0;
  }
  return months;
}

const METHOD_LABELS_FR = { virement: "Virement", mobile_money: "Mobile Money", especes: "Espèces", autre: "Autre" };
const METHOD_LABELS_EN = { virement: "Bank transfer", mobile_money: "Mobile Money", especes: "Cash", autre: "Other" };

export function financeMethodLabel(method, locale) {
  const map = locale === "en" ? METHOD_LABELS_EN : METHOD_LABELS_FR;
  return map[method] || method;
}
