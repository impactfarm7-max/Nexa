-- Bucket fichiers partagés dans la Communauté (centre)
-- À exécuter dans Supabase SQL Editor

insert into storage.buckets (id, name, public)
values ('community-files', 'community-files', true)
on conflict (id) do update set public = true;

drop policy if exists community_files_insert on storage.objects;
create policy community_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-files'
    and (
      (storage.foldername(name))[1] in (
        select center_id::text from public.profiles
        where id = auth.uid() and center_id is not null
      )
      or (storage.foldername(name))[1] in (
        select center_id::text from public.center_users
        where user_id = auth.uid()
      )
    )
  );

drop policy if exists community_files_select on storage.objects;
create policy community_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'community-files');

drop policy if exists community_files_public_select on storage.objects;
create policy community_files_public_select on storage.objects
  for select to anon
  using (bucket_id = 'community-files');
