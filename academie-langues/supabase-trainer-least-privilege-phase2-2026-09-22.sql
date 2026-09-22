-- Phase 2 — moindre privilège formateur univ (défense en profondeur)
-- À exécuter APRÈS supabase-core-rls-hardening.sql (is_center_staff).
-- Managers : uniquement dans LEUR centre. Étudiants : lecture de leurs notes.

-- ── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.trainer_has_ue(p_filiere_matiere_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matiere_formateurs mf
    where mf.formateur_id = auth.uid()
      and mf.filiere_matiere_id = p_filiere_matiere_id
  );
$$;

create or replace function public.trainer_has_groupe(p_groupe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.formateur_groupes fg
      where fg.formateur_id = auth.uid() and fg.groupe_id = p_groupe_id
    )
    or (
      not exists (
        select 1 from public.formateur_groupes fg2
        where fg2.formateur_id = auth.uid()
      )
      and exists (
        select 1
        from public.matiere_formateurs mf
        join public.filiere_matieres fm on fm.id = mf.filiere_matiere_id
        join public.groupes g on g.id = p_groupe_id
        where mf.formateur_id = auth.uid()
          and (
            (fm.niveau_id is not null and g.niveau_id = fm.niveau_id)
            or (fm.niveau_id is null and g.filiere_id = fm.filiere_id)
          )
      )
    );
$$;

-- ── grades ─────────────────────────────────────────────────────────────────

alter table public.grades enable row level security;

drop policy if exists grades_select_center on public.grades;
drop policy if exists grades_write_center on public.grades;
drop policy if exists grades_select_student on public.grades;

-- Étudiant : ses notes (via enrollment)
create policy grades_select_student on public.grades
  for select to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.id = grades.enrollment_id
        and e.student_id = auth.uid()
    )
  );

-- Staff centre : managers/staff du même centre ; formateur = UE + promotion
create policy grades_select_center on public.grades
  for select to authenticated
  using (
    exists (
      select 1
      from public.enrollments e
      join public.filieres f on f.id = e.filiere_id
      join public.profiles p on p.id = auth.uid()
      where e.id = grades.enrollment_id
        and public.is_center_staff(f.center_id)
        and (
          p.role in ('center_manager', 'campus_manager', 'manager', 'staff')
          or (
            p.role = 'trainer'
            and public.trainer_has_ue(grades.filiere_matiere_id)
            and e.groupe_id is not null
            and public.trainer_has_groupe(e.groupe_id)
          )
        )
    )
  );

create policy grades_write_center on public.grades
  for all to authenticated
  using (
    exists (
      select 1
      from public.enrollments e
      join public.filieres f on f.id = e.filiere_id
      join public.profiles p on p.id = auth.uid()
      where e.id = grades.enrollment_id
        and public.is_center_staff(f.center_id)
        and (
          p.role in ('center_manager', 'campus_manager', 'manager', 'staff')
          or (
            p.role = 'trainer'
            and public.trainer_has_ue(grades.filiere_matiere_id)
            and e.groupe_id is not null
            and public.trainer_has_groupe(e.groupe_id)
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.enrollments e
      join public.filieres f on f.id = e.filiere_id
      join public.profiles p on p.id = auth.uid()
      where e.id = grades.enrollment_id
        and public.is_center_staff(f.center_id)
        and (
          p.role in ('center_manager', 'campus_manager', 'manager', 'staff')
          or (
            p.role = 'trainer'
            and public.trainer_has_ue(grades.filiere_matiere_id)
            and e.groupe_id is not null
            and public.trainer_has_groupe(e.groupe_id)
          )
        )
    )
  );

-- Note : l'écriture notes staff passe surtoutement par /api/centre/grades (service role).
-- Ces policies bloquent les accès directs client hors périmètre.
