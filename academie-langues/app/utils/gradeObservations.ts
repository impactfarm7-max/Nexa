/**
 * Observations génériques bulletin (/20) — affichage uniquement, pas en DB.
 * V1 : grille NEXA fixe. V2 éventuel : paramétrage centre.
 */

export type ObservationBand = {
  /** Inclure min (note /20) */
  min: number;
  /** Exclure max, sauf dernière bande */
  maxExclusive: number | null;
  label: string;
};

/** <10 Insuffisant · 10–12 Passable · 12–15 Assez bien · 15–17 Bien · ≥17 Très bien */
export const DEFAULT_OBSERVATION_BANDS: ObservationBand[] = [
  { min: 0, maxExclusive: 10, label: "Insuffisant" },
  { min: 10, maxExclusive: 12, label: "Passable" },
  { min: 12, maxExclusive: 15, label: "Assez bien" },
  { min: 15, maxExclusive: 17, label: "Bien" },
  { min: 17, maxExclusive: null, label: "Très bien" },
];

/** Note déjà ramenée sur /20. */
export function observationFromScore20(
  score20: number | null | undefined,
  bands: ObservationBand[] = DEFAULT_OBSERVATION_BANDS,
): string {
  if (score20 === null || score20 === undefined || Number.isNaN(Number(score20))) {
    return "—";
  }
  const n = Number(score20);
  for (const b of bands) {
    if (n < b.min) continue;
    if (b.maxExclusive === null || n < b.maxExclusive) return b.label;
  }
  return bands[bands.length - 1]?.label || "—";
}

/** Affiche une liste de notes « 12/20 » ou « Devoir 1 : 14/20 ». */
export function formatGradeList(
  grades: { score: number; max_score?: number | null; title?: string | null }[],
  opts?: { withTitle?: boolean },
): string {
  if (!grades.length) return "—";
  const withTitle = opts?.withTitle !== false;
  return grades
    .map((g) => {
      const max = g.max_score && g.max_score > 0 ? g.max_score : 20;
      const scoreStr = `${g.score}/${max}`;
      const t = g.title?.trim();
      if (withTitle && t) return `${t} : ${scoreStr}`;
      return scoreStr;
    })
    .join(" · ");
}
