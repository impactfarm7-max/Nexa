-- Autoriser le type de document "convocation" (titre / toggles / signataires).
-- Logo + cachet restent globaux (center_branding).

alter table public.document_titles
  drop constraint if exists document_titles_document_type_check;

alter table public.document_titles
  add constraint document_titles_document_type_check
  check (document_type in ('bulletin', 'facture', 'attestation', 'convocation'));
