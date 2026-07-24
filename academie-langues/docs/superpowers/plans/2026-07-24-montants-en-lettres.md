# Montants en lettres (FCFA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher « En lettres : … francs CFA » sous chaque saisie d’argent et sous les totaux importants (UI + PDF), via un composant réutilisable branché sur l’utilitaire existant.

**Architecture:** Extraire la logique pure dans `amountInWordsFr.core.mjs` (testable par `node --test`), garder un thin wrapper TS pour l’app, créer `AmountInWords` pour l’UI, puis brancher finance / filières / TCF / PDF / paie. Pas de stockage DB — calcul dérivé à l’affichage.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind, jsPDF (`centerPdfExport`), tests `node --test` sur `.mjs`.

## Global Constraints

- Devise affichée en lettres : **francs CFA** uniquement (sortie de `amountInWordsFr`).
- Format UI : préfixe exact `En lettres : ` + résultat de `amountInWordsFr(n)`.
- Style UI par défaut : `text-[11px] text-neutral-500 italic mt-1.5 leading-snug`.
- Masquer si montant ≤ 0, vide, `NaN` ou négatif (`AmountInWords` retourne `null`).
- Plans de paiement : lettres **uniquement sur le total**, jamais sous chaque échéance.
- Hors scope : KPI dashboard, cellules de tableaux denses, listes étudiants.
- Spec : `docs/superpowers/specs/2026-07-24-montants-en-lettres-design.md`.

## File map

| Fichier | Rôle |
|---|---|
| `app/utils/amountInWordsFr.core.mjs` | Logique pure (nouveau, extrait du `.ts`) |
| `app/utils/amountInWordsFr.core.d.ts` | Types pour le core |
| `app/utils/amountInWordsFr.core.test.mjs` | Tests `node --test` |
| `app/utils/amountInWordsFr.ts` | Re-export TS pour `@/app/utils/amountInWordsFr` |
| `app/components/AmountInWords.tsx` | Composant UI |
| `app/centre/filieres/nouveau/page.tsx` | Remplacer markup inline + total plan |
| `app/centre/finance/page.tsx` | Saisie encaissement, confirmation, facture imprimable |
| `app/centre/tcf/etudiants/page.tsx` | Prix négocié + total activation |
| `app/utils/centerPdfExport.ts` | Solde / totaux relevés manquants |
| `app/components/StaffPayrollTab.tsx` | Inputs montant paie (XAF = FCFA) |

---

### Task 1: Extraire `amountInWordsFr.core` + tests

**Files:**
- Create: `app/utils/amountInWordsFr.core.mjs`
- Create: `app/utils/amountInWordsFr.core.d.ts`
- Create: `app/utils/amountInWordsFr.core.test.mjs`
- Modify: `app/utils/amountInWordsFr.ts` (re-export depuis le core)

**Interfaces:**
- Consumes: rien.
- Produces: `export function amountInWordsFr(amount: number | string): string`

- [ ] **Step 1: Write the failing test**

Create `app/utils/amountInWordsFr.core.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { amountInWordsFr } from "./amountInWordsFr.core.mjs";

test("0 → zéro franc CFA", () => {
  assert.equal(amountInWordsFr(0), "zéro franc CFA");
});

test("1 → un franc CFA", () => {
  assert.equal(amountInWordsFr(1), "un franc CFA");
});

test("71 → soixante et onze francs CFA", () => {
  assert.equal(amountInWordsFr(71), "soixante et onze francs CFA");
});

test("80 → quatre-vingts francs CFA", () => {
  assert.equal(amountInWordsFr(80), "quatre-vingts francs CFA");
});

test("90_000 → quatre-vingt-dix mille francs CFA", () => {
  assert.equal(amountInWordsFr(90_000), "quatre-vingt-dix mille francs CFA");
});

test("150_000 → cent cinquante mille francs CFA", () => {
  assert.equal(amountInWordsFr(150_000), "cent cinquante mille francs CFA");
});

test("1_000_000 → un million francs CFA", () => {
  assert.equal(amountInWordsFr(1_000_000), "un million francs CFA");
});

test("string avec espaces / FCFA → parse digits", () => {
  assert.equal(amountInWordsFr("90 000 FCFA"), "quatre-vingt-dix mille francs CFA");
});

test("négatif / NaN → zéro franc CFA", () => {
  assert.equal(amountInWordsFr(-5), "zéro franc CFA");
  assert.equal(amountInWordsFr(Number.NaN), "zéro franc CFA");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/utils/amountInWordsFr.core.test.mjs`  
(from `academie-langues`)  
Expected: FAIL — module introuvable / cannot find module.

- [ ] **Step 3: Move logic into core + thin TS wrapper**

Create `app/utils/amountInWordsFr.core.mjs` with the **exact** logic currently in `amountInWordsFr.ts` (UNITS, TENS, underHundred, underThousand, chunkToWords, amountInWordsFr). Export only `amountInWordsFr`.

Create `app/utils/amountInWordsFr.core.d.ts`:

```ts
export function amountInWordsFr(amount: number | string): string;
```

Replace `app/utils/amountInWordsFr.ts` contents with:

```ts
export { amountInWordsFr } from "./amountInWordsFr.core.mjs";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/utils/amountInWordsFr.core.test.mjs`  
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/amountInWordsFr.core.mjs app/utils/amountInWordsFr.core.d.ts app/utils/amountInWordsFr.core.test.mjs app/utils/amountInWordsFr.ts
git commit -m "refactor(finance): extract amountInWordsFr core + tests"
```

---

### Task 2: Composant UI `AmountInWords`

**Files:**
- Create: `app/components/AmountInWords.tsx`

**Interfaces:**
- Consumes: `amountInWordsFr` from `@/app/utils/amountInWordsFr`
- Produces:

```ts
export function AmountInWords(props: {
  amount: number | string | null | undefined;
  className?: string;
}): JSX.Element | null;
```

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { amountInWordsFr } from "@/app/utils/amountInWordsFr";

function parsePositiveAmount(amount: number | string | null | undefined): number {
  if (amount == null || amount === "") return 0;
  const n =
    typeof amount === "string"
      ? Number(String(amount).replace(/\D/g, ""))
      : Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function AmountInWords({
  amount,
  className,
}: {
  amount: number | string | null | undefined;
  className?: string;
}) {
  const n = parsePositiveAmount(amount);
  if (n <= 0) return null;
  return (
    <p className={className ?? "text-[11px] text-neutral-500 italic mt-1.5 leading-snug"}>
      En lettres : {amountInWordsFr(n)}
    </p>
  );
}
```

- [ ] **Step 2: Smoke-check TypeScript**

Run from `academie-langues`:  
`npx tsc --noEmit -p . 2>&1 | Select-String -Pattern "AmountInWords|amountInWordsFr" | Select-Object -First 20`  
Expected: aucune erreur liée à ces fichiers (warnings ailleurs OK).

- [ ] **Step 3: Commit**

```bash
git add app/components/AmountInWords.tsx
git commit -m "feat(ui): add AmountInWords component"
```

---

### Task 3: Filières — remplacer inline + total plan

**Files:**
- Modify: `app/centre/filieres/nouveau/page.tsx`

**Interfaces:**
- Consumes: `AmountInWords`
- Produces: même UX qu’aujourd’hui pour `TotalDisplay` ; lettres aussi sous le total du plan d’échéances.

- [ ] **Step 1: Import + `TotalDisplay`**

Add import:

```tsx
import { AmountInWords } from "@/app/components/AmountInWords";
```

Replace the italic block inside `TotalDisplay` (around lines 549–553) with:

```tsx
<AmountInWords amount={n} />
```

Keep `import { amountInWordsFr }` for PDF payload builders (`totalWords` / `globalTotalWords`).

- [ ] **Step 2: Lettres sous le total du plan d’échéances**

In the installment summary that shows `Total : … FCFA` (around line 331, the locked/read summary — **not** each installment row), add:

```tsx
<AmountInWords amount={allocated} />
```

Do **not** add letters under individual échéance amount inputs.

- [ ] **Step 3: Manual check**

Open `/centre/filieres/nouveau`, saisir un total (ex. 90000) et un plan — vérifier « En lettres : quatre-vingt-dix mille francs CFA » sous le total à payer et sous le total du plan.

- [ ] **Step 4: Commit**

```bash
git add app/centre/filieres/nouveau/page.tsx
git commit -m "feat(filieres): AmountInWords on totals and payment plan total"
```

---

### Task 4: Finances — saisie, confirmation, facture imprimable

**Files:**
- Modify: `app/centre/finance/page.tsx`

**Interfaces:**
- Consumes: `AmountInWords`, `amountInWordsFr` (si besoin text PDF/WhatsApp)
- Produces: lettres sous input encaissement, montant encaissé (popup succès), solde facture imprimable.

- [ ] **Step 1: Imports**

```tsx
import { AmountInWords } from "@/app/components/AmountInWords";
import { amountInWordsFr } from "@/app/utils/amountInWordsFr";
```

- [ ] **Step 2: Modal encaissement — sous l’input montant**

After the flex row containing the montant input + bouton « Solde » (around lines 1105–1114), still inside the montant `<div>`, add:

```tsx
<AmountInWords amount={payAmount} />
```

- [ ] **Step 3: Popup paiement validé**

After the line `{fmtFCFA(paymentSuccess.amount)} FCFA encaissés`, add:

```tsx
<AmountInWords amount={paymentSuccess.amount} className="text-[11px] text-neutral-500 italic mt-1 leading-snug" />
```

If `paymentSuccess.resteApres > 0`, also add under the solde restant line:

```tsx
<AmountInWords amount={paymentSuccess.resteApres} className="text-[11px] text-neutral-500 italic mt-1 leading-snug" />
```

- [ ] **Step 4: Facture / relevé imprimable (UI print)**

Under the solde block (around lines 1248–1251), when `invoiceModal.reste_a_payer > 0`:

```tsx
{invoiceModal.reste_a_payer > 0 && (
  <AmountInWords
    amount={invoiceModal.reste_a_payer}
    className="text-[10px] text-neutral-500 italic mt-1 leading-snug print:block"
  />
)}
```

Also under the footer totals « Total versé » / « Solde restant » of the printable table if those amounts are shown as summary rows — add one `AmountInWords` for `invoiceModal.reste_a_payer` near the orange solde footer (around line 1336), not per payment row.

- [ ] **Step 5: Coupon montant fixe (saisie)**

In the coupons form, when `couponForm.type === "fixed"`, under the value input (around line 1012):

```tsx
{couponForm.type === "fixed" && <AmountInWords amount={couponForm.value} />}
```

- [ ] **Step 6: Manual check**

`/centre/finance` → Encaisser → taper 35000 → lettres visibles → valider → lettres sur confirmation → ouvrir facture → lettres sous le solde.

- [ ] **Step 7: Commit**

```bash
git add app/centre/finance/page.tsx
git commit -m "feat(finance): AmountInWords on payment input, success, invoice"
```

---

### Task 5: TCF étudiants — prix négocié + total

**Files:**
- Modify: `app/centre/tcf/etudiants/page.tsx`

**Interfaces:**
- Consumes: `AmountInWords`
- Produces: lettres sous prix négocié et sous total d’activation (pas sous chaque échéance).

- [ ] **Step 1: Import**

```tsx
import { AmountInWords } from "@/app/components/AmountInWords";
```

- [ ] **Step 2: Sous le champ prix négocié**

After the agreed-price input block (around lines 1165–1176):

```tsx
<AmountInWords amount={agreedPrice} />
```

- [ ] **Step 3: Sous le Total d’activation**

After the Total row (around lines 1250–1253):

```tsx
<AmountInWords amount={finalTotal} />
```

Do **not** add under installment amount inputs (lines 1277–1287).

- [ ] **Step 4: Manual check**

Activer un étudiant TCF avec prix négocié 75000 → lettres sous le champ et sous le total.

- [ ] **Step 5: Commit**

```bash
git add app/centre/tcf/etudiants/page.tsx
git commit -m "feat(tcf): AmountInWords on agreed price and activation total"
```

---

### Task 6: PDF exports — totaux manquants

**Files:**
- Modify: `app/utils/centerPdfExport.ts`

**Interfaces:**
- Consumes: `amountInWordsFr`
- Produces: ligne `En lettres : …` sous solde relevé / totaux principaux encore absents. Filières déjà OK (`totalWords` / `globalTotalWords`).

- [ ] **Step 1: Import**

```ts
import { amountInWordsFr } from "@/app/utils/amountInWordsFr";
```

- [ ] **Step 2: `buildStatementPdf` — sous le solde**

After drawing `Solde restant : …` / `Compte soldé` (around lines 292–298), if `params.resteAPayer > 0`:

```ts
y += 5;
doc.setFont("helvetica", "italic");
doc.setFontSize(8);
doc.setTextColor(120, 120, 120);
const words = doc.splitTextToSize(
  `En lettres : ${amountInWordsFr(params.resteAPayer)}`,
  pageWidth - 28
);
doc.text(words, 14, y);
y += words.length * 4;
```

Ensure `pageWidth` is in scope (reuse existing `doc.internal.pageSize.getWidth()` pattern from the same file). Reset font to normal after.

- [ ] **Step 3: Autres totaux PDF finance si présents**

If the same file has receipt / payroll net-to-pay blocks with a single dominant total and no letters yet, add the same italic line under that total only (not under each table cell). Skip installment line amounts.

- [ ] **Step 4: Manual check**

Exporter un relevé étudiant avec solde > 0 → PDF contient « En lettres : … ».

- [ ] **Step 5: Commit**

```bash
git add app/utils/centerPdfExport.ts
git commit -m "feat(pdf): amount in words on statement balance totals"
```

---

### Task 7: Paie staff — inputs montant

**Files:**
- Modify: `app/components/StaffPayrollTab.tsx`

**Interfaces:**
- Consumes: `AmountInWords`
- Produces: lettres sous les inputs Montant (lignes + paiements).

- [ ] **Step 1: Import**

```tsx
import { AmountInWords } from "@/app/components/AmountInWords";
```

- [ ] **Step 2: Sous chaque input montant**

After the line-amount input (~710–717) and after the pay-amount input (~782 area):

```tsx
<AmountInWords amount={lineAmount} />
```

and

```tsx
<AmountInWords amount={payAmount} />
```

If a net-à-payer total is displayed prominently in a summary card, add `<AmountInWords amount={net} />` there too; skip table cells.

- [ ] **Step 3: Manual check**

Ouvrir paie staff → saisir 50000 → lettres visibles.

- [ ] **Step 4: Commit**

```bash
git add app/components/StaffPayrollTab.tsx
git commit -m "feat(paie): AmountInWords under staff amount inputs"
```

---

### Task 8: Vérification finale + commit de polish si besoin

**Files:**
- Possibly touch-up only if gaps found in Tasks 3–7

- [ ] **Step 1: Run unit tests**

```bash
npm test -- app/utils/amountInWordsFr.core.test.mjs
```

Expected: all PASS.

- [ ] **Step 2: Checklist manuelle**

| Écran | Attendu |
|---|---|
| Filière nouveau — total | En lettres |
| Filière — total plan | En lettres ; pas sous chaque échéance |
| Finance — input encaissement | En lettres live |
| Finance — succès paiement | En lettres |
| Finance — facture print | En lettres sous solde |
| TCF activation — prix + total | En lettres ; pas sous échéances |
| PDF relevé | En lettres sous solde |
| Paie — inputs | En lettres |

- [ ] **Step 3: Commit only if polish edits were needed**

```bash
git add -u
git commit -m "fix(finance): polish AmountInWords coverage gaps"
```

(Skip this commit if working tree clean.)

---

## Spec coverage self-check

| Spec requirement | Task |
|---|---|
| Composant `AmountInWords` | 2 |
| Utilitaire + tests cas critiques | 1 |
| Saisie argent + totaux importants | 3, 4, 5, 7 |
| PDF / impression | 4 (UI print), 6 (jsPDF) |
| Plan : lettres seulement sur total | 3, 5 (explicit non-goals) |
| Hors KPI / tableaux denses | Constraints + tasks avoid them |
| Style filière | Task 2 default classes |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-24-montants-en-lettres.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
