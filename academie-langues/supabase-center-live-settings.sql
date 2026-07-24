-- Paramètres Live / rappels par centre + suivi rappels séances collectives TCF
-- À exécuter dans Supabase SQL Editor

alter table public.centers
  add column if not exists coaching_reminder_minutes int not null default 120;

alter table public.centers
  drop constraint if exists centers_coaching_reminder_minutes_check;

alter table public.centers
  add constraint centers_coaching_reminder_minutes_check
  check (coaching_reminder_minutes in (15, 30, 120));

comment on column public.centers.coaching_reminder_minutes is
  'Minutes avant une séance Live pour envoyer le rappel (15, 30 ou 120).';

-- Rappels déjà envoyés pour une occurrence slot + date (séances collectives TCF)
create table if not exists public.schedule_slot_reminders (
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  session_date date not null,
  reminder_sent_at timestamptz not null default now(),
  primary key (slot_id, session_date)
);

create index if not exists idx_schedule_slot_reminders_date
  on public.schedule_slot_reminders (session_date);

alter table public.schedule_slot_reminders enable row level security;

drop policy if exists schedule_slot_reminders_select on public.schedule_slot_reminders;
create policy schedule_slot_reminders_select on public.schedule_slot_reminders
  for select using (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_reminders.slot_id
        and s.center_id = viewer.center_id
    )
  );
