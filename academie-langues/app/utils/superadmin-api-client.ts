import { supabase } from "@/app/utils/supabase";

/**
 * Recupere un access token garanti frais : si la session en cache est expiree
 * (ou tres proche de l'expiration), on force un refresh avant de l'utiliser.
 * Evite les "Session invalide." cote API quand le token a expire pendant que
 * l'onglet etait inactif (veille, longue navigation, etc.).
 */
async function getFreshAccessToken(forceRefresh = false): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresInMs = (session.expires_at ?? 0) * 1000 - Date.now();
  if (!forceRefresh && expiresInMs > 20_000) {
    return session.access_token;
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session) {
    // Le refresh a echoue : on retente avec le token existant (peut-etre
    // encore valide malgre l'estimation), au pire l'appel API renverra 401.
    return session.access_token;
  }
  return refreshed.session.access_token;
}

type SuperadminFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * Appelle une route /api/superadmin/* avec le token courant. Si l'API repond
 * 401 (session expiree), on force un refresh et on retente une fois avant
 * d'abandonner.
 */
export async function superadminFetch<T = any>(path: string, options: SuperadminFetchOptions = {}): Promise<T> {
  const call = async (forceRefresh: boolean) => {
    const token = await getFreshAccessToken(forceRefresh);
    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token ?? ""}`,
        ...options.headers,
      },
    });
    return res;
  };

  let res = await call(false);
  if (res.status === 401) {
    res = await call(true);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Erreur ${res.status}`);
  }
  return json as T;
}
