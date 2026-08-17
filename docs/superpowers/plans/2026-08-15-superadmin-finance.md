# Finance Superadmin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Finance" superadmin module — a real payments registry (replacing the current single `billing_status`/`last_payment_at` fields), a Finance dashboard with real revenue KPIs/chart, and PDF invoice/receipt generation with NEXA branding.

**Architecture:** New `finance_payments` Postgres table (one row per payment, auto-numbered document), fed by two paths: a manual entry form and the existing "Marquer payé" button. A pure-logic core module (`.core.mjs`, TDD via node:test) handles validation/aggregation/labels, consumed by both the API routes and the UI/PDF code. PDF generation reuses the existing `centerPdfExport.ts` engine (`createDoc`/`addPdfFooter`) with NEXA's own branding config instead of a center's.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), TypeScript, jsPDF + jspdf-autotable, existing `superadminFetch`/`getSuperadminContext` patterns, `node:test` for core logic.

Spec: `docs/superpowers/specs/2026-08-15-superadmin-finance-design.md`

## Global Constraints

- Scope: revenue from centers only. No expense/cost tracking (out of scope per spec).
- No editing/deleting a payment row after creation — corrections are a new row + note (per spec "Hors scope v1").
- `finance_payments` RLS locked down: no direct anon/authenticated access, service-role only (same convention as `center_ai_credit_*` tables).
- PDFs are generated on demand from stored data — no PDF files are persisted to storage.
- Legal identity fields in the PDF (name, address, RCCM/NIU, phone) are explicit placeholders marked with `// TODO:` comments — the user fills them in later.
- All new UI strings go through `useI18n()` / `t("superadmin", key)`, FR + EN both populated (no missing-locale gaps).
- Money is always FCFA, integer, no decimals (matches existing `subscription_amount` convention).

---

### Task 1: Database — `finance_payments` table + document numbering

**Files:**
- Create: `academie-langues/supabase-finance-payments.sql`

**Interfaces:**
- Produces: table `public.finance_payments` (columns: `id, center_id, amount, method, period_label, paid_at, note, document_number, source, created_by, created_at`), function `public.next_finance_document_number() returns text`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- À exécuter une fois dans l'éditeur SQL Supabase.

create table if not exists public.finance_document_counters (
  year integer primary key,
  counter integer not null default 0
);

create or replace function public.next_finance_document_number() returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_counter integer;
begin
  insert into public.finance_document_counters(year, counter)
  values (v_year, 1)
  on conflict (year) do update set counter = finance_document_counters.counter + 1
  returning counter into v_counter;

  return 'NEXA-' || v_year || '-' || lpad(v_counter::text, 6, '0');
end;
$$;

create table if not exists public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  amount integer not null check (amount >= 0),
  method text not null check (method in ('virement', 'mobile_money', 'especes', 'autre')),
  period_label text,
  paid_at timestamptz not null default now(),
  note text,
  document_number text not null unique default public.next_finance_document_number(),
  source text not null check (source in ('manual', 'auto_mark_paid')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists finance_payments_center_idx on public.finance_payments(center_id, paid_at desc);
create index if not exists finance_payments_paid_at_idx on public.finance_payments(paid_at desc);

alter table public.finance_document_counters enable row level security;
alter table public.finance_payments enable row level security;

revoke all on public.finance_document_counters from anon, authenticated;
revoke all on public.finance_payments from anon, authenticated;

revoke all on function public.next_finance_document_number() from public, anon, authenticated;
grant execute on function public.next_finance_document_number() to service_role;
```

- [ ] **Step 2: Run it in Supabase SQL editor, then verify**

```sql
select public.next_finance_document_number();
-- expect: NEXA-2026-000001 (or next counter if run again)
select to_regclass('public.finance_payments');
-- expect: public.finance_payments
```

- [ ] **Step 3: Commit**

```bash
git add academie-langues/supabase-finance-payments.sql
git commit -m "feat(finance): add finance_payments table and document numbering"
```

---

### Task 2: Core logic — validation, monthly aggregation, method labels

**Files:**
- Create: `academie-langues/app/data/financePayments.core.mjs`
- Create: `academie-langues/app/data/financePayments.core.test.mjs`
- Create: `academie-langues/app/data/financePayments.core.d.ts`
- Create: `academie-langues/app/data/financePayments.ts`

**Interfaces:**
- Produces: `FINANCE_METHODS`, `isFinanceMethod(value)`, `validatePaymentInput(body)`, `buildMonthlyRevenue(payments, monthsCount, now?)`, `financeMethodLabel(method, locale)`.
- Consumed by: Task 4 (API routes), Task 6 (PDF export), Task 7 (UI).

- [ ] **Step 1: Write the failing tests**

```javascript
// academie-langues/app/data/financePayments.core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  FINANCE_METHODS,
  isFinanceMethod,
  validatePaymentInput,
  buildMonthlyRevenue,
  financeMethodLabel,
} from "./financePayments.core.mjs";

test("FINANCE_METHODS has the four expected keys", () => {
  assert.deepEqual(FINANCE_METHODS, ["virement", "mobile_money", "especes", "autre"]);
});

test("isFinanceMethod accepts known keys, rejects others", () => {
  assert.equal(isFinanceMethod("virement"), true);
  assert.equal(isFinanceMethod("bitcoin"), false);
  assert.equal(isFinanceMethod(null), false);
});

test("validatePaymentInput accepts a well-formed payload", () => {
  const result = validatePaymentInput({
    center_id: "c1",
    amount: 25000,
    method: "mobile_money",
    period_label: "Août 2026",
    paid_at: "2026-08-15T10:00:00.000Z",
    note: "Paiement partiel",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.center_id, "c1");
  assert.equal(result.value.amount, 25000);
  assert.equal(result.value.method, "mobile_money");
  assert.equal(result.value.period_label, "Août 2026");
  assert.equal(result.value.note, "Paiement partiel");
});

test("validatePaymentInput defaults paid_at to now when omitted", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 1000, method: "especes" });
  assert.equal(result.ok, true);
  assert.equal(typeof result.value.paid_at, "string");
  assert.equal(result.value.period_label, null);
  assert.equal(result.value.note, null);
});

test("validatePaymentInput rejects missing center_id", () => {
  const result = validatePaymentInput({ amount: 1000, method: "especes" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("center_id"));
});

test("validatePaymentInput rejects zero or negative amount", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 0, method: "especes" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("amount"));
});

test("validatePaymentInput rejects unknown method", () => {
  const result = validatePaymentInput({ center_id: "c1", amount: 1000, method: "bitcoin" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("method"));
});

test("buildMonthlyRevenue buckets payments into the right month", () => {
  const now = new Date(2026, 7, 15); // 15 août 2026
  const payments = [
    { amount: 1000, paid_at: "2026-08-01T00:00:00.000Z" },
    { amount: 500, paid_at: "2026-08-10T00:00:00.000Z" },
    { amount: 2000, paid_at: "2026-07-01T00:00:00.000Z" },
    { amount: 999, paid_at: "2025-01-01T00:00:00.000Z" }, // out of the 3-month window
  ];
  const months = buildMonthlyRevenue(payments, 3, now);
  assert.equal(months.length, 3);
  assert.equal(months[2].total, 1500); // août
  assert.equal(months[1].total, 2000); // juillet
  assert.equal(months[0].total, 0); // juin
});

test("financeMethodLabel returns FR and EN labels", () => {
  assert.equal(financeMethodLabel("mobile_money", "fr"), "Mobile Money");
  assert.equal(financeMethodLabel("especes", "en"), "Cash");
  assert.equal(financeMethodLabel("unknown_key", "fr"), "unknown_key");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test academie-langues/app/data/financePayments.core.test.mjs`
Expected: FAIL (module `./financePayments.core.mjs` not found)

- [ ] **Step 3: Implement the core module**

```javascript
// academie-langues/app/data/financePayments.core.mjs

export const FINANCE_METHODS = ["virement", "mobile_money", "especes", "autre"];

export function isFinanceMethod(value) {
  return typeof value === "string" && FINANCE_METHODS.includes(value);
}

function toTrimmedStringOrNull(value, maxLen) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export function validatePaymentInput(body) {
  const errors = [];

  const center_id = toTrimmedStringOrNull(body?.center_id);
  if (!center_id) errors.push("center_id");

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("amount");

  const method = body?.method;
  if (!isFinanceMethod(method)) errors.push("method");

  let paidAtDate = body?.paid_at ? new Date(body.paid_at) : new Date();
  if (Number.isNaN(paidAtDate.getTime())) errors.push("paid_at");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      center_id,
      amount: Math.trunc(amount),
      method,
      period_label: toTrimmedStringOrNull(body?.period_label, 120),
      paid_at: paidAtDate.toISOString(),
      note: toTrimmedStringOrNull(body?.note, 500),
    },
  };
}

export function buildMonthlyRevenue(payments, monthsCount, now) {
  const ref = now instanceof Date ? now : new Date();
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, year: d.getFullYear(), month: d.getMonth(), total: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const d = new Date(p.paid_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.total += Number(p.amount) || 0;
  }
  return months;
}

const METHOD_LABELS_FR = { virement: "Virement", mobile_money: "Mobile Money", especes: "Espèces", autre: "Autre" };
const METHOD_LABELS_EN = { virement: "Bank transfer", mobile_money: "Mobile Money", especes: "Cash", autre: "Other" };

export function financeMethodLabel(method, locale) {
  const map = locale === "en" ? METHOD_LABELS_EN : METHOD_LABELS_FR;
  return map[method] || method;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test academie-langues/app/data/financePayments.core.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 5: Add the `.d.ts` ambient types**

```typescript
// academie-langues/app/data/financePayments.core.d.ts
export type FinanceMethod = "virement" | "mobile_money" | "especes" | "autre";

export const FINANCE_METHODS: readonly FinanceMethod[];

export function isFinanceMethod(value: unknown): value is FinanceMethod;

export type PaymentInput = {
  center_id: string;
  amount: number;
  method: FinanceMethod;
  period_label: string | null;
  paid_at: string;
  note: string | null;
};

export type ValidatePaymentResult =
  | { ok: true; value: PaymentInput }
  | { ok: false; errors: string[] };

export function validatePaymentInput(body: unknown): ValidatePaymentResult;

export type MonthlyRevenueBucket = { key: string; year: number; month: number; total: number };

export function buildMonthlyRevenue(
  payments: { amount: number; paid_at: string }[],
  monthsCount: number,
  now?: Date,
): MonthlyRevenueBucket[];

export function financeMethodLabel(method: string, locale: "fr" | "en"): string;
```

- [ ] **Step 6: Add the TS re-export**

```typescript
// academie-langues/app/data/financePayments.ts
export * from "./financePayments.core.mjs";
```

- [ ] **Step 7: Commit**

```bash
git add academie-langues/app/data/financePayments.core.mjs academie-langues/app/data/financePayments.core.test.mjs academie-langues/app/data/financePayments.core.d.ts academie-langues/app/data/financePayments.ts
git commit -m "feat(finance): add payment validation and aggregation core logic"
```

---

### Task 3: Nav entry + menu permission key

**Files:**
- Modify: `academie-langues/app/data/superadminMenus.ts`
- Modify: `academie-langues/app/superadmin/layout.tsx`
- Modify: `academie-langues/app/i18n/messages/superadmin.ts`

**Interfaces:**
- Produces: menu key `"finance"` usable by `requireSuperadminMenu`/`canAccessMenu` (Task 4 depends on this), nav entry linking to `/superadmin/finance` (Task 7 depends on this route existing).

- [ ] **Step 1: Add `"finance"` to the menu key list**

In `academie-langues/app/data/superadminMenus.ts`, change:

```typescript
export const SUPERADMIN_MENU_KEYS = [
  "dashboard",
  "analytics",
  "alertes",
  "commercial",
  "centres",
  "effectifs",
  "etudiants",
  "offres",
  "support",
  "bibliotheque",
  "audit",
  "equipe",
] as const;
```

to:

```typescript
export const SUPERADMIN_MENU_KEYS = [
  "dashboard",
  "analytics",
  "alertes",
  "commercial",
  "finance",
  "centres",
  "effectifs",
  "etudiants",
  "offres",
  "support",
  "bibliotheque",
  "audit",
  "equipe",
] as const;
```

Then add the matching entries to `SUPERADMIN_MENU_PATHS` and `PATH_TO_MENU` (same file):

```typescript
export const SUPERADMIN_MENU_PATHS: Record<SuperadminMenuKey, string> = {
  dashboard: "/superadmin/dashboard",
  analytics: "/superadmin/analytics",
  alertes: "/superadmin/alertes",
  commercial: "/superadmin/commercial",
  finance: "/superadmin/finance",
  centres: "/superadmin/centres",
  effectifs: "/superadmin/effectifs",
  etudiants: "/superadmin/etudiants",
  offres: "/superadmin/offres",
  support: "/superadmin/support",
  bibliotheque: "/superadmin/bibliotheque",
  audit: "/superadmin/audit",
  equipe: "/superadmin/equipe",
};
```

```typescript
const PATH_TO_MENU: { prefix: string; key: SuperadminMenuKey }[] = [
  { prefix: "/superadmin/dashboard", key: "dashboard" },
  { prefix: "/superadmin/analytics", key: "analytics" },
  { prefix: "/superadmin/alertes", key: "alertes" },
  { prefix: "/superadmin/commercial", key: "commercial" },
  { prefix: "/superadmin/finance", key: "finance" },
  { prefix: "/superadmin/centres", key: "centres" },
  { prefix: "/superadmin/effectifs", key: "effectifs" },
  { prefix: "/superadmin/etudiants", key: "etudiants" },
  { prefix: "/superadmin/offres", key: "offres" },
  { prefix: "/superadmin/support", key: "support" },
  { prefix: "/superadmin/bibliotheque", key: "bibliotheque" },
  { prefix: "/superadmin/audit", key: "audit" },
  { prefix: "/superadmin/equipe", key: "equipe" },
  { prefix: "/superadmin/demandes", key: "centres" },
];
```

- [ ] **Step 2: Add the nav entry**

In `academie-langues/app/superadmin/layout.tsx`, add `Wallet` to the lucide-react import:

```typescript
// before:
  AlertTriangle, BarChart3, Bell, Building2, ChevronRight, Command, Headphones, Handshake, Inbox, LayoutDashboard,
  Layers, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck,
  Star, Sun, ScrollText, Users, UsersRound, UserCog, X, LibraryBig,
// after:
  AlertTriangle, BarChart3, Bell, Building2, ChevronRight, Command, Headphones, Handshake, Inbox, LayoutDashboard,
  Layers, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck,
  Star, Sun, ScrollText, Users, UsersRound, UserCog, Wallet, X, LibraryBig,
```

Then insert a new entry into `NAV_CONFIG` right after the `commercial` line:

```typescript
  { href: "/superadmin/commercial", menuKey: "commercial", labelKey: "navCommercialLabel", descKey: "navCommercialDesc", icon: Handshake, groupKey: "groupPiloting" },
  { href: "/superadmin/finance", menuKey: "finance", labelKey: "navFinanceLabel", descKey: "navFinanceDesc", icon: Wallet, groupKey: "groupPiloting" },
  { href: "/superadmin/demandes", menuKey: "centres", labelKey: "navDemandesLabel", descKey: "navDemandesDesc", icon: Inbox, groupKey: "groupPiloting" },
```

- [ ] **Step 3: Add the nav i18n keys**

In `academie-langues/app/i18n/messages/superadmin.ts`, find the line containing `navCommercialDesc:` in the FR block and add right after it (same object, comma-separated on the existing long line style used in this file):

```typescript
navFinanceLabel: "Finance", navFinanceDesc: "Encaissements, factures et reçus",
```

Do the same in the EN block, right after the matching `navCommercialDesc:`:

```typescript
navFinanceLabel: "Finance", navFinanceDesc: "Payments, invoices and receipts",
```

- [ ] **Step 4: Confirm non-owner superadmins can be granted this menu**

Read `SUPERADMIN_ASSIGNABLE_MENUS` in `superadminMenus.ts` — it's derived as `SUPERADMIN_MENU_KEYS.filter((k) => k !== "equipe")`, so it automatically includes `"finance"` now that it's in `SUPERADMIN_MENU_KEYS`. No code change needed; just confirm by reading the file after Step 1.

- [ ] **Step 5: Type-check**

Run: `cd academie-langues && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add academie-langues/app/data/superadminMenus.ts academie-langues/app/superadmin/layout.tsx academie-langues/app/i18n/messages/superadmin.ts
git commit -m "feat(finance): add Finance nav entry and menu permission key"
```

---

### Task 4: API routes — list/create payments, summary

**Files:**
- Create: `academie-langues/app/api/superadmin/finance/payments/route.ts`
- Create: `academie-langues/app/api/superadmin/finance/summary/route.ts`

**Interfaces:**
- Consumes: `getSuperadminContext(req)`, `requireSuperadminMenu(ctx, menu)`, `supabaseAdmin`, `logSuperadminAction` from `@/app/utils/superadmin-auth-server` (all already exist); `validatePaymentInput`, `buildMonthlyRevenue` from `@/app/data/financePayments` (Task 2); `computeCenterDerivedStatus` from `@/app/api/superadmin/centers/route` (already exported, used the same way in `app/api/superadmin/analytics/route.ts`); menu key `"finance"` (Task 3).
- Produces: `GET /api/superadmin/finance/payments?days=&centerId=` → `{ payments: [...] }`; `POST /api/superadmin/finance/payments` → `{ payment: {...} }`; `GET /api/superadmin/finance/summary?days=` → `{ totalAllTime, totalPeriod, countPeriod, revenueAtRisk, monthlyRevenue, periodDays }`. Consumed by Task 7 (UI).

- [ ] **Step 1: Write `payments/route.ts`**

```typescript
// academie-langues/app/api/superadmin/finance/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getSuperadminContext,
  logSuperadminAction,
  requireSuperadminMenu,
  supabaseAdmin,
} from "@/app/utils/superadmin-auth-server";
import { validatePaymentInput } from "@/app/data/financePayments";

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 90);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(requestedDays, 365)) : 90;
  const centerId = req.nextUrl.searchParams.get("centerId");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("finance_payments")
    .select(
      "id, center_id, amount, method, period_label, paid_at, note, document_number, source, created_at, centers(name, city, center_type, nexa_offer, plan_type)",
    )
    .gte("paid_at", since)
    .order("paid_at", { ascending: false })
    .limit(500);

  if (centerId) query = query.eq("center_id", centerId);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ payments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const body = await req.json().catch(() => ({}));
  const parsed = validatePaymentInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: `Champs invalides : ${parsed.errors.join(", ")}` }, { status: 400 });
  }

  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("id")
    .eq("id", parsed.value.center_id)
    .maybeSingle();
  if (!center) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });

  const { data: payment, error: insertError } = await supabaseAdmin
    .from("finance_payments")
    .insert({ ...parsed.value, source: "manual", created_by: ctx.user.id })
    .select("id, center_id, amount, method, period_label, paid_at, note, document_number, source, created_at")
    .single();

  if (insertError || !payment) {
    return NextResponse.json({ error: insertError?.message || "Échec de l'enregistrement." }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "finance_payment_recorded", {
    targetType: "center",
    targetId: parsed.value.center_id,
    req,
    metadata: { amount: parsed.value.amount, document_number: payment.document_number },
  });

  return NextResponse.json({ payment });
}
```

- [ ] **Step 2: Write `summary/route.ts`**

```typescript
// academie-langues/app/api/superadmin/finance/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, requireSuperadminMenu, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { computeCenterDerivedStatus } from "@/app/api/superadmin/centers/route";
import { buildMonthlyRevenue } from "@/app/data/financePayments";

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isFinite(requestedDays) ? Math.max(7, Math.min(requestedDays, 365)) : 30;
  const periodStart = Date.now() - days * 24 * 60 * 60 * 1000;

  const [{ data: payments, error: paymentsError }, { data: centers, error: centersError }] = await Promise.all([
    supabaseAdmin.from("finance_payments").select("amount, paid_at").order("paid_at", { ascending: false }).limit(5000),
    supabaseAdmin.from("centers").select("status, nexa_offer, created_at, trial_ends_at, renewal_at, subscription_amount"),
  ]);
  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 });
  if (centersError) return NextResponse.json({ error: centersError.message }, { status: 500 });

  const now = Date.now();
  let totalAllTime = 0;
  let totalPeriod = 0;
  let countPeriod = 0;
  for (const p of payments ?? []) {
    const amount = Number(p.amount) || 0;
    totalAllTime += amount;
    if (new Date(p.paid_at).getTime() >= periodStart) {
      totalPeriod += amount;
      countPeriod += 1;
    }
  }

  let revenueAtRisk = 0;
  for (const c of centers ?? []) {
    const status = computeCenterDerivedStatus(c, now);
    if (status === "subscription_expired") revenueAtRisk += Number(c.subscription_amount) || 0;
  }

  const monthlyRevenue = buildMonthlyRevenue(payments ?? [], 12, new Date());

  return NextResponse.json({ totalAllTime, totalPeriod, countPeriod, revenueAtRisk, monthlyRevenue, periodDays: days });
}
```

- [ ] **Step 3: Type-check**

Run: `cd academie-langues && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add academie-langues/app/api/superadmin/finance/payments/route.ts academie-langues/app/api/superadmin/finance/summary/route.ts
git commit -m "feat(finance): add payments list/create and summary API routes"
```

---

### Task 5: Extend "Marquer payé" to record a payment

**Files:**
- Modify: `academie-langues/app/api/superadmin/centers/[id]/route.ts:386-389` (right after the center is fetched post-update)

**Interfaces:**
- Consumes: `center` object already selected in this route (`id, name, subscription_amount, ...`), `ctx.user.id` from `getSuperadminContext`.

- [ ] **Step 1: Locate the insertion point**

Find this existing block (already in the file, right after the `.update(patch)...maybeSingle()` call):

```typescript
  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Centre introuvable." }, { status: 404 });
  }
```

- [ ] **Step 2: Insert the payment recording right after it**

```typescript
  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Centre introuvable." }, { status: 404 });
  }

  if (markPaid) {
    const amount = Math.max(0, Math.trunc(Number(center.subscription_amount) || 0));
    if (amount > 0) {
      const { error: paymentError } = await supabaseAdmin.from("finance_payments").insert({
        center_id: center.id,
        amount,
        method: "autre",
        period_label: null,
        paid_at: new Date().toISOString(),
        note: "Enregistré automatiquement via « Marquer payé ».",
        source: "auto_mark_paid",
        created_by: ctx.user.id,
      });
      if (paymentError) {
        console.warn("[finance] auto_mark_paid insert failed:", paymentError.message);
      }
    }
  }
```

This is best-effort by design (per spec): if the insert fails, the `markPaid` status update that already happened is not rolled back — a warning is logged server-side instead of failing the whole request. If `subscription_amount` is 0 or null, no payment row is created (nothing was actually collected).

- [ ] **Step 3: Manual verification**

1. In the superadmin UI, open a center with `subscription_amount > 0`, click "Marquer payé".
2. Confirm the existing success behavior is unchanged (billing_status becomes "current").
3. Query `select * from finance_payments where source = 'auto_mark_paid' order by created_at desc limit 1;` in Supabase — confirm a row appeared with the right `center_id` and `amount`.

- [ ] **Step 4: Commit**

```bash
git add "academie-langues/app/api/superadmin/centers/[id]/route.ts"
git commit -m "feat(finance): record a payment automatically on Marquer payé"
```

---

### Task 6: PDF invoice/receipt generation

**Files:**
- Modify: `academie-langues/app/utils/centerPdfExport.ts` (export 4 existing helpers — no behavior change)
- Create: `academie-langues/app/utils/financePdfExport.ts`

**Interfaces:**
- Consumes: `createDoc`, `addPdfFooter`, `fmtFCFA`, `fmtDate` (exported from `centerPdfExport.ts` in step 1), `financeMethodLabel` from `@/app/data/financePayments` (Task 2), `DocumentExportConfig` type from `@/app/utils/documentConfig`.
- Produces: `downloadInvoicePdf(payment, locale?)`, `downloadReceiptPdf(payment, locale?)`, type `FinanceInvoicePayment`. Consumed by Task 7 (UI).

- [ ] **Step 1: Export the four helpers `centerPdfExport.ts` already has internally**

In `academie-langues/app/utils/centerPdfExport.ts`, change these four declarations (do not change their bodies — only add `export`):

```typescript
// before: function fmtFCFA(n: number) {
export function fmtFCFA(n: number) {
```

```typescript
// before: function fmtDate(iso: string | null, locale = "fr") {
export function fmtDate(iso: string | null, locale = "fr") {
```

```typescript
// before: async function createDoc(subtitle: string, config?: Partial<DocumentExportConfig>, locale = "fr") {
export async function createDoc(subtitle: string, config?: Partial<DocumentExportConfig>, locale = "fr") {
```

```typescript
// before: function addPdfFooter(doc: any, cfg: DocumentExportConfig) {
export function addPdfFooter(doc: any, cfg: DocumentExportConfig) {
```

- [ ] **Step 2: Type-check that nothing else broke**

Run: `cd academie-langues && npx tsc --noEmit -p .`
Expected: no new errors (adding `export` to already-used internal functions is additive).

- [ ] **Step 3: Write `financePdfExport.ts`**

```typescript
// academie-langues/app/utils/financePdfExport.ts
import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { createDoc, addPdfFooter, fmtFCFA, fmtDate } from "@/app/utils/centerPdfExport";
import { financeMethodLabel } from "@/app/data/financePayments";

// TODO: compléter avant mise en prod — informations légales NEXA (adresse du siège,
// numéro RCCM, NIU, téléphone de contact). Le nom "NEXA" et le logo sont déjà corrects.
const NEXA_LEGAL_CONFIG: Partial<DocumentExportConfig> = {
  legalName: "NEXA",
  logoUrl: "/logo-nexa.jpeg",
  address: null, // TODO: adresse du siège NEXA
  phone: null, // TODO: numéro de contact NEXA
  rccmNumber: null, // TODO: numéro RCCM NEXA
  niuNumber: null, // TODO: NIU NEXA
  accentColor: "#F87B1B",
};

export type FinanceInvoicePayment = {
  document_number: string;
  amount: number;
  method: string;
  period_label: string | null;
  paid_at: string;
  note: string | null;
  center: { name: string; city: string | null; offerLabel: string };
};

async function buildFinanceDocument(payment: FinanceInvoicePayment, kind: "invoice" | "receipt", locale: "fr" | "en") {
  const isEn = locale === "en";
  const title = kind === "invoice" ? (isEn ? "Invoice" : "Facture") : isEn ? "Receipt" : "Reçu";
  const { doc, autoTable, startY, cfg } = await createDoc(title, { ...NEXA_LEGAL_CONFIG, title }, locale);

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`${isEn ? "Document no." : "N° document"} : ${payment.document_number}`, 14, y);
  doc.text(fmtDate(payment.paid_at, locale), 195, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(isEn ? "Billed to" : "Facturé à", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...cfg.blueRgb);
  doc.text(payment.center.name, 14, y);
  y += 4.5;
  if (payment.center.city) {
    doc.setTextColor(100, 100, 100);
    doc.text(payment.center.city, 14, y);
    y += 4.5;
  }
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [[isEn ? "Description" : "Désignation", isEn ? "Amount" : "Montant"]],
    body: [
      [
        [payment.center.offerLabel, payment.period_label].filter(Boolean).join(" — ") ||
          (isEn ? "NEXA subscription" : "Abonnement NEXA"),
        `${fmtFCFA(payment.amount)} F`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`Total : ${fmtFCFA(payment.amount)} F`, 14, afterTableY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${isEn ? "Payment method" : "Méthode de paiement"} : ${financeMethodLabel(payment.method, locale)}`, 14, afterTableY + 7);
  if (payment.note) {
    doc.text(`${isEn ? "Note" : "Note"} : ${payment.note}`, 14, afterTableY + 13, { maxWidth: 180 });
  }

  addPdfFooter(doc, { ...cfg, footerText: "NEXA — nexa-edu.com" });
  return doc;
}

export async function downloadInvoicePdf(payment: FinanceInvoicePayment, locale: "fr" | "en" = "fr") {
  const doc = await buildFinanceDocument(payment, "invoice", locale);
  doc.save(`facture_${payment.document_number}.pdf`);
}

export async function downloadReceiptPdf(payment: FinanceInvoicePayment, locale: "fr" | "en" = "fr") {
  const doc = await buildFinanceDocument(payment, "receipt", locale);
  doc.save(`recu_${payment.document_number}.pdf`);
}
```

- [ ] **Step 4: Commit**

```bash
git add academie-langues/app/utils/centerPdfExport.ts academie-langues/app/utils/financePdfExport.ts
git commit -m "feat(finance): generate branded invoice/receipt PDFs"
```

---

### Task 7: Finance page UI

**Files:**
- Create: `academie-langues/app/superadmin/finance/page.tsx`
- Modify: `academie-langues/app/i18n/messages/superadmin.ts` (finance page strings)

**Interfaces:**
- Consumes: `superadminFetch` from `@/app/utils/superadmin-api-client`; `useI18n` from `@/app/i18n/I18nProvider`; `useActionFeedback` from `@/app/components/ActionFeedback`; `downloadInvoicePdf`/`downloadReceiptPdf`/`FinanceInvoicePayment` from `@/app/utils/financePdfExport` (Task 6); `FINANCE_METHODS`, `FinanceMethod`, `financeMethodLabel` from `@/app/data/financePayments` (Task 2); `nexaOfferLabel` from `@/app/data/nexaOffers` (already used in `dashboard/page.tsx`); routes from Task 4 (`/api/superadmin/finance/payments`, `/api/superadmin/finance/summary`) and the existing `/api/superadmin/centers` (returns `{ centers: [...] }` with `id, name, city`, same shape already consumed by `dashboard/page.tsx`).

- [ ] **Step 1: Add the i18n keys**

In `academie-langues/app/i18n/messages/superadmin.ts`, FR block — add near the other page-scoped keys (same pattern as `analytics*`/`dashboard*` keys already in the file):

```typescript
financeTitle: "Finance", financeSubtitle: "Encaissements réseau, factures et reçus.",
financeTotalAllTime: "Total encaissé", financePeriodTotal: "Encaissé sur la période", financeAtRisk: "Impayés",
financePaymentsCount: "Paiements", financeChartTitle: "Revenu mensuel", financeChartSubtitle: "12 derniers mois",
financeRecordPayment: "Enregistrer un paiement", financeHistoryTitle: "Historique des paiements",
financeColCenter: "Centre", financeColDate: "Date", financeColAmount: "Montant", financeColMethod: "Méthode",
financeColDocument: "N° document", financeColActions: "Actions", financeDownloadInvoice: "Facture",
financeDownloadReceipt: "Reçu", financeEmpty: "Aucun paiement enregistré pour l'instant.", financeLoadError: "Chargement impossible.",
financeModalTitle: "Enregistrer un paiement", financeModalCenter: "Centre", financeModalCenterSearch: "Rechercher un centre…",
financeModalAmount: "Montant (FCFA)", financeModalMethod: "Méthode", financeModalPeriod: "Période (optionnel)",
financeModalDate: "Date du paiement", financeModalNote: "Note (optionnel)", financeModalSubmit: "Enregistrer",
financeModalSubmitting: "Enregistrement…", financeModalSuccess: "Paiement enregistré", financeModalSuccessMsg: "Document {number} généré.",
financeModalError: "Impossible d'enregistrer ce paiement.", financeMethodVirement: "Virement", financeMethodMobileMoney: "Mobile Money",
financeMethodEspeces: "Espèces", financeMethodAutre: "Autre",
```

EN block:

```typescript
financeTitle: "Finance", financeSubtitle: "Network payments, invoices and receipts.",
financeTotalAllTime: "Total collected", financePeriodTotal: "Collected this period", financeAtRisk: "Unpaid",
financePaymentsCount: "Payments", financeChartTitle: "Monthly revenue", financeChartSubtitle: "Last 12 months",
financeRecordPayment: "Record a payment", financeHistoryTitle: "Payment history",
financeColCenter: "Center", financeColDate: "Date", financeColAmount: "Amount", financeColMethod: "Method",
financeColDocument: "Document no.", financeColActions: "Actions", financeDownloadInvoice: "Invoice",
financeDownloadReceipt: "Receipt", financeEmpty: "No payment recorded yet.", financeLoadError: "Unable to load.",
financeModalTitle: "Record a payment", financeModalCenter: "Center", financeModalCenterSearch: "Search a center…",
financeModalAmount: "Amount (FCFA)", financeModalMethod: "Method", financeModalPeriod: "Period (optional)",
financeModalDate: "Payment date", financeModalNote: "Note (optional)", financeModalSubmit: "Save",
financeModalSubmitting: "Saving…", financeModalSuccess: "Payment recorded", financeModalSuccessMsg: "Document {number} generated.",
financeModalError: "Could not record this payment.", financeMethodVirement: "Bank transfer", financeMethodMobileMoney: "Mobile Money",
financeMethodEspeces: "Cash", financeMethodAutre: "Other",
```

- [ ] **Step 2: Write the page**

```typescript
// academie-langues/app/superadmin/finance/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Search, Wallet, X } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { FINANCE_METHODS, type FinanceMethod } from "@/app/data/financePayments";
import { downloadInvoicePdf, downloadReceiptPdf, type FinanceInvoicePayment } from "@/app/utils/financePdfExport";
import { nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";

type Payment = {
  id: string;
  center_id: string;
  amount: number;
  method: FinanceMethod;
  period_label: string | null;
  paid_at: string;
  note: string | null;
  document_number: string;
  source: "manual" | "auto_mark_paid";
  created_at: string;
  centers: { name: string; city: string | null; center_type: string | null; nexa_offer: NexaOfferKey | null; plan_type: string | null } | null;
};

type Summary = {
  totalAllTime: number;
  totalPeriod: number;
  countPeriod: number;
  revenueAtRisk: number;
  monthlyRevenue: { key: string; year: number; month: number; total: number }[];
  periodDays: number;
};

type CenterOption = { id: string; name: string; city?: string | null };

const EMPTY_SUMMARY: Summary = {
  totalAllTime: 0,
  totalPeriod: 0,
  countPeriod: 0,
  revenueAtRisk: 0,
  monthlyRevenue: [],
  periodDays: 30,
};

function formatFcfa(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`;
}

function formatShortDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function methodLabel(method: FinanceMethod, t: ReturnType<typeof useI18n>["t"]) {
  const key = {
    virement: "financeMethodVirement",
    mobile_money: "financeMethodMobileMoney",
    especes: "financeMethodEspeces",
    autre: "financeMethodAutre",
  }[method] as
    | "financeMethodVirement"
    | "financeMethodMobileMoney"
    | "financeMethodEspeces"
    | "financeMethodAutre";
  return t("superadmin", key);
}

function RecordPaymentModal({
  onClose,
  onRecorded,
}: {
  onClose: () => void;
  onRecorded: () => void;
}) {
  const { t, locale } = useI18n();
  const feedback = useActionFeedback();
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [search, setSearch] = useState("");
  const [centerId, setCenterId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<FinanceMethod>("mobile_money");
  const [periodLabel, setPeriodLabel] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const json = await superadminFetch<{ centers: CenterOption[] }>("/api/superadmin/centers");
        setCenters(json.centers || []);
      } catch {
        setCenters([]);
      }
    })();
  }, []);

  const filteredCenters = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q ? centers.filter((c) => c.name.toLowerCase().includes(q)) : centers;
    return rows.slice(0, 8);
  }, [centers, search]);

  const selectedCenter = centers.find((c) => c.id === centerId) || null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!centerId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError(t("superadmin", "financeModalError"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const json = await superadminFetch<{ payment: Payment }>("/api/superadmin/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          center_id: centerId,
          amount: Math.trunc(parsedAmount),
          method,
          period_label: periodLabel.trim() || null,
          paid_at: new Date(paidAt).toISOString(),
          note: note.trim() || null,
        }),
      });
      feedback.show(
        {
          status: "success",
          title: t("superadmin", "financeModalSuccess"),
          message: t("superadmin", "financeModalSuccessMsg").replace("{number}", json.payment.document_number),
        },
        2200,
      );
      onRecorded();
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("superadmin", "financeModalError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-white">{t("superadmin", "financeModalTitle")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalCenter")}</label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCenterId("");
                }}
                placeholder={t("superadmin", "financeModalCenterSearch")}
                className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10">
              {filteredCenters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCenterId(c.id);
                    setSearch(c.name);
                  }}
                  className={`block w-full border-b border-white/5 px-3 py-2 text-left text-xs font-bold last:border-0 ${
                    centerId === c.id ? "bg-orange-500/15 text-orange-300" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {c.name}
                  {c.city ? <span className="ml-1.5 text-[10px] font-medium text-slate-500">{c.city}</span> : null}
                </button>
              ))}
            </div>
            {selectedCenter && <p className="mt-1.5 text-[11px] font-bold text-orange-300">{selectedCenter.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalAmount")}</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalMethod")}</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as FinanceMethod)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              >
                {FINANCE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(m, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalDate")}</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalPeriod")}</label>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder={locale === "en" ? "e.g. August 2026" : "ex. Août 2026"}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalNote")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>

          {submitError && <p className="text-xs font-bold text-red-400">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white disabled:opacity-50"
          >
            {submitting ? t("superadmin", "financeModalSubmitting") : t("superadmin", "financeModalSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SuperadminFinancePage() {
  const { t, locale } = useI18n();
  const [days, setDays] = useState(30);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [paymentsJson, summaryJson] = await Promise.all([
        superadminFetch<{ payments: Payment[] }>(`/api/superadmin/finance/payments?days=${days}`),
        superadminFetch<Summary>(`/api/superadmin/finance/summary?days=${days}`),
      ]);
      setPayments(paymentsJson.payments || []);
      setSummary({ ...EMPTY_SUMMARY, ...summaryJson });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "financeLoadError"));
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const growthMax = Math.max(1, ...summary.monthlyRevenue.map((m) => m.total));

  const toInvoicePayment = (p: Payment): FinanceInvoicePayment => ({
    document_number: p.document_number,
    amount: p.amount,
    method: p.method,
    period_label: p.period_label,
    paid_at: p.paid_at,
    note: p.note,
    center: {
      name: p.centers?.name || "—",
      city: p.centers?.city || null,
      offerLabel: p.centers?.nexa_offer ? nexaOfferLabel(p.centers.nexa_offer, locale === "en" ? "en" : "fr") : "NEXA",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{t("superadmin", "financeTitle")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "financeSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[30, 90, 365].map((period) => (
            <button
              key={period}
              onClick={() => setDays(period)}
              className={`rounded-lg px-3 py-2 text-xs font-black ${
                days === period ? "bg-orange-500 text-white" : "border border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {period}j
            </button>
          ))}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white"
          >
            <Plus className="h-4 w-4" />
            {t("superadmin", "financeRecordPayment")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-orange-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeTotalAllTime")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.totalAllTime, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financePeriodTotal")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.totalPeriod, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-red-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeAtRisk")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.revenueAtRisk, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-sky-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financePaymentsCount")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : summary.countPeriod}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="font-black text-white">{t("superadmin", "financeChartTitle")}</h3>
            <p className="text-xs text-slate-500">{t("superadmin", "financeChartSubtitle")}</p>
            <div className="mt-6 flex h-40 items-end gap-2">
              {summary.monthlyRevenue.map((m) => (
                <div key={m.key} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-28 w-full items-end">
                    <div
                      className="w-full rounded-t bg-orange-500/80 transition-all duration-150 group-hover:bg-orange-400"
                      style={{ height: `${loading ? 0 : Math.max(m.total > 0 ? 6 : 2, (m.total / growthMax) * 100)}%` }}
                      title={formatFcfa(m.total, locale)}
                    />
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-500">
                    {new Date(m.year, m.month, 1).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="mb-4 font-black text-white">{t("superadmin", "financeHistoryTitle")}</h3>
            {loading ? (
              <p className="text-sm text-slate-500">…</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-slate-500">{t("superadmin", "financeEmpty")}</p>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="py-3 pr-4">{t("superadmin", "financeColCenter")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColDate")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColMethod")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColDocument")}</th>
                      <th className="py-3 pr-4 text-right">{t("superadmin", "financeColAmount")}</th>
                      <th className="py-3 text-right">{t("superadmin", "financeColActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 font-bold text-slate-200">{p.centers?.name || "—"}</td>
                        <td className="py-3 pr-4 text-slate-400">{formatShortDate(p.paid_at, locale)}</td>
                        <td className="py-3 pr-4 text-slate-400">{methodLabel(p.method, t)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500">{p.document_number}</td>
                        <td className="py-3 pr-4 text-right font-black text-white">{formatFcfa(p.amount, locale)}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => void downloadInvoicePdf(toInvoicePayment(p), locale === "en" ? "en" : "fr")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-orange-400/40"
                            >
                              <Download className="h-3 w-3" />
                              {t("superadmin", "financeDownloadInvoice")}
                            </button>
                            <button
                              onClick={() => void downloadReceiptPdf(toInvoicePayment(p), locale === "en" ? "en" : "fr")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-orange-400/40"
                            >
                              <Download className="h-3 w-3" />
                              {t("superadmin", "financeDownloadReceipt")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <RecordPaymentModal onClose={() => setModalOpen(false)} onRecorded={() => void load()} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd academie-langues && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add academie-langues/app/superadmin/finance/page.tsx academie-langues/app/i18n/messages/superadmin.ts
git commit -m "feat(finance): add the Finance page (KPIs, chart, history, record-payment modal)"
```

---

### Task 8: Verification

- [ ] **Step 1: Run the core logic tests**

Run: `node --test academie-langues/app/data/financePayments.core.test.mjs`
Expected: all PASS.

- [ ] **Step 2: Full type-check**

Run: `cd academie-langues && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `cd academie-langues && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke test — record a manual payment**

1. Log in as superadmin, open `/superadmin/finance`.
2. Click "Enregistrer un paiement", pick a center, amount 15000, method "Mobile Money", submit.
3. Confirm: success toast shows a `NEXA-2026-xxxxxx` document number; the new row appears at the top of the history table; KPI cards update (total encaissé, encaissé période, nombre de paiements).
4. Click "Facture" on that row — confirm a PDF downloads with NEXA logo, correct amount, center name, document number.
5. Click "Reçu" on the same row — confirm a PDF downloads with "Reçu" as the title instead of "Facture", same data.

- [ ] **Step 5: Manual smoke test — auto payment via "Marquer payé"**

1. Go to `/superadmin/centres`, open a center with a positive `subscription_amount`.
2. Click "Marquer payé".
3. Go back to `/superadmin/finance` — confirm a new row appeared with `source = auto_mark_paid` (visible via a Supabase query, not necessarily in the UI) and the amount matches the center's `subscription_amount`.

- [ ] **Step 6: Permission check**

1. As a non-owner superadmin without the `finance` menu assigned, confirm `/superadmin/finance` is inaccessible (redirects or shows nothing) and the nav item doesn't appear.
2. Assign the `finance` menu to that superadmin (via the existing team management screen) and confirm it now appears and works.
