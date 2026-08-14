/**
 * Types de centres NEXA.
 * - tcf_canada : formation native (contenu TCF) — face étudiante TCF complète
 * - formation_courte : shell staff type TCF ; face étudiante TCF allégée (plus tard)
 * - generic : formation pluri-annuelle — face étudiante adaptée (sans packs TCF)
 */
export const CENTER_TYPES = ["tcf_canada", "formation_courte", "generic"] as const;
export type CenterTypeCode = (typeof CENTER_TYPES)[number];

/** Mode d'expérience étudiante dérivé du type de centre. */
export type StudentExperienceMode = "tcf" | "tcf_light" | "pluriannual" | "b2c";

export function normalizeCenterType(
  raw: string | null | undefined,
): CenterTypeCode {
  if (raw === "tcf_canada") return "tcf_canada";
  if (raw === "formation_courte") return "formation_courte";
  return "generic";
}

export function isTcfCanadaCenter(centerType: string | null | undefined) {
  return centerType === "tcf_canada";
}

export function isFormationCourteCenter(centerType: string | null | undefined) {
  return centerType === "formation_courte";
}

export function isPluriannualCenter(centerType: string | null | undefined) {
  return normalizeCenterType(centerType) === "generic";
}

/** Shell staff proche TCF (natif + courte). Contenu / packs TCF = isTcfCanadaCenter uniquement. */
export function usesTcfLikeStaffShell(centerType: string | null | undefined) {
  return centerType === "tcf_canada" || centerType === "formation_courte";
}

/**
 * Expérience UI étudiante.
 * - sans centre → b2c
 * - tcf_canada → tcf
 * - formation_courte → tcf_light (même shell TCF, allégé plus tard)
 * - generic → pluriannual
 */
export function resolveStudentExperienceMode(
  centerId: string | null | undefined,
  centerType: string | null | undefined,
): StudentExperienceMode {
  if (!centerId) return "b2c";
  const type = normalizeCenterType(centerType);
  if (type === "tcf_canada") return "tcf";
  if (type === "formation_courte") return "tcf_light";
  return "pluriannual";
}

export function usesTcfStudentPacks(mode: StudentExperienceMode): boolean {
  return mode === "tcf" || mode === "tcf_light" || mode === "b2c";
}

export function centerTypeLabel(
  centerType: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const en = locale === "en";
  switch (normalizeCenterType(centerType)) {
    case "tcf_canada":
      return en ? "Native training" : "Formation native";
    case "formation_courte":
      return en ? "Short program" : "Formation courte";
    default:
      return en ? "Multi-year training" : "Formation pluri-annuelle";
  }
}
