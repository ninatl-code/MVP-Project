/**
 * SQL MIGRATIONS - Système de Matching Photographe/Client
 * VERSION ADAPTÉE - Compatible avec la base existante
 * À exécuter dans Supabase SQL Editor
 * 
 * IMPORTANT: Ce script n'ajoute QUE les colonnes manquantes dans demandes_client
 * La table demandes_client existe déjà avec 72 colonnes
 * Nous ajoutons uniquement les colonnes utiles au système de matching
 */

-- ============================================
-- 1. ADAPTATION TABLE: demandes_client
-- ============================================
-- La table existe déjà, on ajoute juste les colonnes utiles au matching

-- Vérifier et ajouter les colonnes manquantes pour le système de matching
-- La colonne 'categorie' existe déjà (pas 'category')
-- Les colonnes de localisation existent déjà (lieu, ville, etc.)
-- Les budgets existent déjà (budget_min, budget_max)

ALTER TABLE demandes_client
ADD COLUMN IF NOT EXISTS styles_recherches TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS atmosphere TEXT CHECK (atmosphere IN ('natural', 'posed', 'fun', 'serious', 'mixed')) DEFAULT 'natural',
ADD COLUMN IF NOT EXISTS comfort_level TEXT CHECK (comfort_level IN ('shy', 'neutral', 'comfortable', 'professional')) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS moodboard_notes TEXT;

-- ============================================
-- 2. TABLE: matchings (NOUVELLE)
-- ============================================
-- Enregistre les matchings entre demandes et photographes

CREATE TABLE IF NOT EXISTS matchings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demande_id UUID NOT NULL REFERENCES demandes_client(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
  
  -- Score & Raisons
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  
  -- Status du matching
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',        -- En attente réponse photographe
    'accepted',       -- Photographe a accepté
    'rejected',       -- Photographe a refusé
    'quoted',         -- Photographe a envoyé un devis
    'booked'          -- Réservation confirmée
  )),
  
  -- Communication
  photographer_message TEXT,
  photographe_quote JSONB,  -- { price: 500, description: "...", delivery_date: "2024-04-15" }
  
  -- Dates
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  accepted_at TIMESTAMP,
  
  UNIQUE(demande_id, photographer_id)
);

CREATE INDEX IF NOT EXISTS idx_matchings_demande ON matchings(demande_id);
CREATE INDEX IF NOT EXISTS idx_matchings_photographer ON matchings(photographer_id);
CREATE INDEX IF NOT EXISTS idx_matchings_status ON matchings(status);


-- ============================================
-- 3. INDEXES pour demandes_client (NOUVEAUX)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_demandes_client_categorie 
ON demandes_client(categorie);

CREATE INDEX IF NOT EXISTS idx_demandes_client_statut 
ON demandes_client(statut);

CREATE INDEX IF NOT EXISTS idx_demandes_client_ville 
ON demandes_client(ville);

CREATE INDEX IF NOT EXISTS idx_demandes_client_budget 
ON demandes_client(budget_min, budget_max);

CREATE INDEX IF NOT EXISTS idx_demandes_client_created_at 
ON demandes_client(created_at DESC);

-- ============================================
-- 4. ALTER TABLE profils_photographe (colonnes manquantes)
-- ============================================
-- Ces colonnes manquent dans la base existante pour supporter le matching

ALTER TABLE profils_photographe
ADD COLUMN IF NOT EXISTS styles_photo TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS disponibilite JSONB DEFAULT '{
  "weekdays": true,
  "weekends": true,
  "evenings": false
}';

-- Note: Les autres colonnes telles que specialisations, tarifs, instagram, etc. 
-- existent déjà dans la table profils_photographe de la base existante

-- ============================================
-- 5. TABLE: reviews_photographe (NOUVELLE)
-- ============================================
-- Avis des clients sur les photographes

CREATE TABLE IF NOT EXISTS reviews_photographe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matching_id UUID REFERENCES matchings(id) ON DELETE SET NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(photographer_id, client_id, matching_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_photographer ON reviews_photographe(photographer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews_photographe(rating);

-- ============================================
-- 6. TABLE: messages_matching (NOUVELLE)
-- ============================================
-- Messagerie entre client et photographe pour chaque matching

CREATE TABLE IF NOT EXISTS messages_matching (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matching_id UUID NOT NULL REFERENCES matchings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_matching ON messages_matching(matching_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages_matching(sender_id);

-- ============================================
-- 7. FUNCTION: Calculer rating moyen du photographe
-- ============================================

CREATE OR REPLACE FUNCTION update_photographer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profils_photographe
  SET note_moyenne = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews_photographe
    WHERE photographer_id = NEW.photographer_id
  ),
  nb_avis = (
    SELECT COUNT(*)
    FROM reviews_photographe
    WHERE photographer_id = NEW.photographer_id
  )
  WHERE id = NEW.photographer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_photographer_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews_photographe
FOR EACH ROW
EXECUTE FUNCTION update_photographer_rating();


-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE demandes_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_photographe ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_matching ENABLE ROW LEVEL SECURITY;

-- Demandes: Clients ne voient que leurs demandes
DROP POLICY IF EXISTS "Clients can view own demands" ON demandes_client;
CREATE POLICY "Clients can view own demands"
ON demandes_client FOR SELECT
USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can insert own demands" ON demandes_client;
CREATE POLICY "Clients can insert own demands"
ON demandes_client FOR INSERT
WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own demands" ON demandes_client;
CREATE POLICY "Clients can update own demands"
ON demandes_client FOR UPDATE
USING (client_id = auth.uid());

-- Matchings: Chacun ne voit que ses propres matchings
DROP POLICY IF EXISTS "Clients can view own matchings" ON matchings;
CREATE POLICY "Clients can view own matchings"
ON matchings FOR SELECT
USING (
  demande_id IN (
    SELECT id FROM demandes_client WHERE client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Photographers can view own matchings" ON matchings;
CREATE POLICY "Photographers can view own matchings"
ON matchings FOR SELECT
USING (photographer_id = auth.uid());

-- Messages: Seuls les participants voient les messages
DROP POLICY IF EXISTS "Users can view matching messages" ON messages_matching;
CREATE POLICY "Users can view matching messages"
ON messages_matching FOR SELECT
USING (
  matching_id IN (
    SELECT id FROM matchings WHERE photographer_id = auth.uid()
    UNION
    SELECT id FROM matchings WHERE demande_id IN (
      SELECT id FROM demandes_client WHERE client_id = auth.uid()
    )
  )
);

-- ============================================
-- 9. INDEXES SUPPLÉMENTAIRES (Performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_demandes_budget 
ON demandes_client(budget_min, budget_max);

CREATE INDEX IF NOT EXISTS idx_matchings_created 
ON matchings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matchings_score 
ON matchings(match_score DESC);

-- ============================================
-- 10. MIGRATION DATA (si tables existent)
-- ============================================

-- Remplir les ratings initiaux si vides
UPDATE profils_photographe SET note_moyenne = 0
WHERE note_moyenne IS NULL;

UPDATE profils_photographe SET nb_avis = 0
WHERE nb_avis IS NULL;


-- ============================================
-- 11. VERIFICATION & TESTS
-- ============================================

-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('demandes_client', 'matchings', 'reviews_photographe', 'messages_matching');

-- Vérifier les colonnes de profils_photographe
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profils_photographe'
ORDER BY column_name;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================

/*
COMPATIBILITÉ BASE EXISTANTE:
- demandes_client: Table existante avec 72 colonnes
  ✓ Ajout de colonnes: styles_recherches, atmosphere, comfort_level, moodboard_notes
  ✓ Colonnes existantes réutilisées: categorie (pas category), lieu, ville, budget_min/max
  
- profils_photographe: Table existante avec 54 colonnes
  ✓ Ajout de colonnes: styles_photo, disponibilite
  ✓ Colonnes existantes réutilisées: specialisations, tarifs_indicatifs, note_moyenne, nb_avis

- NOUVELLES TABLES:
  ✓ matchings (relation client↔photographe)
  ✓ reviews_photographe (avis clients)
  ✓ messages_matching (messagerie entre client et photographe)

DÉPLOIEMENT:
1. Exécuter ce script complet dans Supabase SQL Editor
2. Si des erreurs columns déjà existantes → ignorées par IF NOT EXISTS
3. Vérifier les 3 nouvelles tables ont été créées
4. Vérifier les colonnes manquantes de profils_photographe ont été ajoutées
5. Les triggers RLS sont actifs et sécurisent les données

ROLLBACK (si besoin):
DROP TABLE IF EXISTS messages_matching CASCADE;
DROP TABLE IF EXISTS reviews_photographe CASCADE;
DROP TABLE IF EXISTS matchings CASCADE;
ALTER TABLE demandes_client DROP COLUMN IF EXISTS styles_recherches;
ALTER TABLE demandes_client DROP COLUMN IF EXISTS atmosphere;
ALTER TABLE demandes_client DROP COLUMN IF EXISTS comfort_level;
ALTER TABLE demandes_client DROP COLUMN IF EXISTS moodboard_notes;
ALTER TABLE profils_photographe DROP COLUMN IF EXISTS styles_photo;
ALTER TABLE profils_photographe DROP COLUMN IF EXISTS disponibilite;
*/
