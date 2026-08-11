/**
 * Essai centres : 7 jours (trial_ends_at).
 * Legacy : 72h depuis created_at (pour centres sans trial_ends_at).
 */
export const CENTER_TRIAL_DAYS = 7;
export const CENTER_TRIAL_MS = CENTER_TRIAL_DAYS * 24 * 60 * 60 * 1000;

// Legacy compat
export const CENTER_TRIAL_HOURS = 72;

export type CenterOperationalInput = {
  status?: string | null;
  created_at?: string | null;
  trial_ends_at?: string | null;
  renewal_at?: string | null;
};

export type CenterAccessState = "full" | "trial" | "readonly" | "blocked";

/** Temps restant (ms) avant la fin de l'essai. 0 si expiré. */
export function centerTrialRemainingMs(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, CENTER_TRIAL_MS - elapsed);
}

function isTrialActive(center: CenterOperationalInput): boolean {
  if (center.trial_ends_at) {
    return new Date(center.trial_ends_at) > new Date();
  }
  return centerTrialRemainingMs(center.created_at) > 0;
}

/**
 * Résout l'état d'accès d'un centre :
 * - blocked : révoqué (rejected)
 * - readonly : pause (suspended), essai expiré, abonnement expiré
 * - trial : essai actif (IA désactivée)
 * - full : actif avec abonnement valide
 */
export function resolveCenterAccess(center: CenterOperationalInput | null | undefined): CenterAccessState {
  if (!center) return "blocked";
  if (center.status === "rejected") return "blocked";
  if (center.status === "suspended") return "readonly";
  if (center.status === "pending") {
    return isTrialActive(center) ? "trial" : "readonly";
  }
  // active or expired
  if (center.status === "expired") return "readonly";
  if (center.renewal_at && new Date(center.renewal_at) <= new Date()) return "readonly";
  return "full";
}

/**
 * Legacy compat — un centre est opérationnel si pas blocked ni readonly.
 */
export function isCenterOperational(center: CenterOperationalInput | null | undefined): boolean {
  const state = resolveCenterAccess(center);
  return state === "full" || state === "trial";
}
