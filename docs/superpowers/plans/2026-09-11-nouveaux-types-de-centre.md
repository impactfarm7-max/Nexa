# Nouveaux types de centre (École, Université, Entreprise) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new selectable center types (École, Université, Entreprise) that behave identically to the existing "Centre Libre" (`generic`) type, across all 4 places a center gets created and all places its type is displayed/filtered.

**Architecture:** `center_type` is a free-text column with no DB constraint. A single function, `normalizeCenterType()` in `app/data/center-types.ts`, already collapses every non-`"tcf_canada"` value to `"generic"` for behavioral purposes — so the 3 new literal values inherit Centre Libre's behavior for free once added to `CENTER_TYPES`. The real work is fixing two write paths that currently normalize the user's selection away before storing it (so `"universite"` would silently become `"generic"` in the DB), and extending 4 UI surfaces (main signup, branch-creation dropdown, superadmin creation modal, superadmin filter) that currently hardcode the binary tcf/generic choice.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgREST via service_role), custom i18n (`useI18n()` / `t(namespace, key)`), `node --test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-11-nouveaux-types-de-centre-design.md`

## Global Constraints

- No DB migration — `center_type` accepts any string, no `CHECK` constraint exists.
- No code duplication: every task adds a branch/entry to shared logic (`center-types.ts`, i18n message objects), never a new parallel file per center type.
- `normalizeCenterType()`'s behavior-mapping logic (line: `if (raw === "tcf_canada") return "tcf_canada"; return "generic";`) does NOT change in this plan — only `CENTER_TYPES` and `centerTypeLabel()` change in that file.
- All new center types (`ecole`, `universite`, `entreprise`) use the Centre Libre offer model (`nexa_offer`), never the TCF plan model (`plan_type`).
- All new i18n keys need both FR and EN entries.
- Working directory for all file paths below: `academie-langues/` (i.e. `app/...` means `academie-langues/app/...`).

---

### Task 1: Extend `center-types.ts` — data model foundation

**Files:**
- Modify: `app/data/center-types.ts`
- Test: `app/data/center-types.test.mjs` (new)

**Interfaces:**
- Produces: `CENTER_TYPES` array now `["tcf_canada", "generic", "ecole", "universite", "entreprise"]`; `centerTypeLabel(centerType, locale)` returns `"École"/"School"`, `"Université"/"University"`, `"Entreprise"/"Company"` for the 3 new raw values, unchanged behavior for everything else. `normalizeCenterType()` unchanged (still collapses new values to `"generic"`). All later tasks import `CENTER_TYPES` and/or `centerTypeLabel` from this file — no other task changes this file's exports.

- [ ] **Step 1: Write the failing test**

Create `app/data/center-types.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  CENTER_TYPES,
  normalizeCenterType,
  centerTypeLabel,
  isTcfCanadaCenter,
  isPluriannualCenter,
  resolveStudentExperienceMode,
} = await import("./center-types.ts");

test("CENTER_TYPES contient les 5 valeurs", () => {
  assert.deepEqual(
    [...CENTER_TYPES].sort(),
    ["ecole", "entreprise", "generic", "tcf_canada", "universite"].sort(),
  );
});

test("normalizeCenterType renvoie generic pour les 3 nouveaux types", () => {
  assert.equal(normalizeCenterType("ecole"), "generic");
  assert.equal(normalizeCenterType("universite"), "generic");
  assert.equal(normalizeCenterType("entreprise"), "generic");
});

test("centerTypeLabel renvoie le bon libellé FR pour les 3 nouveaux types", () => {
  assert.equal(centerTypeLabel("ecole", "fr"), "École");
  assert.equal(centerTypeLabel("universite", "fr"), "Université");
  assert.equal(centerTypeLabel("entreprise", "fr"), "Entreprise");
});

test("centerTypeLabel renvoie le bon libellé EN pour les 3 nouveaux types", () => {
  assert.equal(centerTypeLabel("ecole", "en"), "School");
  assert.equal(centerTypeLabel("universite", "en"), "University");
  assert.equal(centerTypeLabel("entreprise", "en"), "Company");
});

test("centerTypeLabel generic/inconnu reste inchangé", () => {
  assert.equal(centerTypeLabel("generic", "fr"), "Centre de formation libre");
  assert.equal(centerTypeLabel(null, "fr"), "Centre de formation libre");
  assert.equal(centerTypeLabel("tcf_canada", "fr"), "Formation native");
});

test("isPluriannualCenter reste true pour les 3 nouveaux types (clone comportemental)", () => {
  assert.equal(isPluriannualCenter("ecole"), true);
  assert.equal(isPluriannualCenter("universite"), true);
  assert.equal(isPluriannualCenter("entreprise"), true);
  assert.equal(isTcfCanadaCenter("ecole"), false);
});

test("resolveStudentExperienceMode reste pluriannual pour les 3 nouveaux types", () => {
  assert.equal(resolveStudentExperienceMode("center-1", "ecole"), "pluriannual");
  assert.equal(resolveStudentExperienceMode("center-1", "universite"), "pluriannual");
  assert.equal(resolveStudentExperienceMode("center-1", "entreprise"), "pluriannual");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd academie-langues && node --experimental-strip-types --test app/data/center-types.test.mjs`
Expected: FAIL — `CENTER_TYPES` only has 2 entries, `centerTypeLabel` doesn't recognize the 3 new values yet.

- [ ] **Step 3: Implement**

In `app/data/center-types.ts`, replace:

```ts
export const CENTER_TYPES = ["tcf_canada", "generic"] as const;
```

with:

```ts
export const CENTER_TYPES = [
  "tcf_canada", "generic", "ecole", "universite", "entreprise",
] as const;
```

Replace the `centerTypeLabel` function body:

```ts
export function centerTypeLabel(
  centerType: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const en = locale === "en";
  switch (centerType) {
    case "tcf_canada":
      return en ? "Native training" : "Formation native";
    case "ecole":
      return en ? "School" : "École";
    case "universite":
      return en ? "University" : "Université";
    case "entreprise":
      return en ? "Company" : "Entreprise";
    default:
      return en ? "Independent training center" : "Centre de formation libre";
  }
}
```

(Note: this switches on the **raw** value now, not the normalized one — `normalizeCenterType(centerType)` is no longer called inside `centerTypeLabel`. This is intentional: normalization collapses `ecole`/`universite`/`entreprise` to `generic`, which would make them indistinguishable in labels. The `default` branch still correctly covers `generic`, `null`, `undefined`, and any legacy/unknown value.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd academie-langues && node --experimental-strip-types --test app/data/center-types.test.mjs`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Run full test suite + typecheck**

Run: `cd academie-langues && npm test && npx tsc --noEmit`
Expected: all existing tests still pass (73+ before this task), no new type errors (this file's exports are used in ~64 files, mostly as `string | null` params so widening `CenterTypeCode` is safe — but confirm no consumer does an exhaustive switch that would now be missing cases).

- [ ] **Step 6: Commit**

```bash
git add app/data/center-types.ts app/data/center-types.test.mjs
git commit -m "feat: ajoute ecole/universite/entreprise comme valeurs de center_type"
```

---

### Task 2: Fix `app/api/centre/creer/route.ts` — stop overwriting the user's selection

**Files:**
- Modify: `app/api/centre/creer/route.ts`

**Interfaces:**
- Consumes: `CENTER_TYPES` from Task 1 (`app/data/center-types.ts`).
- No new exports — this is a leaf route.

**Context:** Line 32-36 currently reads:

```ts
    // Seuls deux types de centres existent : TCF Canada ou centre libre.
    const type = normalizeCenterType(centerType);
    // Libre → nexa_offer ; TCF → plan_type (Starter/Pro/Ultra/custom sur devis)
    const offer = type === "tcf_canada" ? null : normalizeNexaOffer(nexaOffer);
    const tcfPlan = type === "tcf_canada" ? normalizeTcfPlan(planType) : null;
```

This normalizes the raw `centerType` from the request body straight to `"generic"`/`"tcf_canada"` and that normalized value (`type`) is what gets written to `center_type` in the `insert` a few lines later (`center_type: type,`). Any value other than `"tcf_canada"` collapses to `"generic"` in the DB — the new types would never persist.

- [ ] **Step 1: Read the current file to confirm line numbers haven't shifted**

Read: `app/api/centre/creer/route.ts` lines 1-90 (may have moved slightly since this plan was written — match on the code shown above, not the line numbers).

- [ ] **Step 2: Add the import and validation**

Add to the imports at the top of the file:

```ts
import { CENTER_TYPES } from "@/app/data/center-types";
```

Replace the block shown in Context above with:

```ts
    // 5 types de centres existent : TCF Canada, Centre Libre, École, Université, Entreprise.
    // On conserve la sélection brute de l'utilisateur (validée) plutôt que de la
    // normaliser avant stockage — normalizeCenterType() sert uniquement à décider
    // du modèle d'offre ci-dessous, pas à choisir ce qui est écrit en base.
    if (!CENTER_TYPES.includes(centerType)) {
      return NextResponse.json({ error: "Type de centre invalide." }, { status: 400 });
    }
    const type = centerType as (typeof CENTER_TYPES)[number];
    // Libre/École/Université/Entreprise → nexa_offer ; TCF → plan_type (Starter/Pro/Ultra/custom sur devis)
    const offer = type === "tcf_canada" ? null : normalizeNexaOffer(nexaOffer);
    const tcfPlan = type === "tcf_canada" ? normalizeTcfPlan(planType) : null;
```

Remove the now-unused `normalizeCenterType` import if this file imported it only for this line (check remaining usages in the file first — grep the file for `normalizeCenterType` after this edit; if no other call remains, delete the import line).

- [ ] **Step 3: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean. If `normalizeCenterType` import removal leaves an unused-import lint error, confirm it's actually gone (search the file for any remaining reference before deleting the import).

- [ ] **Step 4: Manual verification**

This route can't be unit-tested without a live Supabase instance (service_role writes). Confirm by reading the diff that: (a) an invalid `centerType` (e.g. `"bogus"`) now returns 400 instead of silently becoming `"generic"`, (b) `centerType: "universite"` now flows through to `center_type: type` unchanged, (c) the offer/plan branch logic (`type === "tcf_canada"`) still behaves identically for the 2 pre-existing types. Full live verification (real signup through `/ouvrir-centre` with a new type, once Task 6 wires the UI) happens at the end of this plan.

- [ ] **Step 5: Commit**

```bash
git add app/api/centre/creer/route.ts
git commit -m "fix: centre/creer stocke le center_type choisi au lieu de le normaliser"
```

---

### Task 3: Fix `app/api/center/create/route.ts` — same bug, branch-creation route

**Files:**
- Modify: `app/api/center/create/route.ts`

**Interfaces:**
- Consumes: `CENTER_TYPES` from Task 1.
- No new exports.

**Context:** Line 19 currently reads `const type = normalizeCenterType(centerType);` and `type` is written directly to `center_type` at line 23. Same bug as Task 2, different route (used by `CenterSidebar.tsx`'s "create another center/branch" flow).

- [ ] **Step 1: Read the current file to confirm nothing has shifted**

Read: `app/api/center/create/route.ts` (49 lines total) — match against the code shown in Task 3's Context, not line numbers, in case Task 2's edits to a different file caused no shift here (they shouldn't, different file, but confirm).

- [ ] **Step 2: Replace the import and normalization line**

Replace:

```ts
import { normalizeCenterType } from "@/app/data/center-types";
```

with:

```ts
import { CENTER_TYPES } from "@/app/data/center-types";
```

Replace:

```ts
  const type = normalizeCenterType(centerType);
```

with:

```ts
  if (!CENTER_TYPES.includes(centerType)) {
    return NextResponse.json({ error: "Type de centre invalide." }, { status: 400 });
  }
  const type = centerType as (typeof CENTER_TYPES)[number];
```

Everything downstream (`center_type: type`, `if (type === "tcf_canada")` at the filière-seeding block) is unaffected — it already compares against the exact string `"tcf_canada"`, which still works correctly for all 5 types.

- [ ] **Step 3: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/center/create/route.ts
git commit -m "fix: center/create stocke le center_type choisi au lieu de le normaliser"
```

---

### Task 4: `CenterSidebar.tsx` — "create another center" dropdown

**Files:**
- Modify: `app/components/CenterSidebar.tsx`

**Interfaces:**
- Consumes: `CENTER_TYPES`, `centerTypeLabel`, `type CenterTypeCode` from Task 1 (`app/data/center-types.ts`, already partially imported in this file — see below).
- Consumes: `POST /api/center/create` from Task 3 (body shape unchanged, `centerType` now validated server-side against all 5 values).
- No new exports — internal component.

**Context:** This file already imports `normalizeCenterType` and `type CenterTypeCode` from `@/app/data/center-types` (line 17) for other uses elsewhere in the file — do not remove that import, only add `CENTER_TYPES` and `centerTypeLabel` to it. The `CreateCenterModal` function (starts ~line 781) has its own local state, separate from the rest of the file, and does not currently call `useI18n()`.

Current code (~line 784):
```tsx
  const [centerType, setCenterType] = useState("generic");
```

Current dropdown (~lines 819-824):
```tsx
          <div className="relative">
            <button type="button" onClick={() => setTypeOpen((value) => !value)} className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm font-semibold text-[#11224E] transition ${typeOpen ? "border-[#11224E] ring-2 ring-[#11224E]/10" : "border-neutral-200"}`}>
              <span>{centerType === "tcf_canada" ? "Centre TCF Canada" : "Centre libre"}</span><ChevronDown size={16} className={`transition-transform ${typeOpen ? "rotate-180" : ""}`} />
            </button>
            {typeOpen && <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">{[["generic", "Centre libre"], ["tcf_canada", "Centre TCF Canada"]].map(([value, label]) => <button key={value} type="button" onClick={() => { setCenterType(normalizeCenterType(value)); setTypeOpen(false); }} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${centerType === value ? "bg-[#11224E] text-white" : "text-[#11224E] hover:bg-neutral-100"}`}>{label}</button>)}</div>}
          </div>
```

Current confirmation text (~line 830, single line, shown wrapped here for readability):
```tsx
<p className="mt-2 text-sm leading-relaxed text-neutral-600">
  Créer <strong>{name}</strong> à <strong>{city}</strong> comme
  <strong>{centerType === "tcf_canada" ? "centre TCF Canada" : "centre libre"}</strong> ?
</p>
```

- [ ] **Step 1: Read the current file around lines 780-833 to confirm exact text**

Read: `app/components/CenterSidebar.tsx` lines 780-834 — match against the Context above (line numbers may have shifted slightly).

- [ ] **Step 2: Update the import line**

Replace line 17:
```ts
import { normalizeCenterType, type CenterTypeCode } from "@/app/data/center-types";
```
with:
```ts
import { normalizeCenterType, centerTypeLabel, CENTER_TYPES, type CenterTypeCode } from "@/app/data/center-types";
```

- [ ] **Step 3: Type the state and add `useI18n` locale access inside `CreateCenterModal`**

Replace:
```tsx
  const [centerType, setCenterType] = useState("generic");
```
with:
```tsx
  const { locale } = useI18n();
  const [centerType, setCenterType] = useState<CenterTypeCode>("generic");
```

- [ ] **Step 4: Replace the dropdown to list all 5 types via `centerTypeLabel`**

Replace the dropdown block shown in Context with:

```tsx
          <div className="relative">
            <button type="button" onClick={() => setTypeOpen((value) => !value)} className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm font-semibold text-[#11224E] transition ${typeOpen ? "border-[#11224E] ring-2 ring-[#11224E]/10" : "border-neutral-200"}`}>
              <span>{centerTypeLabel(centerType, locale)}</span><ChevronDown size={16} className={`transition-transform ${typeOpen ? "rotate-180" : ""}`} />
            </button>
            {typeOpen && <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">{CENTER_TYPES.map((value) => <button key={value} type="button" onClick={() => { setCenterType(value); setTypeOpen(false); }} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${centerType === value ? "bg-[#11224E] text-white" : "text-[#11224E] hover:bg-neutral-100"}`}>{centerTypeLabel(value, locale)}</button>)}</div>}
          </div>
```

(`normalizeCenterType` is no longer called at selection time — the raw value picked from `CENTER_TYPES` is stored directly, matching Task 2/3's fix. `normalizeCenterType` stays imported for the file's other uses outside this modal.)

- [ ] **Step 5: Update the confirmation text**

Replace:
```tsx
<strong>{centerType === "tcf_canada" ? "centre TCF Canada" : "centre libre"}</strong>
```
with:
```tsx
<strong>{centerTypeLabel(centerType, locale)}</strong>
```

- [ ] **Step 6: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add app/components/CenterSidebar.tsx
git commit -m "feat: dropdown creation de filiale propose les 5 types de centre"
```

---

### Task 5: Superadmin `CreateCenterModal.tsx` — 5-option type grid

**Files:**
- Modify: `app/superadmin/_components/CreateCenterModal.tsx`
- Modify: `app/i18n/messages/superadmin.ts`

**Interfaces:**
- Consumes: `POST /api/centre/creer` (Task 2, unchanged shape, now accepts all 5 `centerType` values).
- No new exports.

**Context:** Line 8: `type CenterTypeChoice = "generic" | "tcf_canada";`. Lines 134-154: a `grid-cols-2` of 2 buttons built from a literal tuple array `[["generic", "centresTypeNative"], ["tcf_canada", "centresTypeTcf"]]`, each rendering `t("superadmin", labelKey)`.

- [ ] **Step 1: Add 3 new i18n keys to `app/i18n/messages/superadmin.ts`**

In the FR block, find this exact substring (appears once, confirmed via grep):
```
centresTypeTcf: "TCF", centresTypeNative: "Libre",
```
Replace with:
```
centresTypeTcf: "TCF", centresTypeNative: "Libre", centresTypeEcole: "École", centresTypeUniversite: "Université", centresTypeEntreprise: "Entreprise",
```

In the EN block, find this exact substring (appears once):
```
centresTypeTcf: "TCF", centresTypeNative: "Independent",
```
Replace with:
```
centresTypeTcf: "TCF", centresTypeNative: "Independent", centresTypeEcole: "School", centresTypeUniversite: "University", centresTypeEntreprise: "Company",
```

- [ ] **Step 2: Update `CenterTypeChoice` and the option list in `CreateCenterModal.tsx`**

Replace:
```ts
type CenterTypeChoice = "generic" | "tcf_canada";
```
with:
```ts
type CenterTypeChoice = "generic" | "tcf_canada" | "ecole" | "universite" | "entreprise";
```

Replace the grid block:
```tsx
        <div className="mt-5 grid grid-cols-2 gap-2">
          {(
            [
              ["generic", "centresTypeNative"],
              ["tcf_canada", "centresTypeTcf"],
            ] as const
          ).map(([value, labelKey]) => (
```
with:
```tsx
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(
            [
              ["generic", "centresTypeNative"],
              ["tcf_canada", "centresTypeTcf"],
              ["ecole", "centresTypeEcole"],
              ["universite", "centresTypeUniversite"],
              ["entreprise", "centresTypeEntreprise"],
            ] as const
          ).map(([value, labelKey]) => (
```

(The closing `))}` and the button JSX inside the `.map` are untouched — only the array literal and the grid's responsive column count change.)

- [ ] **Step 3: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/superadmin/_components/CreateCenterModal.tsx app/i18n/messages/superadmin.ts
git commit -m "feat: creation de centre superadmin propose ecole/universite/entreprise"
```

---

### Task 6: `/ouvrir-centre` — main signup page, 4 program cards

**Files:**
- Modify: `app/ouvrir-centre/page.tsx`
- Modify: `app/i18n/messages/openingCentre.ts`

**Interfaces:**
- Consumes: `POST /api/centre/creer` (Task 2).
- No new exports.

**Context:** `PROGRAMS` array (lines ~61-100) has 2 entries: `"native"` (opens the TCF Canada sub-card) and `"generic"` (direct selection). `ProgramFamily` type (line 41) is `"native" | "generic" | null`. Icon imports (line 6-10) include `GraduationCap` (currently used by the `"generic"` entry) and `Building2` (currently used only on the submit button at line 884, not as an icon in `PROGRAMS`).

- [ ] **Step 1: Add 12 new i18n keys (4 fields × 3 types) to `app/i18n/messages/openingCentre.ts`**

In the FR block, find this exact substring (appears once):
```
ouvrirCentreProgramGenericTitle: "Formation libre", ouvrirCentreProgramGenericSubtitle: "Vous construisez votre offre", ouvrirCentreProgramGenericBlurb: "Créez filières courtes ou longues, périodes, notes et bulletins  -  à votre rythme.", ouvrirCentreProgramGenericPoint1: "Filières & campus", ouvrirCentreProgramGenericPoint2: "Notes & bulletins", ouvrirCentreProgramGenericPoint3: "Finance & échéanciers",
```
Replace with (same text, plus 3 new blocks appended):
```
ouvrirCentreProgramGenericTitle: "Formation libre", ouvrirCentreProgramGenericSubtitle: "Vous construisez votre offre", ouvrirCentreProgramGenericBlurb: "Créez filières courtes ou longues, périodes, notes et bulletins  -  à votre rythme.", ouvrirCentreProgramGenericPoint1: "Filières & campus", ouvrirCentreProgramGenericPoint2: "Notes & bulletins", ouvrirCentreProgramGenericPoint3: "Finance & échéanciers",
    ouvrirCentreProgramEcoleTitle: "École", ouvrirCentreProgramEcoleSubtitle: "Primaire, secondaire, cycles complets", ouvrirCentreProgramEcoleBlurb: "Gérez classes, niveaux, emplois du temps, notes et bulletins - de la maternelle au lycée.", ouvrirCentreProgramEcolePoint1: "Classes & niveaux", ouvrirCentreProgramEcolePoint2: "Bulletins scolaires", ouvrirCentreProgramEcolePoint3: "Suivi des élèves",
    ouvrirCentreProgramUniversiteTitle: "Université", ouvrirCentreProgramUniversiteSubtitle: "Facultés, filières, semestres", ouvrirCentreProgramUniversiteBlurb: "Organisez facultés, filières, semestres, crédits et relevés de notes - pour l'enseignement supérieur.", ouvrirCentreProgramUniversitePoint1: "Facultés & filières", ouvrirCentreProgramUniversitePoint2: "Semestres & crédits", ouvrirCentreProgramUniversitePoint3: "Relevés de notes",
    ouvrirCentreProgramEntrepriseTitle: "Entreprise", ouvrirCentreProgramEntrepriseSubtitle: "Formation professionnelle interne", ouvrirCentreProgramEntrepriseBlurb: "Formez vos équipes en interne : sessions, modules, suivi de présence et certification - à votre rythme.", ouvrirCentreProgramEntreprisePoint1: "Sessions & modules", ouvrirCentreProgramEntreprisePoint2: "Suivi de présence", ouvrirCentreProgramEntreprisePoint3: "Certification interne",
```

In the EN block, find this exact substring (appears once):
```
ouvrirCentreProgramGenericTitle: "Flexible training", ouvrirCentreProgramGenericSubtitle: "Build your own offering", ouvrirCentreProgramGenericBlurb: "Create short or long programs, terms, grades, and report cards - at your own pace.", ouvrirCentreProgramGenericPoint1: "Programs & campuses", ouvrirCentreProgramGenericPoint2: "Grades & report cards", ouvrirCentreProgramGenericPoint3: "Finance & payment schedules",
```
Replace with:
```
ouvrirCentreProgramGenericTitle: "Flexible training", ouvrirCentreProgramGenericSubtitle: "Build your own offering", ouvrirCentreProgramGenericBlurb: "Create short or long programs, terms, grades, and report cards - at your own pace.", ouvrirCentreProgramGenericPoint1: "Programs & campuses", ouvrirCentreProgramGenericPoint2: "Grades & report cards", ouvrirCentreProgramGenericPoint3: "Finance & payment schedules",
    ouvrirCentreProgramEcoleTitle: "School", ouvrirCentreProgramEcoleSubtitle: "Primary, secondary, full cycles", ouvrirCentreProgramEcoleBlurb: "Manage classes, grade levels, timetables, grades, and report cards - from kindergarten to high school.", ouvrirCentreProgramEcolePoint1: "Classes & grade levels", ouvrirCentreProgramEcolePoint2: "School report cards", ouvrirCentreProgramEcolePoint3: "Student tracking",
    ouvrirCentreProgramUniversiteTitle: "University", ouvrirCentreProgramUniversiteSubtitle: "Faculties, majors, semesters", ouvrirCentreProgramUniversiteBlurb: "Organize faculties, majors, semesters, credits, and transcripts - for higher education.", ouvrirCentreProgramUniversitePoint1: "Faculties & majors", ouvrirCentreProgramUniversitePoint2: "Semesters & credits", ouvrirCentreProgramUniversitePoint3: "Transcripts",
    ouvrirCentreProgramEntrepriseTitle: "Company", ouvrirCentreProgramEntrepriseSubtitle: "Internal professional training", ouvrirCentreProgramEntrepriseBlurb: "Train your teams in-house: sessions, modules, attendance tracking, and certification - at your own pace.", ouvrirCentreProgramEntreprisePoint1: "Sessions & modules", ouvrirCentreProgramEntreprisePoint2: "Attendance tracking", ouvrirCentreProgramEntreprisePoint3: "Internal certification",
```

- [ ] **Step 2: Update icon imports in `app/ouvrir-centre/page.tsx`**

Replace:
```ts
import {
  Building2, ArrowRight, ArrowLeft, Check,
  Loader2, Eye, EyeOff, Award, GraduationCap, Flag,
  ChevronDown, type LucideIcon,
} from "lucide-react";
```
with:
```ts
import {
  Building2, ArrowRight, ArrowLeft, Check,
  Loader2, Eye, EyeOff, Award, GraduationCap, Flag,
  ChevronDown, Layers, School, type LucideIcon,
} from "lucide-react";
```

- [ ] **Step 3: Widen the `ProgramFamily` type**

Replace:
```ts
type ProgramFamily = "native" | "generic" | null;
```
with:
```ts
type ProgramFamily = "native" | "generic" | "ecole" | "universite" | "entreprise" | null;
```

- [ ] **Step 4: Replace the single `"generic"` entry with 4 entries in `PROGRAMS`**

Replace the `"generic"` object in the `PROGRAMS` array (the second and last entry currently in the array):
```ts
  {
    family: "generic",
    centerType: "generic",
    icon: GraduationCap,
    titleKey: "ouvrirCentreProgramGenericTitle",
    subtitleKey: "ouvrirCentreProgramGenericSubtitle",
    blurbKey: "ouvrirCentreProgramGenericBlurb",
    pointKeys: [
      "ouvrirCentreProgramGenericPoint1",
      "ouvrirCentreProgramGenericPoint2",
      "ouvrirCentreProgramGenericPoint3",
    ],
    accent: ORANGE,
  },
```
with 4 entries (Formation libre now uses `Layers`, Université gets `GraduationCap`, École gets `School`, Entreprise reuses `Building2`):
```ts
  {
    family: "generic",
    centerType: "generic",
    icon: Layers,
    titleKey: "ouvrirCentreProgramGenericTitle",
    subtitleKey: "ouvrirCentreProgramGenericSubtitle",
    blurbKey: "ouvrirCentreProgramGenericBlurb",
    pointKeys: [
      "ouvrirCentreProgramGenericPoint1",
      "ouvrirCentreProgramGenericPoint2",
      "ouvrirCentreProgramGenericPoint3",
    ],
    accent: ORANGE,
  },
  {
    family: "ecole",
    centerType: "ecole",
    icon: School,
    titleKey: "ouvrirCentreProgramEcoleTitle",
    subtitleKey: "ouvrirCentreProgramEcoleSubtitle",
    blurbKey: "ouvrirCentreProgramEcoleBlurb",
    pointKeys: [
      "ouvrirCentreProgramEcolePoint1",
      "ouvrirCentreProgramEcolePoint2",
      "ouvrirCentreProgramEcolePoint3",
    ],
    accent: ORANGE,
  },
  {
    family: "universite",
    centerType: "universite",
    icon: GraduationCap,
    titleKey: "ouvrirCentreProgramUniversiteTitle",
    subtitleKey: "ouvrirCentreProgramUniversiteSubtitle",
    blurbKey: "ouvrirCentreProgramUniversiteBlurb",
    pointKeys: [
      "ouvrirCentreProgramUniversitePoint1",
      "ouvrirCentreProgramUniversitePoint2",
      "ouvrirCentreProgramUniversitePoint3",
    ],
    accent: ORANGE,
  },
  {
    family: "entreprise",
    centerType: "entreprise",
    icon: Building2,
    titleKey: "ouvrirCentreProgramEntrepriseTitle",
    subtitleKey: "ouvrirCentreProgramEntrepriseSubtitle",
    blurbKey: "ouvrirCentreProgramEntrepriseBlurb",
    pointKeys: [
      "ouvrirCentreProgramEntreprisePoint1",
      "ouvrirCentreProgramEntreprisePoint2",
      "ouvrirCentreProgramEntreprisePoint3",
    ],
    accent: ORANGE,
  },
```

The `PROGRAMS` type annotation above the array (`family: Exclude<ProgramFamily, null>; centerType: CenterTypeCode | null; ...`) does not need changes — `Exclude<ProgramFamily, null>` automatically includes the 3 new literals now that `ProgramFamily` was widened in Step 3, and `centerType: CenterTypeCode | null` already accepts the 3 new values since Task 1 widened `CenterTypeCode` (it's the same type as `CENTER_TYPES[number]`).

- [ ] **Step 5: Verify `selectProgram` handles the new families correctly**

Read the `selectProgram` function (~line 229-238):
```ts
  const selectProgram = (family: Exclude<ProgramFamily, null>, type: CenterTypeCode | null) => {
    setProgramFamily(family);
    if (family === "native") {
      setCenterType((prev) => (prev === "tcf_canada" ? prev : null));
      return;
    }
    setCenterType(type);
    setTcfPlan(null);
  };
```
No change needed: the `if (family === "native")` branch only special-cases `"native"`; every other family (including the 3 new ones) falls through to `setCenterType(type)`, exactly like `"generic"` does today. Confirm this by reading the function, don't skip this step — if the condition were ever changed to something broader (e.g. `family !== "generic"`), it would need updating, but as written it's already correct.

- [ ] **Step 6: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Manual verification in the running app**

Run: `cd academie-langues && npm run dev` (if not already running), navigate to `/ouvrir-centre`. Confirm: 5 cards total (Formation native + 4 at the same level: Formation libre, École, Université, Entreprise), each selectable, each shows its own title/subtitle/blurb/points, no icon visually duplicated in a confusing way. Stop the dev server after checking (or leave running if you're about to do Task 7's manual check too).

- [ ] **Step 8: Commit**

```bash
git add app/ouvrir-centre/page.tsx app/i18n/messages/openingCentre.ts
git commit -m "feat: page d'inscription propose ecole/universite/entreprise comme programmes"
```

---

### Task 7: Superadmin centres list — detailed type filter

**Files:**
- Modify: `app/superadmin/centres/page.tsx`
- Modify: `app/i18n/messages/superadmin.ts`

**Interfaces:**
- No new exports — leaf page.

**Context:** `TypeFilter` type (line 44): `"all" | "tcf" | "native"`. Filter logic (lines 159-160):
```ts
      if (typeFilter === "tcf" && c.center_type !== "tcf_canada") return false;
      if (typeFilter === "native" && c.center_type === "tcf_canada") return false;
```
Select markup (lines 302-310):
```tsx
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-xl border border-white/10 bg-[#0a0f1c] px-3 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-orange-400"
        >
          <option value="all">{t("superadmin", "centresFilterTypeAll")}</option>
          <option value="tcf">{t("superadmin", "centresFilterTypeTcf")}</option>
          <option value="native">{t("superadmin", "centresFilterTypeNative")}</option>
        </select>
```

- [ ] **Step 1: Add 3 new i18n keys, rename one, in `app/i18n/messages/superadmin.ts`**

In the FR block, find this exact substring (appears once):
```
centresFilterTypeAll: "Tous les types", centresFilterTypeTcf: "TCF", centresFilterTypeNative: "Libres",
```
Replace with:
```
centresFilterTypeAll: "Tous les types", centresFilterTypeTcf: "TCF", centresFilterTypeGeneric: "Libres", centresFilterTypeEcole: "Écoles", centresFilterTypeUniversite: "Universités", centresFilterTypeEntreprise: "Entreprises",
```

In the EN block, find this exact substring (appears once):
```
centresFilterTypeAll: "All types", centresFilterTypeTcf: "TCF", centresFilterTypeNative: "Independent",
```
Replace with:
```
centresFilterTypeAll: "All types", centresFilterTypeTcf: "TCF", centresFilterTypeGeneric: "Independent", centresFilterTypeEcole: "Schools", centresFilterTypeUniversite: "Universities", centresFilterTypeEntreprise: "Companies",
```

(`centresFilterTypeNative` is renamed to `centresFilterTypeGeneric` — grep confirmed this key is used nowhere else in the repo besides this one `<option>`, which Step 3 below updates to the new key name in the same commit.)

- [ ] **Step 2: Widen `TypeFilter` and update the filter logic**

Replace:
```ts
type TypeFilter = "all" | "tcf" | "native";
```
with:
```ts
type TypeFilter = "all" | "tcf" | "generic" | "ecole" | "universite" | "entreprise";
```

Replace:
```ts
      if (typeFilter === "tcf" && c.center_type !== "tcf_canada") return false;
      if (typeFilter === "native" && c.center_type === "tcf_canada") return false;
```
with:
```ts
      if (typeFilter !== "all") {
        if (typeFilter === "tcf") {
          if (c.center_type !== "tcf_canada") return false;
        } else {
          // Tout ce qui n'est pas explicitement ecole/universite/entreprise retombe
          // dans "generic" (comportement clone — voir center-types.ts), y compris
          // les valeurs legacy (null, "formation_courte").
          const raw = c.center_type && c.center_type !== "tcf_canada" ? c.center_type : "generic";
          const bucket = ["ecole", "universite", "entreprise"].includes(raw) ? raw : "generic";
          if (bucket !== typeFilter) return false;
        }
      }
```

- [ ] **Step 3: Update the `<select>` options**

Replace:
```tsx
          <option value="all">{t("superadmin", "centresFilterTypeAll")}</option>
          <option value="tcf">{t("superadmin", "centresFilterTypeTcf")}</option>
          <option value="native">{t("superadmin", "centresFilterTypeNative")}</option>
```
with:
```tsx
          <option value="all">{t("superadmin", "centresFilterTypeAll")}</option>
          <option value="tcf">{t("superadmin", "centresFilterTypeTcf")}</option>
          <option value="generic">{t("superadmin", "centresFilterTypeGeneric")}</option>
          <option value="ecole">{t("superadmin", "centresFilterTypeEcole")}</option>
          <option value="universite">{t("superadmin", "centresFilterTypeUniversite")}</option>
          <option value="entreprise">{t("superadmin", "centresFilterTypeEntreprise")}</option>
```

- [ ] **Step 4: Verify**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Manual verification**

In the running app (`npm run dev` if not already running), go to `/superadmin/centres`, open the type filter dropdown: confirm 6 options (Tous les types / TCF / Libres / Écoles / Universités / Entreprises). If any centers were created via Task 6's manual check with the new types, confirm filtering by "Écoles"/"Universités"/"Entreprises" isolates them correctly, and that their badge/label elsewhere on the page (list row, detail panel) shows the correct name via `centerTypeLabel()` — this should already work automatically from Task 1, confirm rather than assume.

- [ ] **Step 6: Commit**

```bash
git add app/superadmin/centres/page.tsx app/i18n/messages/superadmin.ts
git commit -m "feat: filtre superadmin par type de centre detaille (ecole/universite/entreprise)"
```

---

### Task 8: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `cd academie-langues && npm test`
Expected: all tests pass (73 pre-existing + 6 new from Task 1 = 79).

- [ ] **Step 2: Full typecheck**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: clean, zero errors.

- [ ] **Step 3: End-to-end manual signup, one new type**

With the dev server running, go through `/ouvrir-centre` fully for one new type (e.g. Université): fill the form, submit, confirm the created center's dashboard loads and looks/behaves identically to an existing Centre Libre account (same nav, same modules, same quotas). This is the one step in this plan that touches a real Supabase write — do it once, not per-task, to avoid creating throwaway test centers for all 3 types.

- [ ] **Step 4: Confirm the stored value in Supabase**

Query (via Supabase dashboard or a quick `select id, name, center_type from centers order by created_at desc limit 1;`) that the just-created center's `center_type` column reads `"universite"`, not `"generic"` — this is the concrete proof that Task 2's fix works end-to-end, not just in isolation.
