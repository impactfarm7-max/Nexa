-- A exécuter dans Supabase SQL Editor
-- Classes (groupes) dans lesquelles un formateur dispense — complémentaire à matiere_formateurs

create table if not exists public.formateur_groupes (
  formateur_id uuid not null references public.profiles(id) on delete cascade,
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (formateur_id, groupe_id)
);

create index if not exists idx_formateur_groupes_formateur
  on public.formateur_groupes (formateur_id);

create index if not exists idx_formateur_groupes_groupe
  on public.formateur_groupes (groupe_id);

alter table public.formateur_groupes enable row level security;

drop policy if exists formateur_groupes_select on public.formateur_groupes;
create policy formateur_groupes_select on public.formateur_groupes
  for select using (
    exists (
      select 1
      from public.profiles target
      join public.profiles viewer on viewer.id = auth.uid()
      where target.id = formateur_groupes.formateur_id
        and target.center_id = viewer.center_id
        and viewer.center_id is not null
    )
  );

drop policy if exists formateur_groupes_write on public.formateur_groupes;
create policy formateur_groupes_write on public.formateur_groupes
  for all using (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'center_manager', 'campus_manager')
        and viewer.center_id = (
          select p.center_id from public.profiles p where p.id = formateur_groupes.formateur_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'center_manager', 'campus_manager')
        and viewer.center_id = (
          select p.center_id from public.profiles p where p.id = formateur_groupes.formateur_id
        )
    )
  );
