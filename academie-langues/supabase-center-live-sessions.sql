-- Sessions Live (module /centre/lives) vs Coaching de groupe (Planning)
-- session_scope: 'collective' = coaching de groupe (classes)
--                'live'       = session live (participants choisis)

-- Autoriser session_scope live
alter table public.schedule_slots
  drop constraint if exists schedule_slots_session_scope_check;

alter table public.schedule_slots
  add constraint schedule_slots_session_scope_check
  check (session_scope in ('collective', 'live'));

-- Participants choisis pour les sessions live
create table if not exists public.schedule_slot_participants (
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (slot_id, user_id)
);

create index if not exists idx_schedule_slot_participants_user
  on public.schedule_slot_participants (user_id);

alter table public.schedule_slot_participants enable row level security;

drop policy if exists schedule_slot_participants_select on public.schedule_slot_participants;
create policy schedule_slot_participants_select on public.schedule_slot_participants
  for select using (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_participants.slot_id
        and s.center_id = viewer.center_id
    )
    or user_id = auth.uid()
  );

drop policy if exists schedule_slot_participants_write on public.schedule_slot_participants;
create policy schedule_slot_participants_write on public.schedule_slot_participants
  for all using (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_participants.slot_id
        and s.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.schedule_slots s
      join public.profiles viewer on viewer.id = auth.uid()
      where s.id = schedule_slot_participants.slot_id
        and s.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );
