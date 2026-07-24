export function sessionToMs(sessionDate: string, sessionTime: string): number;
export function computeEndsAt(startMs: number, durationMin: number): number;
export function isEligibleProfile(p: { coaching_total?: number | null; tag_status?: string | null }): boolean;
export function overlapsGroupWindow(
  indivStartMs: number,
  groupStartMs: number,
  groupEndMs: number,
  indivDurationMs?: number
): boolean;
export function reminderDueMinutes(startMs: number, nowMs: number): boolean;
