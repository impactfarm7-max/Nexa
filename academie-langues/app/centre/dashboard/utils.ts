import { ensureTcfCommunautePermission, filterModulePermissions } from "@/app/data/tcf-teaching-subjects";

const DASHBOARD_FULL_ACCESS_ROLES = new Set([
  "admin",
  "center_manager",
  "campus_manager",
  "manager",
]);

/**
 * Résout les modules visibles sur le dashboard pour un membre du personnel.
 * Les rôles de direction voient tout ; le staff/formateur voit uniquement ses modules.
 */
export function resolveDashboardModules(
  role: string | null | undefined,
  permissions: string[] | null | undefined,
  centerType: string | null | undefined,
): { canAccess: (...keys: string[]) => boolean; isFullAccess: boolean } {
  const isFullAccess = Boolean(role && DASHBOARD_FULL_ACCESS_ROLES.has(role));
  if (isFullAccess) {
    return { canAccess: () => true, isFullAccess: true };
  }
  const effective = new Set(
    ensureTcfCommunautePermission(filterModulePermissions(permissions || []), centerType),
  );
  return {
    canAccess: (...keys: string[]) => keys.some((k) => effective.has(k)),
    isFullAccess: false,
  };
}

export function getMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function fmtXAF(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("fr-FR");
}

export function fmtFCFA(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return neg ? `-${grouped}` : grouped;
}

export function greeting() {
  return new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
}

export function todayLabel() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type TcfStatusRow = {
  center_status?: string | null;
  tag_status?: string | null;
  access_status?: string;
};

export function tcfEffectiveStatus(s: TcfStatusRow): "pending" | "active" | "paused" | "inactive" | "expired" {
  const cs = s.center_status;
  const ts = s.tag_status;

  if (cs === "paused" || ts === "paused") return "paused";
  if (cs === "revoked" || ts === "revoque") return "inactive";
  if (cs === "pending_center_approval" || ts === "pending_center_approval") return "pending";
  if (cs === "active" || ts === "normal" || ts === "actif" || !ts) {
    return (s.access_status as "pending" | "active" | "paused" | "inactive" | "expired") || "active";
  }

  return (s.access_status as "pending" | "active" | "paused" | "inactive" | "expired") || "active";
}
