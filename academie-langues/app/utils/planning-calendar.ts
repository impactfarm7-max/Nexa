/** Début de journée en heure locale (évite les décalages UTC). */
export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** true si la date calendaire est strictement avant aujourd'hui (local). */
export function isPastCalendarDay(d: Date): boolean {
  return startOfLocalDay(d).getTime() < startOfLocalDay(new Date()).getTime();
}

export function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
