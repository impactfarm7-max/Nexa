-- Conversations privées admin ↔ étudiant
create table if not exists private_messages (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid not null references profiles(id) on delete cascade,
  to_user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now(),
  read_at timestamptz default null
);

-- Activer le realtime
alter publication supabase_realtime add table private_messages;

-- RLS
alter table private_messages enable row level security;

-- Chaque participant voit ses messages
create policy "pm_participants_select" on private_messages
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- L'admin voit toutes les conversations
create policy "pm_admin_select" on private_messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Un utilisateur ne peut envoyer qu'en son propre nom
create policy "pm_insert" on private_messages
  for insert with check (auth.uid() = from_user_id);

-- Index perf
create index if not exists pm_from_to on private_messages(from_user_id, to_user_id);
create index if not exists pm_to_created on private_messages(to_user_id, created_at desc);
