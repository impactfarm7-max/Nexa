# Matricule étudiant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque étudiant reçoit un matricule unique par centre (`{PREFIXE}-{ANNÉE}-{SEQ}`), généré automatiquement ou repris d'un import CSV, configurable par centre, visible partout (liste, profil, bulletins, certificat).

**Architecture:** Un helper serveur pur (`app/utils/student-matricule.server.ts`) encapsule le format et la logique de génération/synchronisation ; deux fonctions Postgres (`next_student_counter`, `bump_student_counter`) garantissent l'atomicité du compteur par centre/année ; `/api/etudiants` (point d'entrée unique pour création manuelle et import CSV) est le seul endroit qui écrit un matricule. L'affichage se branche ensuite sur les API/pages existantes sans nouvelle logique métier.

**Tech Stack:** Next.js API routes, Supabase (Postgres + PostgREST + RPC), TypeScript, `node --test` pour les tests unitaires.

**Spec:** `docs/superpowers/specs/2026-09-14-matricule-etudiant-design.md`

## Global Constraints

- Format toujours `{PREFIXE}-{ANNÉE}-{SEQ}` — préfixe `"ETU"` par défaut, année réelle de création (4 chiffres), SEQ paddé à 4 chiffres.
- Compteur remis à zéro chaque nouvelle année civile, par centre (table dédiée `center_student_counters`, pas un entier plat).
- Unicité du matricule **par centre**, jamais globale (`profiles_matricule_center_unique`, index partiel sur `matricule is not null`).
- Toute écriture de compteur passe par une fonction Postgres (`next_student_counter` / `bump_student_counter`), jamais par un lire-puis-écrire côté JS (risque de collision sur import CSV en masse).
- `/api/etudiants` (POST) est le seul point d'entrée pour la génération — création manuelle et import CSV appellent cette même route.
- Import CSV : colonne `matricule` optionnelle, prise telle quelle si remplie (aucune détection de format sur une valeur inconnue) ; si elle correspond au format courant du centre, le compteur est synchronisé pour que les prochains matricules générés continuent après.
- Aucune renumérotation rétroactive quand un centre change son préfixe ; aucune modification manuelle d'un matricule via l'UI dans cette version.
- Toutes les migrations SQL sont écrites en fichier `.sql` à la racine de `academie-langues/`, exécutées manuellement par l'utilisateur dans le Supabase SQL Editor — aucune exécution DDL directe possible depuis ce plan.
- Nouveaux textes UI en FR et EN, dans les fichiers `app/i18n/messages/*.ts` existants, même convention (un seul objet par bloc de locale, clé: valeur séparées par virgules).

---

### Task 1: Migration SQL — schéma, compteurs, fonctions

**Files:**
- Create: `academie-langues/supabase-student-matricule-2026-09-14.sql`

**Interfaces:**
- Produces (schéma consommé par toutes les tâches suivantes) :
  - `centers.student_id_prefix` (text, nullable)
  - Table `center_student_counters(center_id uuid, year integer, counter integer, primary key (center_id, year))`
  - `profiles.matricule` (text, nullable) + index unique partiel `profiles_matricule_center_unique` sur `(center_id, matricule) where matricule is not null`
  - Fonction `public.next_student_counter(p_center_id uuid, p_year integer) returns integer`
  - Fonction `public.bump_student_counter(p_center_id uuid, p_year integer, p_min_value integer) returns void`
  - Fonction `public.verify_certificate(p_code text)` étendue : ajoute `student_matricule text` à sa table de retour, sans changer le comportement existant.

Ce fichier n'est pas exécuté par l'implémenteur (pas d'accès DDL) — il est écrit, relu, et l'utilisateur l'exécute manuellement plus tard.

- [ ] **Step 1: Écrire le fichier de migration**

```sql
-- A executer dans Supabase SQL Editor.
--
-- Systeme de matricule etudiant : chaque etudiant recoit un matricule
-- unique par centre, format {PREFIXE}-{ANNEE}-{SEQ}, genere
-- automatiquement ou repris tel quel d'un import CSV. Voir
-- docs/superpowers/specs/2026-09-14-matricule-etudiant-design.md pour le
-- design complet.

begin;

-- ── 1. Prefixe personnalisable par centre ──────────────────────────────────
alter table public.centers add column if not exists student_id_prefix text;

-- ── 2. Compteur par centre et par annee civile (reset annuel) ─────────────
create table if not exists public.center_student_counters (
  center_id uuid not null references public.centers(id) on delete cascade,
  year integer not null,
  counter integer not null default 0,
  primary key (center_id, year)
);

-- ── 3. Matricule sur le profil, unique par centre uniquement ──────────────
alter table public.profiles add column if not exists matricule text;

drop index if exists public.profiles_matricule_center_unique;
create unique index profiles_matricule_center_unique
  on public.profiles (center_id, matricule)
  where matricule is not null;

-- ── 4. Incrementation atomique (creation normale / generation) ────────────
create or replace function public.next_student_counter(p_center_id uuid, p_year integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_counter integer;
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, 1)
  on conflict (center_id, year)
  do update set counter = center_student_counters.counter + 1
  returning counter into v_counter;
  return v_counter;
end;
$$;

-- ── 5. Synchronisation du compteur (import CSV avec matricule existant) ───
-- Fait avancer le compteur d'une annee a au moins p_min_value, sans jamais
-- le faire reculer (plusieurs imports ne doivent pas se marcher dessus).
create or replace function public.bump_student_counter(p_center_id uuid, p_year integer, p_min_value integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, p_min_value)
  on conflict (center_id, year)
  do update set counter = greatest(center_student_counters.counter, p_min_value);
end;
$$;

-- ── 6. Certificat public : ajoute le matricule a la verification ──────────
-- Definition d'origine (verifiee en direct via pg_get_functiondef avant ce
-- changement) : ne fait que mettre a jour verified_count et joindre
-- profiles.prenom. On ajoute uniquement profiles.matricule au SELECT et au
-- type de retour, rien d'autre ne change.
create or replace function public.verify_certificate(p_code text)
returns table(
  certificate_code text,
  discipline_code text,
  score_summary jsonb,
  issued_at timestamp with time zone,
  student_prenom text,
  student_matricule text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.exam_certificates
  set verified_count = verified_count + 1
  where certificate_code = p_code;

  return query
  select c.certificate_code, c.discipline_code, c.score_summary, c.issued_at, p.prenom, p.matricule
  from public.exam_certificates c
  join public.profiles p on p.id = c.user_id
  where c.certificate_code = p_code;
end;
$function$;

commit;
```

- [ ] **Step 2: Relire le fichier**

Vérifier : les 3 blocs `alter table`/`create table` utilisent `if not exists` (idempotent, rejouable) ; `verify_certificate` reprend exactement le corps d'origine (update + select), seul le SELECT et le type de retour gagnent `student_matricule`/`p.matricule` ; les deux nouvelles fonctions utilisent `on conflict (center_id, year) do update` pour l'atomicité.

- [ ] **Step 3: Commit**

```bash
git add supabase-student-matricule-2026-09-14.sql
git commit -m "fix: migration SQL pour le systeme de matricule etudiant"
```

---

### Task 2: Helper serveur — format et génération

**Files:**
- Create: `academie-langues/app/utils/student-matricule.server.ts`
- Test: `academie-langues/app/utils/student-matricule.test.mjs`

**Interfaces:**
- Consumes: aucune dépendance à d'autres tâches (le fichier ne suppose que l'existence future des fonctions RPC `next_student_counter`/`bump_student_counter` de la Task 1, appelées par leur nom via `.rpc()`).
- Produces (consommé par Task 3) :
  - `DEFAULT_STUDENT_ID_PREFIX: string` (`"ETU"`)
  - `resolveStudentIdPrefix(rawPrefix: string | null | undefined): string`
  - `formatMatricule(prefix: string, year: number, seq: number): string`
  - `parseMatriculeForPrefix(matricule: string, prefix: string): { year: number; seq: number } | null`
  - `generateMatricule(supabaseAdmin: SupabaseClient, centerId: string, prefix: string, year: number): Promise<string>`
  - `syncImportedMatriculeCounter(supabaseAdmin: SupabaseClient, centerId: string, prefix: string, matricule: string): Promise<void>`

- [ ] **Step 1: Écrire le fichier de test (fonctions pures uniquement)**

```js
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  DEFAULT_STUDENT_ID_PREFIX,
  resolveStudentIdPrefix,
  formatMatricule,
  parseMatriculeForPrefix,
} = await import("./student-matricule.server.ts");

test("DEFAULT_STUDENT_ID_PREFIX vaut ETU", () => {
  assert.equal(DEFAULT_STUDENT_ID_PREFIX, "ETU");
});

test("resolveStudentIdPrefix renvoie le defaut si null/undefined/vide", () => {
  assert.equal(resolveStudentIdPrefix(null), "ETU");
  assert.equal(resolveStudentIdPrefix(undefined), "ETU");
  assert.equal(resolveStudentIdPrefix("   "), "ETU");
});

test("resolveStudentIdPrefix renvoie le prefixe personnalise trim", () => {
  assert.equal(resolveStudentIdPrefix("  UNIV-DKR  "), "UNIV-DKR");
});

test("formatMatricule compose prefixe-annee-seq avec padding 4 chiffres", () => {
  assert.equal(formatMatricule("ETU", 2026, 1), "ETU-2026-0001");
  assert.equal(formatMatricule("UNIV-DKR", 2026, 47), "UNIV-DKR-2026-0047");
  assert.equal(formatMatricule("ETU", 2026, 10000), "ETU-2026-10000");
});

test("parseMatriculeForPrefix extrait annee/seq quand ca correspond exactement", () => {
  assert.deepEqual(parseMatriculeForPrefix("ETU-2026-0050", "ETU"), { year: 2026, seq: 50 });
  assert.deepEqual(parseMatriculeForPrefix("UNIV-DKR-2024-0003", "UNIV-DKR"), { year: 2024, seq: 3 });
});

test("parseMatriculeForPrefix renvoie null si le prefixe ne correspond pas", () => {
  assert.equal(parseMatriculeForPrefix("STU2019-4521", "ETU"), null);
});

test("parseMatriculeForPrefix renvoie null si le format general ne correspond pas", () => {
  assert.equal(parseMatriculeForPrefix("ETU-26-1", "ETU"), null);
  assert.equal(parseMatriculeForPrefix("ETU-2026", "ETU"), null);
  assert.equal(parseMatriculeForPrefix("", "ETU"), null);
});

test("parseMatriculeForPrefix echappe les caracteres speciaux du prefixe", () => {
  // Un prefixe contenant un caractere regex special (ex. un point) ne doit
  // pas etre interprete comme un pattern.
  assert.equal(parseMatriculeForPrefix("ETUX2026-0001", "ETU."), null);
  assert.deepEqual(parseMatriculeForPrefix("ETU.-2026-0001", "ETU."), { year: 2026, seq: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academie-langues && node --experimental-strip-types --test app/utils/student-matricule.test.mjs`
Expected: FAIL — le fichier `student-matricule.server.ts` n'existe pas encore.

- [ ] **Step 3: Écrire l'implémentation**

Create `academie-langues/app/utils/student-matricule.server.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_STUDENT_ID_PREFIX = "ETU";

export function resolveStudentIdPrefix(rawPrefix: string | null | undefined): string {
  return rawPrefix?.trim() || DEFAULT_STUDENT_ID_PREFIX;
}

export function formatMatricule(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Si `matricule` correspond exactement au format {prefix}-{annee}-{seq},
 * renvoie l'annee et le seq extraits. Sinon null (format inconnu — on ne
 * devine rien, voir design "Hors scope").
 */
export function parseMatriculeForPrefix(
  matricule: string,
  prefix: string,
): { year: number; seq: number } | null {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d{4})-(\\d{4})$`);
  const match = pattern.exec(matricule.trim());
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

/** Génère le prochain matricule pour ce centre/année (incrémentation atomique côté DB). */
export async function generateMatricule(
  supabaseAdmin: SupabaseClient,
  centerId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("next_student_counter", {
    p_center_id: centerId,
    p_year: year,
  });
  if (error || typeof data !== "number") {
    throw new Error("Génération du matricule impossible : " + (error?.message || "réponse invalide"));
  }
  return formatMatricule(prefix, year, data);
}

/**
 * Si le matricule importé correspond au format courant du centre, fait
 * avancer le compteur de cette année pour que les prochains matricules
 * générés continuent après. Ne fait rien si le format ne correspond pas.
 */
export async function syncImportedMatriculeCounter(
  supabaseAdmin: SupabaseClient,
  centerId: string,
  prefix: string,
  matricule: string,
): Promise<void> {
  const parsed = parseMatriculeForPrefix(matricule, prefix);
  if (!parsed) return;
  await supabaseAdmin.rpc("bump_student_counter", {
    p_center_id: centerId,
    p_year: parsed.year,
    p_min_value: parsed.seq,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academie-langues && node --experimental-strip-types --test app/utils/student-matricule.test.mjs`
Expected: PASS, 8 tests verts.

- [ ] **Step 5: Vérifier le typecheck global**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean (le fichier importe `SupabaseClient` en type-only depuis `@supabase/supabase-js`, déjà une dépendance du projet).

- [ ] **Step 6: Commit**

```bash
git add app/utils/student-matricule.server.ts app/utils/student-matricule.test.mjs
git commit -m "feat: helper de generation/synchronisation du matricule etudiant"
```

---

### Task 3: Génération dans `/api/etudiants` (création + import)

**Files:**
- Modify: `academie-langues/app/api/etudiants/route.ts`

**Interfaces:**
- Consumes: `resolveStudentIdPrefix`, `generateMatricule`, `syncImportedMatriculeCounter` de `app/utils/student-matricule.server.ts` (Task 2). Suppose les fonctions RPC `next_student_counter`/`bump_student_counter` et la colonne `centers.student_id_prefix`/`profiles.matricule` de la Task 1 déployées en base avant tout test live (le code compile et se relit sans, mais ne fonctionnera qu'après exécution de la migration SQL).
- Produces: le body accepté par `POST /api/etudiants` gagne un champ optionnel `matricule?: string` — Task 4 (import CSV) l'utilise.

**Context:** Le body est déstructuré ligne ~156-159 :
```ts
const {
  prenom, nom, phone,
  filiere_id, niveau_id, groupe_id, campus_id, tuition_fee,
} = body;
```
Le centre est déjà chargé ligne ~330-334 :
```ts
if (callerCenterId) {
  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("nexa_offer, status, created_at, center_type, quota_overrides")
    .eq("id", callerCenterId)
    .maybeSingle();
  centerTypeRaw = centerRow?.center_type ?? null;
  ...
}
```
Le profil est upsert ligne ~497-527, avec un fallback en cas d'erreur (colonnes optionnelles absentes) puis un nettoyage de l'utilisateur auth créé en cas d'échec définitif (ligne ~537-539) :
```ts
if (profErr) {
  await supabaseAdmin.auth.admin.deleteUser(newStudentId);
  return NextResponse.json({ error: "Échec du profil : " + profErr.message }, { status: 500 });
}
```

- [ ] **Step 1: Lire le fichier pour confirmer les lignes exactes**

Read: `academie-langues/app/api/etudiants/route.ts` autour des lignes indiquées ci-dessus (le fichier a pu légèrement bouger depuis l'écriture de ce plan — se caler sur le code montré, pas les numéros de ligne).

- [ ] **Step 2: Importer le helper**

Ajouter en haut du fichier, avec les autres imports :
```ts
import {
  resolveStudentIdPrefix,
  generateMatricule,
  syncImportedMatriculeCounter,
} from "@/app/utils/student-matricule.server";
```

- [ ] **Step 3: Étendre le select du centre pour récupérer le préfixe**

Remplacer :
```ts
      const { data: centerRow } = await supabaseAdmin
        .from("centers")
        .select("nexa_offer, status, created_at, center_type, quota_overrides")
        .eq("id", callerCenterId)
        .maybeSingle();
      centerTypeRaw = centerRow?.center_type ?? null;
```
par :
```ts
      const { data: centerRow } = await supabaseAdmin
        .from("centers")
        .select("nexa_offer, status, created_at, center_type, quota_overrides, student_id_prefix")
        .eq("id", callerCenterId)
        .maybeSingle();
      centerTypeRaw = centerRow?.center_type ?? null;
      centerStudentIdPrefix = resolveStudentIdPrefix(centerRow?.student_id_prefix ?? null);
```

Déclarer `centerStudentIdPrefix` avec les autres variables du même bloc (juste au-dessus de `if (callerCenterId) {`, aux côtés de `centerTypeRaw`, `centerQuotaOverrides`, `centerOfferKey`) :
```ts
    let centerStudentIdPrefix: string = resolveStudentIdPrefix(null);
```

- [ ] **Step 4: Résoudre le matricule avant l'upsert du profil**

Juste avant `// ---- 6. Renseigner le profil ----`, ajouter :
```ts
    // ---- 5b. Résoudre le matricule ----
    const importedMatricule = typeof body.matricule === "string" ? body.matricule.trim() : "";
    let matricule: string | null = null;
    if (callerCenterId) {
      if (importedMatricule) {
        matricule = importedMatricule;
        await syncImportedMatriculeCounter(
          supabaseAdmin, callerCenterId, centerStudentIdPrefix, importedMatricule,
        );
      } else {
        matricule = await generateMatricule(
          supabaseAdmin, callerCenterId, centerStudentIdPrefix, new Date().getFullYear(),
        );
      }
    }
```

- [ ] **Step 5: Ajouter le matricule au payload du profil**

Dans le bloc `profilePayload`, ajouter `matricule,` :
```ts
    const profilePayload: Record<string, unknown> = {
      id: newStudentId,
      prenom,
      nom,
      email: normalizedEmail,
      phone: phone || null,
      matricule,
      role: "student",
```

- [ ] **Step 6: Message d'erreur explicite en cas de collision de matricule**

Remplacer :
```ts
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(newStudentId);
      return NextResponse.json({ error: "Échec du profil : " + profErr.message }, { status: 500 });
    }
```
par :
```ts
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(newStudentId);
      if (profErr.message.includes("profiles_matricule_center_unique")) {
        return NextResponse.json(
          { error: `Le matricule "${matricule}" est déjà utilisé dans ce centre.` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Échec du profil : " + profErr.message }, { status: 500 });
    }
```

- [ ] **Step 7: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

Ce fichier ne peut pas être testé en unité sans instance Supabase live (écritures service_role) — pas de nouveau test ici, cohérent avec le reste de cette route.

- [ ] **Step 8: Commit**

```bash
git add app/api/etudiants/route.ts
git commit -m "feat: generation/reprise du matricule a la creation d'etudiant"
```

---

### Task 4: Import CSV — colonne matricule optionnelle

**Files:**
- Modify: `academie-langues/app/components/centre/students/ImportStudentsCsvModal.tsx`

**Interfaces:**
- Consumes: `POST /api/etudiants` avec `matricule?: string` dans le body (Task 3).
- Produces: aucun nouvel export — composant terminal.

**Context:** `TEMPLATE_HEADERS` (ligne ~28-32) :
```ts
const TEMPLATE_HEADERS = [
  "prenom", "nom", "email", "telephone", "programme", "campus", "niveau",
  "classe", "genre", "date_naissance", "pays", "region", "duree_mois", "coupon",
  "annee_scolaire", "tuteur_nom", "tuteur_lien", "tuteur_tel",
];
```
`ParsedRow` (ligne ~56-77), la fonction `downloadTemplate` (ligne ~169-182), le parsing des lignes CSV (ligne ~345-365), et la construction du `body` envoyé à `/api/etudiants` (ligne ~437-448).

- [ ] **Step 1: Lire le fichier pour confirmer les lignes exactes**

Read: `academie-langues/app/components/centre/students/ImportStudentsCsvModal.tsx` sur les 4 zones listées ci-dessus.

- [ ] **Step 2: Ajouter `matricule` en dernière position des en-têtes**

Remplacer :
```ts
const TEMPLATE_HEADERS = [
  "prenom", "nom", "email", "telephone", "programme", "campus", "niveau",
  "classe", "genre", "date_naissance", "pays", "region", "duree_mois", "coupon",
  "annee_scolaire", "tuteur_nom", "tuteur_lien", "tuteur_tel",
];
```
par :
```ts
const TEMPLATE_HEADERS = [
  "prenom", "nom", "email", "telephone", "programme", "campus", "niveau",
  "classe", "genre", "date_naissance", "pays", "region", "duree_mois", "coupon",
  "annee_scolaire", "tuteur_nom", "tuteur_lien", "tuteur_tel", "matricule",
];
```

- [ ] **Step 3: Ajouter `matricule` au type `ParsedRow`**

Dans le type `ParsedRow`, ajouter le champ juste avant `error?`:
```ts
  guardianPhone: string;
  matricule: string;
  error?: string;
};
```

- [ ] **Step 4: Étendre le fichier gabarit téléchargeable**

Dans `downloadTemplate`, l'exemple a une valeur vide par colonne — ajouter une entrée de plus (chaîne vide, la colonne est optionnelle) :
```ts
function downloadTemplate() {
  const example = [
    "Jean", "DUPONT", "jean.dupont@example.com", "690000000",
    "", "", "1", "", "Homme", "2005-03-12", "CM", "", "", "", "", "", "", "", "",
  ];
```
(un `""` de plus à la fin de la liste, pour la 19e colonne `matricule`.)

- [ ] **Step 5: Extraire la colonne dans le parsing des lignes**

Dans le `.map` qui construit `ParsedRow` (juste après `guardianPhone: cell(...)`), ajouter :
```ts
      guardianPhone: cell(headers, raw, "tuteur_tel", "guardian_phone", "tuteur_telephone"),
      matricule: cell(headers, raw, "matricule", "student_id", "registration_number"),
    }));
```

- [ ] **Step 6: Transmettre le matricule dans le body envoyé à l'API**

Dans `runImport`, juste après la construction de `body` (après `if (row.coupon) body.coupon_code = row.coupon.toUpperCase();`), ajouter :
```ts
        if (row.coupon) body.coupon_code = row.coupon.toUpperCase();
        if (row.matricule) body.matricule = row.matricule;
```

- [ ] **Step 7: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/components/centre/students/ImportStudentsCsvModal.tsx
git commit -m "feat: colonne matricule optionnelle dans l'import CSV etudiants"
```

---

### Task 5: Réglage centre — préfixe personnalisé

**Files:**
- Modify: `academie-langues/app/centre/parametres/entreprise/page.tsx`
- Modify: `academie-langues/app/i18n/messages/centre.ts`

**Interfaces:**
- Consumes: `centers.student_id_prefix` (Task 1, colonne DB).
- Produces: aucun nouvel export — page terminale.

**Context:** Le centre est chargé ligne ~210-213 :
```ts
    const { data: center, error: cErr } = await supabase
      .from("centers").select("name, center_type").eq("id", cId).single();
    if (cErr) console.error("centers:", cErr.message);
    if (center) { setDisplayName(center.name || ""); setCenterType(center.center_type || "generic"); }
```
La sauvegarde met déjà à jour `centers` ligne ~396-398 :
```ts
    const { error: e1 } = await supabase
      .from("centers").update({ name: displayName.trim() }).eq("id", centerId);
    if (e1) { alert(t("centre", "companyDisplayNameError", { message: e1.message })); setSaving(false); return; }
```
La dernière section du formulaire est "Signataires officiels", ligne ~583-584 :
```tsx
      <Section icon={Signature} title={t("centre", "companySignatoriesTitle")}
        description={t("centre", "companySignatoriesDescription")}>
```
Les helpers `Section`, `FieldLabel`, `Field` sont définis en bas du fichier (~ligne 698-738), réutilisables tels quels.

- [ ] **Step 1: Lire le fichier pour confirmer les lignes exactes**

Read: `academie-langues/app/centre/parametres/entreprise/page.tsx` sur les 3 zones ci-dessus, et la fin du fichier (dernière balise fermante de la section Signataires, juste avant `</div>` de fermeture du formulaire) pour repérer où insérer une nouvelle `<Section>`.

- [ ] **Step 2: Ajouter les clés i18n (FR + EN)**

Dans `academie-langues/app/i18n/messages/centre.ts`, bloc FR, trouver cette sous-chaîne exacte (elle apparaît une fois) :
```
companySignatoriesTitle: "Signataires officiels", companySignatoriesDescription: "Apparaissent au bas des bulletins et reçus, dans l'ordre ci-dessous. Le cachet est apposé automatiquement.",
```
et ajouter juste après, sur la même ligne :
```
matriculeSectionTitle: "Matricules étudiants", matriculeSectionDescription: "Chaque étudiant reçoit un matricule unique, au format PRÉFIXE-ANNÉE-NUMÉRO. Ce réglage ne concerne que les futurs étudiants.", matriculeModeGenerated: "Généré automatiquement", matriculeModeCustom: "Préfixe personnalisé", matriculePrefixLabel: "Préfixe", matriculePrefixPlaceholder: "Ex. : UNIV-DKR", matriculePreviewLabel: "Aperçu",
```

Bloc EN, trouver la sous-chaîne exacte (une fois) :
```
companySignatoriesTitle: "Official signatories", companySignatoriesDescription: "They appear at the bottom of report cards and receipts in the order below. The stamp is applied automatically.",
```
et ajouter juste après :
```
matriculeSectionTitle: "Student IDs", matriculeSectionDescription: "Every student gets a unique ID, formatted as PREFIX-YEAR-NUMBER. This setting only affects future students.", matriculeModeGenerated: "Auto-generated", matriculeModeCustom: "Custom prefix", matriculePrefixLabel: "Prefix", matriculePrefixPlaceholder: "E.g.: UNIV-DKR", matriculePreviewLabel: "Preview",
```

- [ ] **Step 3: Ajouter l'état et le chargement du préfixe**

Ajouter un state, aux côtés des autres (`// --- Identifiants légaux ---` par exemple) :
```ts
  const [studentIdPrefix, setStudentIdPrefix] = useState("");
```

Étendre le select du centre :
```ts
    const { data: center, error: cErr } = await supabase
      .from("centers").select("name, center_type, student_id_prefix").eq("id", cId).single();
    if (cErr) console.error("centers:", cErr.message);
    if (center) {
      setDisplayName(center.name || "");
      setCenterType(center.center_type || "generic");
      setStudentIdPrefix(center.student_id_prefix || "");
    }
```

- [ ] **Step 4: Étendre la sauvegarde**

```ts
    const { error: e1 } = await supabase
      .from("centers").update({
        name: displayName.trim(),
        student_id_prefix: studentIdPrefix.trim() || null,
      }).eq("id", centerId);
```

- [ ] **Step 5: Ajouter la section UI**

Après la fermeture de la `<Section>` "Signataires officiels" (après son `</Section>`), ajouter :
```tsx
      <Section icon={Hash} title={t("centre", "matriculeSectionTitle")}
        description={t("centre", "matriculeSectionDescription")}>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStudentIdPrefix("")} disabled={isLocked}
            className={`flex-1 h-11 rounded-xl border text-sm font-bold transition ${
              !studentIdPrefix.trim() ? "border-[#11224E] bg-[#11224E]/5 text-[#11224E]" : "border-neutral-200 text-neutral-500"
            }`}>
            {t("centre", "matriculeModeGenerated")}
          </button>
          <button type="button" onClick={() => setStudentIdPrefix(studentIdPrefix || "ETU")} disabled={isLocked}
            className={`flex-1 h-11 rounded-xl border text-sm font-bold transition ${
              studentIdPrefix.trim() ? "border-[#11224E] bg-[#11224E]/5 text-[#11224E]" : "border-neutral-200 text-neutral-500"
            }`}>
            {t("centre", "matriculeModeCustom")}
          </button>
        </div>
        {studentIdPrefix.trim() !== "" && (
          <Field label={t("centre", "matriculePrefixLabel")} value={studentIdPrefix}
            onChange={setStudentIdPrefix} placeholder={t("centre", "matriculePrefixPlaceholder")} disabled={isLocked} />
        )}
        <p className="text-xs text-neutral-500 font-medium">
          {t("centre", "matriculePreviewLabel")} :{" "}
          <span className="font-bold text-[#11224E]">
            {(studentIdPrefix.trim() || "ETU")}-{new Date().getFullYear()}-0001
          </span>
        </p>
      </Section>
```

- [ ] **Step 6: Importer l'icône `Hash`**

Ajouter `Hash` à l'import `lucide-react` en haut du fichier :
```ts
import {
  Camera, Loader2, CheckCircle2, FileUp, X, Plus, Trash2,
  ChevronUp, ChevronDown, PenLine, Stamp, Building2, ScrollText,
  Globe2, Signature, Hash,
} from "lucide-react";
```

- [ ] **Step 7: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/centre/parametres/entreprise/page.tsx app/i18n/messages/centre.ts
git commit -m "feat: reglage centre pour le prefixe de matricule etudiant"
```

---

### Task 6: Affichage — liste étudiants + profil côté centre

**Files:**
- Modify: `academie-langues/app/api/center/enrollments-list/route.ts`
- Modify: `academie-langues/app/centre/etudiants/page.tsx`
- Modify: `academie-langues/app/components/centre/students/StudentIdentityTab.tsx`

**Interfaces:**
- Consumes: `profiles.matricule` (Task 1).
- Produces: `StudentRow.matricule: string | null` — utilisé en interne à ce fichier uniquement, aucune autre tâche n'en dépend.

**Context — `enrollments-list/route.ts` :** deux `select` sur `profiles`, lignes ~79 et ~88 :
```ts
    .select("id, prenom, nom, email, phone, avatar_url, center_status, birth_date, genre")
```
```ts
      .select("id, prenom, nom, email, phone, avatar_url, center_status")
```

**Context — `etudiants/page.tsx` :** le type `StudentRow` (ligne ~71-82), le filtre de recherche (ligne ~502-508), la cellule tableau nom/email (ligne ~761-766), et l'appel à `StudentIdentityTab` (ligne ~869-875).

**Context — `StudentIdentityTab.tsx` :** les `Props` (ligne ~70-94) et le bloc `<p>` nom/e-mail/téléphone (ligne ~545-548) — pas de composant `Row`/`MetaLine` à cet endroit, du JSX direct.

- [ ] **Step 1: Lire les 3 fichiers pour confirmer les lignes exactes**

Read: les 3 fichiers listés, sur les zones indiquées ci-dessus (le code a pu légèrement bouger depuis l'écriture de ce plan — se caler sur le code montré, pas les numéros de ligne).

- [ ] **Step 2: Étendre les 2 selects de `enrollments-list/route.ts`**

```ts
    .select("id, prenom, nom, email, phone, avatar_url, center_status, birth_date, genre, matricule")
```
et
```ts
      .select("id, prenom, nom, email, phone, avatar_url, center_status, matricule")
```

- [ ] **Step 3: Étendre `StudentRow` et le filtre de recherche**

```ts
type StudentRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  matricule: string | null;
  avatar_url: string | null;
  birth_date: string | null;     // YYYY-MM-DD
  genre: string | null;
  center_status: "active" | "paused" | "revoked" | "pending_center_approval" | string;
  enrollments: Enrollment[];
};
```

```ts
  const filtered = students.filter((s) => {
    const matchSearch   = !search || `${s.prenom} ${s.nom} ${s.email} ${s.matricule || ""}`.toLowerCase().includes(search.toLowerCase());
```

- [ ] **Step 4: Afficher le matricule sous l'e-mail dans le tableau**

La première cellule du tableau empile déjà nom et e-mail (pas de colonne dédiée par étudiant — ajouter une colonne changerait l'en-tête, l'export CSV/PDF et le colspan pour un gain minime). Remplacer :
```tsx
                        <td className="px-4 py-3.5 min-w-0 print:break-inside-avoid">
                          <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: BLUE }}>
                            {`${s.prenom || ""} ${s.nom || ""}`.trim().toUpperCase()}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">{s.email || "—"}</p>
                        </td>
```
par :
```tsx
                        <td className="px-4 py-3.5 min-w-0 print:break-inside-avoid">
                          <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: BLUE }}>
                            {`${s.prenom || ""} ${s.nom || ""}`.trim().toUpperCase()}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">{s.email || "—"}</p>
                          {s.matricule && (
                            <p className="text-[10px] text-neutral-400 font-semibold mt-0.5 truncate">{s.matricule}</p>
                          )}
                        </td>
```

- [ ] **Step 5: Passer le matricule à `StudentIdentityTab`**

```tsx
                  <StudentIdentityTab
                    studentId={selectedStudent.id}
                    enrollmentId={selectedEnrollment?.id}
                    studentName={`${selectedStudent.prenom || ""} ${selectedStudent.nom || ""}`.trim().toUpperCase()}
                    studentEmail={selectedStudent.email}
                    studentMatricule={selectedStudent.matricule}
                    studentPhone={selectedStudent.phone}
```

- [ ] **Step 6: Étendre `StudentIdentityTab` — props et rendu**

Ajouter à `Props` :
```ts
type Props = {
  studentId: string;
  enrollmentId?: string | null;
  studentName: string;
  studentEmail: string;
  studentMatricule: string | null;
  studentPhone: string | null;
```

Ajouter au paramètre de la fonction :
```ts
export default function StudentIdentityTab({
  studentId,
  enrollmentId,
  studentName,
  studentEmail,
  studentMatricule,
  studentPhone,
```

Le nom, l'e-mail et le téléphone sont rendus en `<p>` simples (pas de composant `Row`/`MetaLine` à cet endroit) :
```tsx
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-extrabold text-lg truncate" style={{ color: BLUE }}>{studentName}</p>
            <p className="text-sm text-neutral-500 font-medium truncate">{studentEmail}</p>
            {studentPhone && <p className="text-sm text-neutral-500 font-medium">{studentPhone}</p>}
```
Remplacer par :
```tsx
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-extrabold text-lg truncate" style={{ color: BLUE }}>{studentName}</p>
            <p className="text-sm text-neutral-500 font-medium truncate">{studentEmail}</p>
            {studentMatricule && <p className="text-sm text-neutral-500 font-medium">{studentMatricule}</p>}
            {studentPhone && <p className="text-sm text-neutral-500 font-medium">{studentPhone}</p>}
```

- [ ] **Step 7: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/api/center/enrollments-list/route.ts app/centre/etudiants/page.tsx app/components/centre/students/StudentIdentityTab.tsx
git commit -m "feat: matricule visible dans la liste et le profil etudiant cote centre"
```

---

### Task 7: Affichage — profil étudiant lui-même

**Files:**
- Modify: `academie-langues/app/api/student/account/route.ts`
- Modify: `academie-langues/app/profil/CenterStudentProfil.tsx`
- Modify: `academie-langues/app/i18n/messages/dashboard.ts`

**Interfaces:**
- Consumes: `profiles.matricule` (Task 1).
- Produces: aucun nouvel export — page terminale.

**Context — `student/account/route.ts` :** deux `select` sur `profiles` (chemin GET principal et fallback), lignes ~25 et ~37 :
```ts
      "id, prenom, nom, email, phone, ville, city, country, country_code, region, birth_date, genre, role, center_id, avatar_url, created_at, center_status, tag_status, access_pause_reason, pack_name, subscription_ends_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used, tutor_ia_total, tutor_ia_used, tutor_unlock_at",
```
```ts
        "id, prenom, nom, email, phone, ville, city, country, country_code, region, birth_date, genre, role, center_id, avatar_url, created_at, center_status, tag_status, pack_name, subscription_ends_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used, tutor_ia_total, tutor_ia_used, tutor_unlock_at",
```

**Context — `CenterStudentProfil.tsx` :** le type `StudentAccount.profile` (ligne ~69-84) et le rendu `<Row icon={Mail} label={td("profilEmail")} value={...} />` (ligne ~615).

- [ ] **Step 1: Lire les 2 fichiers pour confirmer les lignes exactes**

Read: les zones indiquées dans les 2 fichiers.

- [ ] **Step 2: Ajouter `matricule` aux 2 selects de `student/account/route.ts`**

Ajouter `, matricule` à la fin de chacune des deux chaînes `.select(...)` montrées ci-dessus (uniquement ces deux — celle en ligne ~330, utilisée par le PATCH, n'a pas besoin d'être modifiée : le matricule n'est jamais édité, il reste dans l'état déjà chargé par le GET).

- [ ] **Step 3: Ajouter `matricule` au type `StudentAccount.profile`**

```ts
type StudentAccount = {
  user: { id: string; email: string | null; created_at: string | null };
  profile: {
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    matricule: string | null;
    phone: string | null;
```

- [ ] **Step 4: Ajouter la clé i18n**

Dans `app/i18n/messages/dashboard.ts`, bloc FR, trouver la sous-chaîne exacte (une fois) :
```
profilEmail: "Email",
```
remplacer par :
```
profilEmail: "Email", profilMatricule: "Matricule",
```
Bloc EN, trouver :
```
profilEmail: "Email",
```
remplacer par :
```
profilEmail: "Email", profilMatricule: "Student ID",
```

- [ ] **Step 5: Ajouter la ligne matricule au rendu**

Juste après :
```tsx
          <Row icon={Mail} label={td("profilEmail")} value={account.profile.email || account.user.email || emptyValue} />
```
ajouter :
```tsx
          <Row icon={Hash} label={td("profilMatricule")} value={account.profile.matricule || emptyValue} />
```

- [ ] **Step 6: Importer l'icône `Hash`**

Ajouter `Hash` à l'import `lucide-react` en haut du fichier (dans la liste alphabétique existante, entre `Building2` et `Calendar` ou à un endroit cohérent) :
```ts
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Lock,
```

- [ ] **Step 7: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/api/student/account/route.ts app/profil/CenterStudentProfil.tsx app/i18n/messages/dashboard.ts
git commit -m "feat: matricule visible sur le profil de l'etudiant lui-meme"
```

---

### Task 8: Affichage — bulletin

**Files:**
- Modify: `academie-langues/app/components/BulletinDynamique.tsx`
- Modify: `academie-langues/app/i18n/messages/centre.ts`

**Interfaces:**
- Consumes: `profiles.matricule` (Task 1).
- Produces: aucun nouvel export — composant terminal.

**Context:** La requête de chargement (ligne ~91-101) :
```ts
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id, groupe_id, filieres(center_id), profiles:student_id(prenom, nom), groupes:groupe_id(nom)")
        .eq("id", enrollmentId)
        .single();

      const centerId = (enr as any)?.filieres?.center_id;
      const prenom = (enr as any)?.profiles?.prenom || "";
      const nom = (enr as any)?.profiles?.nom || "";
      setStudentName(`${prenom} ${nom}`.trim());
      setStudentClasse((enr as any)?.groupes?.nom || "");
```
Le rendu de l'identité de l'apprenant (ligne ~465-474) :
```tsx
        <div className="bg-[#F7F7F6] p-4 rounded-xl border border-black/[0.06] mb-5 flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "bulletinLearner")}</p>
            <p className="font-extrabold text-sm tracking-tight" style={{ color: BLUE }}>{studentName}</p>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {enrollmentLabel}
```

- [ ] **Step 1: Lire le fichier pour confirmer les lignes exactes**

Read: `academie-langues/app/components/BulletinDynamique.tsx` sur les 2 zones ci-dessus.

- [ ] **Step 2: Ajouter le state et étendre la requête**

Ajouter le state à côté de `studentClasse` :
```ts
  const [studentClasse, setStudentClasse] = useState("");
  const [studentMatricule, setStudentMatricule] = useState("");
```

Étendre le select et l'extraction :
```ts
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id, groupe_id, filieres(center_id), profiles:student_id(prenom, nom, matricule), groupes:groupe_id(nom)")
        .eq("id", enrollmentId)
        .single();

      const centerId = (enr as any)?.filieres?.center_id;
      const prenom = (enr as any)?.profiles?.prenom || "";
      const nom = (enr as any)?.profiles?.nom || "";
      setStudentName(`${prenom} ${nom}`.trim());
      setStudentMatricule((enr as any)?.profiles?.matricule || "");
      setStudentClasse((enr as any)?.groupes?.nom || "");
```

- [ ] **Step 3: Ajouter la clé i18n**

Dans `app/i18n/messages/centre.ts`, réutiliser l'ancre déjà modifiée aux Tasks 5/6, bloc FR, ajouter à la suite :
```
studentMatriculeLabel: "Matricule", bulletinMatricule: "Matricule",
```
bloc EN :
```
studentMatriculeLabel: "Student ID", bulletinMatricule: "Student ID",
```

- [ ] **Step 4: Afficher le matricule sous le nom de l'apprenant**

```tsx
            <p className="font-extrabold text-sm tracking-tight" style={{ color: BLUE }}>{studentName}</p>
            {studentMatricule && (
              <p className="text-[11px] text-neutral-500 font-semibold mt-0.5">
                {t("centre", "bulletinMatricule")} : {studentMatricule}
              </p>
            )}
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {enrollmentLabel}
```

- [ ] **Step 5: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/components/BulletinDynamique.tsx app/i18n/messages/centre.ts
git commit -m "feat: matricule affiche sur le bulletin de notes"
```

---

### Task 9: Affichage — certificat public

**Files:**
- Modify: `academie-langues/app/certificat/[code]/CertificatView.tsx`
- Modify: `academie-langues/app/i18n/messages/sharedDocuments.ts`

**Interfaces:**
- Consumes: `verify_certificate()` renvoie désormais `student_matricule: string | null` (Task 1, SQL uniquement — ce champ n'existera en pratique qu'une fois la migration exécutée manuellement par l'utilisateur ; le code de cette tâche compile et se relit indépendamment de ça).
- Produces: aucun nouvel export — composant terminal.

**Context:** Le fichier complet fait 60 lignes. Le type `Cert` (ligne 7-12) et son usage dans `CertificatValid` (ligne 26-59), en particulier le bloc affichant `student_prenom` (ligne 39-42).

- [ ] **Step 1: Lire le fichier**

Read: `academie-langues/app/certificat/[code]/CertificatView.tsx` (fichier court, le lire en entier pour confirmer qu'il n'a pas changé depuis l'écriture de ce plan).

- [ ] **Step 2: Étendre le type `Cert`**

```ts
type Cert = {
  student_prenom: string;
  student_matricule: string | null;
  discipline_code: string;
  issued_at: string;
  certificate_code: string;
};
```

- [ ] **Step 3: Ajouter la ligne matricule au rendu (si présent)**

Juste après le bloc candidat, avant le bloc "Sujet" :
```tsx
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatCandidateLabel")} </span>
            {cert.student_prenom}
          </p>
          {cert.student_matricule && (
            <p className="text-sm">
              <span className="font-bold text-slate-900">{t("marketing", "certificatMatriculeLabel")} </span>
              {cert.student_matricule}
            </p>
          )}
          <p className="text-sm">
            <span className="font-bold text-slate-900">{t("marketing", "certificatSubjectLabel")} </span>
            {cert.discipline_code}
          </p>
```

- [ ] **Step 4: Ajouter la clé i18n**

La clé `certificatCandidateLabel` (utilisée juste au-dessus dans ce composant, via `t("marketing", "certificatCandidateLabel")`) est en réalité définie dans `app/i18n/messages/sharedDocuments.ts` (fusionnée dans le namespace `marketing` à la construction des messages) — c'est ce fichier qu'il faut modifier, pas `marketing.ts`.

Dans `app/i18n/messages/sharedDocuments.ts`, bloc FR, trouver cette sous-chaîne exacte (apparaît une fois) :
```
certificatCandidateLabel: "Candidat :",
```
remplacer par :
```
certificatCandidateLabel: "Candidat :", certificatMatriculeLabel: "Matricule :",
```

Bloc EN, trouver :
```
certificatCandidateLabel: "Candidate:",
```
remplacer par :
```
certificatCandidateLabel: "Candidate:", certificatMatriculeLabel: "Student ID:",
```

- [ ] **Step 5: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/certificat/[code]/CertificatView.tsx app/i18n/messages/sharedDocuments.ts
git commit -m "feat: matricule affiche sur la page de verification de certificat"
```

---

### Task 10: Backfill des étudiants existants

**Files:**
- Create: `academie-langues/scripts/backfill-student-matricules.mjs`

**Interfaces:**
- Consumes: mêmes fonctions RPC que Task 2/3 (`next_student_counter`), appelées directement via `supabaseAdmin.rpc(...)` (le script est autonome, ne peut pas importer un fichier `.server.ts` de l'app Next.js — même limite que `seed-demo-accounts.mjs`, qui duplique sa propre logique plutôt que d'importer `app/`).
- Produces: rien consommé par une autre tâche — script terminal, exécuté manuellement une fois par l'utilisateur après la migration SQL (Task 1) ET après le déploiement du code des Tasks 2-9.

**Context:** Suivre exactement la structure de `academie-langues/scripts/seed-demo-accounts.mjs` (lecture de `.env.local` via `--env-file`, client `service_role`, fonctions `ok`/`fail` pour le logging, `main()` en bas de fichier).

- [ ] **Step 1: Écrire le script**

```js
/**
 * Attribue retroactivement un matricule aux etudiants deja crees avant ce
 * chantier (profiles.matricule est null). Idempotent : un etudiant qui a
 * deja un matricule est ignore, le script est rejouable sans risque.
 * Usage: node --env-file=.env.local scripts/backfill-student-matricules.mjs
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
const warn = (m) => console.warn(`! ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const DEFAULT_PREFIX = "ETU";

function formatMatricule(prefix, year, seq) {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

async function nextCounter(centerId, year) {
  const { data, error } = await sb.rpc("next_student_counter", {
    p_center_id: centerId,
    p_year: year,
  });
  if (error || typeof data !== "number") {
    throw new Error(error?.message || "réponse invalide de next_student_counter");
  }
  return data;
}

async function backfillCenter(center) {
  const prefix = center.student_id_prefix?.trim() || DEFAULT_PREFIX;

  const { data: students, error } = await sb
    .from("profiles")
    .select("id, created_at")
    .eq("center_id", center.id)
    .eq("role", "student")
    .is("matricule", null)
    .order("created_at", { ascending: true });

  if (error) {
    warn(`${center.name} : lecture étudiants échouée (${error.message})`);
    return { attempted: 0, done: 0 };
  }
  if (!students || students.length === 0) return { attempted: 0, done: 0 };

  let done = 0;
  for (const student of students) {
    const year = new Date(student.created_at).getFullYear();
    try {
      const seq = await nextCounter(center.id, year);
      const matricule = formatMatricule(prefix, year, seq);
      const { error: updErr } = await sb
        .from("profiles")
        .update({ matricule })
        .eq("id", student.id)
        .is("matricule", null); // ne jamais écraser un matricule déjà posé entre-temps
      if (updErr) {
        warn(`étudiant ${student.id} : échec (${updErr.message})`);
        continue;
      }
      done++;
    } catch (e) {
      warn(`étudiant ${student.id} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { attempted: students.length, done };
}

async function main() {
  const { data: centers, error } = await sb
    .from("centers")
    .select("id, name, student_id_prefix");
  if (error || !centers) fail(`lecture des centres : ${error?.message}`);

  let totalDone = 0;
  let totalAttempted = 0;
  for (const center of centers) {
    const { attempted, done } = await backfillCenter(center);
    totalAttempted += attempted;
    totalDone += done;
    if (attempted > 0) ok(`${center.name} : ${done}/${attempted} matricule(s) attribué(s)`);
  }
  ok(`Backfill terminé. ${totalDone}/${totalAttempted} matricules attribués au total.`);
}

main();
```

- [ ] **Step 2: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean (fichier `.mjs`, non couvert par le typecheck TS, mais ne doit rien casser ailleurs — vérifier simplement qu'il n'y a pas d'erreur de syntaxe en l'importarnt via node) :
Run: `cd academie-langues && node --check scripts/backfill-student-matricules.mjs`
Expected: aucune sortie (syntaxe valide).

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-student-matricules.mjs
git commit -m "feat: script de backfill des matricules pour les etudiants existants"
```

---

### Task 11: Vérification finale (manuelle, après migration SQL exécutée)

**Files:** aucun — vérification uniquement.

Cette tâche ne peut être exécutée qu'après que l'utilisateur a lancé `supabase-student-matricule-2026-09-14.sql` (Task 1) dans Supabase SQL Editor. Avant ça, toutes les tâches de code compilent et passent leurs tests unitaires, mais aucun test live n'est possible (mêmes contraintes que les chantiers précédents de cette session — pas d'accès DDL direct).

- [ ] **Step 1: Suite de tests complète**

Run: `cd academie-langues && npm test`
Expected: tous les tests passent, y compris les 8 nouveaux de la Task 2.

- [ ] **Step 2: Typecheck complet**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Vérification live (nécessite la migration SQL exécutée)**

Avec un serveur de dev local et un compte centre réel :
1. Ouvrir `/centre/parametres/entreprise`, confirmer la présence de la section "Matricules étudiants", basculer sur "Préfixe personnalisé", saisir un préfixe, vérifier l'aperçu, enregistrer.
2. Créer un étudiant manuellement (`CreateStudentModal`), confirmer dans `/centre/etudiants` que son matricule suit le format `{préfixe}-{année}-0001`.
3. Créer un second étudiant, confirmer `0002`.
4. Importer un CSV avec une ligne `matricule` rempli (ex. `{préfixe}-{année}-0050`) et une ligne vide — confirmer que la première garde sa valeur, la seconde est générée.
5. Créer un 3e étudiant manuel juste après cet import — confirmer qu'il obtient `0051`, pas `0001`.
6. Rechercher un étudiant par son matricule dans `/centre/etudiants` — confirmer qu'il apparaît.
7. Ouvrir le profil de l'étudiant côté centre et côté étudiant lui-même — confirmer l'affichage du matricule aux deux endroits.
8. Générer un bulletin pour un étudiant avec matricule — confirmer son affichage.
9. Si un certificat existant est disponible : ouvrir sa page de vérification publique, confirmer l'affichage du matricule.
10. Exécuter `node --env-file=.env.local scripts/backfill-student-matricules.mjs` sur un centre ayant des étudiants antérieurs à ce chantier — confirmer qu'ils reçoivent tous un matricule cohérent par année de création, puis le rejouer une seconde fois et confirmer qu'aucun n'est modifié (idempotence).
