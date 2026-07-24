const TIME_OFFSET = "+01:00";

export function collectiveRoomName(slotId: string, sessionDate: string) {
  return `tcf-collective-${slotId}-${sessionDate}`;
}

export function collectiveJoinPath(slotId: string, sessionDate: string) {
  return `/tcf-canada/live/room/${slotId}?date=${sessionDate}`;
}

export function sessionStartMs(sessionDate: string, startTime: string) {
  return new Date(`${sessionDate}T${startTime.slice(0, 5)}:00${TIME_OFFSET}`).getTime();
}

export function sessionEndMs(sessionDate: string, endTime: string) {
  return new Date(`${sessionDate}T${endTime.slice(0, 5)}:00${TIME_OFFSET}`).getTime();
}

/** Fenêtre cron (5 min) : envoyer si minutesUntil ∈ ]target-window, target] */
export function reminderDueAtMinutes(
  startMs: number,
  nowMs: number,
  targetMinutes: number,
  windowMinutes = 5
) {
  const minutesUntil = (startMs - nowMs) / 60000;
  return minutesUntil >= 0 && minutesUntil <= targetMinutes && minutesUntil > targetMinutes - windowMinutes;
}

export const JOIN_BEFORE_MS = 15 * 60 * 1000;
export const ALLOWED_REMINDER_MINUTES = [15, 30, 120] as const;
export type ReminderMinutes = (typeof ALLOWED_REMINDER_MINUTES)[number];

export function normalizeReminderMinutes(value: unknown): ReminderMinutes {
  const n = Number(value);
  if (ALLOWED_REMINDER_MINUTES.includes(n as ReminderMinutes)) return n as ReminderMinutes;
  return 120;
}
