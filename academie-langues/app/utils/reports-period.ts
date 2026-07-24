export type PeriodPreset = "today" | "week" | "month" | "quarter" | "year" | "custom";

export type ReportPeriod = {
  preset: PeriodPreset;
  from: string;
  to: string;
  label: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Période par défaut : 1er du mois en cours → aujourd'hui */
export function defaultReportPeriodRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(start), to: toIsoDate(now) };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getMonday(d: Date) {
  const copy = startOfDay(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
  return copy;
}

export function resolveReportPeriod(
  preset: string | null,
  fromParam: string | null,
  toParam: string | null,
): ReportPeriod {
  if (fromParam && toParam) {
    const from = fromParam.slice(0, 10);
    const to = toParam.slice(0, 10);
    const fromDate = from <= to ? from : to;
    const toDate = from <= to ? to : from;
    return {
      preset: "custom",
      from: fromDate,
      to: toDate,
      label: fromDate === toDate ? formatShort(fromDate) : `${formatShort(fromDate)} — ${formatShort(toDate)}`,
    };
  }

  const now = new Date();
  const p = (preset || "month") as PeriodPreset;

  if (p === "today") {
    const iso = toIsoDate(now);
    return { preset: "today", from: iso, to: iso, label: "Aujourd'hui" };
  }

  if (p === "week") {
    const from = toIsoDate(getMonday(now));
    const to = toIsoDate(now);
    return { preset: "week", from, to, label: "Cette semaine" };
  }

  if (p === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    return {
      preset: "quarter",
      from: toIsoDate(start),
      to: toIsoDate(now),
      label: `T${q + 1} ${now.getFullYear()}`,
    };
  }

  if (p === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      preset: "year",
      from: toIsoDate(start),
      to: toIsoDate(now),
      label: String(now.getFullYear()),
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    preset: "month",
    from: toIsoDate(start),
    to: toIsoDate(now),
    label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  };
}

export function formatShort(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function periodStartIso(from: string) {
  return startOfDay(new Date(from + "T00:00:00")).toISOString();
}

export function periodEndIso(to: string) {
  return endOfDay(new Date(to + "T00:00:00")).toISOString();
}

export function parseReportFilters(url: URL) {
  const period = resolveReportPeriod(
    url.searchParams.get("preset"),
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  );
  return {
    period,
    campusId: url.searchParams.get("campusId") || null,
    filiereId: url.searchParams.get("filiereId") || null,
  };
}
