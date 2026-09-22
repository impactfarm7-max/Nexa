-- Convocations d'examens (universités LMD) : salle + date + épreuve
-- Création manuelle staff — distinct du planning cours et des lives/coaching.

create table if not exists public.exam_convocations (
  id uuid default gen_random_uuid() primary key,
  center_id uuid not null references public.centers(id) on delete cascade,
  filiere_id uuid references public.filieres(id) on delete set null,
  filiere_matiere_id uuid references public.filiere_matieres(id) on delete set null,
  epreuve_label text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  room_name text not null,
  instructions text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'cancelled')),
  target_scope text not null default 'groupes'
    check (target_scope in ('all', 'groupes', 'students')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_convocations_center_date
  on public.exam_convocations (center_id, scheduled_at desc);

create table if not exists public.exam_convocation_groupes (
  convocation_id uuid not null references public.exam_convocations(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  primary key (convocation_id, groupe_id)
);

create table if not exists public.exam_convocation_students (
  convocation_id uuid not null references public.exam_convocations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (convocation_id, user_id)
);

create table if not exists public.exam_convocation_assignments (
  id uuid default gen_random_uuid() primary key,
  convocation_id uuid not null references public.exam_convocations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned', 'seen', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (convocation_id, user_id)
);

create index if not exists idx_exam_convocation_assignments_user
  on public.exam_convocation_assignments (user_id, created_at desc);

alter table public.exam_convocations enable row level security;
alter table public.exam_convocation_groupes enable row level security;
alter table public.exam_convocation_students enable row level security;
alter table public.exam_convocation_assignments enable row level security;

-- Staff centre
drop policy if exists exam_convocations_staff on public.exam_convocations;
create policy exam_convocations_staff on public.exam_convocations
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = exam_convocations.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.center_id = exam_convocations.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists exam_convocation_groupes_staff on public.exam_convocation_groupes;
create policy exam_convocation_groupes_staff on public.exam_convocation_groupes
  for all using (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_groupes.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_groupes.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists exam_convocation_students_staff on public.exam_convocation_students;
create policy exam_convocation_students_staff on public.exam_convocation_students
  for all using (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_students.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_students.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists exam_convocation_assignments_staff on public.exam_convocation_assignments;
create policy exam_convocation_assignments_staff on public.exam_convocation_assignments
  for all using (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_assignments.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.exam_convocations c
      join public.profiles p on p.id = auth.uid()
      where c.id = exam_convocation_assignments.convocation_id
        and c.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

-- Étudiant : lit ses assignments + la convocation liée si publiée
drop policy if exists exam_convocation_assignments_student on public.exam_convocation_assignments;
create policy exam_convocation_assignments_student on public.exam_convocation_assignments
  for select using (user_id = auth.uid());

drop policy if exists exam_convocations_student on public.exam_convocations;
create policy exam_convocations_student on public.exam_convocations
  for select using (
    status = 'published'
    and exists (
      select 1 from public.exam_convocation_assignments a
      where a.convocation_id = exam_convocations.id
        and a.user_id = auth.uid()
        and a.status <> 'cancelled'
    )
  );
