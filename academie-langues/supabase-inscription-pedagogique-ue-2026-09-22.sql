-- Inscription pédagogique : UE optionnelles (université LMD)
-- Obligatoires = tous les inscrits du semestre ; optionnelles = cochées par le staff.

alter table public.filiere_matieres
  add column if not exists is_optional boolean not null default false;

create table if not exists public.enrollment_ue_inscriptions (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  filiere_matiere_id uuid not null references public.filiere_matieres(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  primary key (enrollment_id, filiere_matiere_id)
);

create index if not exists idx_enrollment_ue_inscriptions_ue
  on public.enrollment_ue_inscriptions (filiere_matiere_id);

alter table public.enrollment_ue_inscriptions enable row level security;

drop policy if exists enrollment_ue_inscriptions_staff on public.enrollment_ue_inscriptions;
create policy enrollment_ue_inscriptions_staff on public.enrollment_ue_inscriptions
  for all using (
    exists (
      select 1
      from public.enrollments e
      join public.filieres f on f.id = e.filiere_id
      join public.profiles p on p.id = auth.uid()
      where e.id = enrollment_ue_inscriptions.enrollment_id
        and f.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1
      from public.enrollments e
      join public.filieres f on f.id = e.filiere_id
      join public.profiles p on p.id = auth.uid()
      where e.id = enrollment_ue_inscriptions.enrollment_id
        and f.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists enrollment_ue_inscriptions_student on public.enrollment_ue_inscriptions;
create policy enrollment_ue_inscriptions_student on public.enrollment_ue_inscriptions
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.id = enrollment_ue_inscriptions.enrollment_id
        and e.student_id = auth.uid()
    )
  );
