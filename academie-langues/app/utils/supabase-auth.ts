import { supabase } from "@/app/utils/supabase";

const REFRESH_TOKEN_MARKERS = [
  "refresh token not found",
  "invalid refresh token",
  "refresh_token_not_found",
];

export function isRefreshTokenError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return REFRESH_TOKEN_MARKERS.some((marker) => lower.includes(marker));
}

function clearLocalAuthArtifacts() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("session_token");
  localStorage.removeItem("iag_last_active");
  localStorage.removeItem("iag_locked");
  localStorage.removeItem("iag_pin_next");
  sessionStorage.removeItem("is_unlocked");
}

/** Nettoie une session Supabase corrompue (refresh token invalide en localStorage). */
export async function clearStaleAuthSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      clearLocalAuthArtifacts();
      return;
    }

    const { error } = await supabase.auth.getUser();
    if (
      error &&
      (isRefreshTokenError(error.message) || error.status === 403 || error.status === 401)
    ) {
      await supabase.auth.signOut({ scope: "local" });
      clearLocalAuthArtifacts();
    }
  } catch {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    clearLocalAuthArtifacts();
  }
}

/** Avant une nouvelle connexion : nettoie les jetons locaux sans émettre d'événement de déconnexion global. */
export async function prepareForLogin(): Promise<void> {
  clearLocalAuthArtifacts();
}
