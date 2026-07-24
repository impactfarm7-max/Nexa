-- A executer dans Supabase SQL Editor
-- Matieres TCF assignees aux formateurs (separees des modules staff_permissions)

alter table profiles add column if not exists country text;
alter table profiles add column if not exists country_code text;
alter table profiles add column if not exists region text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists prime numeric;
alter table profiles add column if not exists id_type text;
alter table profiles add column if not exists id_number text;

create table if not exists staff_tcf_subjects (
  profile_id uuid not null references profiles(id) on delete cascade,
  subject_key text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, subject_key),
  constraint staff_tcf_subjects_subject_key_check
    check (subject_key in (
      'tcf_comprehension_ecrite',
      'tcf_comprehension_orale',
      'tcf_expression_ecrite',
      'tcf_expression_orale'
    ))
);

create index if not exists idx_staff_tcf_subjects_profile
  on staff_tcf_subjects (profile_id);

alter table staff_tcf_subjects enable row level security;

-- Lecture : membres du meme centre
drop policy if exists staff_tcf_subjects_select on staff_tcf_subjects;
create policy staff_tcf_subjects_select on staff_tcf_subjects
  for select using (
    exists (
      select 1
      from profiles target
      join profiles viewer on viewer.id = auth.uid()
      where target.id = staff_tcf_subjects.profile_id
        and target.center_id = viewer.center_id
        and viewer.center_id is not null
    )
  );

-- Ecriture : managers du centre (center_manager, campus_manager, admin)
drop policy if exists staff_tcf_subjects_write on staff_tcf_subjects;
create policy staff_tcf_subjects_write on staff_tcf_subjects
  for all using (
    exists (
      select 1
      from profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'center_manager', 'campus_manager')
        and viewer.center_id = (
          select p.center_id from profiles p where p.id = staff_tcf_subjects.profile_id
        )
    )
  )
  with check (
    exists (
      select 1
      from profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'center_manager', 'campus_manager')
        and viewer.center_id = (
          select p.center_id from profiles p where p.id = staff_tcf_subjects.profile_id
        )
    )
  );
