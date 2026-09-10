/** Session de visite publique en lecture seule (bouton "Visiter" landing). */

export const VISIT_MODE_KEY = "nexa_visit_mode";
export const VISIT_MODE_EVENT = "nexa-visit-mode";

export type VisitModeState = {
  centerKind: "libre" | "tcf";
  viewAs: "center" | "student";
  centerName: string;
  startedAt: string;
};

export function readVisitMode(): VisitModeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VISIT_MODE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitModeState;
    if (!parsed?.centerKind || !parsed?.viewAs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeVisitMode(state: VisitModeState | null) {
  if (typeof window === "undefined") return;
  if (!state) sessionStorage.removeItem(VISIT_MODE_KEY);
  else sessionStorage.setItem(VISIT_MODE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(VISIT_MODE_EVENT));
}

export function clearVisitMode() {
  writeVisitMode(null);
}

export function isVisitMode(): boolean {
  return readVisitMode() !== null;
}
