-- À exécuter dans Supabase SQL Editor
-- Planning TCF : séances individuelles (coaching) + collectives (créneaux)

-- ── Séances individuelles (demandes étudiants) ─────────────────────────────
alter table public.coaching_sessions
  add column if not exists rescheduled_date date,
  add column if not exists rescheduled_time time,
  add column if not exists reschedule_reason text,
  add column if not exists merged_slot_id uuid references public.schedule_slots(id) on delete set null;

create index if not exists idx_coaching_sessions_center_date
  on public.coaching_sessions (session_date, session_time);

-- ── Créneaux collectifs : date ponctuelle + multi-classes ────────────────────
alter table public.schedule_slots
  add column if not exists specific_date date,
  add column if not exists session_scope text not null default 'collective';

create table if not exists public.schedule_slot_groupes (
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  primary key (slot_id, groupe_id)
);

create index if not exists idx_schedule_slot_groupes_groupe
  on public.schedule_slot_groupes (groupe_id);

alter table public.schedule_slot_groupes enable row level security;

drop policy if exists schedule_slot_groupes_select on public.schedule_slot_groupes;
create policy schedule_slot_groupes_select on public.schedule_slot_groupes
  for select using (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_groupes.slot_id
        and s.center_id = viewer.center_id
    )
  );

drop policy if exists schedule_slot_groupes_write on public.schedule_slot_groupes;
create policy schedule_slot_groupes_write on public.schedule_slot_groupes
  for all using (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_groupes.slot_id
        and s.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_groupes.slot_id
        and s.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );
