-- Missions / devoirs TCF : ciblage multi-classes, multi-étudiants, mode correction
-- À exécuter dans Supabase SQL Editor

alter table public.missions
  add column if not exists correction_mode text not null default 'auto';

alter table public.missions
  drop constraint if exists missions_correction_mode_check;

alter table public.missions
  add constraint missions_correction_mode_check
  check (correction_mode in ('auto', 'manual'));

alter table public.missions
  add column if not exists attachment_url text;

alter table public.missions
  add column if not exists attachment_name text;

-- Formats de rendu autorisés (texte, fichier, audio, vidéo)
alter table public.missions
  add column if not exists submission_formats text[] not null default array['text', 'file', 'audio', 'video']::text[];

alter table public.missions
  drop constraint if exists missions_submission_formats_check;

alter table public.missions
  add constraint missions_submission_formats_check
  check (
    cardinality(submission_formats) >= 1
    and submission_formats <@ array['text', 'file', 'audio', 'video']::text[]
  );

-- Échéances et ciblage matière / formateur (module Devoirs)
alter table public.missions
  add column if not exists due_at timestamptz;

alter table public.missions
  add column if not exists unlock_at timestamptz;

alter table public.missions
  add column if not exists filiere_matiere_id uuid references public.filiere_matieres(id) on delete set null;

alter table public.missions
  add column if not exists formateur_id uuid references public.profiles(id) on delete set null;

alter table public.missions
  add column if not exists groupe_id uuid references public.groupes(id) on delete set null;

create index if not exists missions_filiere_matiere_created_idx
  on public.missions (filiere_matiere_id, created_at desc);

create index if not exists missions_center_due_at_idx
  on public.missions (center_id, due_at)
  where due_at is not null;

create table if not exists public.mission_groupes (
  mission_id uuid not null references public.missions(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  primary key (mission_id, groupe_id)
);

create index if not exists idx_mission_groupes_groupe
  on public.mission_groupes (groupe_id);

create table if not exists public.mission_students (
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (mission_id, user_id)
);

create index if not exists idx_mission_students_user
  on public.mission_students (user_id);

alter table public.mission_groupes enable row level security;
alter table public.mission_students enable row level security;

drop policy if exists mission_groupes_center on public.mission_groupes;
create policy mission_groupes_center on public.mission_groupes
  for all using (
    exists (
      select 1 from public.missions m
      join public.profiles p on p.id = auth.uid()
      where m.id = mission_groupes.mission_id
        and m.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      join public.profiles p on p.id = auth.uid()
      where m.id = mission_groupes.mission_id
        and m.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

drop policy if exists mission_students_center on public.mission_students;
create policy mission_students_center on public.mission_students
  for all using (
    exists (
      select 1 from public.missions m
      join public.profiles p on p.id = auth.uid()
      where m.id = mission_students.mission_id
        and m.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      join public.profiles p on p.id = auth.uid()
      where m.id = mission_students.mission_id
        and m.center_id = p.center_id
        and p.role in ('admin', 'center_manager', 'campus_manager', 'trainer', 'staff')
    )
  );

notify pgrst, 'reload schema';
