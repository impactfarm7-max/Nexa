-- Durcissement RLS des objets signales UNRESTRICTED dans Supabase.
-- A executer dans SQL Editor. Les API serveur utilisant service_role continuent de fonctionner.

begin;

-- Helpers SECURITY DEFINER minimaux pour eviter la recursion RLS de profiles.
create or replace function public.current_profile_center_id()
returns uuid language sql stable security definer set search_path = public, pg_temp
as $$ select center_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'superadmin') $$;

create or replace function public.is_center_staff(p_center_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.center_users cu
    where cu.user_id = auth.uid() and cu.center_id = p_center_id
      and cu.role in ('owner','center_manager','campus_manager','manager','staff','trainer')
  ) or exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.center_id = p_center_id
      and p.role in ('center_manager','campus_manager','manager','staff','trainer')
  )
$$;

revoke all on function public.current_profile_center_id() from public;
revoke all on function public.is_superadmin() from public;
revoke all on function public.is_center_staff(uuid) from public;
grant execute on function public.current_profile_center_id() to authenticated, service_role;
grant execute on function public.is_superadmin() to authenticated, service_role;
grant execute on function public.is_center_staff(uuid) to authenticated, service_role;

-- PROFILES
alter table public.profiles enable row level security;
drop policy if exists profiles_select_scoped on public.profiles;
create policy profiles_select_scoped on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_superadmin()
  or (center_id is not null and (center_id = public.current_profile_center_id() or public.is_center_staff(center_id)))
);
drop policy if exists profiles_update_scoped on public.profiles;
create policy profiles_update_scoped on public.profiles for update to authenticated
using (id = auth.uid() or public.is_superadmin() or (center_id is not null and public.is_center_staff(center_id)))
with check (id = auth.uid() or public.is_superadmin() or (center_id is not null and public.is_center_staff(center_id)));
drop policy if exists profiles_delete_center_staff on public.profiles;
create policy profiles_delete_center_staff on public.profiles for delete to authenticated
using (public.is_superadmin() or (center_id is not null and public.is_center_staff(center_id)));

-- Empêche un appel client autorisé sur sa ligne de devenir responsable/superadmin
-- ou de changer de centre. Les API service_role restent libres de le faire.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    if new.role is distinct from old.role
       or new.center_id is distinct from old.center_id
       or new.created_by_center_id is distinct from old.created_by_center_id then
      raise exception 'protected profile fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile_security_fields on public.profiles;
create trigger trg_protect_profile_security_fields before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- FILIERES
alter table public.filieres enable row level security;
drop policy if exists filieres_select_scoped on public.filieres;
create policy filieres_select_scoped on public.filieres for select to authenticated
using (public.is_superadmin() or center_id = public.current_profile_center_id() or public.is_center_staff(center_id));
drop policy if exists filieres_insert_staff on public.filieres;
create policy filieres_insert_staff on public.filieres for insert to authenticated
with check (public.is_superadmin() or public.is_center_staff(center_id));
drop policy if exists filieres_update_staff on public.filieres;
create policy filieres_update_staff on public.filieres for update to authenticated
using (public.is_superadmin() or public.is_center_staff(center_id))
with check (public.is_superadmin() or public.is_center_staff(center_id));
drop policy if exists filieres_delete_staff on public.filieres;
create policy filieres_delete_staff on public.filieres for delete to authenticated
using (public.is_superadmin() or public.is_center_staff(center_id));

-- INSCRIPTIONS
alter table public.enrollments enable row level security;
drop policy if exists enrollments_select_scoped on public.enrollments;
create policy enrollments_select_scoped on public.enrollments for select to authenticated
using (
  student_id = auth.uid() or public.is_superadmin()
  or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id))
);
drop policy if exists enrollments_insert_staff on public.enrollments;
create policy enrollments_insert_staff on public.enrollments for insert to authenticated
with check (
  public.is_superadmin()
  or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id))
);
drop policy if exists enrollments_update_staff on public.enrollments;
create policy enrollments_update_staff on public.enrollments for update to authenticated
using (public.is_superadmin()
  or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id)))
with check (public.is_superadmin()
  or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id)));
drop policy if exists enrollments_delete_staff on public.enrollments;
create policy enrollments_delete_staff on public.enrollments for delete to authenticated
using (public.is_superadmin()
  or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id)));

-- MATIERES DE FILIERE
alter table public.filiere_matieres enable row level security;
drop policy if exists filiere_matieres_select_scoped on public.filiere_matieres;
create policy filiere_matieres_select_scoped on public.filiere_matieres for select to authenticated
using (public.is_superadmin() or exists(
  select 1 from public.filieres f where f.id = filiere_id
    and (f.center_id = public.current_profile_center_id() or public.is_center_staff(f.center_id))
));
drop policy if exists filiere_matieres_write_staff on public.filiere_matieres;
create policy filiere_matieres_write_staff on public.filiere_matieres for all to authenticated
using (public.is_superadmin() or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id)))
with check (public.is_superadmin() or exists(select 1 from public.filieres f where f.id = filiere_id and public.is_center_staff(f.center_id)));

-- AFFECTATIONS FORMATEURS
alter table public.matiere_formateurs enable row level security;
drop policy if exists matiere_formateurs_select_scoped on public.matiere_formateurs;
create policy matiere_formateurs_select_scoped on public.matiere_formateurs for select to authenticated
using (public.is_superadmin() or formateur_id = auth.uid() or exists(
  select 1 from public.filiere_matieres fm join public.filieres f on f.id = fm.filiere_id
  where fm.id = filiere_matiere_id
    and (f.center_id = public.current_profile_center_id() or public.is_center_staff(f.center_id))
));
drop policy if exists matiere_formateurs_write_staff on public.matiere_formateurs;
create policy matiere_formateurs_write_staff on public.matiere_formateurs for all to authenticated
using (public.is_superadmin() or exists(
  select 1 from public.filiere_matieres fm join public.filieres f on f.id = fm.filiere_id
  where fm.id = filiere_matiere_id and public.is_center_staff(f.center_id)
))
with check (public.is_superadmin() or exists(
  select 1 from public.filiere_matieres fm join public.filieres f on f.id = fm.filiere_id
  where fm.id = filiere_matiere_id and public.is_center_staff(f.center_id)
));

-- Tables sensibles sans usage client démontré : API serveur uniquement.
alter table public.exam_tickets enable row level security;
alter table public.student_records enable row level security;
revoke all on public.exam_tickets from anon, authenticated;
revoke all on public.student_records from anon, authenticated;

-- Les vues doivent respecter les politiques des tables sous-jacentes (PostgreSQL 15+).
do $$
declare v_name text;
begin
  foreach v_name in array array[
    'bulletin_matiere','center_tcf_students','enrollment_campus','enrollment_finance_summary',
    'report_coupons_summary','report_effectifs_by_filiere','report_finance_by_center',
    'report_finance_by_filiere','report_reductions_by_center','student_finance_summary'
  ] loop
    if exists(select 1 from pg_views where schemaname = 'public' and viewname = v_name) then
      execute format('alter view public.%I set (security_invoker = true)', v_name);
      execute format('revoke all on public.%I from anon', v_name);
      execute format('grant select on public.%I to authenticated', v_name);
    end if;
  end loop;
end $$;

commit;
notify pgrst, 'reload schema';
