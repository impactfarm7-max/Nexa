-- Permissions menus superadmin Nexa
-- A executer dans Supabase SQL Editor

create table if not exists superadmin_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_owner boolean not null default false,
  menus text[] not null default '{}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index if not exists superadmin_permissions_owner_idx
  on superadmin_permissions (is_owner)
  where is_owner = true and disabled_at is null;

alter table superadmin_permissions enable row level security;

drop policy if exists "no public access" on superadmin_permissions;
create policy "no public access" on superadmin_permissions
  for all using (false) with check (false);

-- Bootstrap : tous les profils deja superadmin deviennent owners (menus complets).
insert into superadmin_permissions (user_id, is_owner, menus)
select p.id, true, '{}'::text[]
from profiles p
where p.role = 'superadmin'
on conflict (user_id) do nothing;

comment on table superadmin_permissions is
  'Droits menu superadmin. is_owner=true ignore menus (acces total). menus = cles NAV (dashboard, centres, …).';
