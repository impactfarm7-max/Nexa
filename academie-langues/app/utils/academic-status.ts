/** Statut académique université (parcours) — distinct de enrollments.status / center_status. */

export const ACADEMIC_STATUSES = [
  "inscrit",
  "redoublant",
  "suspendu",
  "diplome",
  "transfere",
] as const;

export type AcademicStatus = (typeof ACADEMIC_STATUSES)[number];

export function isAcademicStatus(raw: unknown): raw is AcademicStatus {
  return typeof raw === "string" && (ACADEMIC_STATUSES as readonly string[]).includes(raw);
}

export function normalizeAcademicStatus(raw: unknown): AcademicStatus | null {
  if (raw == null || raw === "") return null;
  return isAcademicStatus(raw) ? raw : null;
}

export function academicStatusLabel(
  raw: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const en = locale === "en";
  switch (raw) {
    case "inscrit":
      return en ? "Enrolled" : "Inscrit";
    case "redoublant":
      return en ? "Repeating" : "Redoublant";
    case "suspendu":
      return en ? "Suspended" : "Suspendu";
    case "diplome":
      return en ? "Graduated" : "Diplômé";
    case "transfere":
      return en ? "Transferred" : "Transféré";
    default:
      return raw ? String(raw) : "—";
  }
}

/** Notes / passages interdits (lecture seule scolarité). */
export function isAcademicStatusReadonly(raw: unknown): boolean {
  const s = normalizeAcademicStatus(raw);
  return s === "suspendu" || s === "diplome" || s === "transfere";
}

/** Défaut à la création d'une inscription univ cursus. */
export function defaultAcademicStatus(): AcademicStatus {
  return "inscrit";
}

/** Statut de la nouvelle fiche après décision de passage. */
export function academicStatusAfterPassage(
  decision: "admis" | "redouble" | "ajourne",
): AcademicStatus | null {
  if (decision === "redouble") return "redoublant";
  if (decision === "admis") return "inscrit";
  return null;
}
