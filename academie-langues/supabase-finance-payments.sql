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
