-- Pondération des notes par matière (formule de moyenne du carnet)
-- À exécuter dans le SQL Editor Supabase.

alter table public.filiere_matieres
  add column if not exists grade_weights jsonb;

comment on column public.filiere_matieres.grade_weights is
  'Poids par intitulé pour la moyenne matière. Clé "__principal__" = note principale ; autres clés = title des notes supl. NULL = moyenne simple (égal). Ex: {"__principal__":60,"Test":40}';
