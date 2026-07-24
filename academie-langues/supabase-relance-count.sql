-- A executer dans Supabase SQL Editor
-- Compteur de relances WhatsApp effectuees depuis le dashboard admin.

alter table profiles
  add column if not exists relance_count integer not null default 0;

update profiles
set relance_count = 0
where relance_count is null;
