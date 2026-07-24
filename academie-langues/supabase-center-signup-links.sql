-- A executer dans Supabase SQL Editor
-- Liens publics d'inscription centre sans exposer le code interne.

alter table centers
  add column if not exists signup_slug text;

update centers
set signup_slug =
  trim(both '-' from substring(lower(regexp_replace(coalesce(name, 'centre'), '[^a-zA-Z0-9]+', '-', 'g')) from 1 for 48))
  || '-' || substring(md5(id::text) from 1 for 6)
where signup_slug is null
   or trim(signup_slug) = '';

create unique index if not exists centers_signup_slug_unique
  on centers(signup_slug)
  where signup_slug is not null;
