import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL ou Key manquante !");
}

// Mutex en mémoire pour sérialiser les refreshs de token.
// Remplace le no-op précédent qui causait des déconnexions aléatoires :
// plusieurs appels getSession() simultanés consommaient le même refresh token,
// ce qui invalidait la session côté Supabase.
const mutexMap = new Map<string, Promise<unknown>>();
function memoryLock<T>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  const prev = (mutexMap.get(name) ?? Promise.resolve()) as Promise<unknown>;
  const next = prev.then(fn, fn) as Promise<T>;
  mutexMap.set(name, next.catch(() => {}));
  return next;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    lock: memoryLock,
  },
});