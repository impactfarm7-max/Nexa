-- Barème + coefficient par matière, intitulé pour notes supplémentaires
-- À exécuter dans le SQL Editor Supabase.

-- ── filiere_matieres ─────────────────────────────────────────────────────────
alter table public.filiere_matieres
  add column if not exists coefficient numeric not null default 1;

alter table public.filiere_matieres
  add column if not exists max_score numeric not null default 20;

comment on column public.filiere_matieres.coefficient is
  'Poids de la matière dans la moyenne générale (ex. 4 pour Maths).';

comment on column public.filiere_matieres.max_score is
  'Barème de notation par défaut (ex. 20, 100, 40).';

-- ── grades : intitulé des notes supplémentaires ──────────────────────────────
alter table public.grades
  add column if not exists title text;

comment on column public.grades.title is
  'Intitulé de la note. NULL = note principale de la période ; renseigné = note supplémentaire (devoir, oral, etc.).';

-- Contraintes souples (éviter crash si déjà présentes)
do $$
begin
  alter table public.filiere_matieres
    add constraint filiere_matieres_coefficient_check check (coefficient > 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.filiere_matieres
    add constraint filiere_matieres_max_score_check check (max_score > 0);
exception when duplicate_object then null;
end $$;
