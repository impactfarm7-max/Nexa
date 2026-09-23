import { isAcademicStatusReadonly } from "./academic-status";

export type ImportUpsertEnrollment = {
  id: string;
  status: string | null;
  filiere_id: string | null;
  groupe_id?: string | null;
  passage_decision?: string | null;
  academic_status?: string | null;
  academic_year?: string | null;
};

function yearKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (!m) return s;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b !== a + 1) return s;
  return `${a}-${b}`;
}

/**
 * Choisit l'inscription à mettre à jour lors d'un import par matricule.
 * - Même filière uniquement
 * - Même année scolaire si fournie (sinon préfère active/draft)
 * - active/draft sans passage_decision
 * - refuse une fiche active/draft en lecture seule (suspendu/diplôme/transféré)
 * - sinon null → création d'une nouvelle inscription
 */
export function pickEnrollmentForImportUpsert(
  enrollments: ImportUpsertEnrollment[],
  filiereId: string,
  academicYear?: string | null,
): { target: ImportUpsertEnrollment | null; refuseReadonly: boolean } {
  const sameFiliere = enrollments.filter((e) => e.filiere_id === filiereId);
  const isEditableStatus = (s: string | null | undefined) => s === "active" || s === "draft";
  const wantYear = academicYear ? yearKey(academicYear) : null;

  const yearMatch = (e: ImportUpsertEnrollment) => {
    if (!wantYear) return true;
    const ey = yearKey(e.academic_year);
    return ey === wantYear;
  };

  const pool = wantYear ? sameFiliere.filter(yearMatch) : sameFiliere;

  let target =
    pool.find((e) => e.status === "active")
    || pool.find((e) => e.status === "draft")
    || null;

  // Année fournie mais aucune fiche de cette année → nouvelle inscription
  if (wantYear && !target) {
    return { target: null, refuseReadonly: false };
  }

  if (target && isAcademicStatusReadonly(target.academic_status)) {
    if (isEditableStatus(target.status)) {
      return { target: null, refuseReadonly: true };
    }
    target = null;
  }

  if (
    target
    && (
      !isEditableStatus(target.status)
      || Boolean(target.passage_decision)
    )
  ) {
    target = null;
  }

  return { target, refuseReadonly: false };
}

/** Promo valide : même filière, et niveau cohérent si la promo a un niveau. */
export function isGroupeValidForPlacement(opts: {
  groupeFiliereId: string | null | undefined;
  groupeNiveauId: string | null | undefined;
  filiereId: string;
  niveauId: string | null | undefined;
}): boolean {
  if (opts.groupeFiliereId !== opts.filiereId) return false;
  if (opts.groupeNiveauId && opts.niveauId && opts.groupeNiveauId !== opts.niveauId) {
    return false;
  }
  return true;
}
