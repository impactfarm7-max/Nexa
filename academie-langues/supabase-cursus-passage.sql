-- Cursus pluriannuel : passage de niveau, tarif, année scolaire
-- Additif uniquement. Ne touche pas TCF ni formation_courte.
-- À exécuter dans le SQL Editor Supabase.

-- ── niveaux.seuil_passage ────────────────────────────────────────────────────
alter table public.niveaux
  add column if not exists seuil_passage numeric;

comment on column public.niveaux.seuil_passage is
  'Seuil de passage (échelle moyenne générale, typ. /20). NULL = suggestion manuelle uniquement.';

-- ── filieres.cursus_fee_mode ─────────────────────────────────────────────────
alter table public.filieres
  add column if not exists cursus_fee_mode text;

comment on column public.filieres.cursus_fee_mode is
  'cursus uniquement : uniforme | par_niveau. Distinct de pricing_mode (formation courte).';

do $$
begin
  alter table public.filieres
    add constraint filieres_cursus_fee_mode_check
    check (cursus_fee_mode is null or cursus_fee_mode in ('uniforme', 'par_niveau'));
exception when duplicate_object then null;
end $$;

-- ── enrollments : année scolaire + chaîne de passage ─────────────────────────
alter table public.enrollments
  add column if not exists academic_year text;

alter table public.enrollments
  add column if not exists previous_enrollment_id uuid;

alter table public.enrollments
  add column if not exists passage_decision text;

alter table public.enrollments
  add column if not exists passage_decided_at timestamptz;

alter table public.enrollments
  add column if not exists passage_decided_by uuid;

alter table public.enrollments
  add column if not exists passage_reason text;

comment on column public.enrollments.academic_year is
  'Année scolaire libre (ex. 2025-2026). Cursus.';

comment on column public.enrollments.previous_enrollment_id is
  'Enrollment source (passage admis / redouble).';

comment on column public.enrollments.passage_decision is
  'Décision sur cet enrollment source : admis | redouble | ajourne.';

comment on column public.enrollments.passage_reason is
  'Motif libre (surtout redouble / ajourne).';

do $$
begin
  alter table public.enrollments
    add constraint enrollments_passage_decision_check
    check (passage_decision is null or passage_decision in ('admis', 'redouble', 'ajourne'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.enrollments
    add constraint enrollments_previous_enrollment_id_fkey
    foreign key (previous_enrollment_id) references public.enrollments(id)
    on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists enrollments_previous_enrollment_id_idx
  on public.enrollments (previous_enrollment_id);
