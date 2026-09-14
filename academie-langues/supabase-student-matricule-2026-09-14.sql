-- A executer dans Supabase SQL Editor.
--
-- Systeme de matricule etudiant : chaque etudiant recoit un matricule
-- unique par centre, format {PREFIXE}-{ANNEE}-{SEQ}, genere
-- automatiquement ou repris tel quel d'un import CSV. Voir
-- docs/superpowers/specs/2026-09-14-matricule-etudiant-design.md pour le
-- design complet.
--
-- IMPORTANT apres execution : verifier que la transaction a bien commit
-- avant de deployer le code applicatif, par ex. avec
-- `select to_regclass('public.center_student_counters');` (doit retourner
-- non-null). Ne pas se fier a l'absence apparente d'erreur dans l'editeur
-- SQL : une transaction annulee (rollback) peut visuellement ressembler a
-- un succes si on ne fait pas defiler jusqu'au message d'erreur reel.

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

alter table public.center_student_counters enable row level security;
revoke all on public.center_student_counters from anon, authenticated;

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
set search_path to 'public'
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

revoke execute on function public.next_student_counter(uuid, integer) from public, anon, authenticated;

-- ── 5. Synchronisation du compteur (import CSV avec matricule existant) ───
-- Fait avancer le compteur d'une annee a au moins p_min_value, sans jamais
-- le faire reculer (plusieurs imports ne doivent pas se marcher dessus).
create or replace function public.bump_student_counter(p_center_id uuid, p_year integer, p_min_value integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, p_min_value)
  on conflict (center_id, year)
  do update set counter = greatest(center_student_counters.counter, p_min_value);
end;
$$;

revoke execute on function public.bump_student_counter(uuid, integer, integer) from public, anon, authenticated;

-- ── 6. Certificat public : ajoute le matricule a la verification ──────────
-- Definition d'origine (verifiee en direct via pg_get_functiondef avant ce
-- changement) : ne fait que mettre a jour verified_count et joindre
-- profiles.prenom. On ajoute uniquement profiles.matricule au SELECT et au
-- type de retour, rien d'autre ne change.
-- `create or replace function` ne peut pas changer la liste de colonnes
-- de retour d'une fonction existante (erreur 42P13) : on la supprime
-- explicitement avant de la recreer.
drop function if exists public.verify_certificate(p_code text);
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

grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
