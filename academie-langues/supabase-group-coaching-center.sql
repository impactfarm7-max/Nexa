-- À exécuter dans Supabase SQL Editor
-- Ajoute le scope centre aux masterclass (coaching de groupe).
-- center_id NULL   = masterclass NEXA globale (étudiants directs B2C uniquement)
-- center_id rempli = masterclass d'un centre (visible seulement par ses étudiants)

alter table public.group_coaching_sessions
  add column if not exists center_id uuid references public.centers(id) on delete cascade;

alter table public.group_coaching_sessions
  add column if not exists created_by_center_user uuid references public.profiles(id) on delete set null;

create index if not exists idx_group_coaching_center
  on public.group_coaching_sessions (center_id, session_date);
