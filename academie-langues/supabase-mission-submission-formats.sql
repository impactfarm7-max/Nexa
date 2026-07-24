-- Formats de soumission autorisés par devoir (text, file, audio, video)
-- À exécuter dans Supabase SQL Editor

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

comment on column public.missions.submission_formats is
  'Formats de rendu autorisés pour les étudiants: text, file, audio, video';

notify pgrst, 'reload schema';
