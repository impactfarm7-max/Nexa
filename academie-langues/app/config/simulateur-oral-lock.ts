/**
 * Blocage temporaire du simulateur oral (maintenance / refonte).
 * Passer ORAL_SIMULATOR_LOCKED à false pour rouvrir immédiatement.
 */
export const ORAL_SIMULATOR_LOCKED = false;

/** Fin du blocage — 2 jours à partir du 8 juil. 2026 (10h29 UTC+1) */
export const ORAL_SIMULATOR_UNLOCK_AT = "2026-07-10T10:29:00+01:00";

export function getOralSimulatorUnlockTime(): number {
  return new Date(ORAL_SIMULATOR_UNLOCK_AT).getTime();
}

export function isOralSimulatorLocked(now = Date.now()): boolean {
  if (!ORAL_SIMULATOR_LOCKED) return false;
  return now < getOralSimulatorUnlockTime();
}

export type OralSimulatorCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
};

export function getOralSimulatorCountdown(now = Date.now()): OralSimulatorCountdown | null {
  if (!isOralSimulatorLocked(now)) return null;

  const diffMs = Math.max(0, getOralSimulatorUnlockTime() - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  parts.push(`${pad(hours)}h`, `${pad(minutes)}m`, `${pad(seconds)}s`);

  return {
    days,
    hours,
    minutes,
    seconds,
    label: parts.join(" "),
  };
}
