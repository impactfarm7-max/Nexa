-- Réponses étudiant aux séances programmées par le centre (groupe / live)
-- Exécuter dans Supabase SQL Editor

create table if not exists public.schedule_slot_responses (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  session_date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('refused')),
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, session_date, user_id)
);

create index if not exists idx_schedule_slot_responses_slot_date
  on public.schedule_slot_responses (slot_id, session_date);

create index if not exists idx_schedule_slot_responses_user
  on public.schedule_slot_responses (user_id);

alter table public.schedule_slot_responses enable row level security;

-- Étudiant : lit / écrit ses propres réponses
drop policy if exists schedule_slot_responses_own on public.schedule_slot_responses;
create policy schedule_slot_responses_own on public.schedule_slot_responses
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff du même centre : lecture des refus
drop policy if exists schedule_slot_responses_center_read on public.schedule_slot_responses;
create policy schedule_slot_responses_center_read on public.schedule_slot_responses
  for select using (
    exists (
      select 1
      from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_responses.slot_id
        and s.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );
