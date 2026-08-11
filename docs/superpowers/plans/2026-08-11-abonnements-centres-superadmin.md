# Abonnements Centres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Access/Lite/Advance/Ultra with Découverte/Croissance/Pro/Entreprise (+custom), fuse superadmin centres+demandes into one page, add billing/pause/gate logic, enrich analytics.

**Architecture:** Migrate `centers.nexa_offer` enum + add billing columns → rewrite TS catalogue → rewrite superadmin page (single list, filters, actions) → update access gate (readonly mode) → enrich analytics.

**Tech Stack:** Supabase (Postgres), Next.js App Router, React, Tailwind, TypeScript, existing `useI18n()`.

## Global Constraints

- All user-facing strings via `useI18n()` (`superadmin.ts` namespace for superadmin, `centre.ts` for centre-facing).
- No commits unless explicitly asked.
- Preserve existing centre functionality (sidebar, access gate, etc.) — only extend.
- `centers.nexa_offer` CHECK constraint must accept both old and new values during migration window.
- No payment gateway / Stripe / Mobile Money (manual billing only).
- Superadmin APIs require MFA (aal2) via `superadmin-auth-server.ts`.

---

### Task 1: DB Migration SQL

**Files:**
- Create: `academie-langues/supabase-abonnements-migration.sql`

**Interfaces:**
- Produces: New columns on `centers` table, updated CHECK constraints, migrated `nexa_offer` values.

- [ ] **Step 1: Write migration SQL**

```sql
-- 1. Add new columns
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_amount integer;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_period_months smallint DEFAULT 1;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_starts_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_alert_days smallint DEFAULT 7;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS quota_overrides jsonb;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pause_reason text;

-- 2. Migrate offer values
UPDATE centers SET nexa_offer = 'decouverte' WHERE nexa_offer IN ('access', 'lite');
UPDATE centers SET nexa_offer = 'croissance' WHERE nexa_offer = 'advance';
UPDATE centers SET nexa_offer = 'pro' WHERE nexa_offer = 'ultra';

-- 3. Update nexa_offer CHECK
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_nexa_offer_check;
ALTER TABLE centers ADD CONSTRAINT centers_nexa_offer_check
  CHECK (nexa_offer IN ('decouverte', 'croissance', 'pro', 'entreprise', 'custom'));

-- 4. Extend status CHECK
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_status_check;
ALTER TABLE centers ADD CONSTRAINT centers_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'rejected', 'expired'));

-- 5. Backfill trial_ends_at for pending centers
UPDATE centers
SET trial_ends_at = created_at + interval '7 days'
WHERE status = 'pending' AND trial_ends_at IS NULL;
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Execute the SQL above. Verify with:
```sql
SELECT id, name, nexa_offer, status, trial_ends_at, renewal_at FROM centers LIMIT 20;
```

- [ ] **Step 3: Commit**

```bash
git add academie-langues/supabase-abonnements-migration.sql
git commit -m "feat(db): migrate nexa_offer to 4-tier system + billing columns"
```

---

### Task 2: Rewrite TS Catalogue (`nexaOffers.ts`)

**Files:**
- Modify: `academie-langues/app/data/nexaOffers.ts`

**Interfaces:**
- Consumes: DB migration (Task 1) — `nexa_offer` values now `decouverte | croissance | pro | entreprise | custom`.
- Produces: `NexaOfferKey`, `NexaOfferConfig`, `NEXA_OFFERS`, `resolveEffectiveNexaOffer()`, `getOfferQuota()`.

- [ ] **Step 1: Rewrite types and catalogue**

```typescript
export type NexaOfferKey = "decouverte" | "croissance" | "pro" | "entreprise" | "custom";

export type NexaOfferConfig = {
  key: NexaOfferKey;
  name: string;
  tagline: string;
  minStudents: number;
  maxStudents: number | null; // null = illimité
  maxCampus: number | null;
  maxStaffAccounts: number | null;
  tutorInteractionsPerStudent: number | null; // null = illimité
  liveHoursPerStudent: number | null;
  aiCorrectionsPerStudent: number | null;
  courseBuilderPerMonth: number | null;
  whiteLabel: boolean | "option";
  monthlyFeeMin: number;
  monthlyFeeMax: number | null;
  supportLevel: "standard" | "priority" | "dedicated" | "account_manager";
};

export const NEXA_OFFERS: Record<Exclude<NexaOfferKey, "custom">, NexaOfferConfig> = {
  decouverte: {
    key: "decouverte",
    name: "Découverte",
    tagline: "Pour démarrer avec 5 à 40 apprenants",
    minStudents: 5,
    maxStudents: 40,
    maxCampus: 1,
    maxStaffAccounts: 2,
    tutorInteractionsPerStudent: 15,
    liveHoursPerStudent: 2,
    aiCorrectionsPerStudent: 5,
    courseBuilderPerMonth: 5,
    whiteLabel: false,
    monthlyFeeMin: 12_500,
    monthlyFeeMax: 100_000,
    supportLevel: "standard",
  },
  croissance: {
    key: "croissance",
    name: "Croissance",
    tagline: "Jusqu'à 100 apprenants, support prioritaire",
    minStudents: 41,
    maxStudents: 100,
    maxCampus: 3,
    maxStaffAccounts: 4,
    tutorInteractionsPerStudent: 25,
    liveHoursPerStudent: 3,
    aiCorrectionsPerStudent: 10,
    courseBuilderPerMonth: 10,
    whiteLabel: false,
    monthlyFeeMin: 102_000,
    monthlyFeeMax: 220_000,
    supportLevel: "priority",
  },
  pro: {
    key: "pro",
    name: "Pro",
    tagline: "Rapports personnalisés, sessions illimitées",
    minStudents: 101,
    maxStudents: 250,
    maxCampus: 10,
    maxStaffAccounts: 10,
    tutorInteractionsPerStudent: 30,
    liveHoursPerStudent: 4,
    aiCorrectionsPerStudent: 15,
    courseBuilderPerMonth: 15,
    whiteLabel: "option",
    monthlyFeeMin: 221_900,
    monthlyFeeMax: 505_000,
    supportLevel: "dedicated",
  },
  entreprise: {
    key: "entreprise",
    name: "Entreprise",
    tagline: "Sur devis, tout illimité + SLA",
    minStudents: 251,
    maxStudents: null,
    maxCampus: null,
    maxStaffAccounts: null,
    tutorInteractionsPerStudent: null,
    liveHoursPerStudent: null,
    aiCorrectionsPerStudent: null,
    courseBuilderPerMonth: null,
    whiteLabel: true,
    monthlyFeeMin: 505_000,
    monthlyFeeMax: null,
    supportLevel: "account_manager",
  },
};
```

- [ ] **Step 2: Update `resolveEffectiveNexaOffer()` and helpers**

```typescript
export function resolveEffectiveNexaOffer(
  center: { nexa_offer?: NexaOfferKey | null; status?: string; trial_ends_at?: string | null }
): NexaOfferKey {
  if (center.nexa_offer && center.nexa_offer !== "custom") return center.nexa_offer;
  if (center.nexa_offer === "custom") return "custom";
  // Pending trial → treated as Découverte
  if (center.status === "pending") return "decouverte";
  return "decouverte";
}

export function getOfferQuota(
  offerKey: NexaOfferKey,
  field: keyof NexaOfferConfig,
  overrides?: Record<string, unknown> | null
): unknown {
  if (overrides && field in overrides) return overrides[field];
  if (offerKey === "custom") return null;
  return NEXA_OFFERS[offerKey][field];
}
```

- [ ] **Step 3: Update all imports/usages of old `NexaOfferKey` type**

Search codebase for `"access" | "lite" | "advance" | "ultra"` and `NexaOfferKey` — update to new values. Key files:
- `app/api/etudiants/route.ts` (student count check)
- `app/api/centre/lives/route.ts` (live limit)
- `app/components/CenterSidebar.tsx` (badge display)
- `app/centre/abonnements/page.tsx` (marketing page)
- `app/ouvrir-centre/page.tsx` (center creation)
- `app/api/centre/creer/route.ts`

- [ ] **Step 4: Commit**

```bash
git add academie-langues/app/data/nexaOffers.ts
git commit -m "feat(offers): rewrite catalogue to 4-tier Découverte/Croissance/Pro/Entreprise"
```

---

### Task 3: Access Gate — Lecture Seule + Trial IA

**Files:**
- Modify: `academie-langues/app/utils/center-trial.ts`
- Modify: `academie-langues/app/components/CenterAccessGate.tsx`
- Modify: `academie-langues/app/centre/acces-indisponible/page.tsx`
- Modify: `academie-langues/app/i18n/messages/centre.ts` (new keys)

**Interfaces:**
- Consumes: DB columns `trial_ends_at`, `renewal_at`, `status` (Task 1).
- Produces: `resolveCenterAccess()` returning `'full' | 'trial' | 'readonly' | 'blocked'`, gate component shows appropriate message.

- [ ] **Step 1: Add `resolveCenterAccess()` in center-trial.ts**

```typescript
export type CenterAccessState = "full" | "trial" | "readonly" | "blocked";

export function resolveCenterAccess(center: {
  status: string;
  trial_ends_at?: string | null;
  renewal_at?: string | null;
}): CenterAccessState {
  if (center.status === "rejected") return "blocked";
  if (center.status === "suspended") return "readonly";
  if (center.status === "pending") {
    if (!center.trial_ends_at) return "readonly";
    return new Date(center.trial_ends_at) > new Date() ? "trial" : "readonly";
  }
  // active
  if (center.renewal_at && new Date(center.renewal_at) <= new Date()) return "readonly";
  return "full";
}
```

- [ ] **Step 2: Add i18n keys in `centre.ts`**

FR:
```typescript
gateReadonlyStudent: "Votre accès est en lecture seule. Contactez votre centre.",
gateReadonlyCenter: "Votre abonnement nécessite une action. Contactez l'équipe Nexa.",
gateBlockedStudent: "Accès révoqué. Contactez votre centre.",
gateBlockedCenter: "Votre accès a été révoqué. Contactez l'équipe Nexa.",
gateTrialAiDisabled: "Disponible après activation de votre abonnement.",
```

EN (same namespace):
```typescript
gateReadonlyStudent: "Your access is read-only. Contact your center.",
gateReadonlyCenter: "Your subscription requires action. Contact the Nexa team.",
gateBlockedStudent: "Access revoked. Contact your center.",
gateBlockedCenter: "Your access has been revoked. Contact the Nexa team.",
gateTrialAiDisabled: "Available after activating your subscription.",
```

- [ ] **Step 3: Update `CenterAccessGate.tsx`**

Replace `isCenterOperational()` usage with `resolveCenterAccess()`. Show:
- `blocked` → redirect to acces-indisponible (blocked message)
- `readonly` → show banner at top of layout (role-based message), disable mutations
- `trial` → show badge/banner "Essai 7j", disable IA features
- `full` → no banner

- [ ] **Step 4: Update `acces-indisponible/page.tsx`**

Show `gateBlockedStudent` or `gateBlockedCenter` based on role.

- [ ] **Step 5: Commit**

```bash
git add academie-langues/app/utils/center-trial.ts academie-langues/app/components/CenterAccessGate.tsx academie-langues/app/centre/acces-indisponible/page.tsx academie-langues/app/i18n/messages/centre.ts
git commit -m "feat(gate): readonly mode for pause/expired, trial IA disabled"
```

---

### Task 4: Superadmin API — Endpoints enrichis

**Files:**
- Modify: `academie-langues/app/api/superadmin/centers/route.ts`
- Modify: `academie-langues/app/api/superadmin/centers/[id]/route.ts`
- Create: `academie-langues/app/api/superadmin/centers/[id]/activate/route.ts`
- Create: `academie-langues/app/api/superadmin/centers/[id]/pause/route.ts`
- Create: `academie-langues/app/api/superadmin/centers/[id]/resume/route.ts`
- Create: `academie-langues/app/api/superadmin/centers/[id]/revoke/route.ts`

**Interfaces:**
- Consumes: `superadmin-auth-server.ts` guard, DB schema (Task 1), catalogue (Task 2).
- Produces: REST endpoints consumed by superadmin UI (Task 5).

- [ ] **Step 1: Enrich GET `/api/superadmin/centers`**

Return for each center:
```typescript
{
  id, name, city, code, center_type,
  nexa_offer, status,
  trial_ends_at, renewal_at, subscription_amount,
  quota_overrides, pause_reason,
  manager_email,
  student_count: { total, active, paused },
  derived_status: "active" | "trial" | "trial_expired" | "subscription_expired" | "paused" | "revoked"
}
```

Compute `derived_status` server-side using same logic as `resolveCenterAccess`.

- [ ] **Step 2: Enrich PATCH `/api/superadmin/centers/[id]`**

Accept fields: `nexa_offer`, `subscription_amount`, `subscription_period_months`, `renewal_at`, `renewal_alert_days`, `quota_overrides`. Audit log each change.

- [ ] **Step 3: Create POST `/activate`**

Body: `{ nexa_offer, subscription_amount, subscription_period_months }`.
Logic: set `status = 'active'`, `subscription_starts_at = now()`, compute `renewal_at`, clear `trial_ends_at` irrelevance. Audit: `center_activated`.

- [ ] **Step 4: Create POST `/pause`**

Body: `{ reason? }`.
Logic: set `status = 'suspended'`, `pause_reason`. Audit: `center_paused`.

- [ ] **Step 5: Create POST `/resume`**

Logic: set `status = 'active'`, clear `pause_reason`, optionally extend `renewal_at`. Audit: `center_resumed`.

- [ ] **Step 6: Create POST `/revoke`**

Logic: set `status = 'rejected'`. Audit: `center_revoked`.

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/api/superadmin/centers/
git commit -m "feat(superadmin-api): activate/pause/resume/revoke + enriched center list"
```

---

### Task 5: Superadmin UI — Page Centres fusionnée

**Files:**
- Rewrite: `academie-langues/app/superadmin/centres/page.tsx`
- Delete (or redirect): `academie-langues/app/superadmin/demandes/page.tsx`
- Modify: `academie-langues/app/superadmin/layout.tsx` (nav: remove "Demandes" link)
- Modify: `academie-langues/app/i18n/messages/superadmin.ts` (new keys)

**Interfaces:**
- Consumes: API endpoints (Task 4), catalogue (Task 2).
- Produces: Full superadmin centres page with filters, list, actions.

- [ ] **Step 1: Add i18n keys in `superadmin.ts`**

Keys needed (FR + EN): `centresTitle`, `centresSubtitle`, filter labels (tous, actifs, en pause, en demande, essai expiré, abo expiré, révoqués), column headers, action button labels (activer, changer offre, mettre en pause, reprendre, révoquer, réactiver, rejeter), modal labels (offre, montant, période, overrides, date début, renouvellement).

- [ ] **Step 2: Build page layout**

Structure:
- Header + subtitle
- Filter pills row (derived_status + type TCF/natif)
- Search input (name/code)
- List of CenterRow components

- [ ] **Step 3: Build CenterRow component**

Each row shows:
- Centre name, city, type badge (TCF/natif), manager email
- Offer badge (Découverte/Croissance/Pro/Entreprise/Custom + couleur)
- Quotas pastilles (campus, tuteur, live, correction, constructeur — from catalogue or overrides)
- Effectif étudiants (total / actifs)
- Status badge
- Action buttons (conditional on derived_status)

- [ ] **Step 4: Build ActivateModal / ChangeOfferModal**

Form: select offer → pre-fill montant/période → overrides (if Pro option / Entreprise / Custom) → confirm.
On submit: POST `/activate` or PATCH center.

- [ ] **Step 5: Build PauseModal**

Optional reason text → POST `/pause`.

- [ ] **Step 6: Remove demandes page, update nav**

In `layout.tsx`: remove "Demandes" from `NAV_CONFIG`, keep "Centres" (now covers everything).
Delete or redirect `demandes/page.tsx` → `/superadmin/centres?filter=pending`.

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/superadmin/ academie-langues/app/i18n/messages/superadmin.ts
git commit -m "feat(superadmin): fused centres page with filters, actions, modals"
```

---

### Task 6: Analytics enrichi

**Files:**
- Modify: `academie-langues/app/superadmin/analytics/page.tsx`
- Modify: `academie-langues/app/api/superadmin/analytics/route.ts`
- Modify: `academie-langues/app/i18n/messages/superadmin.ts`

**Interfaces:**
- Consumes: `centers` table with new columns (Task 1), derived status logic (Task 4).
- Produces: KPIs and charts visible in superadmin analytics.

- [ ] **Step 1: Add API aggregations**

New fields in GET response:
```typescript
{
  centersByOffer: { decouverte: N, croissance: N, pro: N, entreprise: N, custom: N },
  centersByStatus: { active: N, trial: N, trial_expired: N, subscription_expired: N, paused: N, revoked: N },
  totalStudents: N,
  mrr: N, // sum subscription_amount where status active
  topCenters: [{ id, name, student_count }] // top 10
}
```

- [ ] **Step 2: Add KPI cards in analytics page**

Cards: Centres par offre, Centres par statut, Total étudiants, MRR estimé.

- [ ] **Step 3: Add top centres list**

Simple ranked list (nom, effectif).

- [ ] **Step 4: Add export CSV button**

Export centres list (nom, offre, statut, effectif, montant, renouvellement).

- [ ] **Step 5: Commit**

```bash
git add academie-langues/app/superadmin/analytics/ academie-langues/app/api/superadmin/analytics/
git commit -m "feat(analytics): network KPIs, MRR, top centres, CSV export"
```

---

### Task 7: Centre Sidebar + Abonnements page (mirror)

**Files:**
- Modify: `academie-langues/app/components/CenterSidebar.tsx`
- Modify: `academie-langues/app/centre/abonnements/page.tsx`

**Interfaces:**
- Consumes: `nexa_offer` new values (Task 2), i18n.
- Produces: Updated badge display + marketing page showing current plan.

- [ ] **Step 1: Update sidebar badge**

Replace old offer name display with new names (Découverte/Croissance/Pro/Entreprise). Show "Essai" if pending + trial active.

- [ ] **Step 2: Update abonnements page**

Show current offer, renewal date, quotas summary. Cards reflect new 4-tier structure.

- [ ] **Step 3: Commit**

```bash
git add academie-langues/app/components/CenterSidebar.tsx academie-langues/app/centre/abonnements/page.tsx
git commit -m "feat(centre): update sidebar badge + abonnements page for new tiers"
```

---

### Task 8: Cleanup + Verification

**Files:**
- Various (imports, dead code)

**Interfaces:**
- Consumes: All previous tasks.
- Produces: Clean build, no type errors.

- [ ] **Step 1: Search for remaining old offer references**

```bash
rg "access|lite|advance|ultra" --type ts --type tsx -l
```

Fix any remaining references to old enum values.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 3: Manual smoke test**

- Load `/superadmin/centres` → verify list, filters, actions
- Test activate flow (pending → active with offer assignment)
- Test pause/resume
- Verify centre access gate (readonly banner appears)
- Check analytics KPIs

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup old offer references, fix type errors"
```
