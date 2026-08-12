/** Session d'impersonation ouverte depuis le superadmin. */

export const SA_VIEW_AS_KEY = "nexa_sa_view_as";
export const SA_VIEW_AS_PENDING_KEY = "nexa_sa_view_as_pending";
export const SA_VIEW_AS_EVENT = "nexa-sa-view-as";
/** Session superadmin à restaurer au Quitter (access + refresh tokens). */
export const SA_RETURN_SESSION_KEY = "nexa_sa_return_session";

export type SaViewAsState = {
  centerId: string;
  centerName: string;
  centerType?: string | null;
  mode: "center" | "staff" | "student";
  targetLabel: string;
  targetEmail?: string;
  startedAt: string;
};

export type SaViewAsPending = {
  token_hash: string;
  next: string;
  mode: "center" | "staff" | "student";
  forceViewAs?: "staff" | null;
  centerId: string;
  centerName: string;
  centerType?: string | null;
  targetLabel: string;
  targetEmail: string;
};

export type SaReturnSession = {
  access_token: string;
  refresh_token: string;
};

export function readSaViewAs(): SaViewAsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SA_VIEW_AS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaViewAsState;
    if (!parsed?.centerId || !parsed?.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSaViewAs(state: SaViewAsState | null) {
  if (typeof window === "undefined") return;
  if (!state) sessionStorage.removeItem(SA_VIEW_AS_KEY);
  else sessionStorage.setItem(SA_VIEW_AS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(SA_VIEW_AS_EVENT));
}

export function clearSaViewAs() {
  writeSaViewAs(null);
}

export function saveSaReturnSession(session: SaReturnSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SA_RETURN_SESSION_KEY, JSON.stringify(session));
}

/** Lit et consomme la session superadmin sauvegardée. */
export function takeSaReturnSession(): SaReturnSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SA_RETURN_SESSION_KEY);
    sessionStorage.removeItem(SA_RETURN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaReturnSession;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    sessionStorage.removeItem(SA_RETURN_SESSION_KEY);
    return null;
  }
}

export function clearSaReturnSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SA_RETURN_SESSION_KEY);
}
