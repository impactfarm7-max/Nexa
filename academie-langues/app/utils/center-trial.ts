/**
 * Regle d'essai pour les centres crees en libre-service (/ouvrir-centre) :
 * un centre "pending" peut explorer la plateforme pendant 72h avant d'etre
 * bloque jusqu'a validation NEXA (passage en status "active" via /superadmin).
 */
export const CENTER_TRIAL_HOURS = 72;
export const CENTER_TRIAL_MS = CENTER_TRIAL_HOURS * 60 * 60 * 1000;

export type CenterOperationalInput = {
  status?: string | null;
  created_at?: string | null;
};

/** Temps restant (ms) avant la fin de l'essai. 0 si expire ou statut non concerne. */
export function centerTrialRemainingMs(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, CENTER_TRIAL_MS - elapsed);
}

/**
 * Un centre est operationnel (staff + etudiants peuvent l'utiliser) si :
 * - son statut est "active", ou
 * - son statut est "pending" ET il reste du temps d'essai (< 72h depuis creation).
 * Tout le reste (suspended, pending expire, valeur inconnue) => bloque.
 */
export function isCenterOperational(center: CenterOperationalInput | null | undefined): boolean {
  if (!center) return false;
  if (center.status === "active") return true;
  if (center.status === "pending") return centerTrialRemainingMs(center.created_at) > 0;
  return false;
}
