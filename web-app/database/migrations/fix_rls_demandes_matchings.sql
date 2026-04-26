-- Fix RLS policies for demandes_client and matchings
-- À exécuter dans Supabase Dashboard > SQL Editor

-- ══════════════════════════════════════
-- 1. demandes_client
-- ══════════════════════════════════════

ALTER TABLE demandes_client ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies existantes
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE tablename = 'demandes_client' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON demandes_client', pol.policyname);
  END LOOP;
END $$;

-- Les clients peuvent créer leurs demandes
CREATE POLICY "clients_insert_own" ON demandes_client
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Les clients peuvent modifier leurs propres demandes
CREATE POLICY "clients_update_own" ON demandes_client
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Les clients peuvent supprimer leurs demandes
CREATE POLICY "clients_delete_own" ON demandes_client
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());

-- TOUT utilisateur authentifié peut lire les demandes ouvertes (marketplace prestataires)
CREATE POLICY "authenticated_read_open" ON demandes_client
  FOR SELECT TO authenticated
  USING (true);

-- ══════════════════════════════════════
-- 2. matchings
-- ══════════════════════════════════════

ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE tablename = 'matchings' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON matchings', pol.policyname);
  END LOOP;
END $$;

-- Les prestataires peuvent lire leurs matchings
CREATE POLICY "prestataires_read_own" ON matchings
  FOR SELECT TO authenticated
  USING (prestataire_id = auth.uid());

-- Le système (service role) peut insérer des matchings — pas besoin de policy pour service_role
-- Les prestataires peuvent répondre à leurs matchings (update status)
CREATE POLICY "prestataires_update_own" ON matchings
  FOR UPDATE TO authenticated
  USING (prestataire_id = auth.uid())
  WITH CHECK (prestataire_id = auth.uid());

-- Admin peut tout voir
CREATE POLICY "admin_all" ON matchings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
