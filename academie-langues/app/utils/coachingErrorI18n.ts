/** Mappe les messages d'erreur API (souvent en FR) vers des clés dashboard. */
const COACHING_ERROR_KEYS: Array<{ match: RegExp; key: string }> = [
  { match: /lien de s[eé]ance invalide/i, key: "coachingRoomInvalidLink" },
  { match: /visioconf[eé]rence non configur/i, key: "coachingRoomVisioNotConfigured" },
  { match: /s[eé]ance introuvable/i, key: "coachingRoomNotFound" },
  { match: /rendez-vous introuvable/i, key: "coachingAppointmentNotFound" },
  { match: /cette s[eé]ance est en pr[eé]sentiel/i, key: "coachingRoomInPersonOnly" },
  { match: /pas de salle visio/i, key: "coachingRoomInPersonOnly" },
  { match: /acc[eè]s refus/i, key: "coachingRoomAccessDenied" },
  { match: /non autoris/i, key: "coachingRoomAccessDenied" },
  { match: /n'est pas confirm/i, key: "coachingRoomNotConfirmed" },
  { match: /n'est pas disponible/i, key: "coachingRoomNotAvailable" },
  { match: /a [eé]t[eé] annul/i, key: "coachingRoomCancelled" },
  { match: /ouvre 15 minutes/i, key: "coachingRoomOpens" },
  { match: /est termin[eé]e/i, key: "coachingRoomEnded" },
  { match: /date de s[eé]ance invalide/i, key: "coachingRoomInvalidDate" },
  { match: /date de rendez-vous invalide/i, key: "coachingRoomInvalidDate" },
  { match: /indiquez un motif \(3/i, key: "coachingErrorReasonMin" },
  { match: /indiquez un motif de report/i, key: "coachingErrorRescheduleFields" },
  { match: /impossible d'enregistrer le refus/i, key: "coachingErrorRefuse" },
  { match: /cr[eé]neau est d[eé]j[aà] r[eé]serv/i, key: "coachingSlotAlreadyTaken" },
  { match: /cr[eé]neau est occup/i, key: "coachingSlotBusyCollective" },
  { match: /quota coaching est [eé]puis/i, key: "coachingQuotaExhausted" },
  { match: /pack ne contient pas de coaching/i, key: "coachingPackMissing" },
  { match: /d[eé]j[aà] un rendez-vous/i, key: "coachingAlreadyBooked" },
  { match: /au moins 30 minutes/i, key: "coachingSlotTooSoon" },
  { match: /au moins 24h/i, key: "coachingCancelTooLate" },
  { match: /ne peut pas [eê]tre annul/i, key: "coachingCannotCancel" },
  { match: /ne peut pas [eê]tre report/i, key: "coachingCannotReschedule" },
  { match: /d[eé]j[aà] pass[eé]/i, key: "coachingAlreadyPast" },
  { match: /profil introuvable/i, key: "coachingProfileMissing" },
  { match: /impossible de rejoindre/i, key: "coachingRoomJoinError" },
];

const TITLE_FALLBACK_KEYS: Record<string, string> = {
  "Session Live": "coachingLiveTitle",
  "Coaching de groupe": "coachingGroupCoachingLabel",
  "Cours en ligne": "coachingOnlineCourse",
  Séance: "coachingSession",
};

export function coachingErrorKey(message: string | null | undefined): string | null {
  if (!message) return null;
  const hit = COACHING_ERROR_KEYS.find((entry) => entry.match.test(message));
  return hit?.key || null;
}

export function localizeCoachingError(
  message: string | null | undefined,
  t: (ns: "dashboard", key: string) => string,
  fallbackKey = "coachingErrorGeneric",
): string {
  const key = coachingErrorKey(message);
  if (key) return t("dashboard", key);
  if (message && message.trim()) return message;
  return t("dashboard", fallbackKey);
}

/** Si le titre API est un fallback FR générique, le localise ; sinon garde le titre centre. */
export function localizeCollectiveTitle(
  title: string | null | undefined,
  kind: "live" | "group",
  t: (ns: "dashboard", key: string) => string,
): string {
  const trimmed = (title || "").trim();
  if (trimmed && TITLE_FALLBACK_KEYS[trimmed]) {
    return t("dashboard", TITLE_FALLBACK_KEYS[trimmed]);
  }
  if (trimmed) return trimmed;
  return kind === "live"
    ? t("dashboard", "coachingLiveTitle")
    : t("dashboard", "coachingGroupCoachingLabel");
}
