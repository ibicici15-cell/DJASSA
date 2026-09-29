-- ============================================================================
-- MonDjassa — 0002 : rattrape deux écarts avec le schéma le plus à jour
-- À exécuter en plus de 0001_init.sql (déjà en place), pas à la place.
-- ============================================================================

-- La colonne n'existait pas encore quand 0001 a été exécuté la première fois
-- (ajoutée depuis dans le fichier source) — "if not exists" pour que ce soit
-- sans risque de la relancer plusieurs fois par erreur.
alter table public.profiles add column if not exists "warningsCount" integer not null default 0;

-- Catégorie "Produits islamiques" retirée de la plateforme.
alter table public.listings drop constraint if exists listings_categorie_check;
alter table public.listings add constraint listings_categorie_check check (categorie in (
  'vehicules','electronique','maison','mode','enfants','livres','emploi',
  'services','agriculture','commerce','sport','artisanat','beaute','divers'
));
