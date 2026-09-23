/** Statut de délibération d'une note. */
export type GradeDeliberationStatus = "provisional" | "validated";

/**
 * - `provisional` explicite → provisoire
 * - `validated` ou null/vide (héritage avant colonne status) → validé
 * - toute autre valeur → provisoire (évite de bloquer sur un garbage « validé »)
 */
export function normalizeGradeStatus(raw: unknown): GradeDeliberationStatus {
  if (raw === "provisional") return "provisional";
  if (raw === "validated" || raw == null || raw === "") return "validated";
  return "provisional";
}

/** Compte pour crédits / relevé officiel / passage. */
export function isOfficialGrade(status: unknown): boolean {
  return normalizeGradeStatus(status) === "validated";
}

export function filterOfficialGrades<T extends { status?: string | null }>(grades: T[]): T[] {
  return grades.filter((g) => isOfficialGrade(g.status));
}
