const SYSTEM_NOTIFICATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Nouvelle séance programmée/gi, "New session scheduled"],
  [/Séance annulée/gi, "Session cancelled"],
  [/Séance reportée/gi, "Session rescheduled"],
  [/Session Live annulée/gi, "Live Session cancelled"],
  [/Session Live modifiée/gi, "Live Session updated"],
  [/Nouvelle Session Live/gi, "New Live Session"],
  [/nouvelle date/gi, "new date"],
  [/Présentiel/gi, "In person"],
  [/En ligne/gi, "Online"],
  [/Rejoindre\s*:/gi, "Join:"],
];

const FRENCH_DATE_WORDS: Record<string, string> = {
  lundi: "Monday",
  mardi: "Tuesday",
  mercredi: "Wednesday",
  jeudi: "Thursday",
  vendredi: "Friday",
  samedi: "Saturday",
  dimanche: "Sunday",
  janvier: "January",
  février: "February",
  fevrier: "February",
  mars: "March",
  avril: "April",
  mai: "May",
  juin: "June",
  juillet: "July",
  août: "August",
  aout: "August",
  septembre: "September",
  octobre: "October",
  novembre: "November",
  décembre: "December",
  decembre: "December",
};

/** Traduit uniquement les modèles système connus. Les titres et noms saisis par le centre restent intacts. */
export function localizeNotificationMessage(message: string, locale: string): string {
  if (!message) return message;

  let localized = message;
  if (locale === "en") {
    for (const [pattern, replacement] of SYSTEM_NOTIFICATION_REPLACEMENTS) {
      localized = localized.replace(pattern, replacement);
    }

    localized = localized.replace(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/gi,
      (word) => FRENCH_DATE_WORDS[word.toLowerCase()] || word,
    );
  }

  localized = localized.replace(/\s+—\s+/g, ": ");

  return localized;
}
