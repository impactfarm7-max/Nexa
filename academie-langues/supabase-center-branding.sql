-- Colonnes manquantes sur center_branding (paramètres Entreprise + Documents)
-- À exécuter dans Supabase SQL Editor

alter table public.center_branding
  add column if not exists short_name text,
  add column if not exists slogan text,
  add column if not exists favicon_url text,
  add column if not exists company_size text,
  add column if not exists document_color text,
  add column if not exists agrement_number text,
  add column if not exists agrement_file_url text,
  add column if not exists ministry_matricule text,
  add column if not exists tax_regime text,
  add column if not exists siege_address text,
  add column if not exists siege_phone text,
  add column if not exists institutional_email text,
  add column if not exists default_currency text,
  add column if not exists timezone text,
  add column if not exists date_format text,
  add column if not exists stamp_url text,
  add column if not exists default_document_type text not null default 'document';

comment on column public.center_branding.agrement_number is
  'Numéro d''agrément / autorisation d''ouverture de l''établissement.';

comment on column public.center_branding.default_document_type is
  'Clé UI pour les exports PDF (document = type par défaut, stocké en base sous bulletin dans document_titles).';

-- Ne pas renommer document_titles.bulletin → document : la contrainte CHECK
-- document_titles_document_type_check n''accepte que bulletin, facture, attestation.
-- L''app mappe « document » (UI) vers « bulletin » (base) via legacyDocKey().

update public.center_branding
set default_document_type = 'document'
where default_document_type is null;
