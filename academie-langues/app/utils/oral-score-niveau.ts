export const ORAL_SCORE_NIVEAU_BARME = `BARÈME OFFICIEL /20 → Niveau CECRL (identique pour les 3 tâches) :
- 0 à 4 : A1
- 5 à 7 : A2
- 7 à 10 : B1
- 11 à 13 : B2
- 14 à 17 : C1
- 18 à 20 : C2

Le champ "niveau" doit correspondre STRICTEMENT à la note attribuée selon ce barème.`;

export function parseNoteSur20(note: string): number | null {
  const trimmed = note.trim();
  const match = trimmed.match(/(\d+(?:[.,]\d+)?)\s*\/\s*20/i);
  if (match) {
    const value = Number.parseFloat(match[1].replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatNoteSur20(note: string): string {
  const score = parseNoteSur20(note);
  if (score === null) return "0/20";
  const clamped = Math.max(0, Math.min(20, Math.round(score)));
  return `${clamped}/20`;
}

/** Score 7 → B1 (début de la tranche B1 selon le barème TCF oral). */
export function scoreToNiveauOral(score: number): string {
  const s = Math.max(0, Math.min(20, Math.round(score)));

  if (s <= 4) return "A1";
  if (s <= 6) return "A2";
  if (s <= 10) return "B1";
  if (s <= 13) return "B2";
  if (s <= 17) return "C1";
  return "C2";
}

export function niveauFromNote(note: string): string | null {
  const score = parseNoteSur20(note);
  if (score === null) return null;
  return scoreToNiveauOral(score);
}
