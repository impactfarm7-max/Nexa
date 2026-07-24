-- À exécuter une seule fois dans l'éditeur SQL Supabase.
-- La date de fin reste inchangée pendant la pause, puis l'API lui ajoute
-- exactement la durée écoulée au moment de la reprise.

alter table public.profiles
  add column if not exists subscription_paused_at timestamptz null;

comment on column public.profiles.subscription_paused_at is
  'Date de suspension du pack. NULL signifie que le pack n''est pas en pause.';

create index if not exists profiles_subscription_paused_at_idx
  on public.profiles (subscription_paused_at)
  where subscription_paused_at is not null;
