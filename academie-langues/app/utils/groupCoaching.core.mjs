// Logique pure du coaching groupe — sans accès DB, isomorphe (Node + bundler).
// Convention identique à coaching_sessions : offset horaire fixe +01:00.

const INDIV_DURATION_MS = 30 * 60000;

export function sessionToMs(sessionDate, sessionTime) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).getTime();
}

export function computeEndsAt(startMs, durationMin) {
  return startMs + durationMin * 60000;
}

export function isEligibleProfile(p) {
  const total = p?.coaching_total ?? 0;
  if (total <= 0) return false;
  if (p?.tag_status === "revoque" || p?.tag_status === "termine") return false;
  return true;
}

export function overlapsGroupWindow(indivStartMs, groupStartMs, groupEndMs, indivDurationMs = INDIV_DURATION_MS) {
  return indivStartMs < groupEndMs && indivStartMs + indivDurationMs > groupStartMs;
}

export function reminderDueMinutes(startMs, nowMs) {
  const minutesUntil = (startMs - nowMs) / 60000;
  return minutesUntil >= 0 && minutesUntil <= 15;
}
