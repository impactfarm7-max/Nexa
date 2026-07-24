-- Motifs pause / suppression etudiants centre TCF
-- A executer dans Supabase SQL Editor

alter table public.profiles
  add column if not exists access_pause_reason text;

alter table public.center_revoked_students
  add column if not exists reason text;

notify pgrst, 'reload schema';
