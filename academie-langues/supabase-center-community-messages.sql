-- A executer dans Supabase SQL Editor
-- Isolation des messages prives et de la communaute par centre.

alter table private_messages
  add column if not exists center_id uuid references centers(id) on delete cascade;

alter table community_messages
  add column if not exists center_id uuid references centers(id) on delete cascade;

alter table private_messages enable row level security;
alter table community_messages enable row level security;

create index if not exists private_messages_center_created
  on private_messages(center_id, created_at desc);

create index if not exists community_messages_center_channel_created
  on community_messages(center_id, channel, created_at desc);

alter table private_messages replica identity full;
alter table community_messages replica identity full;

-- Les policies ci-dessous gardent l'acces IAG global sur center_id null,
-- et ajoutent l'acces centre uniquement aux membres du centre concerne.

-- Drop TOUTES les anciennes policies sur private_messages (pour eviter qu'une
-- vieille policy "Anyone can read" annule notre scoping).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'private_messages'
  loop
    execute format('drop policy if exists %I on private_messages', pol.policyname);
  end loop;
end$$;

create policy "pm_participants_select" on private_messages
  for select using (
    auth.uid() = from_user_id
    or auth.uid() = to_user_id
  );

create policy "pm_admin_select" on private_messages
  for select using (
    center_id is null
    and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

create policy "pm_center_manager_select" on private_messages
  for select using (
    center_id is not null
    and exists (
      select 1 from center_users
      where center_users.center_id = private_messages.center_id
        and center_users.user_id = auth.uid()
    )
  );

create policy "pm_insert" on private_messages
  for insert with check (
    auth.uid() = from_user_id
    and (
      center_id is null
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid()
          and profiles.center_id = private_messages.center_id
      )
      or exists (
        select 1 from center_users
        where center_users.center_id = private_messages.center_id
          and center_users.user_id = auth.uid()
      )
    )
  );

create policy "pm_update_read" on private_messages
  for update using (
    auth.uid() = to_user_id
    or (
      center_id is null
      and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
    )
    or exists (
      select 1 from center_users
      where center_users.center_id = private_messages.center_id
        and center_users.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = to_user_id
    or (
      center_id is null
      and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
    )
    or exists (
      select 1 from center_users
      where center_users.center_id = private_messages.center_id
        and center_users.user_id = auth.uid()
    )
  );

-- Drop TOUTES les anciennes policies sur community_messages (SELECT, INSERT,
-- UPDATE, DELETE) avant de recreer les notres. RLS est permissive : une vieille
-- policy autorisant "true" annulerait notre scoping.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'community_messages'
  loop
    execute format('drop policy if exists %I on community_messages', pol.policyname);
  end loop;
end$$;

create policy "community_select_scope" on community_messages
  for select using (
    -- Messages globaux IAG : visibles par admins + etudiants IAG (sans centre)
    (
      center_id is null
      and (
        exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
        or exists (select 1 from profiles where id = auth.uid() and center_id is null)
      )
    )
    -- Messages de centre : visibles uniquement aux membres du centre
    or (
      center_id is not null
      and (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.center_id = community_messages.center_id
        )
        or exists (
          select 1 from center_users
          where center_users.center_id = community_messages.center_id
            and center_users.user_id = auth.uid()
        )
      )
    )
  );

create policy "community_insert_scope" on community_messages
  for insert with check (
    auth.uid() = user_id
    and (
      center_id is null
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid()
          and profiles.center_id = community_messages.center_id
      )
      or exists (
        select 1 from center_users
        where center_users.center_id = community_messages.center_id
          and center_users.user_id = auth.uid()
      )
    )
  );

create policy "community_update_scope" on community_messages
  for update using (
    auth.uid() = user_id
    or (
      center_id is null
      and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
    )
    or exists (
      select 1 from center_users
      where center_users.center_id = community_messages.center_id
        and center_users.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or (
      center_id is null
      and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
    )
    or exists (
      select 1 from center_users
      where center_users.center_id = community_messages.center_id
        and center_users.user_id = auth.uid()
    )
  );

create policy "community_delete_scope" on community_messages
  for delete using (
    auth.uid() = user_id
    or (
      center_id is null
      and exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
    )
    or exists (
      select 1 from center_users
      where center_users.center_id = community_messages.center_id
        and center_users.user_id = auth.uid()
    )
  );

-- Force PostgREST to reload its schema cache (sinon la nouvelle colonne center_id
-- peut etre ignoree silencieusement sur les inserts).
notify pgrst, 'reload schema';
