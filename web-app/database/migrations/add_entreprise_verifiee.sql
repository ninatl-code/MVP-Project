-- Ajouter la colonne entreprise_verifiee dans profils_prestataire
-- À exécuter dans le dashboard Supabase > SQL Editor

ALTER TABLE profils_prestataire
  ADD COLUMN IF NOT EXISTS entreprise_verifiee boolean DEFAULT false NOT NULL;
