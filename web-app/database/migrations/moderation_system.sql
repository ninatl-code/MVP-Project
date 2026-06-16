-- ============================================================
-- MODERATION SYSTEM MIGRATION
-- ============================================================
-- Run in Supabase > SQL Editor

-- 1. Add columns to profiles (suspend)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspendu BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 2. Add columns to profils_prestataire (score_confiance, motif_refus)
ALTER TABLE profils_prestataire
  ADD COLUMN IF NOT EXISTS score_confiance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motif_refus TEXT;

-- 3. Add columns to demandes_client (actif, suspension_reason)
ALTER TABLE demandes_client
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 4. Add columns to reviews_presta (visible, nonvisibility_reason)
ALTER TABLE reviews_presta
  ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS nonvisibility_reason TEXT;

-- 5. Create signalements table
CREATE TABLE IF NOT EXISTS signalements (
  id            SERIAL PRIMARY KEY,
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type   VARCHAR(20) NOT NULL CHECK (target_type IN ('user','message','avis','demande')),
  target_id     TEXT NOT NULL,
  reason        TEXT NOT NULL,
  description   TEXT,
  status        VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','dismissed')),
  admin_comment TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create avertissements table
CREATE TABLE IF NOT EXISTS avertissements (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id   UUID REFERENCES profiles(id),
  reason     TEXT NOT NULL,
  severity   VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info','warning','severe')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_signalements_status ON signalements(status);
CREATE INDEX IF NOT EXISTS idx_signalements_reporter ON signalements(reporter_id);
CREATE INDEX IF NOT EXISTS idx_avertissements_user ON avertissements(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_suspendu ON profiles(suspendu);
CREATE INDEX IF NOT EXISTS idx_demandes_actif ON demandes_client(actif);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews_presta(visible);

-- 8. RLS policies for signalements (users can insert, admins can read/update)
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE avertissements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signalements_insert ON signalements;
CREATE POLICY signalements_insert ON signalements
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS signalements_select_admin ON signalements;
CREATE POLICY signalements_select_admin ON signalements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS signalements_update_admin ON signalements;
CREATE POLICY signalements_update_admin ON signalements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS avertissements_select ON avertissements;
CREATE POLICY avertissements_select ON avertissements
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS avertissements_insert_admin ON avertissements;
CREATE POLICY avertissements_insert_admin ON avertissements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
