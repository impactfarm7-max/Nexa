-- A executer dans Supabase SQL Editor
-- Conversations support client admin <-> etudiant

create table if not exists support_messages (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid not null references profiles(id) on delete cascade,
  to_user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  image_url text,
  created_at timestamptz default now(),
  read_at timestamptz default null
);

alter table support_messages add column if not exists image_url text;

alter table support_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table support_messages;
exception
  when duplicate_object then null;
end $$;

alter table support_messages enable row level security;

drop policy if exists "support_participants_select" on support_messages;
create policy "support_participants_select" on support_messages
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "support_admin_select" on support_messages;
create policy "support_admin_select" on support_messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "support_insert" on support_messages;
create policy "support_insert" on support_messages
  for insert with check (auth.uid() = from_user_id);

drop policy if exists "support_update_read" on support_messages;
create policy "support_update_read" on support_messages
  for update using (
    auth.uid() = to_user_id
    or exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  )
  with check (
    auth.uid() = to_user_id
    or exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

create index if not exists support_from_to on support_messages(from_user_id, to_user_id);
create index if not exists support_to_created on support_messages(to_user_id, created_at desc);

-- Support invite pour les personnes bloquees avant connexion
create table if not exists guest_support_messages (
  id uuid default gen_random_uuid() primary key,
  guest_token text not null,
  guest_name text,
  guest_email text,
  sender text not null check (sender in ('guest', 'admin')),
  sender_user_id uuid references profiles(id) on delete set null,
  message text not null,
  image_url text,
  created_at timestamptz default now(),
  read_at timestamptz default null
);

alter table guest_support_messages add column if not exists image_url text;
alter table guest_support_messages add column if not exists sender_user_id uuid references profiles(id) on delete set null;

alter table guest_support_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table guest_support_messages;
exception
  when duplicate_object then null;
end $$;

alter table guest_support_messages enable row level security;

drop policy if exists "guest_support_admin_select" on guest_support_messages;
create policy "guest_support_admin_select" on guest_support_messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "guest_support_admin_insert" on guest_support_messages;
create policy "guest_support_admin_insert" on guest_support_messages
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "guest_support_admin_update" on guest_support_messages;
create policy "guest_support_admin_update" on guest_support_messages
  for update using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

create index if not exists guest_support_token_created on guest_support_messages(guest_token, created_at desc);
create index if not exists guest_support_sender_read on guest_support_messages(sender, read_at);
create index if not exists guest_support_sender_user on guest_support_messages(sender_user_id);

-- Bucket public pour les captures envoyees au support
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do update set public = true;
