-- Bucket "center-documents" (agrement, documents legaux du centre) + policies RLS.
-- Contrairement a "center-logos" (branding public), ces documents sont scopes au
-- centre proprietaire : un staff ne peut lire/ecrire que dans le dossier
-- <center_id>/... correspondant a SON propre centre (profiles.center_id).

insert into storage.buckets (id, name, public)
values ('center-documents', 'center-documents', true)
on conflict (id) do nothing;

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

-- Lecture publique conservee (bucket public) car le code actuel affiche le
-- document via une simple URL <a href> stockee en base (getPublicUrl), pas
-- via une URL signee. Si ces documents ne doivent pas etre accessibles a
-- quiconque a le lien, dis-le : il faudra passer bucket public=false +
-- createSignedUrl() cote client (changement de code, pas seulement SQL).
drop policy if exists "center-documents public read" on storage.objects;
create policy "center-documents public read"
on storage.objects for select
to public
using (bucket_id = 'center-documents');
