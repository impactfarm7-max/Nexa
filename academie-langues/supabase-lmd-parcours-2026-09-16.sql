-- A executer dans Supabase SQL Editor.
--
-- Parcours LMD (Licence-Master-Doctorat) pour les centres universite :
-- introduit `semestres` (rattaches a un `niveau`) et les colonnes de
-- credits/rattachement necessaires pour decouper un niveau en semestres,
-- affecter groupes/matieres/inscriptions a un semestre, et ponderer les
-- matieres en credits. Ne touche aucune autre table de tarification
-- (niveaux.tuition_fee reste la seule source de prix — voir spec, section
-- "Perimetre"). Voir docs/superpowers/sdd/2026-09-16-parcours-lmd-universite/
-- pour le design complet.
--
-- IMPORTANT apres execution : verifier que la transaction a bien commit
-- avant de deployer le code applicatif qui en depend (Taches 4+ de ce
-- plan), par ex. avec `select to_regclass('public.semestres');` (doit
-- retourner 'semestres', pas NULL). Ne pas se fier a l'absence apparente
-- d'erreur dans l'editeur SQL : une transaction annulee (rollback) peut
-- visuellement ressembler a un succes si on ne fait pas defiler jusqu'au
-- message d'erreur reel.

begin;

-- ── 1. Table semestres, rattachee a un niveau ──────────────────────────────
create table public.semestres (
  id uuid primary key default gen_random_uuid(),
  niveau_id uuid not null references public.niveaux(id) on delete cascade,
  ordre integer not null,
  nom text,
  credits_cible integer,
  created_at timestamptz not null default now()
);
create index semestres_niveau_id_idx on public.semestres(niveau_id);

alter table public.semestres enable row level security;

-- Policies calquees exactement sur celles de `niveaux` (verifiees en
-- direct via pg_policies avant cette migration), en etendant la jointure
-- d'un cran : semestres.niveau_id -> niveaux.id -> niveaux.filiere_id ->
-- filieres.center_id.
create policy "acces_semestres_du_centre" on public.semestres
  for select
  using (
    exists (
      select 1
      from public.niveaux n
      join public.filieres f on f.id = n.filiere_id
      where n.id = semestres.niveau_id
        and f.center_id = (select profiles.center_id from public.profiles where profiles.id = auth.uid())
    )
  );

create policy "Ecrire semestres de son centre" on public.semestres
  for all
  using (
    exists (
      select 1
      from public.niveaux n
      join public.filieres f on f.id = n.filiere_id
      join public.profiles p on p.id = auth.uid()
      where n.id = semestres.niveau_id
        and (p.role = 'admin' or (p.role = any(array['center_manager','trainer']) and p.center_id = f.center_id))
    )
  )
  with check (
    exists (
      select 1
      from public.niveaux n
      join public.filieres f on f.id = n.filiere_id
      join public.profiles p on p.id = auth.uid()
      where n.id = semestres.niveau_id
        and (p.role = 'admin' or (p.role = any(array['center_manager','trainer']) and p.center_id = f.center_id))
    )
  );

-- ── 2. Rattachements et credits (toutes nullable : retro-compatible avec
--       chaque filiere non-universitaire, qui n'utilisera jamais semestre_id) ─
alter table public.groupes add column semestre_id uuid references public.semestres(id) on delete cascade;
alter table public.filiere_matieres add column semestre_id uuid references public.semestres(id) on delete cascade;
alter table public.filiere_matieres add column credits integer;
alter table public.enrollments add column semestre_id uuid references public.semestres(id) on delete set null;
alter table public.centers add column lmd_validation_threshold_pct integer;

commit;
