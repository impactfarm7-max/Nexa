# Staff PDF / UI dossier / Paie / Accès / Dashboard formateur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher tous les PDF centre sur le modèle Paramètres, corriger l’UI dossier staff (actions + chiffres), capturer la prime contrat en opt-in sur la paie, fixer les droits formateur par défaut, et afficher le planning perso sur le dashboard formateur.

**Architecture:** Correctifs ciblés sur les fichiers existants. Réutiliser `fetchDocumentExportConfig` + `downloadPayslipPdf(..., config)`. Extraire les constantes permissions formateur et un petit composant widget planning (logique `get_weekly_schedule` déjà dans `/centre/mon-planning`). Pas de nouvelle table SQL : la prime contrat opt-in devient une ligne `staff_payroll_lines` (`type: "prime"`).

**Tech Stack:** Next.js App Router, React, Supabase (RPC `get_weekly_schedule`), jsPDF (`centerPdfExport`), tests `node --test` sur helpers `.mjs` si extrait.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-08-03-staff-pdf-paie-acces-dashboard-design.md`
- PDF : tous les exports centre via `fetchDocumentExportConfig` ; hors scope certificats exam QR (`certificate.server`)
- Prime contrat : case **décochée par défaut** ; jamais d’inclusion auto
- Formateur défauts : `["cours","communaute","examens","lives"]` uniquement (remplace `etudiants`/`filieres`/`communaute`)
- Dashboard widget : rôle `trainer` uniquement
- Ne pas committer sans demande explicite de l’utilisateur (règle projet) — les steps « Commit » sont optionnels / à sauter si non demandé
- YAGNI : pas de refonte Paramètres Documents, pas de migration `profiles.prime`

## File map

| Fichier | Rôle |
|---|---|
| `app/centre/staff/page.tsx` | Déplacer Modifier/Suspendre ; NumInput placeholder ; fallbacks trainer UI |
| `app/api/staff/route.ts` | Défauts trainer create + GET fallback + staff_permissions trainers |
| `app/components/StaffPayrollTab.tsx` | Checkbox prime contrat ; PDF avec docConfig ; inputs placeholder |
| `app/api/center/staff-payroll/route.ts` | Action `include_contract_prime` (ou add_line dédiée) |
| `app/utils/centerPdfExport.ts` | S’assurer que chaque export honore `config` (déjà partiel) |
| Call sites PDF manquants | Brancher `fetchDocumentExportConfig` où absent (paie, statement finance si besoin) |
| `app/centre/dashboard/*` | Exposer `role` ; widget formateur |
| `app/components/TrainerWeekSchedule.tsx` (nouveau) | Widget / extrait planning semaine filtré formateur |
| `app/utils/trainer-defaults.mjs` + test (nouveau) | Constante + helpers testables |

---

### Task 1: Constante permissions formateur + tests

**Files:**
- Create: `academie-langues/app/utils/trainer-defaults.mjs`
- Create: `academie-langues/app/utils/trainer-defaults.d.ts`
- Create: `academie-langues/app/utils/trainer-defaults.test.mjs`
- Create: `academie-langues/app/utils/trainer-defaults.ts` (re-export)

**Interfaces:**
- Produces: `TRAINER_DEFAULT_PERMISSIONS: readonly string[]` = `["cours","communaute","examens","lives"]`
- Produces: `resolveTrainerPermissions(stored: string[] | null | undefined): string[]` — si vide → défauts, sinon filtre inchangé

- [ ] **Step 1: Write failing test**

```js
// app/utils/trainer-defaults.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { TRAINER_DEFAULT_PERMISSIONS, resolveTrainerPermissions } from "./trainer-defaults.mjs";

test("defaults are pedagogical modules", () => {
  assert.deepEqual([...TRAINER_DEFAULT_PERMISSIONS], ["cours", "communaute", "examens", "lives"]);
});

test("empty stored → defaults", () => {
  assert.deepEqual(resolveTrainerPermissions([]), ["cours", "communaute", "examens", "lives"]);
  assert.deepEqual(resolveTrainerPermissions(null), ["cours", "communaute", "examens", "lives"]);
});

test("non-empty stored → kept as-is", () => {
  assert.deepEqual(resolveTrainerPermissions(["cours", "lives"]), ["cours", "lives"]);
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `node --test academie-langues/app/utils/trainer-defaults.test.mjs`  
Expected: FAIL cannot find module

- [ ] **Step 3: Implement minimal module**

```js
// app/utils/trainer-defaults.mjs
export const TRAINER_DEFAULT_PERMISSIONS = Object.freeze([
  "cours",
  "communaute",
  "examens",
  "lives",
]);

export function resolveTrainerPermissions(stored) {
  if (!stored || stored.length === 0) {
    return [...TRAINER_DEFAULT_PERMISSIONS];
  }
  return [...stored];
}
```

```ts
// app/utils/trainer-defaults.ts
export {
  TRAINER_DEFAULT_PERMISSIONS,
  resolveTrainerPermissions,
} from "./trainer-defaults.mjs";
```

```ts
// app/utils/trainer-defaults.d.ts
export declare const TRAINER_DEFAULT_PERMISSIONS: readonly string[];
export declare function resolveTrainerPermissions(
  stored: string[] | null | undefined,
): string[];
```

- [ ] **Step 4: Run test — expect PASS**

Run: `node --test academie-langues/app/utils/trainer-defaults.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit (si demandé)**

```bash
git add academie-langues/app/utils/trainer-defaults.*
git commit -m "feat(staff): trainer default module permissions helper"
```

---

### Task 2: API staff — appliquer défauts formateur

**Files:**
- Modify: `academie-langues/app/api/staff/route.ts` (create ~406-441, GET fallback ~155-158, PATCH si fallback trainer)

**Interfaces:**
- Consumes: `TRAINER_DEFAULT_PERMISSIONS` / `resolveTrainerPermissions` from `@/app/utils/trainer-defaults`
- Produces: create trainer → `center_users.permissions` = défauts ; insert `staff_permissions` aussi pour trainers ; GET empty trainer → mêmes défauts

- [ ] **Step 1: Replace trainer create defaults**

Dans le POST create, remplacer :

```ts
: role === "trainer"
  ? ["etudiants", "filieres", "communaute"]
  : [];
```

par :

```ts
: role === "trainer"
  ? [...TRAINER_DEFAULT_PERMISSIONS]
  : [];
```

- [ ] **Step 2: Persister `staff_permissions` pour trainers**

Remplacer le bloc qui ne write `staff_permissions` que pour `role === "staff"` :

```ts
const modulePerms =
  role === "staff"
    ? applyTcfStaffPermissions(sanitizeModulePermissions(permissions || []), centerType)
    : role === "trainer"
      ? applyTcfStaffPermissions([...TRAINER_DEFAULT_PERMISSIONS], centerType)
      : [];
```

(Conserver le insert existant si `modulePerms.length > 0`.)

- [ ] **Step 3: Align GET fallback**

Remplacer le fallback trainer vide :

```ts
access[s.id].permissions = resolveTrainerPermissions(
  filterModulePermissions(access[s.id].permissions),
);
```

(ou équivalent : si length 0 après filter → `TRAINER_DEFAULT_PERMISSIONS`).

Vérifier aussi tout autre fallback `["etudiants","filieres","communaute"]` dans `CenterSidebar.tsx` / `student-routes.ts` — aligner sur la constante si c’est un fallback trainer.

- [ ] **Step 4: Manual check**

Créer un formateur via UI → onglet Accès doit montrer cours / communauté / examens / lives cochés.

- [ ] **Step 5: Commit (si demandé)**

```bash
git add academie-langues/app/api/staff/route.ts academie-langues/app/components/CenterSidebar.tsx academie-langues/app/utils/student-routes.ts
git commit -m "feat(staff): default trainer access to cours, communaute, examens, lives"
```

---

### Task 3: UI dossier — Modifier / Suspendre en bas + NumInput filigrane

**Files:**
- Modify: `academie-langues/app/centre/staff/page.tsx` (~721-786 header, ~800+ body end, ~2829 NumInput, usages RH ~1582)

**Interfaces:**
- Produces: header = tabs only ; footer actions Modifier + Suspendre/Réactiver
- Produces: `NumInput` avec `value: number | null`, `placeholder?: string`, champ string interne / value=""

- [ ] **Step 1: Retirer Modifier / Suspendre du header**

Dans le header dossier (`staffTabs` zone), supprimer les deux boutons (l.768-786). Garder uniquement les onglets + back.

- [ ] **Step 2: Ajouter footer actions sous le contenu**

Après le contenu des onglets (fin du bloc `selectedStaff`, avant fermeture layout), ajouter :

```tsx
<div className="mt-6 pt-4 border-t border-black/[0.06] flex flex-wrap gap-2 justify-end">
  {!rhEditing && (
    <button
      type="button"
      onClick={() => {
        setActiveTab("rh");
        setRhEditing(true);
      }}
      className="h-10 px-4 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:bg-black/[0.03]"
    >
      <Edit3 size={14} /> Modifier
    </button>
  )}
  <button
    type="button"
    onClick={() => void toggleStatus(selectedStaff.id, selectedStaff.center_status)}
    className="h-10 px-4 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold text-neutral-700 hover:bg-black/[0.03]"
  >
    {selectedStaff.center_status === "active" ? "Suspendre" : "Réactiver"}
  </button>
</div>
```

- [ ] **Step 3: Refondre `NumInput`**

```tsx
function NumInput({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value === null || Number.isNaN(value) ? "" : value}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange(null);
        else onChange(Number(raw));
      }}
      min={min}
      max={max}
      className={inputCls}
    />
  );
}
```

- [ ] **Step 4: Brancher les champs RH**

Pour `base_salary`, `prime`, `weekly_hours`, `seniority_years` en édition :
- state local : `number | null` (ne plus forcer `|| 0` dans le controlled value)
- placeholder = ancienne valeur affichée en filigrane, ex. `placeholder={String(staff.base_salary || 0)}` ou `"0"` / `"40"` pour heures
- save : `null` → `null` en DB (ou 0 seulement si contrainte existante documentée)

Même traitement pour `baseEdit` dans `StaffPayrollTab` si encore `type="number"` collé (Task 4 peut le reprendre).

- [ ] **Step 5: Manual check**

Ouvrir dossier → boutons absents du header, présents en bas ; focus salaire → champ vide + placeholder, saisie libre.

- [ ] **Step 6: Commit (si demandé)**

```bash
git add academie-langues/app/centre/staff/page.tsx
git commit -m "fix(staff): move edit/suspend to footer and use numeric placeholders"
```

---

### Task 4: Paie — prime contrat opt-in + PDF modèle

**Files:**
- Modify: `academie-langues/app/components/StaffPayrollTab.tsx` (~704-730 contrat, ~351 handleDownload)
- Modify: `academie-langues/app/api/center/staff-payroll/route.ts` (POST actions)

**Interfaces:**
- Consumes: `contract.prime` déjà renvoyé par GET
- Produces: UI checkbox « Inclure la prime contrat » ; POST `action: "include_contract_prime"` → insert line `type:"prime"`, reason `"Prime contrat"`, amount = `profiles.prime` si > 0 et pas déjà présente
- Produces: `downloadPayslipPdf({ ..., config })` avec `fetchDocumentExportConfig`

- [ ] **Step 1: Helper détection ligne déjà présente (inline UI)**

```ts
const hasContractPrimeLine = lines.some(
  (l) =>
    l.type === "prime" &&
    /prime\s*contrat/i.test(l.reason || "") &&
    Number(l.amount) === Number(contract.prime),
);
```

- [ ] **Step 2: UI checkbox sous « Prime contrat »**

Dans le bloc Contrat & base :

```tsx
{contract.prime > 0 && period && (
  <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
    <input
      type="checkbox"
      checked={hasContractPrimeLine}
      disabled={saving || hasContractPrimeLine}
      onChange={(e) => {
        if (e.target.checked) {
          void post({
            action: "include_contract_prime",
            period_id: period.id,
          });
        }
      }}
    />
    Inclure la prime contrat ({fmt(contract.prime)})
  </label>
)}
```

Note : une fois incluse, la case reste cochée/disabled (retrait = supprimer la ligne via UI lignes existante). Pas d’auto à chaque mois.

- [ ] **Step 3: API action**

Dans POST `staff-payroll/route.ts` :

```ts
if (body.action === "include_contract_prime") {
  // assert period belongs to center + staff
  // amount = Number(staff.prime) || 0; if <= 0 return 400
  // if line already exists with same reason+amount, return current bundle
  // else insert staff_payroll_lines { type: "prime", amount, reason: "Prime contrat" }
  // return loadPeriodBundle(...)
}
```

Étendre le type union `body.action` en conséquence.

- [ ] **Step 4: PDF paie avec modèle Paramètres**

Dans `handleDownload` :

```ts
const { data: { session } } = await supabase.auth.getSession();
// centerId depuis bootstrap / prop — StaffPayrollTab a staff + besoin centerId
const config = await fetchDocumentExportConfig(supabase, centerId).catch(() => undefined);
await downloadPayslipPdf({ ..., config });
```

Si `StaffPayrollTab` n’a pas `centerId` en props, l’ajouter depuis `staff/page.tsx` (déjà connu) ou le lire via `loadCenterBootstrap` / profile.

- [ ] **Step 5: Manual check**

Période sans case → totaux/PDF sans prime ; cocher → ligne + total + PDF ; PDF porte logo/titre Paramètres.

- [ ] **Step 6: Commit (si demandé)**

```bash
git add academie-langues/app/components/StaffPayrollTab.tsx academie-langues/app/api/center/staff-payroll/route.ts
git commit -m "feat(payroll): opt-in contract prime and payslip document template"
```

---

### Task 5: Audit PDF — brancher config manquante

**Files:**
- Modify call sites qui appellent `centerPdfExport` **sans** `fetchDocumentExportConfig`
- Vérifier : `StaffPayrollTab` (Task 4), `app/centre/finance/page.tsx` `downloadStatementPdf(params)` (~1598), tout autre grep `download*Pdf(` sans config

**Interfaces:**
- Consumes: `fetchDocumentExportConfig(supabase, centerId, { documentType? })`
- Produces: chaque download passe `config` (ou `Partial<DocumentExportConfig>`)

- [ ] **Step 1: Lister les gaps**

Run ripgrep :

```bash
rg "download(Journal|Statement|Payslip|Bulletin|Programme|Tcf|ClassGrade)Pdf" academie-langues -g "*.tsx"
```

Pour chaque call : vérifier présence de `config` / `fetchDocumentExportConfig`.

- [ ] **Step 2: Corriger chaque gap**

Pattern :

```ts
const config = await fetchDocumentExportConfig(supabase, centerId).catch(() => undefined);
await downloadXPdf({ ...params, config });
```

Finance statement : s’assurer que `params` inclut `config: docConfig` (déjà en state sur la page).

- [ ] **Step 3: Manual spot-check**

Télécharger : reçu étudiant, journal/relevé finance, bulletin, programme, dossier TCF, fiche paie → branding Paramètres.

- [ ] **Step 4: Commit (si demandé)**

```bash
git add academie-langues/app/centre/finance/page.tsx # + autres gaps
git commit -m "fix(pdf): attach document template config to remaining exports"
```

---

### Task 6: Widget planning dashboard formateur

**Files:**
- Create: `academie-langues/app/components/TrainerWeekSchedule.tsx`
- Modify: `academie-langues/app/centre/dashboard/hooks/useCenterDashboard.ts` (exposer `role`)
- Modify: `academie-langues/app/centre/dashboard/page.tsx` (rendre widget si trainer)
- Optional extract from: `academie-langues/app/centre/mon-planning/page.tsx`

**Interfaces:**
- Consumes: `supabase.rpc("get_weekly_schedule", { p_center_id, p_week_start, p_filiere_id: null, p_niveau_id: null, p_formateur_id: userId })`
- Produces: `<TrainerWeekSchedule compact />` + lien `/centre/mon-planning`
- `useCenterDashboard` return ajoute `role: string | null`

- [ ] **Step 1: Exposer `role` depuis le hook**

```ts
return {
  // ...existing
  role,
};
```

- [ ] **Step 2: Créer `TrainerWeekSchedule`**

Composant client qui :
1. Charge session + `profiles.center_id`
2. `weekStart` = lundi courant (`getMonday`)
3. `loadWeek` via RPC avec `p_formateur_id: userId`
4. Affiche liste groupée par jour (version compacte : max ~6 slots, scroll)
5. Nav prev/next semaine
6. Lien « Voir tout » → `/centre/mon-planning`
7. Soft empty / error states (pas de crash)

Réutiliser types `WeekSlot` / `formatTime` / `STATUS_CONFIG` depuis mon-planning (copier le minimum pour éviter une grosse refactor — extraction shared utils seulement si trivial).

- [ ] **Step 3: Monter sur le dashboard**

Dans `page.tsx` :

```tsx
const { ..., role } = useCenterDashboard();
// ...
{role === "trainer" && (
  <div className="mb-6">
    <TrainerWeekSchedule />
  </div>
)}
```

Placer le widget **au-dessus** du dashboard manager/TCF stats (ou à la place si trainer ne voit pas les stats manager — suivre `canAccess` existant ; si trainer voit déjà un dashboard réduit, intégrer le widget en haut).

- [ ] **Step 4: Manual check**

Compte formateur : dashboard montre uniquement ses créneaux. Manager : pas de widget. Lien ouvre mon-planning.

- [ ] **Step 5: Commit (si demandé)**

```bash
git add academie-langues/app/components/TrainerWeekSchedule.tsx academie-langues/app/centre/dashboard/
git commit -m "feat(dashboard): trainer personal week schedule widget"
```

---

### Task 7: Vérification bout-en-bout

- [ ] **Step 1: Checklist spec**

1. PDF exports centre → modèle Paramètres  
2. Modifier/Suspendre en bas dossier  
3. Numériques en filigrane, saisie libre  
4. Prime contrat opt-in à la période  
5. Formateur créé → cours / communauté / examens / lives  
6. Dashboard formateur → planning perso  

- [ ] **Step 2: Regressions rapides**

- Création staff admin (non trainer) inchangée  
- Paie sans prime contrat (prime=0) : pas de checkbox  
- `/centre/mon-planning` toujours OK  

---

## Spec coverage (self-review)

| Spec section | Task |
|---|---|
| §1 PDF modèle | 4 (paie) + 5 (audit) |
| §2 Modifier/Suspendre + NumInput | 3 |
| §3 Prime contrat opt-in | 4 |
| §4 Défauts académiques | 1 + 2 |
| §5 Dashboard formateur | 6 |
| Tests manuels | 7 |

Pas de placeholder TBD. Types alignés (`TRAINER_DEFAULT_PERMISSIONS`, action `include_contract_prime`).
