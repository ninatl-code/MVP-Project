-- ============================================================
-- MIGRATION : RLS complet pour toutes les tables prestataire
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ---- devis ----
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'devis' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON devis';
END LOOP; END $$;

-- Les prestataires voient leurs propres devis
CREATE POLICY "devis_prestataire_select" ON devis
  FOR SELECT USING (prestataire_id = auth.uid());

-- Les clients voient les devis qui les concernent
CREATE POLICY "devis_client_select" ON devis
  FOR SELECT USING (client_id = auth.uid());

-- Seuls les prestataires peuvent créer des devis
CREATE POLICY "devis_prestataire_insert" ON devis
  FOR INSERT WITH CHECK (prestataire_id = auth.uid());

-- Prestataires peuvent mettre à jour leurs devis, clients aussi (accepter/refuser)
CREATE POLICY "devis_prestataire_update" ON devis
  FOR UPDATE USING (prestataire_id = auth.uid() OR client_id = auth.uid());

-- Prestataires peuvent supprimer leurs devis
CREATE POLICY "devis_prestataire_delete" ON devis
  FOR DELETE USING (prestataire_id = auth.uid());


-- ---- reservations ----
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'reservations' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reservations';
END LOOP; END $$;

-- Prestataires voient leurs réservations
CREATE POLICY "reservations_prestataire_select" ON reservations
  FOR SELECT USING (prestataire_id = auth.uid());

-- Clients voient leurs réservations
CREATE POLICY "reservations_client_select" ON reservations
  FOR SELECT USING (client_id = auth.uid());

-- Clients peuvent créer des réservations
CREATE POLICY "reservations_client_insert" ON reservations
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Les deux parties peuvent modifier la réservation
CREATE POLICY "reservations_update" ON reservations
  FOR UPDATE USING (prestataire_id = auth.uid() OR client_id = auth.uid());

-- Admins peuvent tout faire (via service_role, pas besoin de policy)


-- ---- conversations ----
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversations';
END LOOP; END $$;

-- Prestataires et clients voient leurs conversations
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (prestataire_id = auth.uid() OR client_id = auth.uid());

-- Les deux parties peuvent créer une conversation
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (prestataire_id = auth.uid() OR client_id = auth.uid());

-- Les deux parties peuvent mettre à jour (ex: marquer comme lu, archiver)
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (prestataire_id = auth.uid() OR client_id = auth.uid());


-- ---- messages ----
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
END LOOP; END $$;

-- Membres de la conversation voient les messages
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Utilisateurs authentifiés peuvent envoyer des messages
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Mise à jour (ex: marquer comme lu)
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());


-- ---- notifications ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON notifications';
END LOOP; END $$;

-- Chaque utilisateur voit ses propres notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Le système (service_role) insère les notifications — les utilisateurs aussi pour les notifs directes
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Utilisateur peut marquer ses notifs comme lues
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());


-- ---- packages_types ----
ALTER TABLE packages_types ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'packages_types' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON packages_types';
END LOOP; END $$;

-- Tout le monde peut voir les forfaits actifs (marketplace public)
CREATE POLICY "packages_types_public_select" ON packages_types
  FOR SELECT USING (actif = true OR prestataire_id = auth.uid());

-- Seul le prestataire peut gérer ses forfaits
CREATE POLICY "packages_types_prestataire_insert" ON packages_types
  FOR INSERT WITH CHECK (prestataire_id = auth.uid());

CREATE POLICY "packages_types_prestataire_update" ON packages_types
  FOR UPDATE USING (prestataire_id = auth.uid());

CREATE POLICY "packages_types_prestataire_delete" ON packages_types
  FOR DELETE USING (prestataire_id = auth.uid());


-- ---- profils_prestataire ----
ALTER TABLE profils_prestataire ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profils_prestataire' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profils_prestataire';
END LOOP; END $$;

-- Tout le monde peut voir les profils (marketplace)
CREATE POLICY "profils_prestataire_select" ON profils_prestataire
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seul le prestataire peut modifier son profil (id = profils_prestataire.id)
CREATE POLICY "profils_prestataire_insert" ON profils_prestataire
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profils_prestataire_update" ON profils_prestataire
  FOR UPDATE USING (id = auth.uid());


-- ---- reviews_photographe ----
ALTER TABLE reviews_photographe ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'reviews_photographe' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON reviews_photographe';
END LOOP; END $$;

-- Tout le monde peut voir les avis
CREATE POLICY "reviews_select" ON reviews_photographe
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seuls les clients peuvent écrire des avis
CREATE POLICY "reviews_insert" ON reviews_photographe
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Le client peut modifier son avis
CREATE POLICY "reviews_update" ON reviews_photographe
  FOR UPDATE USING (client_id = auth.uid());


-- ---- paiements ----
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'paiements' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON paiements';
END LOOP; END $$;

CREATE POLICY "paiements_select" ON paiements
  FOR SELECT USING (client_id = auth.uid() OR prestataire_id = auth.uid());


-- ---- factures ----
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'factures' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON factures';
END LOOP; END $$;

CREATE POLICY "factures_select" ON factures
  FOR SELECT USING (prestataire_id = auth.uid());

CREATE POLICY "factures_insert" ON factures
  FOR INSERT WITH CHECK (prestataire_id = auth.uid());


-- ---- remboursements ----
ALTER TABLE remboursements ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'remboursements' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON remboursements';
END LOOP; END $$;

CREATE POLICY "remboursements_select" ON remboursements
  FOR SELECT USING (client_id = auth.uid() OR prestataire_id = auth.uid());


-- ---- favoris ----
ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'favoris' LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON favoris';
END LOOP; END $$;

CREATE POLICY "favoris_select" ON favoris
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "favoris_insert" ON favoris
  FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "favoris_delete" ON favoris
  FOR DELETE USING (client_id = auth.uid());
