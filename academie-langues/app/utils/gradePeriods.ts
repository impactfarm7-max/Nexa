/**
 * Types grade_periods alignés sur le CHECK Postgres :
 * semaine | mois | trimestre | semestre | annee | autre
 *
 * Rôle métier :
 * - groupes (moyenne auto) : trimestre, semestre, annee, mois, semaine
 * - saisie de notes (feuilles) : autre
 * - legacy app (si jamais présent) : evaluation / aggregate
 */

export const GRADE_PERIOD_DB_TYPES = [
  "semaine",
  "mois",
  "trimestre",
  "semestre",
  "annee",
  "autre",
] as const;

export type GradePeriodDbType = (typeof GRADE_PERIOD_DB_TYPES)[number];

/** Types qui regroupent des sous-périodes (moyenne automatique) */
export const GRADE_PERIOD_GROUP_TYPES: readonly string[] = [
  "trimestre",
  "semestre",
  "annee",
  "mois",
  "semaine",
  "aggregate", // legacy UI
];

/** Types où l’on saisit des notes */
export const GRADE_PERIOD_LEAF_TYPES: readonly string[] = [
  "autre",
  "evaluation", // legacy UI
];

export function isGradeGroupPeriod(type: string): boolean {
  return GRADE_PERIOD_GROUP_TYPES.includes(type);
}

export function isGradeLeafPeriod(type: string): boolean {
  if (GRADE_PERIOD_LEAF_TYPES.includes(type)) return true;
  // Tout ce qui n’est pas un groupe connu = feuille (sécurité)
  return !isGradeGroupPeriod(type);
}
