/** Quota tuteur IA : défaut legacy + résolution depuis le profil. */

export const TUTOR_EXCHANGE_QUOTA = 15;

const STAFF_ROLES = new Set(["admin", "center_manager", "trainer", "superadmin"]);

/**
 * @param {{ role?: string | null, tutor_ia_total?: number | string | null, tutor_ia_used?: number | string | null } | null | undefined} profile
 */
export function resolveTutorQuota(profile) {
  const role = profile?.role ?? "student";
  const isAdmin = role === "admin";
  const hasAccess = Boolean(profile && !STAFF_ROLES.has(role));
  const unlimited = isAdmin;

  const usedRaw = Number(profile?.tutor_ia_used);
  const used = Number.isFinite(usedRaw) && usedRaw > 0 ? Math.trunc(usedRaw) : 0;

  if (unlimited) {
    return { hasAccess, unlimited: true, total: null, used: null, remaining: null, exhausted: false };
  }

  const totalRaw = profile?.tutor_ia_total;
  let total;
  if (totalRaw == null || totalRaw === "") {
    total = TUTOR_EXCHANGE_QUOTA;
  } else {
    const n = Number(totalRaw);
    total = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : TUTOR_EXCHANGE_QUOTA;
  }

  const remaining = Math.max(0, total - used);
  const exhausted = used >= total;

  return { hasAccess, unlimited: false, total, used, remaining, exhausted };
}
