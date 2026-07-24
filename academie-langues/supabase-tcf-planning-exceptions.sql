-- Exception « séance réalisée » pour le Kanban collectif TCF
-- À exécuter si l'insert type 'completed' échoue (contrainte CHECK sur schedule_exceptions.type)

-- Étendre la contrainte si elle existe (adapter selon votre schéma Supabase)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname like '%schedule_exceptions%type%'
      and contype = 'c'
  ) then
    alter table public.schedule_exceptions drop constraint if exists schedule_exceptions_type_check;
  end if;
exception when others then null;
end $$;

alter table public.schedule_exceptions
  drop constraint if exists schedule_exceptions_type_check;

alter table public.schedule_exceptions
  add constraint schedule_exceptions_type_check
  check (type in ('cancelled', 'rescheduled', 'substituted', 'completed'));

-- Index unique slot + date (une exception par occurrence)
create unique index if not exists idx_schedule_exceptions_slot_date
  on public.schedule_exceptions (slot_id, exception_date);
