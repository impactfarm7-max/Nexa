# Visite démo en lecture seule — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bouton « Visiter » sur la landing page qui laisse choisir un type de centre (Libre / TCF Canada) puis un rôle (Centre / Étudiant), connecte le visiteur à un vrai compte démo, et garantit qu'aucune écriture n'est possible pendant la visite, sur toute l'app.

**Architecture:** Colonne `profiles.is_demo_account` pour marquer 4 comptes démo réels (2 centres × 2 rôles). Entrée publique via magic-link (même mécanisme que le view-as superadmin déjà en place). Lecture seule garantie à deux niveaux, tous deux basés sur *qui est connecté* (pas un flag client seul) : `middleware.ts` bloque toute méthode non-GET sur `/api/*` pour les comptes démo, et le client Supabase partagé intercepte `insert/update/upsert/delete` en mode visite pour un rejet immédiat côté UI.

**Tech Stack:** Next.js App Router, Supabase (auth + Postgres + supabase-js v2), TypeScript, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-10-visite-demo-lecture-seule-design.md`

## Global Constraints

- Toutes les chaînes visibles utilisateur sont en français, cohérentes avec le reste du site (pas d'anglais).
- Couleurs : `BRAND.blue` (#11224E) / `BRAND.orange` (#F87B1B) via `@/app/utils/brand`, pas de couleurs codées en dur nouvelles.
- Aucune modification de policy RLS existante (hors scope du design).
- Les 4 comptes démo utilisent le domaine d'e-mail `@nexa-demo.app` (jamais un vrai domaine de production) pour qu'ils soient reconnaissables et sans risque de collision.

---

## File Structure

- Create: `academie-langues/supabase-demo-accounts.sql` — migration : colonne `profiles.is_demo_account`.
- Create: `academie-langues/scripts/seed-demo-accounts.mjs` — script idempotent qui crée/rafraîchit les 4 comptes démo + données minimales.
- Create: `academie-langues/app/utils/visit-mode.ts` — helpers sessionStorage (lecture/écriture du flag de visite), purs, testables.
- Create: `academie-langues/app/utils/visit-mode.test.mjs` — tests `node --test` des helpers purs.
- Modify: `academie-langues/app/middleware.ts` — bloque les méthodes non-GET sur `/api/*` pour les comptes démo.
- Create: `academie-langues/app/api/demo/enter/route.ts` — route publique, résout le profil démo, génère un magic-link, rate-limitée.
- Create: `academie-langues/app/visite/enter/page.tsx` — consomme le `token_hash`, établit la session, redirige.
- Modify: `academie-langues/app/utils/supabase.ts` — wrapper qui bloque insert/update/upsert/delete en mode visite.
- Create: `academie-langues/app/components/VisitModeBanner.tsx` — bandeau + bouton Quitter.
- Modify: `academie-langues/app/components/ClientLayout.tsx` — monte `VisitModeBanner` (3 emplacements, à côté de `SaViewAsBanner`).
- Modify: `academie-langues/app/components/CenterAppShell.tsx` — monte `VisitModeBanner`.
- Create: `academie-langues/app/components/landing/VisitModal.tsx` — modal 2 étapes (type de centre → rôle).
- Modify: `academie-langues/app/page.tsx` — bouton « Visiter » + montage du modal.
- Modify: `academie-langues/app/utils/public-routes.ts` — ajoute `/visite` aux routes publiques (si ce fichier liste les routes publiques app-side ; vérifié à la Task 6).

---

### Task 1: Colonne `is_demo_account` + seed des 4 comptes démo

**Files:**
- Create: `academie-langues/supabase-demo-accounts.sql`
- Create: `academie-langues/scripts/seed-demo-accounts.mjs`

**Interfaces:**
- Produces: 4 lignes `profiles` avec `is_demo_account = true`, emails fixes :
  - `demo-libre-centre@nexa-demo.app` (role `center_manager`, centre « Centre Libre Démo »)
  - `demo-libre-etudiant@nexa-demo.app` (role `student`, même centre)
  - `demo-tcf-centre@nexa-demo.app` (role `center_manager`, centre « Centre TCF Démo », `center_type = 'tcf_canada'`)
  - `demo-tcf-etudiant@nexa-demo.app` (role `student`, même centre)
- Produces: colonne `public.profiles.is_demo_account boolean not null default false`, utilisée par Task 3 (middleware) et Task 4 (résolution API).

- [ ] **Step 1: Écrire la migration SQL**

`academie-langues/supabase-demo-accounts.sql` :

```sql
-- Marque les comptes de démonstration publique (bouton "Visiter" landing).
-- Ces comptes sont en lecture seule côté middleware (app/middleware.ts) et
-- côté client Supabase (app/utils/supabase.ts) — voir docs/superpowers/specs/
-- 2026-09-10-visite-demo-lecture-seule-design.md

begin;

alter table public.profiles
  add column if not exists is_demo_account boolean not null default false;

create index if not exists idx_profiles_is_demo_account
  on public.profiles (is_demo_account)
  where is_demo_account = true;

commit;
```

- [ ] **Step 2: Exécuter la migration**

À exécuter manuellement dans le SQL Editor Supabase (comme toutes les migrations `supabase-*.sql` de ce repo — pas d'exécution automatique).

- [ ] **Step 3: Écrire le script de seed**

`academie-langues/scripts/seed-demo-accounts.mjs` :

```js
/**
 * Crée/rafraîchit les 4 comptes démo publics (bouton "Visiter" landing).
 * Idempotent : rejouable sans dupliquer (upsert par email).
 * Usage: node --env-file=.env.local scripts/seed-demo-accounts.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: env Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const DEMO_PASSWORD = "Demo-Nexa-2026!";

async function ensureAuthUser(email) {
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) fail(`création auth ${email}: ${error?.message}`);
  return data.user.id;
}

async function ensureCenter({ name, centerType }) {
  const { data: existing } = await sb
    .from("centers")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("centers")
    .insert({ name, center_type: centerType, status: "active", city: "Yaoundé" })
    .select("id")
    .single();
  if (error || !data) fail(`création centre ${name}: ${error?.message}`);
  return data.id;
}

async function ensureCampus(centerId, name) {
  const { data: existing } = await sb
    .from("campuses")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("campuses")
    .insert({ center_id: centerId, name })
    .select("id")
    .single();
  if (error || !data) fail(`création campus ${name}: ${error?.message}`);
  return data.id;
}

async function ensureFiliere(centerId, name, type) {
  const { data: existing } = await sb
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from("filieres")
    .insert({ center_id: centerId, name, type })
    .select("id")
    .single();
  if (error || !data) fail(`création filière ${name}: ${error?.message}`);
  return data.id;
}

async function upsertProfile({ id, email, prenom, nom, role, centerId }) {
  const { error } = await sb.from("profiles").upsert({
    id,
    email,
    prenom,
    nom,
    role,
    center_id: centerId,
    created_by_center_id: centerId,
    center_status: "active",
    tag_status: "actif",
    is_demo_account: true,
  });
  if (error) fail(`upsert profil ${email}: ${error.message}`);
}

async function seedCenter({ centerName, centerType, filiereName, filiereType, managerEmail, studentEmail }) {
  const centerId = await ensureCenter({ name: centerName, centerType });
  await ensureCampus(centerId, "Campus principal");
  await ensureFiliere(centerId, filiereName, filiereType);

  const managerId = await ensureAuthUser(managerEmail);
  await upsertProfile({
    id: managerId,
    email: managerEmail,
    prenom: "Démo",
    nom: "Responsable",
    role: "center_manager",
    centerId,
  });

  const studentId = await ensureAuthUser(studentEmail);
  await upsertProfile({
    id: studentId,
    email: studentEmail,
    prenom: "Démo",
    nom: "Étudiant",
    role: "student",
    centerId,
  });

  ok(`${centerName} : manager=${managerEmail} étudiant=${studentEmail}`);
}

async function main() {
  await seedCenter({
    centerName: "Centre Libre Démo",
    centerType: "generic",
    filiereName: "Anglais Général",
    filiereType: "cursus",
    managerEmail: "demo-libre-centre@nexa-demo.app",
    studentEmail: "demo-libre-etudiant@nexa-demo.app",
  });

  await seedCenter({
    centerName: "Centre TCF Démo",
    centerType: "tcf_canada",
    filiereName: "TCF Canada",
    filiereType: "cursus",
    managerEmail: "demo-tcf-centre@nexa-demo.app",
    studentEmail: "demo-tcf-etudiant@nexa-demo.app",
  });

  ok("Seed terminé.");
}

main();
```

- [ ] **Step 4: Exécuter le script et vérifier**

Run: `node --env-file=.env.local scripts/seed-demo-accounts.mjs`
Expected: 3 lignes `✓` affichées, aucune ligne `✗`.

Vérification manuelle dans le SQL Editor Supabase :
```sql
select email, role, is_demo_account, center_id from public.profiles where is_demo_account = true;
```
Expected: 4 lignes.

- [ ] **Step 5: Rejouer le script pour vérifier l'idempotence**

Run: `node --env-file=.env.local scripts/seed-demo-accounts.mjs` (une 2e fois)
Expected: mêmes 3 lignes `✓`, et la requête SQL de vérification retourne toujours exactement 4 lignes (pas de doublon).

- [ ] **Step 6: Commit**

```bash
git add supabase-demo-accounts.sql scripts/seed-demo-accounts.mjs
git commit -m "feat: colonne is_demo_account + seed des 4 comptes demo visite"
```

---

### Task 2: `visit-mode.ts` — helpers sessionStorage + tests

**Files:**
- Create: `academie-langues/app/utils/visit-mode.ts`
- Test: `academie-langues/app/utils/visit-mode.test.mjs`

**Interfaces:**
- Produces: `VISIT_MODE_KEY`, `VISIT_MODE_EVENT` (constantes), `type VisitModeState = { centerKind: "libre" | "tcf"; viewAs: "center" | "student"; centerName: string; startedAt: string }`, `readVisitMode(): VisitModeState | null`, `writeVisitMode(state: VisitModeState | null): void`, `clearVisitMode(): void`, `isVisitMode(): boolean`.
- Consumed by: Task 3 (middleware — logique équivalente côté serveur, indépendante), Task 5 (`/visite/enter`), Task 7 (`supabase.ts`), Task 8 (`VisitModeBanner`), Task 9 (`VisitModal`).

- [ ] **Step 1: Écrire le fichier**

`academie-langues/app/utils/visit-mode.ts` (calque de `app/utils/sa-view-as.ts`) :

```ts
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
```

- [ ] **Step 2: Écrire les tests**

`academie-langues/app/utils/visit-mode.test.mjs` :

```js
import { test } from "node:test";
import assert from "node:assert/strict";

// Stub minimal de sessionStorage + window pour un environnement node --test (pas de DOM).
function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
}

globalThis.window = globalThis;
globalThis.sessionStorage = makeSessionStorage();
globalThis.dispatchEvent = () => {};
globalThis.Event = class Event { constructor(name) { this.name = name; } };

const { readVisitMode, writeVisitMode, clearVisitMode, isVisitMode } = await import("./visit-mode.ts");

test("readVisitMode renvoie null si rien n'est stocké", () => {
  clearVisitMode();
  assert.equal(readVisitMode(), null);
  assert.equal(isVisitMode(), false);
});

test("writeVisitMode puis readVisitMode round-trip", () => {
  const state = { centerKind: "tcf", viewAs: "student", centerName: "Centre TCF Démo", startedAt: "2026-09-10T00:00:00.000Z" };
  writeVisitMode(state);
  assert.deepEqual(readVisitMode(), state);
  assert.equal(isVisitMode(), true);
});

test("writeVisitMode(null) efface l'état", () => {
  writeVisitMode({ centerKind: "libre", viewAs: "center", centerName: "x", startedAt: "x" });
  writeVisitMode(null);
  assert.equal(readVisitMode(), null);
});

test("readVisitMode ignore un état malformé (JSON invalide)", () => {
  sessionStorage.setItem("nexa_visit_mode", "{ invalide");
  assert.equal(readVisitMode(), null);
});

test("readVisitMode ignore un état incomplet", () => {
  sessionStorage.setItem("nexa_visit_mode", JSON.stringify({ centerKind: "tcf" }));
  assert.equal(readVisitMode(), null);
});
```

Note : ce fichier de test importe `./visit-mode.ts` directement — `node --test` sur ce repo exécute des `.mjs`, qui peuvent importer du `.ts` uniquement si le runtime le permet nativement. Si l'import échoue (`ERR_UNKNOWN_FILE_EXTENSION`), dupliquer la logique testée dans un fichier `.mjs` frère n'est pas acceptable (duplication) — dans ce cas, renommer l'extension de test en gardant le même runner : voir Step 3.

- [ ] **Step 3: Lancer les tests, ajuster si besoin**

Run: `node --env-file=.env.local --test app/utils/visit-mode.test.mjs`
Expected: 5 tests passent.

Si `node --test` ne sait pas importer un `.ts` directement (message `ERR_UNKNOWN_FILE_EXTENSION` ou équivalent), c'est que ce repo n'a pas de loader TS pour les tests — vérifier comment `app/**/*.test.mjs` existant (le pattern déjà dans `package.json` → `"test": "node --test \"app/**/*.test.mjs\""`) gère un import similaire ; si aucun test existant n'importe de `.ts`, exécuter `node --version` et confirmer le support natif des types (Node 22.6+ avec `--experimental-strip-types`, ou Node 23+ nativement). Si non supporté, ajouter `--experimental-strip-types` à la commande de test dans ce step (pas de changement de `package.json` nécessaire pour ce plan, la commande manuelle suffit).

- [ ] **Step 4: Commit**

```bash
git add app/utils/visit-mode.ts app/utils/visit-mode.test.mjs
git commit -m "feat: helpers sessionStorage pour le mode visite en lecture seule"
```

---

### Task 3: Middleware — blocage des écritures API pour les comptes démo

**Files:**
- Modify: `academie-langues/app/middleware.ts`

**Interfaces:**
- Consumes: `profiles.is_demo_account` (colonne créée Task 1).
- Produces: toute requête `/api/*` avec méthode ≠ GET/HEAD/OPTIONS, faite par un utilisateur `is_demo_account = true`, reçoit `403 { error: "Lecture seule (mode visite)." }` avant d'atteindre la route.

- [ ] **Step 1: Lire le fichier actuel pour confirmer qu'il n'a pas changé**

Read: `academie-langues/app/middleware.ts` (35 lignes actuellement — vérifier que la structure `createServerClient` + `PUBLIC_API_ROUTES` + le bloc `if (request.nextUrl.pathname.startsWith('/api') ...)` est toujours celle-ci avant d'éditer ; si différente, adapter le Step 2 en conséquence plutôt que d'écraser aveuglément).

- [ ] **Step 2: Ajouter le check démo**

Remplacer le bloc :

```ts
  // Protège les routes API privées : si pas de session, bloquer
  if (request.nextUrl.pathname.startsWith('/api') && !user && !isPublicApi) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  return response
```

par :

```ts
  // Protège les routes API privées : si pas de session, bloquer
  if (request.nextUrl.pathname.startsWith('/api') && !user && !isPublicApi) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Mode visite (bouton "Visiter" landing) : comptes démo en lecture seule.
  // Vérifié ici (et pas seulement côté client) car c'est la garantie réelle,
  // indépendante d'un flag sessionStorage contournable.
  const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  if (request.nextUrl.pathname.startsWith('/api') && user && isMutatingMethod) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_demo_account')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.is_demo_account) {
      return NextResponse.json({ error: 'Lecture seule (mode visite).' }, { status: 403 })
    }
  }

  return response
```

- [ ] **Step 3: Vérifier manuellement (pas de framework de test middleware dans ce repo)**

Démarrer le serveur dev (`npm run dev`), se connecter avec `demo-tcf-centre@nexa-demo.app` / `Demo-Nexa-2026!` via `/login`, puis dans un terminal :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X GET "http://localhost:3000/api/center/dashboard-stats" -H "Authorization: Bearer <access_token_du_compte_demo>"
```
Expected: `200` (GET passe).

```bash
curl -s -X PATCH "http://localhost:3000/api/staff" -H "Authorization: Bearer <access_token_du_compte_demo>" -H "Content-Type: application/json" -d '{}'
```
Expected: `403` avec `{"error":"Lecture seule (mode visite)."}`.

(Le token s'obtient via `supabase.auth.getSession()` dans la console DevTools après connexion, ou en lisant le cookie de session.)

- [ ] **Step 4: Commit**

```bash
git add app/middleware.ts
git commit -m "feat: bloque les ecritures API pour les comptes demo (mode visite)"
```

---

### Task 4: Route publique `/api/demo/enter`

**Files:**
- Create: `academie-langues/app/api/demo/enter/route.ts`

**Interfaces:**
- Consumes: `consumeFixedWindow(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>` et `requestIp(req: Request): string` depuis `@/app/utils/fixed-window-rate-limit`. `getPublicSiteUrl(): string` depuis `@/app/utils/public-site-url`.
- Produces: `POST` body `{ centerKind: "libre" | "tcf"; viewAs: "center" | "student" }` → `200 { token_hash: string; centerName: string }` ou erreur `400/404/429/500 { error: string }`.

- [ ] **Step 1: Écrire la route**

`academie-langues/app/api/demo/enter/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeFixedWindow, requestIp } from "@/app/utils/fixed-window-rate-limit";
import { getPublicSiteUrl } from "@/app/utils/public-site-url";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type CenterKind = "libre" | "tcf";
type ViewAs = "center" | "student";

export async function POST(req: NextRequest) {
  const rate = await consumeFixedWindow(`demo-enter:${requestIp(req)}`, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { centerKind?: CenterKind; viewAs?: ViewAs };
  const { centerKind, viewAs } = body;
  if (centerKind !== "libre" && centerKind !== "tcf") {
    return NextResponse.json({ error: "Type de centre invalide." }, { status: 400 });
  }
  if (viewAs !== "center" && viewAs !== "student") {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const wantedCenterType = centerKind === "tcf" ? "tcf_canada" : "generic";
  const wantedRole = viewAs === "center" ? "center_manager" : "student";

  const { data: candidates, error: profilesErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, center_id, centers(name, center_type)")
    .eq("is_demo_account", true)
    .eq("role", wantedRole);

  if (profilesErr) {
    return NextResponse.json({ error: profilesErr.message }, { status: 500 });
  }

  const match = (candidates || []).find(
    (p: any) => p.centers?.center_type === wantedCenterType,
  ) as { id: string; email: string; centers: { name: string } } | undefined;

  if (!match?.email) {
    return NextResponse.json(
      { error: "Compte démo introuvable. Exécutez scripts/seed-demo-accounts.mjs." },
      { status: 404 },
    );
  }

  const site = getPublicSiteUrl();
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: match.email,
    options: { redirectTo: `${site}/visite/enter` },
  });

  const hashedToken =
    (linkData as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token || null;

  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: linkError?.message || "Impossible de créer la session de visite." },
      { status: 500 },
    );
  }

  return NextResponse.json({ token_hash: hashedToken, centerName: match.centers.name });
}
```

- [ ] **Step 2: Ajouter `/api/demo/` aux routes publiques du middleware**

Dans `academie-langues/app/middleware.ts`, ajouter `'/api/demo/'` à `PUBLIC_API_ROUTES` (cette route n'exige pas de session — elle en crée une) :

```ts
  const PUBLIC_API_ROUTES = [
    '/api/centre/creer',
    '/api/creation-centre',
    '/api/center/resolve-code',
    '/api/auth/',
    '/api/sessions/validate',
    '/api/support/guest',
    '/api/pin/',
    '/api/activity',
    '/api/demo/',
  ];
```

- [ ] **Step 3: Vérifier manuellement**

Après avoir exécuté le seed (Task 1) :

```bash
curl -s -X POST "http://localhost:3000/api/demo/enter" -H "Content-Type: application/json" -d '{"centerKind":"tcf","viewAs":"student"}'
```
Expected: `200` avec un `token_hash` non vide et `"centerName":"Centre TCF Démo"`.

```bash
curl -s -X POST "http://localhost:3000/api/demo/enter" -H "Content-Type: application/json" -d '{"centerKind":"nawak","viewAs":"student"}'
```
Expected: `400` avec `{"error":"Type de centre invalide."}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/demo/enter/route.ts app/middleware.ts
git commit -m "feat: route publique /api/demo/enter pour le mode visite"
```

---

### Task 5: Page `/visite/enter` — établit la session de visite

**Files:**
- Create: `academie-langues/app/visite/enter/page.tsx`
- Modify: `academie-langues/app/utils/public-routes.ts`

**Interfaces:**
- Consumes: `sessionStorage` key `"nexa_visit_pending"` (objet `{ token_hash: string; centerKind: "libre"|"tcf"; viewAs: "center"|"student"; centerName: string; next: string }`, écrite par `VisitModal` à la Task 9), `writeVisitMode` depuis `@/app/utils/visit-mode`.
- Produces: redirige vers `/centre/dashboard` ou `/dashboard` une fois la session établie.

- [ ] **Step 1: Vérifier `public-routes.ts`**

Read: `academie-langues/app/utils/public-routes.ts`. Ce fichier liste les chemins publics utilisés par `AppBootGate`/`ClientLayout` (`isPublicAppRoute`). Ajouter `/visite` à la liste (même motif que `/view-as` déjà présent — chercher `view-as` dans ce fichier pour confirmer le format exact avant d'éditer).

- [ ] **Step 2: Écrire la page**

`academie-langues/app/visite/enter/page.tsx` (calque de `app/view-as/enter/page.tsx`, sans session à restaurer) :

```tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { writeVisitMode, type VisitModeState } from "@/app/utils/visit-mode";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";
import { clearStudentAccessCache } from "@/app/utils/student-access-cache";

type VisitPending = {
  token_hash: string;
  centerKind: "libre" | "tcf";
  viewAs: "center" | "student";
  centerName: string;
  next: string;
};

const VISIT_PENDING_KEY = "nexa_visit_pending";

// StrictMode (dev) monte l'effet deux fois : sans ce garde-fou au niveau module,
// le premier passage consomme le token sessionStorage avant le second passage réel.
let visitEnterConsumed = false;

export default function VisitEnterPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visitEnterConsumed) return;
    visitEnterConsumed = true;
    let cancelled = false;

    const run = async () => {
      let pending: VisitPending | null = null;
      try {
        const raw = sessionStorage.getItem(VISIT_PENDING_KEY);
        pending = raw ? (JSON.parse(raw) as VisitPending) : null;
      } catch {
        pending = null;
      }
      sessionStorage.removeItem(VISIT_PENDING_KEY);

      if (!pending?.token_hash) {
        setError("Session de visite introuvable ou expirée.");
        return;
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: pending.token_hash,
        type: "email",
      });

      if (cancelled) return;

      if (otpError) {
        setError(otpError.message || "Impossible d'ouvrir la visite.");
        return;
      }

      // Contourne le PIN pendant la visite (comme le view-as superadmin).
      sessionStorage.setItem("is_unlocked", "true");
      clearCenterMeCache();
      clearStudentAccessCache();

      const state: VisitModeState = {
        centerKind: pending.centerKind,
        viewAs: pending.viewAs,
        centerName: pending.centerName,
        startedAt: new Date().toISOString(),
      };
      writeVisitMode(state);

      window.location.assign(pending.next || "/");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070b14] px-4 text-center">
      {error ? (
        <>
          <p className="text-sm font-bold text-red-300">{error}</p>
          <a
            href="/"
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
          >
            Retour à l'accueil
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="mt-4 text-sm font-bold text-slate-300">Ouverture de la visite…</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier manuellement**

Dans la console DevTools du navigateur, sur `http://localhost:3000` :

```js
sessionStorage.setItem("nexa_visit_pending", JSON.stringify({
  token_hash: "<coller le token_hash reçu de /api/demo/enter>",
  centerKind: "tcf", viewAs: "student", centerName: "Centre TCF Démo", next: "/dashboard",
}));
window.location.href = "/visite/enter";
```
Expected: redirection vers `/dashboard` connecté en tant que `demo-tcf-etudiant@nexa-demo.app`, sans écran PIN.

- [ ] **Step 4: Commit**

```bash
git add app/visite/enter/page.tsx app/utils/public-routes.ts
git commit -m "feat: page /visite/enter etablit la session de visite demo"
```

---

### Task 6: Blocage des écritures côté client Supabase

**Files:**
- Modify: `academie-langues/app/utils/supabase.ts`

**Interfaces:**
- Consumes: `isVisitMode()` depuis `@/app/utils/visit-mode`.
- Produces: `supabase.from(table).insert/update/upsert/delete(...)` résout immédiatement en `{ data: null, error: { message: "Lecture seule (mode visite).", code: "VISIT_MODE_READONLY" } }` quand `isVisitMode()` est vrai, sans requête réseau. `select()` et toute lecture ne sont pas affectés.

- [ ] **Step 1: Modifier le fichier**

Ajouter à la fin de `academie-langues/app/utils/supabase.ts` (après la création de `export const supabase = createClient(...)`, en renommant l'export interne) :

```ts
import { createClient } from "@supabase/supabase-js";
import { isVisitMode } from "./visit-mode";

// ... (contenu existant inchangé jusqu'à la création du client) ...

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
```

Remplacer la ligne existante `export const supabase = createClient(url, key, { auth: { lock: memoryLock } });` par la version `rawSupabase` ci-dessus (le reste du fichier — `isSupabaseConfigured`, `memoryLock`, `url`/`key` — reste inchangé).

- [ ] **Step 2: Vérifier manuellement qu'une lecture n'est pas affectée**

En visite (état de la Task 5), sur `/dashboard`, ouvrir DevTools → Network. Naviguer normalement.
Expected: les requêtes `GET` vers Supabase (lecture du profil, etc.) apparaissent normalement, la page affiche les vraies données du compte démo.

- [ ] **Step 3: Vérifier manuellement qu'une écriture est bloquée sans requête réseau**

Toujours en visite, dans la console DevTools :

```js
const { supabase } = await import("/app/utils/supabase.ts"); // ou utiliser une page qui appelle .update()
```

Plus simple : aller sur `/profil`, cliquer « Modifier », changer le prénom, cliquer « Enregistrer ».
Expected : l'onglet Network ne montre **aucune** requête PATCH vers `supabase.co` au clic sur Enregistrer (le stub court-circuite avant le réseau), et l'UI affiche l'erreur habituelle (le message dépend de la gestion d'erreur de la page — vérifier qu'elle ne plante pas silencieusement).

- [ ] **Step 4: Commit**

```bash
git add app/utils/supabase.ts
git commit -m "feat: bloque insert/update/upsert/delete cote client en mode visite"
```

---

### Task 7: Bandeau de visite + montage

**Files:**
- Create: `academie-langues/app/components/VisitModeBanner.tsx`
- Modify: `academie-langues/app/components/ClientLayout.tsx`
- Modify: `academie-langues/app/components/CenterAppShell.tsx`

**Interfaces:**
- Consumes: `readVisitMode`, `clearVisitMode`, `VISIT_MODE_EVENT` depuis `@/app/utils/visit-mode`.
- Produces: composant `<VisitModeBanner />` sans props, `null` si pas en mode visite.

- [ ] **Step 1: Écrire le bandeau**

`academie-langues/app/components/VisitModeBanner.tsx` (calque de `SaViewAsBanner.tsx`) :

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import {
  VISIT_MODE_EVENT,
  clearVisitMode,
  readVisitMode,
  type VisitModeState,
} from "@/app/utils/visit-mode";

function roleLabel(viewAs: VisitModeState["viewAs"]) {
  return viewAs === "center" ? "Centre" : "Étudiant";
}

export default function VisitModeBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<VisitModeState | null>(null);
  const [exiting, setExiting] = useState(false);

  const sync = useCallback(() => setState(readVisitMode()), []);

  useEffect(() => {
    sync();
    window.addEventListener(VISIT_MODE_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(VISIT_MODE_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  if (!state) return null;
  if (pathname?.startsWith("/login") || pathname?.startsWith("/visite")) return null;

  const exit = async () => {
    setExiting(true);
    clearVisitMode();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    window.location.assign("/");
  };

  return (
    <>
      <div className="h-10 shrink-0 sm:h-11" aria-hidden />
      <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500 px-3 py-2 text-black shadow-lg sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="truncate text-xs font-bold sm:text-sm">
            Visite {state.centerName} · {roleLabel(state.viewAs)} · lecture seule
          </p>
        </div>
        <button
          type="button"
          disabled={exiting}
          onClick={() => void exit()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-black/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide hover:bg-black/25 disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Quitter
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Monter dans `ClientLayout.tsx`**

Dans `academie-langues/app/components/ClientLayout.tsx`, importer `VisitModeBanner` à côté de `SaViewAsBanner` (ligne 22), et ajouter `<VisitModeBanner />` juste après chacune des 3 occurrences de `<SaViewAsBanner />` (lignes 159, 226, 239 au moment de l'écriture de ce plan — confirmer les numéros de ligne réels avant d'éditer, ils ont pu bouger).

- [ ] **Step 3: Monter dans `CenterAppShell.tsx`**

Dans `academie-langues/app/components/CenterAppShell.tsx`, ajouter l'import et `<VisitModeBanner />` en premier enfant du `<div className={\`flex min-h-[100dvh] ...\`}>` :

```tsx
import VisitModeBanner from "@/app/components/VisitModeBanner";

// ...

  return (
    <div className={`flex min-h-[100dvh] w-full overflow-x-hidden ${className}`}>
      <VisitModeBanner />
      <CenterSidebar />
```

- [ ] **Step 4: Vérifier manuellement**

En visite « Centre TCF Démo / Centre », naviguer sur `/centre/dashboard` et `/dashboard` (si applicable au rôle) — le bandeau ambre doit être visible en haut sur les deux familles de pages, avec le bon libellé.

- [ ] **Step 5: Commit**

```bash
git add app/components/VisitModeBanner.tsx app/components/ClientLayout.tsx app/components/CenterAppShell.tsx
git commit -m "feat: bandeau mode visite (centre + etudiant)"
```

---

### Task 8: Modal « Visiter » + bouton landing

**Files:**
- Create: `academie-langues/app/components/landing/VisitModal.tsx`
- Modify: `academie-langues/app/page.tsx`

**Interfaces:**
- Consumes: `POST /api/demo/enter` (Task 4).
- Produces: composant `<VisitModal open={boolean} onClose={() => void} />`.

- [ ] **Step 1: Écrire le modal**

`academie-langues/app/components/landing/VisitModal.tsx` :

```tsx
"use client";

import { useState } from "react";
import { X, Building2, GraduationCap, Loader2 } from "lucide-react";
import { BRAND } from "@/app/utils/brand";

type CenterKind = "libre" | "tcf";
type ViewAs = "center" | "student";

const CENTER_LABEL: Record<CenterKind, string> = {
  libre: "Centre Libre",
  tcf: "Centre TCF Canada",
};

export default function VisitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [centerKind, setCenterKind] = useState<CenterKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setCenterKind(null);
    setError(null);
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickCenterKind = (kind: CenterKind) => {
    setCenterKind(kind);
    setStep(2);
  };

  const pickViewAs = async (viewAs: ViewAs) => {
    if (!centerKind || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerKind, viewAs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Impossible d'ouvrir la visite.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem(
        "nexa_visit_pending",
        JSON.stringify({
          token_hash: data.token_hash,
          centerKind,
          viewAs,
          centerName: data.centerName,
          next: viewAs === "center" ? "/centre/dashboard" : "/dashboard",
        }),
      );
      window.location.assign("/visite/enter");
    } catch {
      setError("Erreur réseau, réessayez.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={close}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: BRAND.orange }}>
              Visite guidée
            </p>
            <h2 className="mt-1 text-lg font-black" style={{ color: BRAND.blue }}>
              {step === 1 ? "Quel type de centre ?" : `${CENTER_LABEL[centerKind!]} — en tant que ?`}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        {step === 1 ? (
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => pickCenterKind("libre")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7]"
            >
              <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
              <span className="text-sm font-bold text-neutral-700">Centre Libre</span>
            </button>
            <button
              type="button"
              onClick={() => pickCenterKind("tcf")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7]"
            >
              <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
              <span className="text-sm font-bold text-neutral-700">Centre TCF Canada</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void pickViewAs("center")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: BRAND.orange }} /> : <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />}
              <span className="text-sm font-bold text-neutral-700">Centre (responsable)</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void pickViewAs("student")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: BRAND.orange }} /> : <GraduationCap className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />}
              <span className="text-sm font-bold text-neutral-700">Étudiant</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-1 text-xs font-bold text-neutral-400 hover:text-neutral-600"
            >
              ← Changer de type de centre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ajouter le bouton + état dans `app/page.tsx`**

Dans `academie-langues/app/page.tsx` :
- Ajouter `"use client"` reste déjà présent (le fichier l'a déjà, ligne 1).
- Ajouter l'import : `import VisitModal from "@/app/components/landing/VisitModal";`
- Ajouter un état dans `LandingPage()` : `const [visitOpen, setVisitOpen] = useState(false);`
- Ajouter un bouton « Visiter » dans le header, à côté du bouton `login` (autour de la ligne 124, dans le bloc `<div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">`) :

```tsx
            <button
              type="button"
              onClick={() => setVisitOpen(true)}
              className="hidden md:flex items-center h-10 px-4 rounded-xl text-[12px] xl:text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition whitespace-nowrap"
            >
              Visiter
            </button>
```

- Monter le modal juste avant la fermeture du composant, à la fin du JSX retourné (avant le `</div>` final englobant) :

```tsx
      <VisitModal open={visitOpen} onClose={() => setVisitOpen(false)} />
```

- [ ] **Step 3: Vérifier manuellement le flow complet**

1. `npm run dev`, ouvrir `/`.
2. Cliquer « Visiter » → modal étape 1 s'ouvre.
3. Choisir « Centre TCF Canada » → étape 2.
4. Choisir « Étudiant » → redirection vers `/dashboard`, bandeau ambre visible, données du compte `demo-tcf-etudiant@nexa-demo.app` affichées.
5. Cliquer « Quitter » sur le bandeau → retour à `/`, déconnecté.
6. Répéter pour les 3 autres combinaisons (libre/centre, libre/étudiant, tcf/centre) — chacune doit atterrir sur le bon dashboard avec les bonnes données.

- [ ] **Step 4: Commit**

```bash
git add app/components/landing/VisitModal.tsx app/page.tsx
git commit -m "feat: bouton Visiter + modal de selection centre/role"
```

---

## Self-Review (fait par l'auteur du plan)

- **Couverture du spec** : comptes démo (Task 1), entrée publique + magic-link (Task 4-5), garantie lecture seule middleware (Task 3) + client (Task 6), bandeau + sortie (Task 7), modal + bouton (Task 8) — toutes les sections du spec sont couvertes.
- **Placeholders** : aucun "TODO"/"similar to Task N" — chaque step contient le code réel. Les deux points où le plan demande une vérification avant d'agir (numéros de ligne `ClientLayout.tsx`, structure `middleware.ts`) sont volontaires : ce sont des fichiers déjà modifiés plusieurs fois dans cette session, leurs lignes exactes peuvent avoir bougé — l'exécutant doit lire avant d'éditer, pas deviner.
- **Cohérence des types** : `VisitModeState` (Task 2) réutilisé identiquement dans Task 5, 6, 7. `CenterKind`/`ViewAs` (Task 4) réutilisés avec les mêmes valeurs littérales (`"libre"|"tcf"`, `"center"|"student"`) dans Task 8.
