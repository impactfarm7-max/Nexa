import { durationLabel, type TcfDurationUnit } from "@/app/utils/tcf-access";

export const PACK_LABELS: Record<string, string> = {
  ivoire: "Pack Ivoire",
  raphia: "Pack Raphia",
  ebene: "Pack Ébène",
  cauris: "Pack Cauris",
  acceleree: "Formation Accélérée",
  complete: "Formation Complète",
  essai: "Essai gratuit",
  nexa_b2b: "Offre NEXA Centre",
  pluriannuel: "Formation pluri-annuelle",
};

export type AppLocale = "fr" | "en";

export type CenterAccessStatusKey = "paused" | "revoked" | "pending" | "active" | "inactive";

export type TranslateDashboard = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function localeToBcp47(locale?: AppLocale | string | null): string {
  return locale === "en" ? "en-US" : "fr-FR";
}

export function packDisplayName(pack: string | null | undefined): string {
  if (!pack) return "Pack Ivoire";
  const key = pack.toLowerCase();
  return PACK_LABELS[key] || `Pack ${pack}`;
}

export function computeAge(
  birthDate: string | null | undefined,
  t?: TranslateDashboard,
): string {
  if (!birthDate) return "—";
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  if (age < 0) return "—";
  if (t) return t("profilAgeYears", { count: age });
  return `${age} ans`;
}

const FINANCE_STATUS_FR: Record<string, string> = {
  pending: "À encaisser",
  current: "En cours",
  paid: "Soldé",
  late: "En retard",
  exempt: "Exonéré",
};

const FINANCE_STATUS_EN: Record<string, string> = {
  pending: "Awaiting payment",
  current: "In progress",
  paid: "Paid in full",
  late: "Overdue",
  exempt: "Exempt",
};

export function financeStatusLabel(
  status: string | null | undefined,
  locale: AppLocale = "fr",
): string {
  if (!status) return "—";
  const map = locale === "en" ? FINANCE_STATUS_EN : FINANCE_STATUS_FR;
  return map[status] || status;
}

export function centerAccessStatusKey(
  centerStatus: string | null | undefined,
  tagStatus: string | null | undefined,
): CenterAccessStatusKey {
  const cs = centerStatus || "";
  const ts = tagStatus || "";
  if (cs === "paused" || ts === "paused") return "paused";
  if (cs === "revoked" || ts === "revoque") return "revoked";
  if (cs === "pending_center_approval" || ts === "pending_center_approval") return "pending";
  if (cs === "active" || ts === "normal") return "active";
  if (cs === "active") return "active";
  return "inactive";
}

const CENTER_ACCESS_STATUS_KEYS: Record<CenterAccessStatusKey, string> = {
  paused: "profilStatusPaused",
  revoked: "profilStatusRevoked",
  pending: "profilStatusPending",
  active: "profilStatusActive",
  inactive: "profilStatusInactive",
};

const CENTER_ACCESS_STATUS_FR: Record<CenterAccessStatusKey, string> = {
  paused: "En pause",
  revoked: "Révoqué",
  pending: "En attente",
  active: "Actif",
  inactive: "Inactif",
};

export function centerAccessStatusLabel(
  centerStatus: string | null | undefined,
  tagStatus: string | null | undefined,
  t?: TranslateDashboard,
): string {
  const statusKey = centerAccessStatusKey(centerStatus, tagStatus);
  if (t) return t(CENTER_ACCESS_STATUS_KEYS[statusKey]);
  return CENTER_ACCESS_STATUS_FR[statusKey];
}

export function formatEnrollmentDuration(
  durationValue: number | null | undefined,
  durationUnit: string | null | undefined,
  durationMonths: number | null | undefined,
  t?: TranslateDashboard,
): string {
  if (durationValue && durationUnit && ["day", "week", "month"].includes(durationUnit)) {
    const v = Math.max(1, Math.floor(durationValue));
    if (t) {
      const unitKey =
        durationUnit === "day"
          ? "profilDurationDays"
          : durationUnit === "week"
            ? "profilDurationWeeks"
            : "profilDurationMonths";
      return t(unitKey, { count: v });
    }
    return durationLabel(durationValue, durationUnit as TcfDurationUnit);
  }
  if (durationMonths) {
    if (t) return t("profilDurationMonths", { count: durationMonths });
    return `${durationMonths} mois`;
  }
  return "—";
}

export function formatDateFr(value?: string | null, locale?: AppLocale | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(localeToBcp47(locale), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeFr(value?: string | null, locale?: AppLocale | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(localeToBcp47(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
