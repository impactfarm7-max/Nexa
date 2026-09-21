-- Dossiers LMD : accès exclusivement par API serveur autorisée, pas d'accès client direct.
begin;
create table if not exists public.lmd_academic_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  filiere_id uuid not null references public.filieres(id),
  center_id uuid not null references public.centers(id),
  revision integer not null default 0,
  dossier jsonb not null default '{}'::jsonb,
  diploma jsonb,
  updated_at timestamptz not null default now(),
  unique (student_id, filiere_id)
);
create table if not exists public.lmd_academic_events (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.lmd_academic_records(id),
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('save', 'issue')),
  revision integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.lmd_academic_records enable row level security;
alter table public.lmd_academic_events enable row level security;
revoke all on public.lmd_academic_records, public.lmd_academic_events from anon, authenticated;
grant all on public.lmd_academic_records, public.lmd_academic_events to service_role;

create or replace function public.save_lmd_academic_record(
  p_student uuid, p_filiere uuid, p_center uuid, p_actor uuid,
  p_revision integer, p_dossier jsonb, p_diploma jsonb default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.lmd_academic_records;
begin
  if not exists (select 1 from filieres where id = p_filiere and center_id = p_center) then
    raise exception 'PROGRAM_SCOPE';
  end if;
  insert into lmd_academic_records(student_id, filiere_id, center_id)
    values(p_student, p_filiere, p_center) on conflict (student_id, filiere_id) do nothing;
  select * into r from lmd_academic_records where student_id = p_student and filiere_id = p_filiere for update;
  if r.center_id <> p_center then raise exception 'PROGRAM_SCOPE'; end if;
  if r.revision <> p_revision then raise exception 'REVISION_CONFLICT'; end if;
  if r.diploma is not null then raise exception 'DIPLOMA_ALREADY_ISSUED'; end if;
  update lmd_academic_records set dossier = p_dossier, diploma = p_diploma,
    revision = revision + 1, updated_at = now() where id = r.id returning * into r;
  insert into lmd_academic_events(record_id, actor_id, action, revision, snapshot)
    values(r.id, p_actor, case when p_diploma is null then 'save' else 'issue' end,
      r.revision, jsonb_build_object('dossier', r.dossier, 'diploma', r.diploma));
  return to_jsonb(r);
end $$;
revoke all on function public.save_lmd_academic_record(uuid, uuid, uuid, uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_lmd_academic_record(uuid, uuid, uuid, uuid, integer, jsonb, jsonb) to service_role;

-- One recovery entry per UE and enrollment, even if two requests arrive together.
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
    insert into grades(enrollment_id, filiere_matiere_id, score, max_score, title, period_id, formateur_id, comment)
      values(p_enrollment, p_ue, p_score, v_max, 'Rattrapage', null, p_actor, 'Rattrapage d''une UE en dette') returning id into v_id;
  else
    update grades set score = p_score, max_score = v_max, formateur_id = p_actor where id = v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.save_lmd_recovery(uuid, uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.save_lmd_recovery(uuid, uuid, uuid, numeric) to service_role;
commit;
