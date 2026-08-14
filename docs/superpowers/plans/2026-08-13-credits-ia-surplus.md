# Crédits IA Surplus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Nexa to sell surplus AI credits to centers (generic wallet + typed packs), and allow centers to grant those credits to a specific student or staff account (type + quantity), optionally recording a student payment — without changing default offer/pack quotas.

**Architecture:** New Postgres tables for center wallets, purchases, and grants. Pure TS helpers for debit/credit mapping (TDD via `.core.mjs`). Superadmin API credits stock; centre API grants to profiles and increments the right `*_total` column. UI: superadmin panel on center detail + centre page `/centre/credits-ia`.

**Tech Stack:** Supabase SQL, Next.js App Router, TypeScript, existing `useI18n()`, `superadminFetch`, centre staff auth patterns, node:test for core helpers.

**Spec:** `docs/superpowers/specs/2026-08-13-credits-ia-surplus-design.md`

## Global Constraints

- User-facing strings via `useI18n()` (`superadmin` + `centre` namespaces, FR+EN parity).
- No commits unless the user explicitly asks.
- Surplus only: grants **increment** profile totals; never reset `*_used`; never change offer baseline quotas.
- TCF and libre centers both supported.
- Beneficiaries: student **or** staff of the **same** `center_id`.
- Attribution payment = optional checkbox (amount + reason); no payment gateway.
- v1 credit types: `tutor_ia`, `exam_sim`, `ai_corrections`, `course_builder`.
- Tutor consumption already respects `tutor_ia_total` (done). Other types must follow the same `used < total` rule where enforcement already exists; if a type has no runtime gate yet, still persist the total for future gates.
- Prefer service-role + role checks on API routes (same as other centre/superadmin routes).

## File map

| File | Responsibility |
|------|----------------|
| `academie-langues/supabase-center-ai-credits.sql` | Tables + RLS + indexes |
| `academie-langues/app/data/aiCredits.core.mjs` | Types, wallet math, profile column mapping |
| `academie-langues/app/data/aiCredits.core.test.mjs` | Unit tests |
| `academie-langues/app/data/aiCredits.ts` | Re-export + TS types |
| `academie-langues/app/api/superadmin/centers/[id]/credits/route.ts` | GET stock/history, POST purchase (credit wallet) |
| `academie-langues/app/api/centre/credits/route.ts` | GET stock + grants, POST grant |
| `academie-langues/app/superadmin/_components/CenterCreditsPanel.tsx` | Superadmin sell/credit UI |
| `academie-langues/app/centre/credits-ia/page.tsx` | Centre stock + grant form + history |
| `academie-langues/app/i18n/messages/{superadmin,centre}.ts` | Copy |

---

### Task 1: Domain helper — credit types, wallets, grant math

**Files:**
- Create: `academie-langues/app/data/aiCredits.core.mjs`
- Create: `academie-langues/app/data/aiCredits.core.test.mjs`
- Create: `academie-langues/app/data/aiCredits.core.d.ts`
- Create: `academie-langues/app/data/aiCredits.ts`

**Interfaces:**
- Produces:
  - `AI_CREDIT_TYPES = ["tutor_ia","exam_sim","ai_corrections","course_builder"]`
  - `PROFILE_TOTAL_COLUMN = { tutor_ia: "tutor_ia_total", exam_sim: "exam_total", ai_corrections: "ai_corrections_total", course_builder: "course_builder_total" }`
  - `emptyWallet()` → `{ generic: 0, tutor_ia: 0, exam_sim: 0, ai_corrections: 0, course_builder: 0 }`
  - `applyPurchase(wallet, { mode: "generic"|"typed", type?, quantity })` → new wallet or throws
  - `applyGrantDebit(wallet, { source: "generic"|"typed", type, quantity })` → new wallet or throws `"INSUFFICIENT_STOCK"`
  - `isAiCreditType(value)` boolean

- [ ] **Step 1: Write failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyWallet,
  applyPurchase,
  applyGrantDebit,
  PROFILE_TOTAL_COLUMN,
} from "./aiCredits.core.mjs";

test("purchase generic increases generic only", () => {
  const w = applyPurchase(emptyWallet(), { mode: "generic", quantity: 100 });
  assert.equal(w.generic, 100);
  assert.equal(w.tutor_ia, 0);
});

test("purchase typed increases that type", () => {
  const w = applyPurchase(emptyWallet(), { mode: "typed", type: "tutor_ia", quantity: 50 });
  assert.equal(w.tutor_ia, 50);
});

test("grant from typed debits typed stock", () => {
  const stocked = applyPurchase(emptyWallet(), { mode: "typed", type: "tutor_ia", quantity: 50 });
  const next = applyGrantDebit(stocked, { source: "typed", type: "tutor_ia", quantity: 10 });
  assert.equal(next.tutor_ia, 40);
});

test("grant from generic debits generic", () => {
  const stocked = applyPurchase(emptyWallet(), { mode: "generic", quantity: 20 });
  const next = applyGrantDebit(stocked, { source: "generic", type: "exam_sim", quantity: 5 });
  assert.equal(next.generic, 15);
});

test("grant fails when insufficient", () => {
  assert.throws(
    () => applyGrantDebit(emptyWallet(), { source: "typed", type: "tutor_ia", quantity: 1 }),
    /INSUFFICIENT_STOCK/,
  );
});

test("profile column map covers all types", () => {
  for (const key of ["tutor_ia", "exam_sim", "ai_corrections", "course_builder"]) {
    assert.equal(typeof PROFILE_TOTAL_COLUMN[key], "string");
  }
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test academie-langues/app/data/aiCredits.core.test.mjs`  
Expected: FAIL (module missing)

- [ ] **Step 3: Implement `aiCredits.core.mjs`**

```js
export const AI_CREDIT_TYPES = ["tutor_ia", "exam_sim", "ai_corrections", "course_builder"];

export const PROFILE_TOTAL_COLUMN = {
  tutor_ia: "tutor_ia_total",
  exam_sim: "exam_total",
  ai_corrections: "ai_corrections_total",
  course_builder: "course_builder_total",
};

export function emptyWallet() {
  return { generic: 0, tutor_ia: 0, exam_sim: 0, ai_corrections: 0, course_builder: 0 };
}

export function isAiCreditType(value) {
  return typeof value === "string" && AI_CREDIT_TYPES.includes(value);
}

function assertQty(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error("INVALID_QUANTITY");
}

export function applyPurchase(wallet, { mode, type, quantity }) {
  assertQty(quantity);
  const next = { ...wallet };
  if (mode === "generic") {
    next.generic += quantity;
    return next;
  }
  if (mode !== "typed" || !isAiCreditType(type)) throw new Error("INVALID_PURCHASE");
  next[type] += quantity;
  return next;
}

export function applyGrantDebit(wallet, { source, type, quantity }) {
  assertQty(quantity);
  if (!isAiCreditType(type)) throw new Error("INVALID_TYPE");
  const next = { ...wallet };
  if (source === "typed") {
    if ((next[type] || 0) < quantity) throw new Error("INSUFFICIENT_STOCK");
    next[type] -= quantity;
    return next;
  }
  if (source !== "generic") throw new Error("INVALID_SOURCE");
  if ((next.generic || 0) < quantity) throw new Error("INSUFFICIENT_STOCK");
  next.generic -= quantity;
  return next;
}
```

- [ ] **Step 4: Re-export + d.ts + run tests PASS**

`aiCredits.ts`: `export * from "./aiCredits.core.mjs";`  
Run: `node --test academie-langues/app/data/aiCredits.core.test.mjs`  
Expected: PASS

---

### Task 2: DB migration

**Files:**
- Create: `academie-langues/supabase-center-ai-credits.sql`

**Interfaces:**
- Produces tables: `center_ai_credit_wallets`, `center_ai_credit_purchases`, `center_ai_credit_grants`
- Produces profile columns: `ai_corrections_total`, `ai_corrections_used`, `course_builder_total`, `course_builder_used` (nullable ints, default 0) — `tutor_ia_*` and `exam_*` already exist

- [ ] **Step 1: Write SQL**

```sql
-- Profile counters for centre-side AI surplus (student tutor/exam already exist)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_corrections_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_corrections_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS course_builder_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS course_builder_used integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.center_ai_credit_wallets (
  center_id uuid PRIMARY KEY REFERENCES public.centers(id) ON DELETE CASCADE,
  generic integer NOT NULL DEFAULT 0 CHECK (generic >= 0),
  tutor_ia integer NOT NULL DEFAULT 0 CHECK (tutor_ia >= 0),
  exam_sim integer NOT NULL DEFAULT 0 CHECK (exam_sim >= 0),
  ai_corrections integer NOT NULL DEFAULT 0 CHECK (ai_corrections >= 0),
  course_builder integer NOT NULL DEFAULT 0 CHECK (course_builder >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.center_ai_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('generic', 'typed')),
  credit_type text CHECK (
    credit_type IS NULL OR credit_type IN ('tutor_ia', 'exam_sim', 'ai_corrections', 'course_builder')
  ),
  quantity integer NOT NULL CHECK (quantity >= 1),
  amount_fcfa integer,
  note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (mode = 'generic' AND credit_type IS NULL)
    OR (mode = 'typed' AND credit_type IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_center_ai_credit_purchases_center
  ON public.center_ai_credit_purchases (center_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.center_ai_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_type text NOT NULL CHECK (credit_type IN ('tutor_ia', 'exam_sim', 'ai_corrections', 'course_builder')),
  quantity integer NOT NULL CHECK (quantity >= 1),
  source text NOT NULL CHECK (source IN ('generic', 'typed')),
  payment_amount integer,
  payment_reason text,
  granted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_center_ai_credit_grants_center
  ON public.center_ai_credit_grants (center_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_center_ai_credit_grants_beneficiary
  ON public.center_ai_credit_grants (beneficiary_id, created_at DESC);

-- Service role used by Next APIs; lock down direct client access
ALTER TABLE public.center_ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_ai_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_ai_credit_grants ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply in Supabase SQL editor** and verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE '%ai_corrections%';
SELECT to_regclass('public.center_ai_credit_wallets');
```

---

### Task 3: Superadmin API — credit stock

**Files:**
- Create: `academie-langues/app/api/superadmin/centers/[id]/credits/route.ts`
- Modify: reuse auth from `app/utils/superadmin-auth-server.ts` (same pattern as `centers/[id]/route.ts`)

**Interfaces:**
- Consumes: `applyPurchase`, `emptyWallet`, `isAiCreditType`
- Produces:
  - `GET` → `{ wallet, purchases: [...] }`
  - `POST` body `{ mode, credit_type?, quantity, amount_fcfa?, note? }` → `{ wallet, purchase }`

- [ ] **Step 1: Implement GET**

Load wallet row for `centerId` (or return `emptyWallet()` shape if missing). Load last 50 purchases ordered by `created_at desc`. Require superadmin MFA like sibling routes.

- [ ] **Step 2: Implement POST**

1. Validate body with `applyPurchase` rules.  
2. Upsert wallet: read current → `applyPurchase` → write.  
3. Insert purchase row.  
4. Prefer a single transaction via Supabase RPC if available; otherwise read-modify-write with row lock comment — on conflict retry once.  
5. Return updated wallet + purchase.  
6. On invalid input → 400; center missing → 404.

- [ ] **Step 3: Manual smoke**

`POST /api/superadmin/centers/{id}/credits` with `{ "mode":"generic", "quantity": 10 }` then GET — `generic === 10`.

---

### Task 4: Centre API — grant credits

**Files:**
- Create: `academie-langues/app/api/centre/credits/route.ts`

**Interfaces:**
- Consumes: `applyGrantDebit`, `PROFILE_TOTAL_COLUMN`, `isAiCreditType`
- Produces:
  - `GET` → `{ wallet, grants: [...] }`
  - `POST` body `{ beneficiary_id, credit_type, quantity, source, record_payment?: boolean, payment_amount?: number, payment_reason?: string }` → `{ wallet, grant, beneficiary_totals }`

- [ ] **Step 1: Auth gate**

Only `center_manager` / `campus_manager` of the center (same `MANAGER_ROLES` as bibliothèque). Resolve `center_id` from session profile.

- [ ] **Step 2: GET**

Return wallet (empty defaults if none) + last 50 grants for this center (join beneficiary prenom/nom/email).

- [ ] **Step 3: POST grant**

1. Validate `credit_type`, `quantity`, `source`.  
2. Load beneficiary `profiles` where `id = beneficiary_id` AND `center_id =` caller center. Else 404/403.  
3. Load wallet; `applyGrantDebit`; persist wallet.  
4. Increment profile column:  
   `UPDATE profiles SET {col} = COALESCE({col},0) + quantity WHERE id = beneficiary_id`  
   using `PROFILE_TOTAL_COLUMN[credit_type]`.  
5. Insert `center_ai_credit_grants`.  
6. If `record_payment === true`: require `payment_amount >= 1` and non-empty `payment_reason`; store on grant row. (Do **not** invent enrollment payment if no enrollment — grant row is the finance line of record for v1; show it in the credits UI history.)  
7. If stock insufficient → 409 `{ error: "INSUFFICIENT_STOCK" }`.

- [ ] **Step 4: Smoke**

Seed typed `tutor_ia` stock via superadmin → grant 5 to a student → student `tutor_ia_total` increased by 5 → wallet typed decreased by 5.

---

### Task 5: Superadmin UI — credit a center

**Files:**
- Create: `academie-langues/app/superadmin/_components/CenterCreditsPanel.tsx`
- Modify: `academie-langues/app/superadmin/_components/CenterDetailPanel.tsx` (embed panel)
- Modify: `academie-langues/app/i18n/messages/superadmin.ts` (FR+EN keys)

**Interfaces:**
- Consumes: `GET/POST /api/superadmin/centers/:id/credits`

- [ ] **Step 1: Add i18n keys** (both locales), e.g.  
  `creditsTitle`, `creditsWalletGeneric`, `creditsAddGeneric`, `creditsAddTyped`, `creditsQuantity`, `creditsAmountOptional`, `creditsNoteOptional`, `creditsSubmit`, `creditsHistory`, `creditsType_*`

- [ ] **Step 2: Build `CenterCreditsPanel`**

Show wallet chips. Form: mode toggle generic/typed → if typed, type select → quantity → optional amount/note → submit. List recent purchases.

- [ ] **Step 3: Mount in `CenterDetailPanel`** under subscription section.

---

### Task 6: Centre UI — stock + attribution

**Files:**
- Create: `academie-langues/app/centre/credits-ia/page.tsx`
- Modify: centre nav (wherever `navAbonnements` / `navFinance` is registered — typically sidebar config under `app/centre` or shared centre nav) to add link « Crédits IA »
- Modify: `academie-langues/app/i18n/messages/centre.ts`

**Interfaces:**
- Consumes: `GET/POST /api/centre/credits`
- Student picker: reuse existing centre student search pattern (e.g. lightweight fetch from existing students list API already used by centre pages)

- [ ] **Step 1: i18n** — titles, form labels, « Enregistrer un paiement », history columns, errors.

- [ ] **Step 2: Page layout** (follow `center-page-ui`)

Sections:
1. Wallet balances  
2. Grant form: beneficiary (student or staff select), type, quantity, source (auto: if typed stock > 0 for that type prefer typed; else generic), checkbox payment → amount + reason  
3. History table

- [ ] **Step 3: Wire submit** — toast/feedback on success; refresh wallet + history; show 409 stock error inline.

- [ ] **Step 4: Nav entry** visible to managers only (same as Finance).

---

### Task 7: Wire grant shortcut from student dossier (optional but in spec)

**Files:**
- Modify: centre student detail / TCF student sheet component that already shows quotas (search `tutor_ia_total` in centre student UI — e.g. profil or etudiants detail)

- [ ] **Step 1:** Add button « Ajouter des crédits » linking to  
  `/centre/credits-ia?beneficiary={profileId}`  
  Page reads query and preselects beneficiary.

---

### Task 8: Verification

- [ ] **Step 1:** Run unit tests  
  `node --test academie-langues/app/data/aiCredits.core.test.mjs`  
  `node --test academie-langues/app/utils/tutor-quota.core.test.mjs`

- [ ] **Step 2:** Manual checklist  
  1. Superadmin credits +100 generic to a libre center  
  2. Superadmin credits +20 typed `tutor_ia` to a TCF center  
  3. Centre grants 5 tutor_ia from typed stock to student A → total +5, stock −5  
  4. Centre grants 3 exam_sim from generic → generic −3, `exam_total` +3  
  5. Grant with payment checkbox → grant row has amount+reason  
  6. Grant without checkbox → payment fields null  
  7. Grant exceeding stock → 409, no profile change  
  8. Cannot grant to profile of another center  
  9. Student with raised `tutor_ia_total` can chat past old 15 cap (already fixed)

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Achat générique + typé | 1, 3, 5 |
| Attribution qui / quoi / combien | 1, 4, 6 |
| Surplus only (increment totals) | 4 |
| Paiement optionnel C | 4, 6 |
| TCF + libre | 4 (no type filter) |
| Étudiant + staff same center | 4 |
| Historique | 3–6 |
| Superadmin + centre UI | 5, 6 |
| Shortcut dossier | 7 |
| Tutor respects total | already done; verified in 8 |

## Out of scope (do not implement in this plan)

- Student self-checkout / PSP  
- Cross-center transfers  
- Auto-refunds  
- Runtime gates for `ai_corrections` / `course_builder` if not already enforced elsewhere (persist totals only in v1)
