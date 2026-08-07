export type PeriodPreset = "today" | "week" | "month" | "quarter" | "year" | "custom";

export type ReportLocale = "fr" | "en";

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

export function formatShort(iso: string, locale: ReportLocale = "fr") {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Label de période pour UI / PDF / CSV (client ou serveur). */
export function formatReportPeriodLabel(
  from: string,
  to: string,
  locale: ReportLocale = "fr",
) {
  if (from === to) return formatShort(from, locale);
  return locale === "en"
    ? `${formatShort(from, locale)} to ${formatShort(to, locale)}`
    : `${formatShort(from, locale)} — ${formatShort(to, locale)}`;
}

export function resolveReportPeriod(
  preset: string | null,
  fromParam: string | null,
  toParam: string | null,
  locale: ReportLocale = "fr",
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
      label: formatReportPeriodLabel(fromDate, toDate, locale),
    };
  }

  const now = new Date();
  const p = (preset || "month") as PeriodPreset;
  const loc = locale === "en" ? "en-US" : "fr-FR";

  if (p === "today") {
    const iso = toIsoDate(now);
    return {
      preset: "today",
      from: iso,
      to: iso,
      label: locale === "en" ? "Today" : "Aujourd'hui",
    };
  }

  if (p === "week") {
    const from = toIsoDate(getMonday(now));
    const to = toIsoDate(now);
    return {
      preset: "week",
      from,
      to,
      label: locale === "en" ? "This week" : "Cette semaine",
    };
  }

  if (p === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    return {
      preset: "quarter",
      from: toIsoDate(start),
      to: toIsoDate(now),
      label: locale === "en" ? `Q${q + 1} ${now.getFullYear()}` : `T${q + 1} ${now.getFullYear()}`,
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
    label: now.toLocaleDateString(loc, { month: "long", year: "numeric" }),
  };
}

export function periodStartIso(from: string) {
  return startOfDay(new Date(from + "T00:00:00")).toISOString();
}

export function periodEndIso(to: string) {
  return endOfDay(new Date(to + "T00:00:00")).toISOString();
}

export function parseReportFilters(url: URL, locale: ReportLocale = "fr") {
  const period = resolveReportPeriod(
    url.searchParams.get("preset"),
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    locale,
  );
  return {
    period,
    campusId: url.searchParams.get("campusId") || null,
    filiereId: url.searchParams.get("filiereId") || null,
  };
}
