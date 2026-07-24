export type TcfDurationUnit = "day" | "week" | "month";

export function durationToDays(value: number, unit: TcfDurationUnit): number {
  const v = Math.max(1, Math.floor(value));
  if (unit === "day") return v;
  if (unit === "week") return v * 7;
  return v * 30;
}

export function durationLabel(value: number, unit: TcfDurationUnit): string {
  const v = Math.max(1, Math.floor(value));
  if (unit === "day") return v === 1 ? "1 jour" : `${v} jours`;
  if (unit === "week") return v === 1 ? "1 semaine" : `${v} semaines`;
  return v === 1 ? "1 mois" : `${v} mois`;
}

/** Tarif catalogue à partir du prix mensuel et de la durée en jours. */
export function catalogTotalFromMonthly(monthlyPrice: number, days: number): number {
  if (monthlyPrice <= 0 || days <= 0) return 0;
  return Math.round((monthlyPrice / 30) * days);
}

export function monthEquivalent(value: number, unit: TcfDurationUnit): number {
  return durationToDays(value, unit) / 30;
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86400000);
}
