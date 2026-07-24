-- A executer dans Supabase SQL Editor
-- Libelle libre du role/fonction des membres staff d'un centre.

alter table center_users
  add column if not exists role_label text;

update center_users
set role_label = 'Formateur'
where role = 'staff'
  and (role_label is null or trim(role_label) = '');
