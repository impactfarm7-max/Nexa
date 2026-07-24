export type ExamSessionResults = {
  ce_result?: { score?: number; total?: number; niveau?: string } | null;
  co_result?: { score?: number; total?: number; niveau?: string } | null;
  ee_result?: { note?: number; niveau?: string } | null;
  eo_result?: { tache1?: { note?: number }; tache2?: { note?: number }; tache3?: { note?: number } } | null;
};

const CECO_LEVEL_SCORE: Record<string, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, "B2+": 4.5, C1: 5, C2: 6,
};

function levelToPoints(level?: string | null): number {
  if (!level) return 0;
  return CECO_LEVEL_SCORE[level.toUpperCase()] ?? CECO_LEVEL_SCORE[level] ?? 0;
}

/** Score composite 0-100 pour classement centre */
export function computeExamCompositeScore(session: ExamSessionResults): number {
  const ce = session.ce_result;
  const co = session.co_result;
  const ee = session.ee_result;
  const eo = session.eo_result;

  let total = 0;
  let count = 0;

  if (ce?.score != null && ce?.total) {
    total += (Number(ce.score) / Number(ce.total)) * 25;
    count++;
  }
  if (co?.score != null && co?.total) {
    total += (Number(co.score) / Number(co.total)) * 25;
    count++;
  }
  if (ee?.note != null) {
    total += (Number(ee.note) / 20) * 25;
    count++;
  }
  if (eo) {
    const notes = [eo.tache1?.note, eo.tache2?.note, eo.tache3?.note].filter((n) => n != null) as number[];
    if (notes.length > 0) {
      total += (notes.reduce((a, b) => a + b, 0) / notes.length / 20) * 25;
      count++;
    }
  }

  if (count === 0) {
    const levels = [ce?.niveau, co?.niveau, ee?.niveau].map(levelToPoints);
    const avg = levels.filter((l) => l > 0);
    if (avg.length === 0) return 0;
    return Math.round((avg.reduce((a, b) => a + b, 0) / avg.length) * (100 / 6));
  }

  return Math.round(total);
}

export function computeMonthlyRankings(
  rows: Array<{ user_id: string; composite_score: number }>
) {
  const bestByUser = new Map<string, number>();
  for (const r of rows) {
    const prev = bestByUser.get(r.user_id) ?? 0;
    if (r.composite_score > prev) bestByUser.set(r.user_id, r.composite_score);
  }

  const scored = Array.from(bestByUser.entries())
    .map(([user_id, composite_score]) => ({ user_id, composite_score }))
    .sort((a, b) => b.composite_score - a.composite_score);

  const rankMap = new Map<string, { rank: number; total: number }>();
  let rank = 0;
  let prevScore: number | null = null;
  for (let i = 0; i < scored.length; i++) {
    if (prevScore === null || scored[i].composite_score !== prevScore) {
      rank = i + 1;
      prevScore = scored[i].composite_score;
    }
    rankMap.set(scored[i].user_id, { rank, total: scored.length });
  }
  return rankMap;
}
