/**
 * Tarification formation courte (générique) — formule Doc.
 * Ne pas utiliser le pro-rata TCF (catalogTotalFromMonthly).
 */

export type ShortPricingMode = "mensuel" | "forfaitaire";

export function isShortPricingMode(raw: unknown): raw is ShortPricingMode {
  return raw === "mensuel" || raw === "forfaitaire";
}

/** Forfait : le prix catalogue est le total. */
export function catalogTotalForfait(fee: number): number {
  return Math.max(0, Math.round(Number(fee) || 0));
}

/** Mensuel Doc : total = prix_mois × nombre_de_mois (unités entières). */
export function catalogTotalMensuel(monthly: number, months: number): number {
  const m = Math.max(0, Math.round(Number(monthly) || 0));
  const n = Math.max(0, Math.floor(Number(months) || 0));
  return m * n;
}

export function catalogTotalShort(params: {
  pricingMode: ShortPricingMode;
  defaultTuitionFee: number;
  /** Requis si mensuel */
  months?: number;
  /** Frais annexes (payment_plan.fees) à ajouter au total */
  extraFees?: number;
}): number {
  const extras = Math.max(0, Math.round(Number(params.extraFees) || 0));
  const base =
    params.pricingMode === "mensuel"
      ? catalogTotalMensuel(params.defaultTuitionFee, params.months ?? 0)
      : catalogTotalForfait(params.defaultTuitionFee);
  return base + extras;
}

export function sumPaymentPlanFees(plan: unknown): number {
  if (!plan || typeof plan !== "object") return 0;
  const fees = (plan as { fees?: { montant?: unknown; amount?: unknown }[] }).fees;
  if (!Array.isArray(fees)) return 0;
  return fees.reduce((acc, f) => acc + (Number(f?.montant ?? f?.amount) || 0), 0);
}

/** Frais TCF (filieres.extra_fees : [{ name, amount }]). */
export function sumNamedExtraFees(fees: unknown): number {
  if (!Array.isArray(fees)) return 0;
  return fees.reduce((acc, f) => {
    if (!f || typeof f !== "object") return acc;
    const row = f as { montant?: unknown; amount?: unknown };
    return acc + (Number(row.montant ?? row.amount) || 0);
  }, 0);
}

export type ShortInstallmentTemplate = { montant: number; jours: number };

export function parsePaymentPlanInstallments(plan: unknown): ShortInstallmentTemplate[] {
  if (!plan || typeof plan !== "object") return [];
  const rows = (plan as { installments?: { montant?: unknown; jours?: unknown }[] }).installments;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      montant: Number(r?.montant) || 0,
      jours: Math.max(0, Math.floor(Number(r?.jours) || 0)),
    }))
    .filter((r) => r.montant > 0);
}

/** Échéances catalogue, éventuellement redimensionnées au total facturé. */
export function scaleInstallmentsToTotal(
  templates: ShortInstallmentTemplate[],
  finalTotal: number,
): { label: string; amount: number; due_date: string; position: number }[] {
  if (finalTotal <= 0 || templates.length === 0) return [];
  const sum = templates.reduce((a, t) => a + t.montant, 0);
  const scale = sum > 0 ? finalTotal / sum : 1;
  const now = Date.now();
  const rows = templates.map((t, idx) => {
    const amount =
      idx === templates.length - 1
        ? 0 // placeholder, fixed below
        : Math.round(t.montant * scale);
    const due = new Date(now + t.jours * 24 * 60 * 60 * 1000);
    return {
      label: `Échéance ${idx + 1}`,
      amount,
      due_date: due.toISOString().slice(0, 10),
      position: idx + 1,
      jours: t.jours,
    };
  });
  const allocated = rows.slice(0, -1).reduce((a, r) => a + r.amount, 0);
  rows[rows.length - 1].amount = Math.max(0, finalTotal - allocated);
  return rows.map(({ label, amount, due_date, position }) => ({
    label,
    amount,
    due_date,
    position,
  }));
}

export function durationLabelShort(value: number, unit: string): string {
  const n = Math.max(0, Math.floor(value) || 0);
  if (unit === "mois" || unit === "month") return `${n} mois`;
  if (unit === "semaines" || unit === "week") return `${n} sem.`;
  if (unit === "jours" || unit === "day") return `${n} j`;
  return `${n}`;
}
