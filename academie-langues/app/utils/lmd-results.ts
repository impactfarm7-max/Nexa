import { averageGradesOnScale, parseGradeWeights } from "./gradesCalc";
import { computeUeFinalStatus } from "./lmd-credits";

export type LmdGrade = { enrollment_id: string; filiere_matiere_id: string; score: number; max_score?: number | null; title?: string | null };
export type LmdUe = { id: string; semestre_id: string; niveau_id: string; credits: number; creditsConfigured?: boolean; max_score: number; grade_weights?: unknown; name?: string };

export function evaluateLmdUe(grades: Omit<LmdGrade, "enrollment_id" | "filiere_matiere_id">[], maxScore: number, weights: unknown, thresholdPct: number) {
  const isCatchup = (g: { title?: string | null }) => g.title?.trim().toLowerCase() === "rattrapage";
  const scale = maxScore > 0 ? maxScore : 20;
  return computeUeFinalStatus({
    normalScore: averageGradesOnScale(grades.filter(g => !isCatchup(g)), scale, parseGradeWeights(weights)),
    normalMaxScore: scale,
    rattrapageScore: averageGradesOnScale(grades.filter(isCatchup), scale),
    rattrapageMaxScore: scale,
    thresholdPct,
  });
}

/** An acquired UE is counted once, even after repeats; attempts are never averaged together. */
export function computeLmdProgress(ues: LmdUe[], grades: LmdGrade[], thresholdPct: number, currentNiveauId: string | null, pastSemesterIds: string[]) {
  const past = new Set(pastSemesterIds);
  const results = ues.map(ue => {
    const attempts = new Map<string, LmdGrade[]>();
    for (const grade of grades.filter(g => g.filiere_matiere_id === ue.id)) {
      attempts.set(grade.enrollment_id, [...(attempts.get(grade.enrollment_id) || []), grade]);
    }
    const attemptRows = [...attempts.values()];
    const isNormal = (g: LmdGrade) => g.title?.trim().toLowerCase() !== "rattrapage";
    const statuses = attemptRows.map(attempt => {
      // A later recovery can settle a historical failed UE without duplicating its original grades.
      const normal = attempt.some(isNormal) ? [] : attemptRows.find(rows => rows.some(isNormal))?.filter(isNormal) || [];
      return evaluateLmdUe([...normal, ...attempt], ue.max_score, ue.grade_weights, thresholdPct);
    });
    const validated = statuses.some(s => s.validated);
    const assessed = statuses.some(s => s.finalScore !== null);
    return { ...ue, validated, assessed, debt: past.has(ue.semestre_id) && assessed && !validated };
  });
  const sum = (rows: typeof results) => ({
    totalCredits: rows.reduce((n, ue) => n + ue.credits, 0),
    acquiredCredits: rows.filter(ue => ue.validated).reduce((n, ue) => n + ue.credits, 0),
    pendingCount: rows.filter(ue => !ue.assessed).length,
    failedCount: rows.filter(ue => ue.assessed && !ue.validated).length,
    unconfiguredCount: rows.filter(ue => ue.creditsConfigured === false).length,
  });
  const levelRows = results.filter(ue => ue.niveau_id === currentNiveauId);
  const level = sum(levelRows);
  const suggestion = !levelRows.length || level.pendingCount > 0 || level.unconfiguredCount > 0 ? null : level.failedCount ? "redouble" as const : "admis" as const;
  return { ...sum(results), level, suggestion, results, debts: results.filter(ue => ue.debt), complete: results.length > 0 && results.every(ue => ue.validated && ue.creditsConfigured !== false) };
}
