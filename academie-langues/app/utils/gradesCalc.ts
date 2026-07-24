/** Clé de pondération pour la note principale (title null). */
export const PRINCIPAL_WEIGHT_KEY = "__principal__";

/** Normalise une note vers une échelle cible (ex. /20). */
export function normalizeScore(
  score: number,
  maxScore: number,
  targetScale = 20,
): number {
  const max = maxScore > 0 ? maxScore : targetScale;
  return (score / max) * targetScale;
}

/** Moyenne pondérée ; ignore les valeurs null. */
export function weightedMean(
  items: { value: number | null | undefined; weight?: number }[],
): number | null {
  let sum = 0;
  let wSum = 0;
  for (const it of items) {
    if (it.value === null || it.value === undefined || Number.isNaN(it.value)) continue;
    const w = it.weight && it.weight > 0 ? it.weight : 1;
    sum += it.value * w;
    wSum += w;
  }
  if (wSum <= 0) return null;
  return Math.round((sum / wSum) * 100) / 100;
}

/** Moyenne simple. */
export function simpleMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function isPrincipalGrade(title: string | null | undefined): boolean {
  return !title || !String(title).trim();
}

/** Clé de poids pour une note (principale ou intitulé supl.). */
export function gradeWeightKey(title: string | null | undefined): string {
  return isPrincipalGrade(title) ? PRINCIPAL_WEIGHT_KEY : String(title).trim();
}

/** Parse filiere_matieres.grade_weights — null = moyenne simple (égal). */
export function parseGradeWeights(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function hasCustomGradeWeights(
  weights: Record<string, number> | null | undefined,
): boolean {
  return !!weights && Object.keys(weights).length > 0;
}

/**
 * Moyenne d’un ensemble de notes (principale + supl.) ramenées au barème matière.
 * Si `weights` est fourni : pondération par intitulé, renormalisée sur les notes présentes.
 * Sinon : moyenne simple (notes) / N.
 */
export function averageGradesOnScale(
  grades: { score: number; max_score?: number | null; title?: string | null }[],
  subjectMaxScore: number,
  weights?: Record<string, number> | null,
): number | null {
  if (grades.length === 0) return null;
  const scale = subjectMaxScore > 0 ? subjectMaxScore : 20;
  const normalized = grades.map((g) => ({
    value: normalizeScore(
      g.score,
      g.max_score && g.max_score > 0 ? g.max_score : scale,
      scale,
    ),
    key: gradeWeightKey(g.title),
  }));

  if (!hasCustomGradeWeights(weights)) {
    return simpleMean(normalized.map((n) => n.value));
  }

  const items = normalized.map((n) => ({
    value: n.value,
    weight: weights![n.key] ?? 0,
  }));
  if (!items.some((it) => it.weight > 0)) {
    return simpleMean(normalized.map((n) => n.value));
  }
  return weightedMean(items);
}

/** Ton visuel d’une note selon % du barème (≥50 % ok, 40–50 % ambre, sinon rouge). */
export type ScoreTone = "empty" | "ok" | "warn" | "bad";

export function scoreTone(
  score: number | null | undefined,
  maxScore: number,
): ScoreTone {
  if (score === null || score === undefined || Number.isNaN(score)) return "empty";
  const max = maxScore > 0 ? maxScore : 20;
  const pct = score / max;
  if (pct >= 0.5) return "ok";
  if (pct >= 0.4) return "warn";
  return "bad";
}

export function scoreToneClasses(tone: ScoreTone, dirty = false): string {
  if (dirty) return "border-amber-400 bg-amber-50 text-amber-900";
  switch (tone) {
    case "ok":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "warn":
      return "border-amber-300 bg-amber-50/80 text-amber-800";
    case "bad":
      return "border-red-300 bg-red-50 text-red-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
  }
}

export function scoreToneTextClass(tone: ScoreTone): string {
  switch (tone) {
    case "ok":
      return "text-emerald-700";
    case "warn":
      return "text-amber-700";
    case "bad":
      return "text-red-600";
    default:
      return "text-neutral-400";
  }
}
