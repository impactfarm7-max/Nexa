-- Statut académique universitaire (distinct de enrollments.status et center_status)
-- À exécuter dans le SQL Editor Supabase.

alter table public.enrollments
  add column if not exists academic_status text;

comment on column public.enrollments.academic_status is
  'Univ cursus: inscrit | redoublant | suspendu | diplome | transfere. Null hors univ.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_academic_status_check'
  ) then
    alter table public.enrollments
      add constraint enrollments_academic_status_check
      check (
        academic_status is null
        or academic_status in ('inscrit', 'redoublant', 'suspendu', 'diplome', 'transfere')
      );
  end if;
end $$;

-- Backfill inscriptions actives / draft d'universités → inscrit
update public.enrollments e
set academic_status = 'inscrit'
from public.filieres f
join public.centers c on c.id = f.center_id
where e.filiere_id = f.id
  and e.academic_status is null
  and c.center_type = 'universite'
  and f.type = 'cursus'
  and e.status in ('active', 'draft');

create index if not exists enrollments_academic_status_idx
  on public.enrollments (academic_status)
  where academic_status is not null;
