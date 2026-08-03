import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

/** True uniquement si les variables publiques Supabase sont présentes. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // Ne pas throw au chargement du module : ça casse SSR / build / layout entier.
  // Les appels API échoueront tant que .env.local n'est pas configuré.
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquante. " +
      "Ajoutez-les dans academie-langues/.env.local",
  );
}

// Mutex en mémoire pour sérialiser les refreshs de token.
// Remplace le no-op précédent qui causait des déconnexions aléatoires :
// plusieurs appels getSession() simultanés consommaient le même refresh token,
// ce qui invalidait la session côté Supabase.
const mutexMap = new Map<string, Promise<unknown>>();
function memoryLock<T>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = (mutexMap.get(name) ?? Promise.resolve()) as Promise<unknown>;
  const next = prev.then(fn, fn) as Promise<T>;
  mutexMap.set(name, next.catch(() => {}));
  return next;
}

// Placeholders valides pour createClient — évite le crash d'import sans env.
const url = supabaseUrl || "https://placeholder.supabase.co";
const key =
  supabaseKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIn0.placeholder";

export const supabase = createClient(url, key, {
  auth: {
    lock: memoryLock,
  },
});
