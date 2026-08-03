export const TRAINER_DEFAULT_PERMISSIONS = Object.freeze([
  "cours",
  "communaute",
  "examens",
  "lives",
]);

export function resolveTrainerPermissions(stored) {
  if (!stored || stored.length === 0) {
    return [...TRAINER_DEFAULT_PERMISSIONS];
  }
  return [...stored];
}
