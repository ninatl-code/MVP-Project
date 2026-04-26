-- Fix RLS policies for profils_prestataire
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE profils_prestataire ENABLE ROW LEVEL SECURITY;

-- Supprimer les éventuelles policies conflictuelles existantes
DROP POLICY IF EXISTS "Users can insert own prestataire profile" ON profils_prestataire;
DROP POLICY IF EXISTS "Users can update own prestataire profile" ON profils_prestataire;
DROP POLICY IF EXISTS "Users can upsert own prestataire profile" ON profils_prestataire;

-- Permettre à chaque prestataire de lire son propre profil
CREATE POLICY "Users can select own prestataire profile"
  ON profils_prestataire FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Permettre aux clients / visiteurs authentifiés de lire les profils publics (pour la recherche)
CREATE POLICY "Authenticated users can view prestataire profiles"
  ON profils_prestataire FOR SELECT
  TO authenticated
  USING (true);

-- Permettre à chaque prestataire d'insérer son propre profil
CREATE POLICY "Users can insert own prestataire profile"
  ON profils_prestataire FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Permettre à chaque prestataire de modifier son propre profil
CREATE POLICY "Users can update own prestataire profile"
  ON profils_prestataire FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
