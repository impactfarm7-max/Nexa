/** Volumes horaires UE (charge enseignement ≠ planning EDT). */

export type UeHours = {
  heures_cm: number | null;
  heures_td: number | null;
  heures_tp: number | null;
};

export function parseUeHour(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function sumUeHours(h: Partial<UeHours> | null | undefined): number {
  if (!h) return 0;
  return (Number(h.heures_cm) || 0) + (Number(h.heures_td) || 0) + (Number(h.heures_tp) || 0);
}

export function ueHoursFromDraft(m: {
  heures_cm?: number | string | null;
  heures_td?: number | string | null;
  heures_tp?: number | string | null;
}): UeHours {
  return {
    heures_cm: parseUeHour(m.heures_cm),
    heures_td: parseUeHour(m.heures_td),
    heures_tp: parseUeHour(m.heures_tp),
  };
}

export function formatUeHoursShort(h: Partial<UeHours>, locale: "fr" | "en" = "fr"): string {
  const parts: string[] = [];
  if (Number(h.heures_cm) > 0) parts.push(`${h.heures_cm}h CM`);
  if (Number(h.heures_td) > 0) parts.push(`${h.heures_td}h TD`);
  if (Number(h.heures_tp) > 0) parts.push(`${h.heures_tp}h TP`);
  if (parts.length === 0) return locale === "en" ? "No hours" : "Sans heures";
  return parts.join(" · ");
}
