# Parcours LMD Université Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give centers of type `universite` a real LMD pathway (Licence-Master-Doctorat) — Filière → Niveau (L1–M2) → Semestre (count configurable per niveau) → UE (matière + crédits ECTS) — with UE-by-UE credit validation (no cross-UE compensation) and a rattrapage (resit) mechanism, without touching any other center type or any existing université filière already created.

**Architecture:** One new table (`semestres`, child of `niveaux`) plus four new nullable columns on existing tables (`groupes.semestre_id`, `filiere_matieres.semestre_id`, `filiere_matieres.credits`, `enrollments.semestre_id`, `centers.lmd_validation_threshold_pct`). A filière is "LMD" purely by the presence of semestre rows under its niveaux — no new flag to keep in sync. All new logic is additive and gated behind `center_type === "universite"`; every other center type's code path is untouched.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + PostgREST), TypeScript, `node --test` (`.test.mjs` files) for pure-function unit tests, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-16-parcours-lmd-universite-design.md`

## Global Constraints

- Only centers with `centers.center_type === "universite"` may use any LMD feature. All other types (`generic`, `ecole`, `entreprise`, `tcf_canada`) must be provably unaffected — every task that touches a shared file must show the non-university path is unchanged.
- Only **new** université filières use the LMD structure. Existing université filières (created before this plan) are never migrated and must keep working exactly as before.
- Validation threshold: `centers.lmd_validation_threshold_pct` nullable; `null` means 50 (default). Never hardcode `50` more than once — always go through the resolver function defined in Task 2.
- UE validation is strictly per-UE (no compensation): an UE is validated (credits earned) if its own final score (normal, or rattrapage if it clears the threshold) reaches the threshold. No weighted average across UEs decides validation.
- Rattrapage note is recognized by grade **title exactly `"Rattrapage"`** (trim + case-insensitive compare) — reuses the existing "extra grade column" mechanism in the Carnet de notes, no new table.
- Tuition/pricing stays at the **niveau** level — this plan must not touch `app/centre/finance/*` or tuition-resolution logic (`resolveCursusTuition`, `app/utils/cursus-passage.ts`) at all.
- Every SQL migration file lives at the academie-langues repo root (`academie-langues/supabase-<description>-<date>.sql`), wrapped in one `begin;`/`commit;` transaction, with a top-of-file comment telling the operator to verify it committed (matches `academie-langues/supabase-student-matricule-2026-09-14.sql` convention). The assistant/executor has no raw SQL execution capability — these files are written for the human operator to run manually in the Supabase SQL Editor. Do not attempt to run them.
- New RLS policies on `semestres` must mirror the existing policies on `niveaux` (center-scoped staff read, manager/staff-with-`filieres`-permission write) — read the live policies on `niveaux` before writing `semestres`' policies (Task 1, Step 1) rather than guessing.

---

## Task 1: SQL migration — schema for niveau → semestre → UE + crédits

**Files:**
- Create: `academie-langues/supabase-lmd-parcours-2026-09-16.sql`

**Interfaces:**
- Produces: table `public.semestres(id, niveau_id, ordre, nom, credits_cible, created_at)`; columns `public.groupes.semestre_id`, `public.filiere_matieres.semestre_id`, `public.filiere_matieres.credits`, `public.enrollments.semestre_id`, `public.centers.lmd_validation_threshold_pct`. All later tasks read/write these exact names.

- [ ] **Step 1: Read the live RLS policies on `niveaux` and `groupes`**

This is schema design research, not a code step — there is no test to write first. Ask the user to run this in the Supabase SQL Editor and paste the result back:

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('niveaux', 'groupes')
order by tablename, policyname;
```

Use the returned policy definitions as the template for `semestres`' policies in Step 2 — same staff/manager scoping pattern, same permission check (`filieres`), just with the FK chain extended one hop (`semestres.niveau_id → niveaux.id → niveaux.filiere_id → filieres.center_id`).

- [ ] **Step 2: Write the migration file**

```sql
-- Parcours LMD (Licence-Master-Doctorat) pour les centres universite.
-- Ne touche aucune autre table de tarification (niveaux.tuition_fee reste
-- la seule source de prix — voir spec, section "Perimetre").
--
-- IMPORTANT : verifier que cette migration a bien commite avant de
-- deployer le code applicatif qui en depend (Taches 4+ de ce plan) :
--   select to_regclass('public.semestres');
-- doit retourner 'semestres', pas NULL.

begin;

create table public.semestres (
  id uuid primary key default gen_random_uuid(),
  niveau_id uuid not null references public.niveaux(id) on delete cascade,
  ordre integer not null,
  nom text,
  credits_cible integer,
  created_at timestamptz not null default now()
);
create index semestres_niveau_id_idx on public.semestres(niveau_id);

alter table public.semestres enable row level security;

-- TODO-OPERATEUR : remplacer les deux policies ci-dessous par la copie
-- exacte des policies de `niveaux` (recuperees Etape 1), en etendant la
-- jointure d'un cran : semestres -> niveaux -> filieres -> center_id.
-- Exemple de forme attendue (a adapter aux policies reelles retournees) :
create policy "semestres_select_center_staff" on public.semestres
  for select
  using (
    exists (
      select 1
      from public.niveaux nv
      join public.filieres f on f.id = nv.filiere_id
      join public.center_users cu on cu.center_id = f.center_id
      where nv.id = semestres.niveau_id
        and cu.user_id = auth.uid()
    )
  );

create policy "semestres_write_center_staff" on public.semestres
  for all
  using (
    exists (
      select 1
      from public.niveaux nv
      join public.filieres f on f.id = nv.filiere_id
      join public.center_users cu on cu.center_id = f.center_id
      where nv.id = semestres.niveau_id
        and cu.user_id = auth.uid()
        and (cu.permissions is null or 'filieres' = any(cu.permissions))
    )
  )
  with check (
    exists (
      select 1
      from public.niveaux nv
      join public.filieres f on f.id = nv.filiere_id
      join public.center_users cu on cu.center_id = f.center_id
      where nv.id = semestres.niveau_id
        and cu.user_id = auth.uid()
        and (cu.permissions is null or 'filieres' = any(cu.permissions))
    )
  );

alter table public.groupes add column semestre_id uuid references public.semestres(id) on delete cascade;
alter table public.filiere_matieres add column semestre_id uuid references public.semestres(id) on delete cascade;
alter table public.filiere_matieres add column credits integer;
alter table public.enrollments add column semestre_id uuid references public.semestres(id) on delete set null;
alter table public.centers add column lmd_validation_threshold_pct integer;

commit;
```

- [ ] **Step 3: Ask the user to run the migration and confirm**

Ask the user to run the file in the Supabase SQL Editor, then verify live:

```js
const { data, error } = await admin.from('semestres').select('id').limit(1);
// error should be null (empty array is fine — table just created)
```

Report back the result before starting Task 2.

- [ ] **Step 4: Commit**

```bash
git add academie-langues/supabase-lmd-parcours-2026-09-16.sql
git commit -m "feat: migration SQL parcours LMD (semestres + credits)"
```

---

## Task 2: Pure helpers — seuil de validation, statut des crédits, rattrapage

**Files:**
- Create: `academie-langues/app/utils/lmd-credits.ts`
- Test: `academie-langues/app/utils/lmd-credits.test.mjs`

**Interfaces:**
- Consumes: nothing (pure functions, no DB/network).
- Produces:
  - `resolveLmdValidationThreshold(raw: number | null | undefined): number`
  - `isRattrapageGrade(title: string | null | undefined): boolean`
  - `computeUeFinalStatus(params: { normalScore: number | null; normalMaxScore: number; rattrapageScore: number | null; rattrapageMaxScore: number; thresholdPct: number }): { finalScore: number | null; finalMaxScore: number; validated: boolean }`
  - `computeCreditsStatus(ues: { filiere_matiere_id: string; credits: number }[], statuses: { filiere_matiere_id: string; validated: boolean }[]): { totalCredits: number; acquiredCredits: number; validatedUeIds: string[]; pendingUeIds: string[] }`

Every later task that needs credit/validation logic (Tasks 6, 7, 8) imports from this file — do not reimplement the threshold or validation rule anywhere else.

- [ ] **Step 1: Write the failing tests**

```js
// academie-langues/app/utils/lmd-credits.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLmdValidationThreshold,
  isRattrapageGrade,
  computeUeFinalStatus,
  computeCreditsStatus,
} from "./lmd-credits.ts";

test("resolveLmdValidationThreshold defaults to 50 when null/undefined", () => {
  assert.equal(resolveLmdValidationThreshold(null), 50);
  assert.equal(resolveLmdValidationThreshold(undefined), 50);
});

test("resolveLmdValidationThreshold returns the configured value", () => {
  assert.equal(resolveLmdValidationThreshold(40), 40);
  assert.equal(resolveLmdValidationThreshold(0), 0);
});

test("isRattrapageGrade matches exact title, case/whitespace insensitive", () => {
  assert.equal(isRattrapageGrade("Rattrapage"), true);
  assert.equal(isRattrapageGrade("  rattrapage  "), true);
  assert.equal(isRattrapageGrade("RATTRAPAGE"), true);
  assert.equal(isRattrapageGrade("Rattrapage 2"), false);
  assert.equal(isRattrapageGrade(null), false);
  assert.equal(isRattrapageGrade(undefined), false);
  assert.equal(isRattrapageGrade(""), false);
});

test("computeUeFinalStatus: normal score above threshold validates directly", () => {
  const r = computeUeFinalStatus({
    normalScore: 12, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 12, finalMaxScore: 20, validated: true });
});

test("computeUeFinalStatus: normal below threshold, no rattrapage -> not validated, normal score kept", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 8, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: normal below threshold, rattrapage clears it -> validated with rattrapage score", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 11, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 11, finalMaxScore: 20, validated: true });
});

test("computeUeFinalStatus: normal below threshold, rattrapage also below -> not validated, normal score kept (not rattrapage)", () => {
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 9, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 8, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: no normal score at all -> not validated, null score", () => {
  const r = computeUeFinalStatus({
    normalScore: null, normalMaxScore: 20,
    rattrapageScore: null, rattrapageMaxScore: 20,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: null, finalMaxScore: 20, validated: false });
});

test("computeUeFinalStatus: different max_score between normal and rattrapage normalizes correctly", () => {
  // normal 8/20 = 40% (below 50) ; rattrapage 60/100 = 60% (clears 50)
  const r = computeUeFinalStatus({
    normalScore: 8, normalMaxScore: 20,
    rattrapageScore: 60, rattrapageMaxScore: 100,
    thresholdPct: 50,
  });
  assert.deepEqual(r, { finalScore: 60, finalMaxScore: 100, validated: true });
});

test("computeCreditsStatus sums only validated UE credits into acquiredCredits", () => {
  const ues = [
    { filiere_matiere_id: "a", credits: 6 },
    { filiere_matiere_id: "b", credits: 5 },
    { filiere_matiere_id: "c", credits: 4 },
  ];
  const statuses = [
    { filiere_matiere_id: "a", validated: true },
    { filiere_matiere_id: "b", validated: false },
    { filiere_matiere_id: "c", validated: true },
  ];
  const r = computeCreditsStatus(ues, statuses);
  assert.equal(r.totalCredits, 15);
  assert.equal(r.acquiredCredits, 10);
  assert.deepEqual(r.validatedUeIds.sort(), ["a", "c"]);
  assert.deepEqual(r.pendingUeIds, ["b"]);
});

test("computeCreditsStatus treats a UE with no status entry as pending", () => {
  const ues = [{ filiere_matiere_id: "a", credits: 6 }];
  const r = computeCreditsStatus(ues, []);
  assert.equal(r.acquiredCredits, 0);
  assert.deepEqual(r.pendingUeIds, ["a"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types --test "app/utils/lmd-credits.test.mjs"` (from `academie-langues/`)
Expected: FAIL — `lmd-credits.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// academie-langues/app/utils/lmd-credits.ts

/** Seuil de validation LMD (%) — null en base = 50 par defaut. */
export function resolveLmdValidationThreshold(raw: number | null | undefined): number {
  return raw === null || raw === undefined ? 50 : raw;
}

/** Reconnait la colonne de note "Rattrapage" (insensible casse/espaces). */
export function isRattrapageGrade(title: string | null | undefined): boolean {
  if (!title) return false;
  return title.trim().toLowerCase() === "rattrapage";
}

function toPct(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  return (score / maxScore) * 100;
}

/**
 * Statut final d'une UE pour un etudiant : validation UE par UE, sans
 * compensation avec d'autres UE. Le rattrapage ne remplace la note
 * normale que s'il atteint lui-meme le seuil ; sinon la note normale
 * (echouee) reste affichee telle quelle.
 */
export function computeUeFinalStatus(params: {
  normalScore: number | null;
  normalMaxScore: number;
  rattrapageScore: number | null;
  rattrapageMaxScore: number;
  thresholdPct: number;
}): { finalScore: number | null; finalMaxScore: number; validated: boolean } {
  const { normalScore, normalMaxScore, rattrapageScore, rattrapageMaxScore, thresholdPct } = params;

  if (normalScore === null) {
    return { finalScore: null, finalMaxScore: normalMaxScore, validated: false };
  }

  const normalPct = toPct(normalScore, normalMaxScore);
  if (normalPct >= thresholdPct) {
    return { finalScore: normalScore, finalMaxScore: normalMaxScore, validated: true };
  }

  if (rattrapageScore !== null) {
    const rattrapagePct = toPct(rattrapageScore, rattrapageMaxScore);
    if (rattrapagePct >= thresholdPct) {
      return { finalScore: rattrapageScore, finalMaxScore: rattrapageMaxScore, validated: true };
    }
  }

  return { finalScore: normalScore, finalMaxScore: normalMaxScore, validated: false };
}

/** Resume credits acquis/total pour un etudiant sur un ensemble d'UE. */
export function computeCreditsStatus(
  ues: { filiere_matiere_id: string; credits: number }[],
  statuses: { filiere_matiere_id: string; validated: boolean }[],
): {
  totalCredits: number;
  acquiredCredits: number;
  validatedUeIds: string[];
  pendingUeIds: string[];
} {
  const validatedSet = new Set(statuses.filter((s) => s.validated).map((s) => s.filiere_matiere_id));
  const totalCredits = ues.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);
  const validatedUeIds: string[] = [];
  const pendingUeIds: string[] = [];
  let acquiredCredits = 0;
  for (const u of ues) {
    if (validatedSet.has(u.filiere_matiere_id)) {
      validatedUeIds.push(u.filiere_matiere_id);
      acquiredCredits += Number(u.credits) || 0;
    } else {
      pendingUeIds.push(u.filiere_matiere_id);
    }
  }
  return { totalCredits, acquiredCredits, validatedUeIds, pendingUeIds };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --test "app/utils/lmd-credits.test.mjs"`
Expected: PASS, all 10 tests green.

- [ ] **Step 5: Run the full suite + typecheck to confirm nothing else broke**

Run: `npm test` (expect the existing 88 tests + these 10 = 98 passing) and `npx tsc --noEmit -p .` (expect clean, from `academie-langues/`).

- [ ] **Step 6: Commit**

```bash
git add academie-langues/app/utils/lmd-credits.ts academie-langues/app/utils/lmd-credits.test.mjs
git commit -m "feat: helpers purs validation credits LMD (seuil, rattrapage, statut UE)"
```

---

## Task 3: Paramètres centre — seuil de validation LMD

**Files:**
- Modify: `academie-langues/app/centre/parametres/entreprise/page.tsx`
- Modify: `academie-langues/app/i18n/messages/centre.ts`

**Interfaces:**
- Consumes: `resolveLmdValidationThreshold` from Task 2 (`app/utils/lmd-credits.ts`), for the live-preview text only.
- Produces: `centers.lmd_validation_threshold_pct` is readable/writable from this page. No other task depends on this file's internals — Task 6/7/8 read the column directly from `centers`.

This file already has a center-scoped setting pattern to copy exactly: the "Matricule" section added earlier (student ID prefix). Find it by searching for `Hash` icon import and `studentIdPrefix` state — that section's shape (state, `centers` select/update extension, `<Section icon={...} title={...}>` JSX block) is the template for this task.

- [ ] **Step 1: Read the existing matricule section to copy its shape**

```bash
grep -n "studentIdPrefix\|matriculeSectionTitle" academie-langues/app/centre/parametres/entreprise/page.tsx
```

Read the full section (state declaration, the `centers` select that includes `student_id_prefix`, the `save()` call that writes it, and the `<Section icon={Hash} title={t("centre","matriculeSectionTitle")}>` JSX block). This task adds a near-identical second section, visible only when `centerType === "universite"`.

- [ ] **Step 2: Add i18n keys**

In `academie-langues/app/i18n/messages/centre.ts`, find the FR line containing `studentMatriculeLabel: "Matricule"` and add, on both the FR line and its EN counterpart, following the exact same `key: "value", ` comma-separated format already used in that object literal:

FR line — insert after `bulletinMatricule: "Matr..."` (same line):
```
lmdThresholdSectionTitle: "Seuil de validation LMD", lmdThresholdSectionDescription: "Une UE est validée (crédits acquis) si la note finale atteint ce pourcentage du barème.", lmdThresholdLabel: "Seuil (%)", lmdThresholdPreview: "Ex. : une UE notée sur 20 est validée à partir de {value}/20.",
```

EN line — same keys, English text:
```
lmdThresholdSectionTitle: "LMD validation threshold", lmdThresholdSectionDescription: "A course unit is validated (credits earned) once the final score reaches this percentage of the scale.", lmdThresholdLabel: "Threshold (%)", lmdThresholdPreview: "E.g.: a course unit scored out of 20 is validated from {value}/20.",
```

- [ ] **Step 3: Add the state, select/save wiring, and section JSX**

Add state near the existing `studentIdPrefix` state:

```tsx
const [lmdThresholdPct, setLmdThresholdPct] = useState("");
```

Extend the `centers` select (the same `.select(...)` call that already includes `student_id_prefix`) to also include `lmd_validation_threshold_pct`, and set the state from it after fetch:

```tsx
setLmdThresholdPct(
  centerRow.lmd_validation_threshold_pct != null ? String(centerRow.lmd_validation_threshold_pct) : ""
);
```

Extend the `save()` function's `centers.update({...})` call with:

```tsx
lmd_validation_threshold_pct: lmdThresholdPct.trim() ? Math.max(0, Math.min(100, Number(lmdThresholdPct))) : null,
```

Add the section JSX, gated on `centerType === "universite"`, immediately after the existing matricule `<Section>` block:

```tsx
import { resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";

{centerType === "universite" && (
  <Section icon={GraduationCap} title={t("centre", "lmdThresholdSectionTitle")} description={t("centre", "lmdThresholdSectionDescription")}>
    <div className="max-w-xs">
      <label className="text-xs font-semibold text-neutral-600 block mb-1.5">{t("centre", "lmdThresholdLabel")}</label>
      <input
        type="number"
        min={0}
        max={100}
        placeholder="50"
        value={lmdThresholdPct}
        onChange={(e) => setLmdThresholdPct(e.target.value)}
        className="w-full h-11 px-3 rounded-lg border border-black/[0.08] bg-white font-semibold text-sm outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
      />
      <p className="text-[11px] text-neutral-400 mt-1.5">
        {t("centre", "lmdThresholdPreview", {
          value: String(resolveLmdValidationThreshold(lmdThresholdPct.trim() ? Number(lmdThresholdPct) : null) / 5),
        })}
      </p>
    </div>
  </Section>
)}
```

Add `GraduationCap` to the `lucide-react` import at the top of the file if not already imported (check first with `grep -n "^import.*lucide-react" academie-langues/app/centre/parametres/entreprise/page.tsx`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`. Expected: clean.

- [ ] **Step 5: Manual verification**

Start the dev server, sign in as a `universite`-type demo center manager (or create a throwaway one — see Task 5's verification for the exact `curl` pattern this repo uses), open `/centre/parametres/entreprise`, confirm the new section appears only for `universite` centers (does not appear for `generic`/`ecole`/`entreprise`/`tcf_canada` — check by loading the page as a non-université demo center too), set a value, reload, confirm it persisted.

- [ ] **Step 6: Commit**

```bash
git add academie-langues/app/centre/parametres/entreprise/page.tsx academie-langues/app/i18n/messages/centre.ts
git commit -m "feat: seuil de validation LMD configurable par centre universite"
```

---

## Task 4: Constructeur Programmes — Niveau → Semestre → UE + crédits

**Files:**
- Modify: `academie-langues/app/centre/filieres/nouveau/page.tsx`

**Interfaces:**
- Consumes: `centers.center_type` (already loaded by this page — confirm via `grep -n "center_type" academie-langues/app/centre/filieres/nouveau/page.tsx`; if not already loaded, add it to whichever `centers` select this page already runs).
- Produces: for university `cursus` filières, `niveaux` rows get child `semestres` rows, and `filiere_matieres` rows are created with `semestre_id` set (instead of `niveau_id`) and `credits` populated. Task 9 (inscription) and Task 6 (notes) both rely on `filiere_matieres.semestre_id` being populated exactly when the filière is LMD (i.e., `exists(select 1 from semestres where niveau_id = niveaux.id)` — the spec's LMD detection rule).

This is the largest, most exploratory task in the plan — this file is 3131 lines with a dense dual-mode (create/edit, cursus/formation_courte) save flow. Known anchors (grep-verified during planning, re-verify before editing since line numbers drift):
- `NiveauDraft` type: line ~83. `MatiereDraft` type: line ~69.
- `defaultNiveau()`: line ~112.
- Niveaux state (`niveaux`, `setNiveaux`) + sync effect on `nbNiveaux`/`type` change: lines ~756-819.
- Niveaux count input (`nbNiveauxStr`): line ~2325.
- Niveaux save path for cursus filières: inside `saveExistingProgram` / the equivalent create-path function, lines ~1500-1900 (search `from("niveaux")` and `from("filiere_matieres")` — 7 and 4 occurrences respectively at planning time).

- [ ] **Step 1: Confirm the LMD gate is available**

Run `grep -n "center_type" academie-langues/app/centre/filieres/nouveau/page.tsx`. If the page does not already load `center_type` for the current center, add it to the existing `centers` select used to populate the page's center-scoped state, and store it in a `centerType` state variable (mirror how `CreateStudentModal.tsx` does it — `grep -n "center_type" academie-langues/app/components/centre/students/CreateStudentModal.tsx` for the exact pattern). Define:

```tsx
const isUniversityLmd = centerType === "universite" && type === "cursus";
```

- [ ] **Step 2: Extend the draft types**

Add to `MatiereDraft` (line ~69):

```tsx
/** Credits ECTS — uniquement rempli pour les UE d'un centre universite. */
credits?: number | string;
```

Add to `NiveauDraft` (line ~83), a new sibling array to `classes`/`matieres`:

```tsx
/** Semestres du niveau — uniquement pour les filieres LMD (centre universite). */
semestres: SemestreDraft[];
```

Add the new type next to `NiveauDraft`:

```tsx
type SemestreDraft = {
  id?: string | null;
  ordre: number;
  credits_cible: string;
  matieres: MatiereDraft[];
};
function defaultSemestre(ordre: number): SemestreDraft {
  return { ordre, credits_cible: "30", matieres: [] };
}
```

Update `defaultNiveau()` (line ~112) to initialize `semestres: isUniversityLmd ? [defaultSemestre(1), defaultSemestre(2)] : []` — since `defaultNiveau` is a free function without access to component state, change its signature to `defaultNiveau(numero: number, withDefaultSemestres: boolean)` and update its one call site (line ~767, `useState<NiveauDraft[]>([defaultNiveau(1)])`) and its other call site in the sync effect (line ~810) to pass `isUniversityLmd`.

- [ ] **Step 3: Add semestre-count + UE-with-credits UI, gated on `isUniversityLmd`**

Inside the niveau card rendering (find it by searching for where `niveaux.map(...)` renders each `NiveauDraft` — near the matières UI, since it already renders `n.matieres.map(...)` per niveau), add, only `{isUniversityLmd && (...)}`:

```tsx
{isUniversityLmd && (
  <div className="mt-4 space-y-4">
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold text-neutral-600">{t("centre", "lmdSemestreCount")}</label>
      <input
        type="number"
        min={1}
        max={4}
        value={n.semestres.length}
        onChange={(e) => {
          const count = Math.max(1, Math.min(4, parseInt(e.target.value) || 1));
          const next = Array.from({ length: count }, (_, i) => n.semestres[i] || defaultSemestre(i + 1));
          updateNiveau(n.numero, { semestres: next });
        }}
        className="w-16 h-8 px-2 rounded-lg border border-black/[0.08] text-sm font-semibold"
      />
    </div>
    {n.semestres.map((s, sIdx) => (
      <div key={sIdx} className="rounded-xl border border-black/[0.08] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: BLUE }}>{t("centre", "lmdSemestreLabel", { number: String(s.ordre) })}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-400">{t("centre", "lmdCreditsCible")}</span>
            <input
              type="number"
              min={0}
              value={s.credits_cible}
              onChange={(e) => {
                const nextSemestres = n.semestres.map((sem, i) => (i === sIdx ? { ...sem, credits_cible: e.target.value } : sem));
                updateNiveau(n.numero, { semestres: nextSemestres });
              }}
              className="w-14 h-7 px-1.5 rounded-md border border-black/[0.08] text-xs font-semibold text-center"
            />
          </div>
        </div>
        {s.matieres.map((m, mIdx) => (
          <div key={mIdx} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t("centre", "createStudentSelectCountry") /* replace with actual UE-name placeholder key used by matiere rows below */}
              value={m.newDisciplineName}
              onChange={(e) => {
                const nextMatieres = s.matieres.map((mm, i) => (i === mIdx ? { ...mm, newDisciplineName: e.target.value } : mm));
                const nextSemestres = n.semestres.map((sem, i) => (i === sIdx ? { ...sem, matieres: nextMatieres } : sem));
                updateNiveau(n.numero, { semestres: nextSemestres });
              }}
              className="flex-1 h-8 px-2 rounded-lg border border-black/[0.08] text-xs"
            />
            <input
              type="number"
              min={0}
              placeholder={t("centre", "lmdCredits")}
              value={m.credits ?? ""}
              onChange={(e) => {
                const nextMatieres = s.matieres.map((mm, i) => (i === mIdx ? { ...mm, credits: e.target.value } : mm));
                const nextSemestres = n.semestres.map((sem, i) => (i === sIdx ? { ...sem, matieres: nextMatieres } : sem));
                updateNiveau(n.numero, { semestres: nextSemestres });
              }}
              className="w-16 h-8 px-2 rounded-lg border border-black/[0.08] text-xs"
            />
            <button
              type="button"
              onClick={() => {
                const nextMatieres = s.matieres.filter((_, i) => i !== mIdx);
                const nextSemestres = n.semestres.map((sem, i) => (i === sIdx ? { ...sem, matieres: nextMatieres } : sem));
                updateNiveau(n.numero, { semestres: nextSemestres });
              }}
              className="h-8 w-8 rounded-lg border border-black/[0.08] text-neutral-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const nextSemestres = n.semestres.map((sem, i) =>
              i === sIdx
                ? { ...sem, matieres: [...sem.matieres, { discipline_id: "", newDisciplineName: "", formateurIds: [], coefficient: 1, max_score: 20, credits: "" }] }
                : sem,
            );
            updateNiveau(n.numero, { semestres: nextSemestres });
          }}
          className="text-xs font-semibold hover:underline"
          style={{ color: ORANGE }}
        >
          + {t("centre", "lmdAddUe")}
        </button>
      </div>
    ))}
  </div>
)}
```

Read the existing (non-LMD) matière row rendering just above this insertion point first — reuse its exact discipline-name input pattern (it likely already has a discipline picker/autocomplete component rather than a bare text input; if so, reuse that same sub-component here instead of a plain `<input>`, to stay consistent and avoid a second, worse UI for entering a subject name).

- [ ] **Step 4: Add i18n keys**

In `academie-langues/app/i18n/messages/centre.ts`, add to both the FR and EN objects (same line-insertion pattern as Task 3, Step 2):

FR:
```
lmdSemestreCount: "Nombre de semestres", lmdSemestreLabel: "Semestre {number}", lmdCreditsCible: "Cible crédits", lmdCredits: "Crédits", lmdAddUe: "Ajouter une UE",
```

EN:
```
lmdSemestreCount: "Number of semesters", lmdSemestreLabel: "Semester {number}", lmdCreditsCible: "Credits target", lmdCredits: "Credits", lmdAddUe: "Add a course unit",
```

- [ ] **Step 5: Wire the save path**

Read the full `saveExistingProgram` function (and its create-mode counterpart, if separate — search for the second/earlier occurrence of `from("niveaux").insert`) end to end before editing. Add a new function, called only when `isUniversityLmd`, inserted right after each niveau is created/updated (i.e., right after the existing `from("niveaux").insert(...)` or `.update(...)` call resolves an id) instead of the existing flat `filiere_matieres` save for that niveau:

```tsx
async function saveNiveauSemestres(niveauId: string, semestres: SemestreDraft[]) {
  // Existing semestres for this niveau (for diffing on edit — delete removed ones).
  const { data: existingSemestres } = await supabase
    .from("semestres")
    .select("id, ordre")
    .eq("niveau_id", niveauId);
  const keepIds = new Set<string>();

  for (const s of semestres) {
    let semestreId = s.id;
    const creditsCible = s.credits_cible.trim() ? Number(s.credits_cible) : null;
    if (semestreId) {
      await supabase.from("semestres").update({ ordre: s.ordre, credits_cible: creditsCible }).eq("id", semestreId);
    } else {
      const { data: created, error } = await supabase
        .from("semestres")
        .insert({ niveau_id: niveauId, ordre: s.ordre, credits_cible: creditsCible })
        .select("id")
        .single();
      if (error || !created) throw new Error(`${en ? "Semester" : "Semestre"} : ${error?.message || "échec"}`);
      semestreId = created.id;
    }
    keepIds.add(semestreId!);

    // UE de ce semestre : supprime celles retirees, upsert le reste.
    const { data: existingUes } = await supabase
      .from("filiere_matieres")
      .select("id")
      .eq("semestre_id", semestreId);
    const keepUeIds = new Set<string>();
    for (const m of s.matieres) {
      const creditsVal = m.credits !== undefined && String(m.credits).trim() ? Number(m.credits) : null;
      if (m.fm_id) {
        await supabase.from("filiere_matieres").update({
          coefficient: Number(m.coefficient) || 1,
          max_score: Number(m.max_score) || 20,
          credits: creditsVal,
        }).eq("id", m.fm_id);
        keepUeIds.add(m.fm_id);
      } else {
        // Discipline : reutilise la resolution discipline_id/newDisciplineName
        // deja geree par le chemin non-LMD existant (voir la fonction qui
        // resout `discipline_id` a partir de `newDisciplineName` pour les
        // matieres non-LMD, et appelle-la ici plutot que de dupliquer).
        const disciplineId = await resolveDisciplineId(m); // fonction existante a localiser (grep "newDisciplineName" dans ce fichier)
        const { data: createdUe, error } = await supabase
          .from("filiere_matieres")
          .insert({
            filiere_id: filiereIdRef.current, // id de la filiere en cours de sauvegarde, deja disponible dans la fonction appelante
            discipline_id: disciplineId,
            semestre_id: semestreId,
            coefficient: Number(m.coefficient) || 1,
            max_score: Number(m.max_score) || 20,
            credits: creditsVal,
          })
          .select("id")
          .single();
        if (error || !createdUe) throw new Error(`UE : ${error?.message || "échec"}`);
        keepUeIds.add(createdUe.id);
      }
    }
    for (const existing of existingUes || []) {
      if (!keepUeIds.has(existing.id)) await supabase.from("filiere_matieres").delete().eq("id", existing.id);
    }
  }

  for (const existing of existingSemestres || []) {
    if (!keepIds.has(existing.id)) await supabase.from("semestres").delete().eq("id", existing.id);
  }
}
```

`resolveDisciplineId` and `filiereIdRef` are placeholders for whatever the existing non-LMD path already uses to resolve a discipline id from `newDisciplineName` and to reference the filière id being saved — locate the real names via `grep -n "newDisciplineName" academie-langues/app/centre/filieres/nouveau/page.tsx` and use them verbatim; do not invent a second discipline-resolution path.

Call `saveNiveauSemestres(niveauId, n.semestres)` instead of the existing flat matière-save call, only inside the branch where `isUniversityLmd` is true, immediately after each niveau's id is known (both the update and the insert branch).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`. Fix any type errors before proceeding — this is the highest-risk task in the plan for breaking the non-LMD path, so also re-read the diff and confirm every new block is inside an `isUniversityLmd` (or equivalent) guard, never replacing unconditional existing code.

- [ ] **Step 7: Manual verification — non-regression first**

Create a `generic`-type test filière (cursus, 2 niveaux, matières) through the UI exactly as before, save it, confirm it saves identically to pre-change behavior (no semestre UI appears, no `semestres` rows created — check via `admin.from('semestres').select('id').eq('niveau_id', <that niveau's id>)` returns empty).

- [ ] **Step 8: Manual verification — LMD path**

Create a throwaway `universite`-type test center (reuse the pattern already established in this repo's session history: `POST /api/centre/creer` with `centerType: "universite"`), create a cursus filière with 2 niveaux, 2 semestres each, 2 UE per semestre with credits set. Confirm via direct query:

```js
const { data } = await admin.from('semestres').select('id, ordre, niveau_id, credits_cible');
const { data: ues } = await admin.from('filiere_matieres').select('id, semestre_id, credits').not('semestre_id', 'is', null);
```

Both should show the expected rows. Delete the throwaway center afterward (`centers`, `niveaux`, `semestres`, `filiere_matieres`, `campuses`, `center_users`, `center_branding`, auth user — same cleanup pattern used earlier this session).

- [ ] **Step 9: Commit**

```bash
git add academie-langues/app/centre/filieres/nouveau/page.tsx academie-langues/app/i18n/messages/centre.ts
git commit -m "feat: constructeur niveau/semestre/UE+credits pour filieres universite"
```

---

## Task 5: Carnet de notes — grille par semestre, crédits, rattrapage

**Files:**
- Modify: `academie-langues/app/centre/examens/notes/page.tsx`

**Interfaces:**
- Consumes: `isRattrapageGrade`, `computeUeFinalStatus`, `resolveLmdValidationThreshold` from Task 2; `centers.lmd_validation_threshold_pct` (fetch alongside the existing `center_type` fetch in this file, near line 367).
- Produces: nothing new consumed by later tasks — this task is a leaf.

This file already switched its filière/niveau selection UI to a semestre-aware model would be needed, but the spec keeps this simpler: the existing grouping key is `niveau_id` (`selectedNiveauId`, `groupes.niveau_id`). For LMD filières, this task changes the grouping key to `semestre_id` throughout the same screen, without altering anything for non-LMD filières.

- [ ] **Step 1: Load semestres and the center's LMD threshold**

Near the niveaux-loading effect (found via `grep -n "from(\"niveaux\")" academie-langues/app/centre/examens/notes/page.tsx` — the effect keyed on `selectedFiliereId`, around line 520), after `setNiveaux(nivs)`, also load semestres for those niveaux:

```tsx
const niveauIdList = nivs.map((n) => n.id);
const { data: semRows } = niveauIdList.length
  ? await supabase.from("semestres").select("id, niveau_id, ordre, credits_cible").in("niveau_id", niveauIdList).order("ordre")
  : { data: [] };
setSemestres(semRows || []);
```

Add `const [semestres, setSemestres] = useState<{ id: string; niveau_id: string; ordre: number; credits_cible: number | null }[]>([]);` near the other state declarations (line ~215).

Near where `centerType` is fetched (line ~367, `.from("centers").select("center_type")`), extend the select to include `lmd_validation_threshold_pct` and store it:

```tsx
const { data: center } = await supabase.from("centers").select("center_type, lmd_validation_threshold_pct").eq("id", cId).maybeSingle();
setCenterType(center?.center_type ?? null);
setLmdThresholdPct(center?.lmd_validation_threshold_pct ?? null);
```

Add `const [lmdThresholdPct, setLmdThresholdPct] = useState<number | null>(null);` near the other state.

- [ ] **Step 2: Define the LMD gate and semester picker**

```tsx
const isUniversityLmd = centerType === "universite" && semestres.length > 0;
const semestresForSelectedNiveau = semestres.filter((s) => s.niveau_id === selectedNiveauId);
const [selectedSemestreId, setSelectedSemestreId] = useState("");
```

In the header filter bar (the row built in Task-history around line 1237-1400, already reworked this session for mobile stacking), when `isUniversityLmd`, insert a semestre picker between the Niveau pills and the Classe pills — same `FilterPill` component already used for niveaux/classes:

```tsx
{isUniversityLmd && selectedNiveauId && (
  <>
    <span className="hidden sm:block w-px h-4 bg-black/[0.08] shrink-0" />
    <div className="flex gap-1 flex-wrap items-center">
      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{t("centre", "notesPeriodLabel") /* replace with new "lmdSemestreLabel"-derived text */}</span>
      {semestresForSelectedNiveau.map((s) => (
        <FilterPill
          key={s.id}
          active={selectedSemestreId === s.id}
          onClick={() => {
            setSelectedSemestreId(s.id);
            setSelectedGroupeId("");
            setSelectedSubjectId("");
            setStudentRows([]);
            setSuplColumns([]);
          }}
        >
          {t("centre", "lmdSemestreLabel", { number: String(s.ordre) })}
        </FilterPill>
      ))}
    </div>
  </>
)}
```

- [ ] **Step 3: Filter classes and subjects by semestre instead of niveau when LMD**

Find the effect that filters `groupes` by `selectedNiveauId` (line ~574-588) and the `subjectsForContext` filter (line ~318-324, keyed on `s.niveau_id`). For both, when `isUniversityLmd`, filter by `semestre_id === selectedSemestreId` instead of `niveau_id === selectedNiveauId`:

```tsx
const next = isUniversityLmd
  ? allGroupes.filter((g) => g.semestre_id === selectedSemestreId)
  : hasNiveauLinks
    ? allGroupes.filter((g) => g.niveau_id === selectedNiveauId)
    : allGroupes.filter((g) => g.niveau_id === selectedNiveauId || (!g.niveau_id && g.filiere_id === selectedFiliereId));
```

Extend `GroupeOption`/`allGroupes` fetch and `MatiereOption`/`allSubjects` fetch (wherever they're `select(...)`ed) to also select `semestre_id`.

Require `selectedSemestreId` (not just `selectedNiveauId`) in `contextReady` when `isUniversityLmd`:

```tsx
const contextReady = Boolean(
  selectedFiliereId && filiereId
    && (niveaux.length === 0 || !!selectedNiveauId)
    && (!isUniversityLmd || !!selectedSemestreId)
    // ... existing conditions unchanged
);
```

- [ ] **Step 4: Compute and display per-UE credits/validation status**

In the grid rendering (where `studentRows` are mapped to table rows — the block already touched this session around line 1780-1810), when `isUniversityLmd` and `selectedSubject?.credits` is set, compute and show a small badge next to the score input using `computeUeFinalStatus` from Task 2:

```tsx
import { computeUeFinalStatus, isRattrapageGrade, resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";

// per student row, once suplColumns/extras are known:
const rattrapageCol = suplColumns.find((c) => isRattrapageGrade(c.title));
const rattrapageCell = rattrapageCol ? row.extras.find((ex) => ex.colKey === rattrapageCol.colKey) : undefined;
const status = computeUeFinalStatus({
  normalScore: row.new_score.trim() ? Number(row.new_score) : null,
  normalMaxScore: selectedSubject?.max_score || 20,
  rattrapageScore: rattrapageCell?.score?.trim() ? Number(rattrapageCell.score) : null,
  rattrapageMaxScore: selectedSubject?.max_score || 20,
  thresholdPct: resolveLmdValidationThreshold(lmdThresholdPct),
});
```

Render `status.validated` as a small green/red badge (`{selectedSubject.credits} cr.` in green if validated, neutral gray otherwise) next to each row's score cell, only when `isUniversityLmd && selectedSubject?.credits != null`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`.

- [ ] **Step 6: Manual verification**

On the throwaway université test center from Task 4, open Carnet de notes, select the LMD filière, confirm: niveau pills → semestre pills → classe pills → UE picker → période, in that order; enter a normal score below the configured threshold, confirm the badge shows unvalidated; add a "Rattrapage" extra column with a passing score, confirm the badge flips to validated. On a non-université center, confirm the semestre picker never appears and the existing niveau→classe flow is unchanged.

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/centre/examens/notes/page.tsx
git commit -m "feat: carnet de notes par semestre + badges credits/validation LMD"
```

---

## Task 6: Bulletin — UE, crédits, statut de validation

**Files:**
- Modify: `academie-langues/app/components/BulletinDynamique.tsx`

**Interfaces:**
- Consumes: `computeUeFinalStatus`, `resolveLmdValidationThreshold`, `computeCreditsStatus` from Task 2.

- [ ] **Step 1: Extend the matières fetch to include credits and semestre**

At line ~135-136 (`.from("filiere_matieres").select("id, coefficient, max_score, grade_weights, exam_disciplines(name)")`) and its fallback at line ~142-143, add `credits, semestre_id` to both selects.

- [ ] **Step 2: Fetch the center's LMD threshold**

Find where this component fetches the center row (search `from("centers")` in this file) and add `lmd_validation_threshold_pct` to that select; store it in a new `lmdThresholdPct` state.

- [ ] **Step 3: Compute and render per-UE crédits + statut, and a total**

Near the existing matière-rows rendering (`matieres.map(...)` around line 301), when a matière has `credits != null`, compute its status with `computeUeFinalStatus` (same shape as Task 5, Step 4 — reuse the grade lookup already present in this file for that matière) and render a `{credits} cr. — validé/non validé` line under the matière's coefficient label.

After the matières table, when any matière in the current bulletin has `credits != null`, render a total line using `computeCreditsStatus`:

```tsx
{hasLmdCredits && (
  <p className="text-xs font-bold mt-2" style={{ color: BLUE }}>
    {t("centre", "lmdCreditsTotal", { acquired: String(creditsStatus.acquiredCredits), total: String(creditsStatus.totalCredits) })}
  </p>
)}
```

- [ ] **Step 4: Add i18n key**

`centre.ts`, both locales: `lmdCreditsTotal: "Crédits acquis : {acquired} / {total}"` (FR) / `"Credits earned: {acquired} / {total}"` (EN).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`.

- [ ] **Step 6: Manual verification**

Generate a bulletin for a student enrolled in the throwaway LMD filière (Task 4/5), confirm crédits + statut show per UE and the total line appears; generate a bulletin for a non-LMD student, confirm no crédits text appears anywhere.

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/components/BulletinDynamique.tsx academie-langues/app/i18n/messages/centre.ts
git commit -m "feat: bulletin affiche credits UE + total credits acquis (LMD)"
```

---

## Task 7: Profil étudiant + liste étudiants — résumé crédits

**Files:**
- Modify: `academie-langues/app/profil/CenterStudentProfil.tsx`
- Modify: `academie-langues/app/centre/etudiants/page.tsx`
- Modify: `academie-langues/app/api/student/account/route.ts`
- Modify: `academie-langues/app/api/center/enrollments-list/route.ts`

**Interfaces:**
- Consumes: `computeCreditsStatus` from Task 2.
- Produces: both API routes return a `creditsStatus: { totalCredits, acquiredCredits } | null` field per student (null when the student's filière is not LMD).

- [ ] **Step 1: Compute crédits status server-side in `enrollments-list`**

In `academie-langues/app/api/center/enrollments-list/route.ts` (192 lines — read it fully first, this task adds to its existing per-student mapping), after the existing enrollment/profile joins, for each student whose current enrollment has a non-null `semestre_id`:

```ts
import { computeCreditsStatus, computeUeFinalStatus, resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";

// For each enrollment with semestre_id set:
const { data: ues } = await supabaseAdmin
  .from("filiere_matieres")
  .select("id, credits")
  .eq("semestre_id", enrollment.semestre_id)
  .not("credits", "is", null);

const { data: grades } = await supabaseAdmin
  .from("grades")
  .select("filiere_matiere_id, score, max_score, title")
  .eq("enrollment_id", enrollment.id)
  .in("filiere_matiere_id", (ues || []).map((u) => u.id));

const { data: centerRow } = await supabaseAdmin.from("centers").select("lmd_validation_threshold_pct").eq("id", ctx!.centerId).maybeSingle();
const thresholdPct = resolveLmdValidationThreshold(centerRow?.lmd_validation_threshold_pct ?? null);

const statuses = (ues || []).map((u) => {
  const gradesForUe = (grades || []).filter((g) => g.filiere_matiere_id === u.id);
  const normal = gradesForUe.find((g) => !isRattrapageGrade(g.title));
  const rattrapage = gradesForUe.find((g) => isRattrapageGrade(g.title));
  const status = computeUeFinalStatus({
    normalScore: normal?.score ?? null,
    normalMaxScore: normal?.max_score || 20,
    rattrapageScore: rattrapage?.score ?? null,
    rattrapageMaxScore: rattrapage?.max_score || 20,
    thresholdPct,
  });
  return { filiere_matiere_id: u.id, validated: status.validated };
});

const creditsStatus = ues?.length
  ? computeCreditsStatus(ues.map((u) => ({ filiere_matiere_id: u.id, credits: u.credits })), statuses)
  : null;
```

Fetch the `centers` row once outside the per-student loop (not per-student — move it above the mapping loop), and skip the whole block (set `creditsStatus: null`) when `enrollment.semestre_id` is null. Add `creditsStatus` to the returned `ProfileRow`/response mapping (same pattern as `matricule` was added earlier this session — extend the type and the final mapping step, and confirm via a full-file trace to `NextResponse.json` that the field survives, exactly as was done for `matricule`).

- [ ] **Step 2: Same computation in `student/account`**

`academie-langues/app/api/student/account/route.ts` — read the GET handler fully, add the same `creditsStatus` computation for the signed-in student's own current enrollment (reuse the exact same code from Step 1 as a shared helper — extract it into `app/utils/lmd-credits.server.ts` if duplicated verbatim in both routes, to keep DRY; both routes already import from `app/utils/` elsewhere in this repo).

- [ ] **Step 3: Display on the student list**

`academie-langues/app/centre/etudiants/page.tsx`: add `creditsStatus: { totalCredits: number; acquiredCredits: number } | null` to `StudentRow` type (same spot `matricule` was added earlier this session), and render it in the table row — a small line under the matricule column cell, only `{s.creditsStatus && <p className="text-[10px] text-neutral-400">{s.creditsStatus.acquiredCredits}/{s.creditsStatus.totalCredits} cr.</p>}`.

- [ ] **Step 4: Display on the student profile**

`academie-langues/app/profil/CenterStudentProfil.tsx`: add `creditsStatus` to `StudentAccount.profile` (or wherever the account payload type lives — same spot `matricule` was added), render a `<Row icon={GraduationCap} label={...} value="{acquired}/{total} crédits" />` next to the existing matricule `Row`, only when `account.creditsStatus` is non-null.

- [ ] **Step 5: Add i18n key**

`centre.ts` both locales: `lmdCreditsSummary: "Crédits"` (FR) / `"Credits"` (EN) — used as the `Row` label in Step 4.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`.

- [ ] **Step 7: Manual verification**

On the throwaway LMD center/student from Task 4/5, confirm the crédits summary appears on both the étudiants list and the student's own profile page, matching the numbers computed in Task 5/6's manual checks. Confirm it does not appear for non-LMD students.

- [ ] **Step 8: Commit**

```bash
git add academie-langues/app/profil/CenterStudentProfil.tsx academie-langues/app/centre/etudiants/page.tsx academie-langues/app/api/student/account/route.ts academie-langues/app/api/center/enrollments-list/route.ts academie-langues/app/i18n/messages/centre.ts
git commit -m "feat: resume credits acquis/total sur liste etudiants et profil (LMD)"
```

---

## Task 8: Inscription étudiant — sélecteur niveau → semestre → classe

**Files:**
- Modify: `academie-langues/app/components/centre/students/CreateStudentModal.tsx`
- Modify: `academie-langues/app/api/etudiants/route.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks besides the `semestres` table existing (Task 1).
- Produces: `enrollments.semestre_id` populated for LMD enrollments — Task 5 and Task 7 both read it.

- [ ] **Step 1: Load semestres in the modal**

Near the niveaux fetch in `CreateStudentModal.tsx` (line ~230-240, `.from("niveaux")`), after `setNiveaux(...)`, when `centerType === "universite"`, also fetch:

```tsx
const { data: semRows } = await supabase
  .from("semestres")
  .select("id, niveau_id, ordre")
  .in("niveau_id", (nivRows || []).map((n) => n.id))
  .order("ordre");
setSemestres(semRows || []);
```

Add `const [semestres, setSemestres] = useState<{ id: string; niveau_id: string; ordre: number }[]>([]);` near line 96-99 (next to the existing `niveaux`/`niveauId` state).

- [ ] **Step 2: Add the semestre picker between niveau and classe**

At line ~724-734 (the `CenterSelect` for niveau, rendered when `selectedFiliere?.type === "cursus" && niveaux.length > 0`), add a second `CenterSelect` right after it, shown only when the selected niveau has semestres:

```tsx
const semestresForNiveau = semestres.filter((s) => s.niveau_id === niveauId);
const [semestreId, setSemestreId] = useState("");

// JSX, right after the niveau CenterSelect:
{semestresForNiveau.length > 0 && (
  <CenterSelect
    size="lg"
    value={semestreId}
    onChange={setSemestreId}
    options={[
      { value: "", label: t("centre", "identitySelect") },
      ...semestresForNiveau.map((s) => ({ value: s.id, label: t("centre", "lmdSemestreLabel", { number: String(s.ordre) }) })),
    ]}
  />
)}
```

Reset `semestreId` to `""` in every place `niveauId` is reset (line ~205, ~239, ~277 — same pattern already used for `groupeId`).

- [ ] **Step 3: Filter classes by semestre instead of niveau when applicable**

At line ~325-333 (the effect that loads `groupes` filtered `.eq("niveau_id", niveauId)`), when `semestresForNiveau.length > 0` (this niveau has semestres), require `semestreId` to be set first and filter by it instead:

```tsx
useEffect(() => {
  if (!niveauId) { setGroupes([]); setGroupeId(""); return; }
  const needsSemestre = semestres.some((s) => s.niveau_id === niveauId);
  if (needsSemestre && !semestreId) { setGroupes([]); setGroupeId(""); return; }
  (async () => {
    let query = supabase.from("groupes").select("id, nom, niveau_id, semestre_id").eq("filiere_id", filiereId);
    query = needsSemestre ? query.eq("semestre_id", semestreId) : query.eq("niveau_id", niveauId);
    const { data } = await query;
    setGroupes(data || []);
    setGroupeId(data && data.length === 1 ? data[0].id : "");
  })();
}, [niveauId, semestreId, niveaux, semestres, selectedFiliere]);
```

Adjust to match whatever the existing effect's exact variable names are (`filiereId` vs `selectedFiliere.id` etc. — re-read the surrounding lines before editing, this is a paraphrase of the intended change, not a verbatim replacement block).

- [ ] **Step 4: Send `semestre_id` on submit**

At line ~389-390 (the request body built in `handleSubmit`, where `niveau_id: niveauId || null, groupe_id: groupeId || null,` are set), add `semestre_id: semestreId || null,`.

In `academie-langues/app/api/etudiants/route.ts`, find the profile/enrollment insert (search `niveau_id` in this file — it's read from `body.niveau_id` and written into the `enrollments` insert), add the equivalent `semestre_id: typeof body.semestre_id === "string" && body.semestre_id ? body.semestre_id : null` to the same `enrollments` insert payload.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .` from `academie-langues/`.

- [ ] **Step 6: Manual verification**

On the throwaway LMD center (Task 4), open "Créer un apprenant", confirm the flow is Programme → Niveau → Semestre → Classe (semestre picker appears only for the LMD niveau, never for a non-LMD niveau in the same or another center). Create a student picking Semestre 2 directly (not Semestre 1) to confirm mid-parcours enrollment works. Confirm via `admin.from('enrollments').select('semestre_id').eq('id', <new enrollment id>)` that it's populated.

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/components/centre/students/CreateStudentModal.tsx academie-langues/app/api/etudiants/route.ts
git commit -m "feat: inscription etudiant avec selecteur semestre (LMD universite)"
```

---

## Final Verification

- [ ] Run `npm test` from `academie-langues/` — expect all pre-existing tests plus the 10 new ones from Task 2 to pass (98 total at time of writing; re-count if other work landed in between).
- [ ] Run `npx tsc --noEmit -p .` from `academie-langues/` — expect clean.
- [ ] Re-run the non-regression checks from Task 4 Step 7 and Task 5/8's "non-université center unaffected" checks one more time, now that all tasks have landed together.
- [ ] Delete every throwaway université test center created during manual verification (Tasks 4, 5, 6, 7, 8) — reuse the cleanup script pattern already established this session (delete `enrollments`, `profiles`, auth users, `semestres`, `niveaux`, `filiere_matieres`, `groupes`, `campuses`, `center_branding`, `center_users`, then `centers`).
- [ ] Invoke `superpowers:finishing-a-development-branch` to decide how to integrate (merge/PR/keep-as-is).
