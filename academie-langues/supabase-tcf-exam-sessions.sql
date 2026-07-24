-- Examens complets TCF centre : planification, convocations, déblocages
-- À exécuter dans Supabase SQL Editor

alter table public.exam_sessions
  add column if not exists center_id uuid references public.centers(id) on delete set null;

alter table public.exam_sessions
  add column if not exists assignment_id uuid;

create table if not exists public.tcf_exam_sessions (
  id uuid default gen_random_uuid() primary key,
  center_id uuid not null references public.centers(id) on delete cascade,
  title text not null,
  examen_id integer not null check (examen_id >= 1 and examen_id <= 25),
  scheduled_at timestamptz not null,
  window_start timestamptz,
  window_end timestamptz,
  session_type text not null default 'scheduled' check (session_type in ('scheduled', 'exceptional')),
  status text not null default 'planned' check (status in ('planned', 'open', 'closed', 'cancelled')),
  target_scope text not null default 'all' check (target_scope in ('all', 'groupes', 'students')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tcf_exam_sessions_center_date
  on public.tcf_exam_sessions (center_id, scheduled_at);

create table if not exists public.tcf_exam_session_groupes (
  session_id uuid not null references public.tcf_exam_sessions(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  primary key (session_id, groupe_id)
);

create table if not exists public.tcf_exam_session_students (
  session_id uuid not null references public.tcf_exam_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (session_id, user_id)
);

create table if not exists public.tcf_exam_assignments (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.tcf_exam_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'started', 'completed', 'no_show')),
  exam_session_id uuid references public.exam_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists idx_tcf_exam_assignments_user
  on public.tcf_exam_assignments (user_id, status);

alter table public.exam_sessions
  drop constraint if exists exam_sessions_assignment_id_fkey;

alter table public.exam_sessions
  add constraint exam_sessions_assignment_id_fkey
  foreign key (assignment_id) references public.tcf_exam_assignments(id) on delete set null;

create table if not exists public.tcf_exam_unlocks (
  id uuid default gen_random_uuid() primary key,
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  examen_id integer check (examen_id is null or (examen_id >= 1 and examen_id <= 25)),
  expires_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tcf_exam_unlocks_user
  on public.tcf_exam_unlocks (user_id, expires_at desc);

alter table public.tcf_exam_sessions enable row level security;
alter table public.tcf_exam_session_groupes enable row level security;
alter table public.tcf_exam_session_students enable row level security;
alter table public.tcf_exam_assignments enable row level security;
alter table public.tcf_exam_unlocks enable row level security;

-- Staff centre : accès complet aux séances de leur centre
drop policy if exists tcf_exam_sessions_staff on public.tcf_exam_sessions;
create policy tcf_exam_sessions_staff on public.tcf_exam_sessions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = tcf_exam_sessions.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = tcf_exam_sessions.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists tcf_exam_session_groupes_staff on public.tcf_exam_session_groupes;
create policy tcf_exam_session_groupes_staff on public.tcf_exam_session_groupes
  for all using (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_session_groupes.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_session_groupes.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists tcf_exam_session_students_staff on public.tcf_exam_session_students;
create policy tcf_exam_session_students_staff on public.tcf_exam_session_students
  for all using (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_session_students.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_session_students.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists tcf_exam_assignments_staff on public.tcf_exam_assignments;
create policy tcf_exam_assignments_staff on public.tcf_exam_assignments
  for all using (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_assignments.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.tcf_exam_sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = tcf_exam_assignments.session_id
        and s.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists tcf_exam_unlocks_staff on public.tcf_exam_unlocks;
create policy tcf_exam_unlocks_staff on public.tcf_exam_unlocks
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = tcf_exam_unlocks.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = tcf_exam_unlocks.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

-- Étudiant : lit ses propres convocations
drop policy if exists tcf_exam_assignments_student_select on public.tcf_exam_assignments;
create policy tcf_exam_assignments_student_select on public.tcf_exam_assignments
  for select using (auth.uid() = user_id);

drop policy if exists tcf_exam_sessions_student_select on public.tcf_exam_sessions;
create policy tcf_exam_sessions_student_select on public.tcf_exam_sessions
  for select using (
    exists (
      select 1 from public.tcf_exam_assignments a
      where a.session_id = tcf_exam_sessions.id and a.user_id = auth.uid()
    )
  );

-- Migration : étendre la plage examen_id 21 → 25 (bases déjà déployées)
alter table public.tcf_exam_sessions
  drop constraint if exists tcf_exam_sessions_examen_id_check;

alter table public.tcf_exam_sessions
  add constraint tcf_exam_sessions_examen_id_check
  check (examen_id >= 1 and examen_id <= 25);

alter table public.tcf_exam_unlocks
  drop constraint if exists tcf_exam_unlocks_examen_id_check;

alter table public.tcf_exam_unlocks
  add constraint tcf_exam_unlocks_examen_id_check
  check (examen_id is null or (examen_id >= 1 and examen_id <= 25));
