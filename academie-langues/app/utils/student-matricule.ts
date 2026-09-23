/** Helpers matricule purs (utilisables client + serveur). */

export const DEFAULT_STUDENT_ID_PREFIX = "ETU";

export function isUniversityCenter(centerType: string | null | undefined): boolean {
  return centerType === "universite";
}

export function resolveStudentIdPrefix(rawPrefix: string | null | undefined): string {
  return rawPrefix?.trim() || DEFAULT_STUDENT_ID_PREFIX;
}

/**
 * Université : préfixe institutionnel obligatoire (pas de fallback silencieux ETU).
 * Autres centres : comportement historique (ETU si vide).
 */
export function resolveStudentIdPrefixForCenter(
  rawPrefix: string | null | undefined,
  centerType: string | null | undefined,
): string {
  const trimmed = rawPrefix?.trim() || "";
  if (isUniversityCenter(centerType)) {
    if (!trimmed) {
      throw new Error("MATRICULE_PREFIX_REQUIRED");
    }
    return trimmed;
  }
  return trimmed || DEFAULT_STUDENT_ID_PREFIX;
}

export function formatMatricule(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Si `matricule` correspond exactement au format {prefix}-{annee}-{seq},
 * renvoie l'annee et le seq extraits. Sinon null.
 */
export function parseMatriculeForPrefix(
  matricule: string,
  prefix: string,
): { year: number; seq: number } | null {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d{4})-(\\d{4})$`);
  const match = pattern.exec(matricule.trim());
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

/** Bloque l'impression officielle sans matricule (documents scolarité univ). */
export function assertMatriculeForOfficialDocument(
  matricule: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const m = (matricule || "").trim();
  if (!m) {
    throw new Error(
      locale === "en"
        ? "Institutional student ID is required before printing. Assign a matricule first."
        : "Matricule institutionnel obligatoire avant impression. Attribuez un matricule à l'étudiant.",
    );
  }
  return m;
}
