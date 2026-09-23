-- Notes : statut provisoire / validée (délibération session)
-- À exécuter dans le SQL Editor Supabase.
-- ORDRE 1/3 — ensuite : supabase-grade-audit-events-2026-09-23.sql
-- puis : supabase-teaching-load-heures-2026-09-23.sql
-- Sans status + audit, l'API /api/centre/grades renvoie 503.

alter table public.grades
  add column if not exists status text;

comment on column public.grades.status is
  'provisional = saisie visible mais non officielle ; validated = délibérée (crédits / relevé).';

update public.grades
set status = 'validated'
where status is null;

alter table public.grades
  alter column status set default 'provisional';

alter table public.grades
  alter column status set not null;

do $$
begin
  alter table public.grades
    add constraint grades_status_check
    check (status in ('provisional', 'validated'));
exception when duplicate_object then null;
end $$;

create index if not exists grades_status_idx on public.grades (status);

-- Rattrapage LMD : nouvelle note = provisoire (à délibérer comme les autres).
create or replace function public.save_lmd_recovery(p_enrollment uuid, p_ue uuid, p_actor uuid, p_score numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_max numeric;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_enrollment::text || ':' || p_ue::text, 0));
  select m.max_score into v_max from filiere_matieres m join enrollments e on e.filiere_id = m.filiere_id
    where e.id = p_enrollment and e.status = 'active' and m.id = p_ue and m.credits is not null;
  if v_max is null or p_score is null or p_score < 0 or p_score > v_max then raise exception 'INVALID_RECOVERY'; end if;
  select id into v_id from grades where enrollment_id = p_enrollment and filiere_matiere_id = p_ue
    and title = 'Rattrapage' and comment = 'Rattrapage d''une UE en dette' order by created_at desc limit 1;
  if v_id is null then
    insert into grades(enrollment_id, filiere_matiere_id, score, max_score, title, period_id, formateur_id, comment, status)
      values(p_enrollment, p_ue, p_score, v_max, 'Rattrapage', null, p_actor, 'Rattrapage d''une UE en dette', 'provisional') returning id into v_id;
  else
    update grades set score = p_score, max_score = v_max, formateur_id = p_actor, status = 'provisional' where id = v_id;
  end if;
  return v_id;
end $$;
