-- Vente manuelle de documents de la bibliothèque.
-- À exécuter dans Supabase SQL Editor avant de déployer le code applicatif.

create table if not exists public.document_purchases (
  id uuid primary key default gen_random_uuid(),
  document_id bigint not null references public.bibliotheque_documents(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  buyer_center_id uuid references public.centers(id) on delete set null,
  seller_center_id uuid not null references public.centers(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'XAF' check (currency = 'XAF'),
  payment_method text not null check (payment_method in ('cash', 'mobile_money', 'bank_transfer', 'other')),
  payment_reference text,
  buyer_note text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected', 'cancelled', 'refunded')),
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  refunded_at timestamptz,
  refunded_by uuid references public.profiles(id) on delete set null,
  refund_reason text,
  updated_at timestamptz not null default now()
);

create unique index if not exists document_purchases_one_open_idx
  on public.document_purchases(document_id, buyer_id)
  where status in ('pending', 'paid');
create index if not exists document_purchases_buyer_idx on public.document_purchases(buyer_id, requested_at desc);
create index if not exists document_purchases_seller_idx on public.document_purchases(seller_center_id, status, requested_at desc);

create table if not exists public.document_purchase_events (
  id bigint generated always as identity primary key,
  purchase_id uuid not null references public.document_purchases(id) on delete cascade,
  event_type text not null check (event_type in ('requested', 'confirmed', 'rejected', 'cancelled', 'refunded')),
  previous_status text,
  new_status text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists document_purchase_events_purchase_idx
  on public.document_purchase_events(purchase_id, created_at);

alter table public.document_purchases enable row level security;
alter table public.document_purchase_events enable row level security;
revoke all on public.document_purchases from anon, authenticated;
revoke all on public.document_purchase_events from anon, authenticated;

-- Toutes les opérations passent par les API serveur utilisant service_role.
-- Cette absence volontaire de politique client évite la falsification d'un paiement.
