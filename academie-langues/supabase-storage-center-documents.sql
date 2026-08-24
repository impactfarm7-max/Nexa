-- Bucket "center-documents" (agrement, documents legaux du centre) + policies RLS.
-- Contrairement a "center-logos" (branding public), ces documents sont scopes au
-- centre proprietaire : un staff ne peut lire/ecrire que dans le dossier
-- <center_id>/... correspondant a SON propre centre (profiles.center_id).

insert into storage.buckets (id, name, public)
values ('center-documents', 'center-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "center-documents authenticated upload" on storage.objects;
create policy "center-documents authenticated upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'center-documents'
  and (storage.foldername(name))[1] in (
    select center_id::text from public.profiles where id = auth.uid() and center_id is not null
  )
);

drop policy if exists "center-documents authenticated update" on storage.objects;
create policy "center-documents authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'center-documents'
  and (storage.foldername(name))[1] in (
    select center_id::text from public.profiles where id = auth.uid() and center_id is not null
  )
);

drop policy if exists "center-documents authenticated delete" on storage.objects;
create policy "center-documents authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'center-documents'
  and (storage.foldername(name))[1] in (
    select center_id::text from public.profiles where id = auth.uid() and center_id is not null
  )
);

drop policy if exists "center-documents public read" on storage.objects;
drop policy if exists "center-documents authenticated read" on storage.objects;
create policy "center-documents authenticated read"
on storage.objects for select to authenticated
using (
  bucket_id = 'center-documents'
  and (storage.foldername(name))[1] = (public.current_profile_center_id())::text
);
