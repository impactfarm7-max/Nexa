-- A executer dans Supabase SQL Editor
-- Demandes d'ouverture de centre B2B

create table if not exists center_applications (
  id uuid default gen_random_uuid() primary key,
  center_name text not null,
  center_type text,
  country text,
  city text not null,
  address text,
  manager_name text not null,
  manager_role text,
  email text not null,
  phone text not null,
  student_volume text,
  needs text[] default '{}',
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'approved', 'rejected')),
  approved_center_id uuid,
  center_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table center_applications enable row level security;

alter table center_applications alter column center_type drop not null;
alter table center_applications alter column country drop not null;
alter table center_applications add column if not exists approved_center_id uuid;
alter table center_applications add column if not exists center_code text;

create table if not exists centers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null,
  code text,
  signup_slug text,
  address text,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  application_id uuid references center_applications(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists center_users (
  id uuid default gen_random_uuid() primary key,
  center_id uuid not null references centers(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner', 'manager', 'staff')),
  permissions text[] not null default '{}',
  created_at timestamptz default now(),
  unique(center_id, user_id)
);

alter table profiles add column if not exists center_id uuid references centers(id) on delete set null;
alter table profiles add column if not exists created_by_center_id uuid references centers(id) on delete set null;
alter table centers add column if not exists code text;
alter table centers add column if not exists signup_slug text;
alter table center_users add column if not exists permissions text[] not null default '{}';

update centers
set code = upper(
  substring(regexp_replace(coalesce(name, 'IAG'), '[^a-zA-Z0-9]', '', 'g') from 1 for 4)
  || substring(md5(id::text) from 1 for 4)
)
where code is null;

update centers
set signup_slug =
  trim(both '-' from substring(lower(regexp_replace(coalesce(name, 'centre'), '[^a-zA-Z0-9]+', '-', 'g')) from 1 for 48))
  || '-' || substring(md5(id::text) from 1 for 6)
where signup_slug is null
   or trim(signup_slug) = '';

-- Elargit la contrainte CHECK sur profiles.role pour autoriser les roles centre.
-- (sinon /api/admin/centers/approve plante en creant le profil du manager).
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('student', 'admin', 'center_manager', 'trainer'));

alter table centers enable row level security;
alter table center_users enable row level security;

drop policy if exists "center_applications_admin_select" on center_applications;
create policy "center_applications_admin_select" on center_applications
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "center_applications_admin_update" on center_applications;
create policy "center_applications_admin_update" on center_applications
  for update using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

create index if not exists center_applications_status_created on center_applications(status, created_at desc);
create index if not exists center_applications_email on center_applications(email);
create index if not exists centers_status_created on centers(status, created_at desc);
create unique index if not exists centers_code_unique on centers(code) where code is not null;
create unique index if not exists centers_signup_slug_unique on centers(signup_slug) where signup_slug is not null;
create index if not exists center_users_user on center_users(user_id);
create index if not exists profiles_center_id on profiles(center_id);

alter table missions add column if not exists center_id uuid references centers(id) on delete cascade;
alter table missions add column if not exists target_user_id uuid references profiles(id) on delete set null;
alter table missions add column if not exists created_by_center_user_id uuid references profiles(id) on delete set null;
create index if not exists missions_center_id_created on missions(center_id, created_at desc);
create index if not exists missions_target_user_id on missions(target_user_id);

-- Quotas Pack Ivoire par defaut pour les etudiants rattaches a un centre.
-- Cette mise a jour complete les anciens comptes centre sans remettre leurs consommations a zero.
update profiles
set
  pack_name = case when pack_name is null or pack_name = 'aucun' then 'ivoire' else pack_name end,
  subscription_ends_at = coalesce(subscription_ends_at, now() + interval '90 days'),
  ee_total = case when ee_total is null or ee_total = 0 then 9999 else ee_total end,
  ee_used = coalesce(ee_used, 0),
  exam_total = case when exam_total is null or exam_total = 0 then 24 else exam_total end,
  exam_used = coalesce(exam_used, 0),
  exam_4m_total = case when exam_4m_total is null or exam_4m_total = 0 then 4 else exam_4m_total end,
  exam_4m_used = coalesce(exam_4m_used, 0),
  eo_total = case when eo_total is null or eo_total = 0 then 36 else eo_total end,
  eo_used = coalesce(eo_used, 0),
  coaching_total = case when coaching_total is null or coaching_total = 0 then 8 else coaching_total end,
  coaching_used = coalesce(coaching_used, 0)
where center_id is not null and "role" = 'student';

drop policy if exists "centers_admin_select" on centers;
create policy "centers_admin_select" on centers
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "centers_manager_select" on centers;
create policy "centers_manager_select" on centers
  for select using (
    exists (select 1 from center_users where center_users.center_id = centers.id and center_users.user_id = auth.uid())
  );

drop policy if exists "center_users_admin_select" on center_users;
create policy "center_users_admin_select" on center_users
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "center_users_self_select" on center_users;
create policy "center_users_self_select" on center_users
  for select using (auth.uid() = user_id);
