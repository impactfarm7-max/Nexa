/**
 * Types de centres NEXA.
 * - tcf_canada : formation native (contenu TCF) — face étudiante TCF complète
 * - generic : centre libre pouvant proposer des cursus longs et des formations courtes
 *
 * `formation_courte` reste accepté en entrée comme ancienne valeur de base de données,
 * mais est normalisé en `generic`. Une formation courte est un type de programme,
 * pas un type de centre.
 */
export const CENTER_TYPES = ["tcf_canada", "generic"] as const;
export type CenterTypeCode = (typeof CENTER_TYPES)[number];

/** Mode d'expérience étudiante dérivé du type de centre. */
export type StudentExperienceMode = "tcf" | "pluriannual" | "b2c";

export function normalizeCenterType(
  raw: string | null | undefined,
): CenterTypeCode {
  if (raw === "tcf_canada") return "tcf_canada";
  return "generic";
}

export function isTcfCanadaCenter(centerType: string | null | undefined) {
  return centerType === "tcf_canada";
}

export function isFormationCourteCenter(centerType: string | null | undefined) {
  return false;
}

export function isPluriannualCenter(centerType: string | null | undefined) {
  return normalizeCenterType(centerType) === "generic";
}

/** Seul un centre TCF Canada utilise le shell staff TCF. */
export function usesTcfLikeStaffShell(centerType: string | null | undefined) {
  return centerType === "tcf_canada";
}

/**
 * Expérience UI étudiante.
 * - sans centre → b2c
 * - tcf_canada → tcf
 * - generic, y compris l'ancienne valeur formation_courte → pluriannual
 */
export function resolveStudentExperienceMode(
  centerId: string | null | undefined,
  centerType: string | null | undefined,
): StudentExperienceMode {
  if (!centerId) return "b2c";
  const type = normalizeCenterType(centerType);
  if (type === "tcf_canada") return "tcf";
  return "pluriannual";
}

export function usesTcfStudentPacks(mode: StudentExperienceMode): boolean {
  return mode === "tcf" || mode === "b2c";
}

export function centerTypeLabel(
  centerType: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const en = locale === "en";
  switch (normalizeCenterType(centerType)) {
    case "tcf_canada":
      return en ? "Native training" : "Formation native";
    default:
      return en ? "Independent training center" : "Centre de formation libre";
  }
}
