export const TUTOR_LOCK_DAYS = 10;

/** Date ISO 8601 — ex. 2026-07-16T00:00:00+01:00. Vide = tuteur ouvert (NEXA). */
export function getGlobalTutorLaunchAt(): Date | null {
  const raw = process.env.NEXT_PUBLIC_TUTOR_LAUNCH_AT?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TutorLockState = {
  locked: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  unlockAt: string | null;
  unlockDateLabel: string;
  countdownLabel: string;
};

const EMPTY_LOCK: TutorLockState = {
  locked: false,
  daysRemaining: 0,
  hoursRemaining: 0,
  minutesRemaining: 0,
  secondsRemaining: 0,
  unlockAt: null,
  unlockDateLabel: "—",
  countdownLabel: "",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Libellé badge nav : « Bientôt » sans date, sinon J-n ou countdown court.
 * Logique alignée sur `tutor-unlock.core.mjs` (tests). */
export function getTutorLockBadgeLabel(lock: TutorLockState): string {
  if (!lock.locked) return "";
  if (!lock.unlockAt) return "Bientôt";
  if (lock.daysRemaining > 0) return `J-${lock.daysRemaining}`;
  if (lock.hoursRemaining > 0) {
    return `${pad2(lock.hoursRemaining)}h${pad2(lock.minutesRemaining)}`;
  }
  return lock.countdownLabel || "Bientôt";
}

function formatUnlockLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Verrou global optionnel via NEXT_PUBLIC_TUTOR_LAUNCH_AT. Sans date : tuteur ouvert. */
export function getGlobalTutorLockState(bypass = false): TutorLockState {
  if (bypass) return EMPTY_LOCK;

  const launch = getGlobalTutorLaunchAt();
  if (!launch) return EMPTY_LOCK;

  const msLeft = launch.getTime() - Date.now();
  const unlockDateLabel = formatUnlockLabel(launch);

  if (msLeft <= 0) {
    return {
      ...EMPTY_LOCK,
      unlockAt: launch.toISOString(),
      unlockDateLabel,
    };
  }

  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    locked: true,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    secondsRemaining: seconds,
    unlockAt: launch.toISOString(),
    unlockDateLabel,
    countdownLabel: `${days}j ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`,
  };
}

/** @deprecated Conservé pour l'activation centre — le verrou affiché utilise getGlobalTutorLockState. */
export function computeTutorUnlockAt(startDate: string | Date): string {
  const start = new Date(startDate);
  return new Date(start.getTime() + TUTOR_LOCK_DAYS * 86400000).toISOString();
}

/** @deprecated Utiliser getGlobalTutorLockState pour l'UI étudiant. */
export function getTutorUnlockState(unlockAt: string | null | undefined): TutorLockState {
  if (!unlockAt) return EMPTY_LOCK;

  const unlock = new Date(unlockAt);
  const msLeft = unlock.getTime() - Date.now();
  if (msLeft <= 0) {
    return { ...EMPTY_LOCK, unlockAt: unlock.toISOString(), unlockDateLabel: formatUnlockLabel(unlock) };
  }

  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    locked: true,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    secondsRemaining: seconds,
    unlockAt: unlock.toISOString(),
    unlockDateLabel: formatUnlockLabel(unlock),
    countdownLabel: `${days}j ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`,
  };
}
