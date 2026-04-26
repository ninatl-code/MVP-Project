-- Supprimer TOUTES les policies existantes sur profils_prestataire
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profils_prestataire' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profils_prestataire', pol.policyname);
  END LOOP;
END $$;

-- Désactiver puis réactiver RLS (reset propre)
ALTER TABLE profils_prestataire DISABLE ROW LEVEL SECURITY;
ALTER TABLE profils_prestataire ENABLE ROW LEVEL SECURITY;

-- SELECT : tout le monde authentifié peut lire (recherche client)
CREATE POLICY "select_all" ON profils_prestataire
  FOR SELECT TO authenticated USING (true);

-- INSERT : uniquement son propre profil
CREATE POLICY "insert_own" ON profils_prestataire
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- UPDATE : uniquement son propre profil
-- Exception admin : les admins peuvent tout modifier
CREATE POLICY "update_own_or_admin" ON profils_prestataire
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- DELETE : uniquement son propre profil
CREATE POLICY "delete_own" ON profils_prestataire
  FOR DELETE TO authenticated USING (id = auth.uid());
