/** Convertit un montant entier en français (ex. 150000 → « cent cinquante mille »). */
const UNITS = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = [
  "", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function underHundred(n) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    const base = t === 7 ? "soixante" : "quatre-vingt";
    const rest = n - (t === 7 ? 60 : 80);
    if (rest === 0) return t === 9 ? "quatre-vingts" : base;
    const joiner = (rest === 1 || rest === 11) && t === 7 ? " et " : "-";
    return `${base}${joiner}${underHundred(rest)}`;
  }
  if (t === 8) {
    if (u === 0) return "quatre-vingts";
    return `quatre-vingt-${UNITS[u]}`;
  }
  if (u === 0) return TENS[t];
  if (u === 1) return `${TENS[t]} et un`;
  return `${TENS[t]}-${UNITS[u]}`;
}

function underThousand(n) {
  if (n < 100) return underHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hundreds = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 && h > 1 ? "s" : ""}`;
  if (r === 0) return hundreds;
  return `${hundreds} ${underHundred(r)}`;
}

function chunkToWords(n) {
  if (n === 0) return "";
  return underThousand(n);
}

/**
 * Montant en toutes lettres + devise.
 * @example amountInWordsFr(150000) → "cent cinquante mille francs CFA"
 */
export function amountInWordsFr(amount) {
  let n = typeof amount === "string" ? Number(String(amount).replace(/\D/g, "")) : Math.floor(Number(amount) || 0);
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n === 0) return "zéro franc CFA";

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts = [];
  if (billions) {
    parts.push(billions === 1 ? "un milliard" : `${chunkToWords(billions)} milliards`);
  }
  if (millions) {
    parts.push(millions === 1 ? "un million" : `${chunkToWords(millions)} millions`);
  }
  if (thousands) {
    parts.push(thousands === 1 ? "mille" : `${chunkToWords(thousands)} mille`);
  }
  if (rest) parts.push(chunkToWords(rest));

  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${words} franc${n > 1 ? "s" : ""} CFA`;
}
