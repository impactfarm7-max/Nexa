/** Seuil de validation LMD (%) — null en base = 50 par defaut. */
export function resolveLmdValidationThreshold(raw: number | null | undefined): number {
  return raw === null || raw === undefined ? 50 : raw;
}

/** Reconnait la colonne de note "Rattrapage" (insensible casse/espaces). */
export function isRattrapageGrade(title: string | null | undefined): boolean {
  if (!title) return false;
  return title.trim().toLowerCase() === "rattrapage";
}

function toPct(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  return (score / maxScore) * 100;
}

/**
 * Statut final d'une UE pour un etudiant : validation UE par UE, sans
 * compensation avec d'autres UE. Le rattrapage ne remplace la note
 * normale que s'il atteint lui-meme le seuil ; sinon la note normale
 * (echouee) reste affichee telle quelle.
 */
export function computeUeFinalStatus(params: {
  normalScore: number | null;
  normalMaxScore: number;
  rattrapageScore: number | null;
  rattrapageMaxScore: number;
  thresholdPct: number;
}): { finalScore: number | null; finalMaxScore: number; validated: boolean } {
  const { normalScore, normalMaxScore, rattrapageScore, rattrapageMaxScore, thresholdPct } = params;

  if (normalScore === null) {
    return { finalScore: null, finalMaxScore: normalMaxScore, validated: false };
  }

  const normalPct = toPct(normalScore, normalMaxScore);
  if (normalPct >= thresholdPct) {
    return { finalScore: normalScore, finalMaxScore: normalMaxScore, validated: true };
  }

  if (rattrapageScore !== null) {
    const rattrapagePct = toPct(rattrapageScore, rattrapageMaxScore);
    if (rattrapagePct >= thresholdPct) {
      return { finalScore: rattrapageScore, finalMaxScore: rattrapageMaxScore, validated: true };
    }
  }

  return { finalScore: normalScore, finalMaxScore: normalMaxScore, validated: false };
}

/** Resume credits acquis/total pour un etudiant sur un ensemble d'UE. */
export function computeCreditsStatus(
  ues: { filiere_matiere_id: string; credits: number }[],
  statuses: { filiere_matiere_id: string; validated: boolean }[],
): {
  totalCredits: number;
  acquiredCredits: number;
  validatedUeIds: string[];
  pendingUeIds: string[];
} {
  const validatedSet = new Set(statuses.filter((s) => s.validated).map((s) => s.filiere_matiere_id));
  const totalCredits = ues.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);
  const validatedUeIds: string[] = [];
  const pendingUeIds: string[] = [];
  let acquiredCredits = 0;
  for (const u of ues) {
    if (validatedSet.has(u.filiere_matiere_id)) {
      validatedUeIds.push(u.filiere_matiere_id);
      acquiredCredits += Number(u.credits) || 0;
    } else {
      pendingUeIds.push(u.filiere_matiere_id);
    }
  }
  return { totalCredits, acquiredCredits, validatedUeIds, pendingUeIds };
}
