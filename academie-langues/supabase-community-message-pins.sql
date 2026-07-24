-- Epinglage des messages de la communaute.
-- A executer dans Supabase SQL Editor.
-- Colonnes utilisees par l'app: pinned, pinned_at, pinned_until, pinned_by.

alter table community_messages
  add column if not exists pinned boolean not null default false,
  add column if not exists pinned_at timestamptz default null,
  add column if not exists pinned_until timestamptz default null,
  add column if not exists pinned_by uuid references profiles(id) on delete set null;

create index if not exists community_messages_channel_pinned_created
  on community_messages(channel, pinned desc, pinned_until desc, pinned_at desc, created_at asc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'community_messages'
      and policyname = 'community_messages_admin_pin_update'
  ) then
    create policy "community_messages_admin_pin_update" on community_messages
      for update
      using (
        exists (
          select 1
          from profiles
          where id = auth.uid()
            and role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from profiles
          where id = auth.uid()
            and role = 'admin'
        )
      );
  end if;
end $$;

-- Force PostgREST a recharger le cache du schema.
-- Sans ca, Supabase peut continuer a repondre PGRST204 quelques secondes/minutes.
notify pgrst, 'reload schema';

-- Verification rapide: cette requete doit retourner les 4 colonnes.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'community_messages'
  and column_name in ('pinned', 'pinned_at', 'pinned_until', 'pinned_by')
order by column_name;
