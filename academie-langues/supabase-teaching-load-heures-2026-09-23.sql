-- Charge d'enseignement (service universitaire) — distinct du planning centre (EDT).
-- À exécuter dans le SQL Editor Supabase.
-- ORDRE 3/3 — après status + grade_audit_events.
-- Sans ces colonnes, /api/centre/teaching-load et /centre/cours/charge renvoient 503.

alter table public.filiere_matieres
  add column if not exists heures_cm numeric,
  add column if not exists heures_td numeric,
  add column if not exists heures_tp numeric;

comment on column public.filiere_matieres.heures_cm is
  'Volume horaire CM de l''UE (charge enseignement, pas créneau EDT).';
comment on column public.filiere_matieres.heures_td is
  'Volume horaire TD de l''UE (charge enseignement).';
comment on column public.filiere_matieres.heures_tp is
  'Volume horaire TP de l''UE (charge enseignement).';

alter table public.profiles
  add column if not exists service_annuel_heures numeric;

comment on column public.profiles.service_annuel_heures is
  'Plafond de service annuel (heures) pour un formateur — référentiel charge enseignement.';
