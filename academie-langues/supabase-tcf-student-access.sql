-- A executer dans Supabase SQL Editor
-- Champs profil et inscription TCF (duree flexible, prix negocie)

alter table profiles add column if not exists country text;
alter table profiles add column if not exists country_code text;
alter table profiles add column if not exists region text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists birth_date date;

alter table enrollments add column if not exists duration_value integer;
alter table enrollments add column if not exists duration_unit text;
alter table enrollments add column if not exists catalog_tuition_fee numeric;
alter table enrollments add column if not exists price_note text;

alter table enrollments drop constraint if exists enrollments_duration_unit_check;
alter table enrollments add constraint enrollments_duration_unit_check
  check (duration_unit is null or duration_unit in ('day', 'week', 'month'));
