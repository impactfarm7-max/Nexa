-- Assiduité simple (université) : présent / absent par séance datée
-- Staff marque ; étudiant consulte. Pas de suivi amphithéâtre.

create table if not exists public.class_attendance (
  id uuid default gen_random_uuid() primary key,
  center_id uuid not null references public.centers(id) on delete cascade,
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  session_date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (slot_id, session_date, user_id)
);

create index if not exists idx_class_attendance_center_date
  on public.class_attendance (center_id, session_date desc);

create index if not exists idx_class_attendance_user
  on public.class_attendance (user_id, session_date desc);

create index if not exists idx_class_attendance_slot_date
  on public.class_attendance (slot_id, session_date);

alter table public.class_attendance enable row level security;

drop policy if exists class_attendance_staff on public.class_attendance;
create policy class_attendance_staff on public.class_attendance
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = class_attendance.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = class_attendance.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists class_attendance_student_read on public.class_attendance;
create policy class_attendance_student_read on public.class_attendance
  for select using (user_id = auth.uid());
