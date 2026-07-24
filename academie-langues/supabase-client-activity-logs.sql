-- A executer dans Supabase SQL Editor
-- Journal des actions clients conserve pendant 7 jours.

create table if not exists client_activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists client_activity_logs_created_at
  on client_activity_logs(created_at desc);

create index if not exists client_activity_logs_user_created
  on client_activity_logs(user_id, created_at desc);

alter table client_activity_logs enable row level security;

drop policy if exists "client_activity_logs_admin_select" on client_activity_logs;
create policy "client_activity_logs_admin_select" on client_activity_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

drop policy if exists "client_activity_logs_self_insert" on client_activity_logs;
create policy "client_activity_logs_self_insert" on client_activity_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "client_activity_logs_admin_delete" on client_activity_logs;
create policy "client_activity_logs_admin_delete" on client_activity_logs
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and "role" = 'admin')
  );

create or replace function prune_old_client_activity_logs()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from client_activity_logs
  where created_at < now() - interval '7 days';
  return new;
end;
$$;

drop trigger if exists trg_prune_old_client_activity_logs on client_activity_logs;
create trigger trg_prune_old_client_activity_logs
after insert on client_activity_logs
execute function prune_old_client_activity_logs();
