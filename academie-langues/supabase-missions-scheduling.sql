-- A executer dans Supabase SQL Editor
-- Corrige l'erreur "Could not find the 'due_at' column of 'missions'"
-- sur /centre/cours/devoirs

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

notify pgrst, 'reload schema';
