-- A executer dans Supabase SQL Editor.
--
-- Systeme de matricule etudiant : chaque etudiant recoit un matricule
-- unique par centre, format {PREFIXE}-{ANNEE}-{SEQ}, genere
-- automatiquement ou repris tel quel d'un import CSV. Voir
-- docs/superpowers/specs/2026-09-14-matricule-etudiant-design.md pour le
-- design complet.

begin;

-- ── 1. Prefixe personnalisable par centre ──────────────────────────────────
alter table public.centers add column if not exists student_id_prefix text;

-- ── 2. Compteur par centre et par annee civile (reset annuel) ─────────────
create table if not exists public.center_student_counters (
  center_id uuid not null references public.centers(id) on delete cascade,
  year integer not null,
  counter integer not null default 0,
  primary key (center_id, year)
);

-- ── 3. Matricule sur le profil, unique par centre uniquement ──────────────
alter table public.profiles add column if not exists matricule text;

drop index if exists public.profiles_matricule_center_unique;
create unique index profiles_matricule_center_unique
  on public.profiles (center_id, matricule)
  where matricule is not null;

-- ── 4. Incrementation atomique (creation normale / generation) ────────────
create or replace function public.next_student_counter(p_center_id uuid, p_year integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_counter integer;
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, 1)
  on conflict (center_id, year)
  do update set counter = center_student_counters.counter + 1
  returning counter into v_counter;
  return v_counter;
end;
$$;

-- ── 5. Synchronisation du compteur (import CSV avec matricule existant) ───
-- Fait avancer le compteur d'une annee a au moins p_min_value, sans jamais
-- le faire reculer (plusieurs imports ne doivent pas se marcher dessus).
create or replace function public.bump_student_counter(p_center_id uuid, p_year integer, p_min_value integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, p_min_value)
  on conflict (center_id, year)
  do update set counter = greatest(center_student_counters.counter, p_min_value);
end;
$$;

-- ── 6. Certificat public : ajoute le matricule a la verification ──────────
-- Definition d'origine (verifiee en direct via pg_get_functiondef avant ce
-- changement) : ne fait que mettre a jour verified_count et joindre
-- profiles.prenom. On ajoute uniquement profiles.matricule au SELECT et au
-- type de retour, rien d'autre ne change.
create or replace function public.verify_certificate(p_code text)
returns table(
  certificate_code text,
  discipline_code text,
  score_summary jsonb,
  issued_at timestamp with time zone,
  student_prenom text,
  student_matricule text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.exam_certificates
  set verified_count = verified_count + 1
  where certificate_code = p_code;

  return query
  select c.certificate_code, c.discipline_code, c.score_summary, c.issued_at, p.prenom, p.matricule
  from public.exam_certificates c
  join public.profiles p on p.id = c.user_id
  where c.certificate_code = p_code;
end;
$function$;

commit;
