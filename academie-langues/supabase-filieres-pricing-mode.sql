-- Mode de tarification des formations courtes (mensuel | forfaitaire)
-- À exécuter dans le SQL Editor Supabase.
-- Ne concerne pas TCF ni les cursus pluriannuels (colonne nullable).

alter table public.filieres
  add column if not exists pricing_mode text;

comment on column public.filieres.pricing_mode is
  'formation_courte uniquement : mensuel (prix/mois × durée à l''inscription) | forfaitaire (prix total fixe). NULL pour cursus / TCF.';

do $$
begin
  alter table public.filieres
    add constraint filieres_pricing_mode_check
    check (pricing_mode is null or pricing_mode in ('mensuel', 'forfaitaire'));
exception when duplicate_object then null;
end $$;
