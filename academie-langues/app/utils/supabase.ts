import { createClient } from "@supabase/supabase-js";
import { isVisitMode } from "./visit-mode";

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

const rawSupabase = createClient(url, key, {
  auth: {
    lock: memoryLock,
  },
});

const READONLY_ERROR = { message: "Lecture seule (mode visite).", code: "VISIT_MODE_READONLY" } as const;

/** Proxy thenable : toute méthode chaînée renvoie le même stub, `await`/`.then()` résout en erreur. */
function readonlyStub(): any {
  const result = { data: null, error: READONLY_ERROR };
  const stub: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return (resolve: any) => resolve(result);
        if (prop === "catch") return () => stub;
        if (prop === "finally") return (cb?: () => void) => {
          cb?.();
          return stub;
        };
        return () => stub;
      },
    },
  );
  return stub;
}

const BLOCKED_METHODS = ["insert", "update", "upsert", "delete"] as const;

function wrapFrom(client: typeof rawSupabase): typeof rawSupabase["from"] {
  const originalFrom = client.from.bind(client);
  return ((table: Parameters<typeof originalFrom>[0]) => {
    const builder = originalFrom(table);
    if (!isVisitMode()) return builder;
    const wrapped: any = builder;
    for (const method of BLOCKED_METHODS) {
      wrapped[method] = () => readonlyStub();
    }
    return wrapped;
  }) as typeof originalFrom;
}

/** Client Supabase applicatif : en mode visite, insert/update/upsert/delete sont bloqués côté UI (garantie réelle = middleware.ts). */
export const supabase: typeof rawSupabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") return wrapFrom(target);
    return Reflect.get(target, prop, receiver);
  },
}) as typeof rawSupabase;
