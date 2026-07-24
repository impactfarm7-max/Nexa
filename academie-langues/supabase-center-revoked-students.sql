-- A executer dans Supabase SQL Editor
-- Memoire minimale des comptes etudiants supprimes/revoques par un centre.
-- Le compte Auth et le profil peuvent etre supprimes, mais la login peut
-- encore afficher un message clair si l'ancien email tente de se connecter.

create table if not exists public.center_revoked_students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete cascade,
  student_id uuid,
  email text not null,
  email_lc text not null,
  prenom text,
  nom text,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz not null default now()
);

create index if not exists center_revoked_students_email_idx
  on public.center_revoked_students (email_lc, revoked_at desc);

create index if not exists center_revoked_students_center_idx
  on public.center_revoked_students (center_id, revoked_at desc);

alter table public.center_revoked_students enable row level security;

drop policy if exists center_revoked_students_service_only on public.center_revoked_students;
create policy center_revoked_students_service_only
  on public.center_revoked_students
  for all
  using (false)
  with check (false);

notify pgrst, 'reload schema';
