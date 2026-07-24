/**
 * Passage de niveau cursus — helpers additifs.
 * Ne pas utiliser pour TCF / formation_courte.
 */

import {
  averageGradesOnScale,
  normalizeScore,
  weightedMean,
} from "@/app/utils/gradesCalc";

export type PassageDecision = "admis" | "redouble" | "ajourne";
export type CursusFeeMode = "uniforme" | "par_niveau";

export function isCursusFeeMode(raw: unknown): raw is CursusFeeMode {
  return raw === "uniforme" || raw === "par_niveau";
}

export function isPassageDecision(raw: unknown): raw is PassageDecision {
  return raw === "admis" || raw === "redouble" || raw === "ajourne";
}

export function passageDecisionLabelFr(raw: string | null | undefined): string {
  if (raw === "admis") return "Admis";
  if (raw === "redouble") return "Redouble";
  if (raw === "ajourne") return "Ajourné";
  return raw ? String(raw) : "—";
}

/** Motif obligatoire pour redouble / ajourne (min. 3 caractères). */
export function normalizePassageReason(
  decision: PassageDecision,
  raw: unknown,
): { ok: true; reason: string | null } | { ok: false; error: string } {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (decision === "redouble" || decision === "ajourne") {
    if (reason.length < 3) {
      return {
        ok: false,
        error: "Indiquez un motif (3 caractères minimum) pour cette décision.",
      };
    }
    return { ok: true, reason: reason.slice(0, 500) };
  }
  return { ok: true, reason: reason ? reason.slice(0, 500) : null };
}

/** Suggestion auto vs seuil. null = pas assez d'info. */
export function suggestPassage(
  moyenne: number | null,
  seuil: number | null | undefined,
): "admis" | "redouble" | null {
  if (moyenne === null || moyenne === undefined || Number.isNaN(moyenne)) return null;
  if (seuil === null || seuil === undefined || Number.isNaN(Number(seuil))) return null;
  return moyenne >= Number(seuil) ? "admis" : "redouble";
}

/** "2025-2026" → "2026-2027" ; sinon année civile courante / +1. */
export function nextAcademicYear(current: string | null | undefined): string {
  const raw = String(current || "").trim();
  const m = raw.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    return `${a + 1}-${b + 1}`;
  }
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  // Avant août → année N-1/N, sinon N/N+1
  const month = new Date().getMonth(); // 0-based
  if (month < 7) return `${y - 1}-${y}`;
  return `${y}-${y + 1}`;
}

type GradeInput = {
  filiere_matiere_id: string;
  score: number;
  max_score?: number | null;
  title?: string | null;
};

type MatiereInput = {
  id: string;
  coefficient: number;
  max_score: number;
  grade_weights?: Record<string, number> | null;
};

/**
 * Moyenne générale /20 : moyenne des notes par matière (barème matière),
 * puis moyenne pondérée des matières — même esprit que le bulletin.
 */
export function computeMoyenneGenerale(
  matieres: MatiereInput[],
  grades: GradeInput[],
): number | null {
  if (!matieres.length) return null;
  const byFm = new Map<string, GradeInput[]>();
  for (const g of grades) {
    const list = byFm.get(g.filiere_matiere_id) || [];
    list.push(g);
    byFm.set(g.filiere_matiere_id, list);
  }

  return weightedMean(
    matieres.map((m) => {
      const gs = byFm.get(m.id) || [];
      const avg = averageGradesOnScale(
        gs.map((g) => ({ score: g.score, max_score: g.max_score, title: g.title })),
        m.max_score,
        m.grade_weights,
      );
      if (avg === null) return { value: null as number | null, weight: m.coefficient };
      return {
        value: normalizeScore(avg, m.max_score > 0 ? m.max_score : 20, 20),
        weight: m.coefficient > 0 ? m.coefficient : 1,
      };
    }),
  );
}

/** Résout le tuition à appliquer selon le mode cursus (+ frais annexes). */
export function resolveCursusTuition(params: {
  feeMode: CursusFeeMode;
  filiereDefault: number | null;
  niveauTuition: number | null;
  /** Frais du payment_plan.fees (ex. frais d'inscription) */
  extraFees?: number;
}): number {
  const def = Number(params.filiereDefault) || 0;
  const niv = params.niveauTuition != null ? Number(params.niveauTuition) : null;
  const extras = Math.max(0, Math.round(Number(params.extraFees) || 0));
  let base = def;
  if (params.feeMode === "uniforme") base = def;
  else if (niv != null && !Number.isNaN(niv)) base = niv;
  return base + extras;
}
