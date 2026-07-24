-- À exécuter dans Supabase SQL Editor
-- Ciblage multi-classes pour les cours (gestion-cours)
-- Aucune classe sélectionnée = visible pour toutes les classes du centre

create table if not exists public.course_groupes (
  course_id uuid not null references public.courses(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, groupe_id)
);

create index if not exists idx_course_groupes_groupe
  on public.course_groupes (groupe_id);

alter table public.course_groupes enable row level security;

drop policy if exists course_groupes_select on public.course_groupes;
create policy course_groupes_select on public.course_groupes
  for select using (
    exists (
      select 1
      from public.courses c
      join public.profiles viewer on viewer.id = auth.uid()
      where c.id = course_groupes.course_id
        and c.center_id = viewer.center_id
        and viewer.center_id is not null
    )
  );

drop policy if exists course_groupes_write on public.course_groupes;
create policy course_groupes_write on public.course_groupes
  for all using (
    exists (
      select 1
      from public.courses c
      join public.profiles viewer on viewer.id = auth.uid()
      where c.id = course_groupes.course_id
        and c.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      join public.profiles viewer on viewer.id = auth.uid()
      where c.id = course_groupes.course_id
        and c.center_id = viewer.center_id
        and viewer.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );
