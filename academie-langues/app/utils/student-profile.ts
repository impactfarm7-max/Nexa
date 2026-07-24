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

export function packDisplayName(pack: string | null | undefined): string {
  if (!pack) return "Pack Ivoire";
  const key = pack.toLowerCase();
  return PACK_LABELS[key] || `Pack ${pack}`;
}

export function computeAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? `${age} ans` : "—";
}

export function financeStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    pending: "À encaisser",
    current: "En cours",
    paid: "Soldé",
    late: "En retard",
    exempt: "Exonéré",
  };
  return map[status] || status;
}

export function centerAccessStatusLabel(
  centerStatus: string | null | undefined,
  tagStatus: string | null | undefined,
): string {
  const cs = centerStatus || "";
  const ts = tagStatus || "";
  if (cs === "paused" || ts === "paused") return "En pause";
  if (cs === "revoked" || ts === "revoque") return "Révoqué";
  if (cs === "pending_center_approval" || ts === "pending_center_approval") return "En attente";
  if (cs === "active" || ts === "normal") return "Actif";
  if (cs === "active") return "Actif";
  return "Inactif";
}

export function formatEnrollmentDuration(
  durationValue: number | null | undefined,
  durationUnit: string | null | undefined,
  durationMonths: number | null | undefined,
): string {
  if (durationValue && durationUnit && ["day", "week", "month"].includes(durationUnit)) {
    return durationLabel(durationValue, durationUnit as TcfDurationUnit);
  }
  if (durationMonths) return `${durationMonths} mois`;
  return "—";
}

export function formatDateFr(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeFr(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
