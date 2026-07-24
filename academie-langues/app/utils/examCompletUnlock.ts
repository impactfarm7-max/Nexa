/**
 * Examen complet TCF : déblocage J+20 après activation, puis 1 crédit par
 * anniversaire mensuel du premier déblocage (plafonné par exam_4m_total / durée).
 */

export const EXAM_COMPLET_LOCK_DAYS = 20;

export type ExamCompletProfileInput = {
  activated_at?: string | null;
  created_at?: string | null;
  subscription_ends_at?: string | null;
  exam_4m_total?: number | null;
  exam_4m_used?: number | null;
};

export type ExamCompletAccess = {
  canUse: boolean;
  reason: string;
  firstUnlockAt: string | null;
  nextCycleAt: string | null;
  entitledCount: number;
  usedCount: number;
  creditsLeft: number;
  daysUntilFirstUnlock: number | null;
};

export function addCalendarMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function resolveActivatedAt(profile: ExamCompletProfileInput): Date {
  if (profile.activated_at) return new Date(profile.activated_at);
  if (profile.created_at) return new Date(profile.created_at);
  return new Date();
}

function formatFrDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Nombre de cycles ouverts (anniversaires passés, dans la durée d'abonnement). */
export function countEntitledExamCycles(
  firstUnlock: Date,
  now: Date,
  subEnd: Date | null,
  maxCycles: number,
): number {
  let count = 0;
  for (let i = 0; i < maxCycles; i++) {
    const cycleStart = i === 0 ? firstUnlock : addCalendarMonths(firstUnlock, i);
    if (cycleStart.getTime() > now.getTime()) break;
    if (subEnd && cycleStart.getTime() >= subEnd.getTime()) break;
    count++;
  }
  return count;
}

export function getFirstUnlockAt(profile: ExamCompletProfileInput): Date {
  const activated = resolveActivatedAt(profile);
  return new Date(activated.getTime() + EXAM_COMPLET_LOCK_DAYS * 86400000);
}

export function computeExamCompletAccess(
  profile: ExamCompletProfileInput,
  now: Date = new Date(),
): ExamCompletAccess {
  const used = profile.exam_4m_used ?? 0;
  const maxCycles = profile.exam_4m_total ?? 0;
  const firstUnlock = getFirstUnlockAt(profile);
  const subEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;

  const empty = (partial: Partial<ExamCompletAccess>): ExamCompletAccess => ({
    canUse: false,
    reason: "",
    firstUnlockAt: firstUnlock.toISOString(),
    nextCycleAt: null,
    entitledCount: 0,
    usedCount: used,
    creditsLeft: 0,
    daysUntilFirstUnlock: null,
    ...partial,
  });

  if (maxCycles === 9999) {
    if (subEnd && now.getTime() > subEnd.getTime()) {
      return empty({ reason: "Abonnement expiré." });
    }
    if (now.getTime() < firstUnlock.getTime()) {
      const daysLeft = Math.ceil((firstUnlock.getTime() - now.getTime()) / 86400000);
      return empty({
        reason: `Examen complet disponible dans ${daysLeft} jour(s).`,
        daysUntilFirstUnlock: daysLeft,
      });
    }
    return {
      canUse: true,
      reason: "Vous pouvez démarrer un examen complet.",
      firstUnlockAt: firstUnlock.toISOString(),
      nextCycleAt: null,
      entitledCount: 9999,
      usedCount: used,
      creditsLeft: 9999,
      daysUntilFirstUnlock: null,
    };
  }

  if (maxCycles <= 0) {
    return empty({ reason: "Pack incompatible avec l'examen complet." });
  }

  if (subEnd && now.getTime() > subEnd.getTime()) {
    return empty({ reason: "Abonnement expiré." });
  }

  if (now.getTime() < firstUnlock.getTime()) {
    const daysLeft = Math.ceil((firstUnlock.getTime() - now.getTime()) / 86400000);
    return empty({
      reason: `Examen complet disponible dans ${daysLeft} jour(s) (après validation + ${EXAM_COMPLET_LOCK_DAYS} jours).`,
      daysUntilFirstUnlock: daysLeft,
    });
  }

  const entitled = countEntitledExamCycles(firstUnlock, now, subEnd, maxCycles);
  const creditsLeft = Math.max(0, entitled - used);

  let nextCycleAt: Date | null = null;
  if (creditsLeft <= 0) {
    for (let i = entitled; i < maxCycles; i++) {
      const cycleStart = i === 0 ? firstUnlock : addCalendarMonths(firstUnlock, i);
      if (cycleStart.getTime() > now.getTime()) {
        if (!subEnd || cycleStart.getTime() < subEnd.getTime()) nextCycleAt = cycleStart;
        break;
      }
    }
  }

  if (creditsLeft <= 0) {
    return empty({
      entitledCount: entitled,
      creditsLeft: 0,
      nextCycleAt: nextCycleAt?.toISOString() ?? null,
      reason: nextCycleAt
        ? `Prochain accès le ${formatFrDate(nextCycleAt)}.`
        : "Crédits examen complet épuisés pour cette formation.",
    });
  }

  return {
    canUse: true,
    reason: "Vous pouvez démarrer un examen complet.",
    firstUnlockAt: firstUnlock.toISOString(),
    nextCycleAt: nextCycleAt?.toISOString() ?? null,
    entitledCount: entitled,
    usedCount: used,
    creditsLeft,
    daysUntilFirstUnlock: null,
  };
}
