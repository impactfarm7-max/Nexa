-- A executer dans Supabase SQL Editor
-- Salle de classe par defaut pour les inscriptions et rattachement communaute.

alter table groupes
  add column if not exists is_default_signup boolean not null default false;

alter table profiles
  add column if not exists pending_groupe_id uuid references public.groupes(id) on delete set null;

create index if not exists groupes_filiere_default_signup_idx
  on public.groupes (filiere_id)
  where is_default_signup = true;
