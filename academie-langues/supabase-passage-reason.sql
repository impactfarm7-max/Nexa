-- Additif : motif de décision de passage (redouble / ajourne).
-- Exécuter dans le SQL Editor Supabase si pas déjà dans supabase-cursus-passage.sql.

alter table public.enrollments
  add column if not exists passage_reason text;

comment on column public.enrollments.passage_reason is
  'Motif libre (surtout redouble / ajourne).';
