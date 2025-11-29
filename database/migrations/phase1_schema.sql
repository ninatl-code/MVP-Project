-- ============================================================================
-- PHASE 1 DATABASE SCHEMA - Advanced Features (UPDATED FOR EXISTING DB)
-- Execute this in Supabase SQL Editor
-- ============================================================================
-- 
-- ⚠️ IMPORTANT: AVANT D'EXÉCUTER CE SCRIPT
-- 1. Ce script utilise auth.users(id) pour les FK utilisateurs
-- 2. Supabase Auth gère automatiquement la table auth.users
-- 3. Vos colonnes prestataire_id et particulier_id référencent auth.users(id)
--
-- 📝 NOTES:
-- - Utilise les tables existantes: avis, blocked_slots, annonces, conversations
-- - Convention française: prestataire_id, particulier_id, annonce_id
-- - Ajoute seulement les colonnes manquantes (pas de DROP/CREATE sur tables existantes)
-- ============================================================================
-- ============================================================================
-- 1. ADVANCED CALENDAR & INSTANT BOOKING
-- ============================================================================
-- Provider availability slots (NEW TABLE)
CREATE TABLE IF NOT EXISTS provider_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestataire_id UUID NOT NULL,
    -- Uses existing column name
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prestataire_id, day_of_week, start_time)
);
-- TABLE blocked_slots ALREADY EXISTS - Add missing columns only
ALTER TABLE blocked_slots
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reason TEXT;
-- Update existing data: convert 'date' to 'start_datetime' if needed
UPDATE blocked_slots
SET start_datetime = date
WHERE start_datetime IS NULL;
UPDATE blocked_slots
SET end_datetime = date + INTERVAL '1 hour'
WHERE end_datetime IS NULL;
UPDATE blocked_slots
SET reason = motif
WHERE reason IS NULL;
-- Instant booking settings (NEW TABLE)
CREATE TABLE IF NOT EXISTS instant_booking_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestataire_id UUID NOT NULL UNIQUE,
    -- Uses existing column name
    enabled BOOLEAN DEFAULT false,
    buffer_minutes INTEGER DEFAULT 60,
    -- Time between bookings
    advance_notice_hours INTEGER DEFAULT 24,
    -- Minimum notice before booking
    max_advance_days INTEGER DEFAULT 90,
    -- How far in advance clients can book
    auto_accept_conditions JSONB DEFAULT '{}',
    -- Criteria for auto-acceptance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Update reservations table to support instant booking
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'request' CHECK (booking_type IN ('request', 'instant')),
    ADD COLUMN IF NOT EXISTS auto_confirmed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS service_start_datetime TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS service_end_datetime TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS buffer_applied BOOLEAN DEFAULT false;
-- ============================================================================
-- 2. TWO-WAY REVIEW SYSTEM
-- ============================================================================
-- TABLE avis ALREADY EXISTS - Add missing columns only
-- Existing columns: reservation_id, note, commentaire, note_qualite, note_ponctualite, 
-- note_communication, note_rapport_qualite_prix, photos, visible, signale, verifie
ALTER TABLE avis
ADD COLUMN IF NOT EXISTS reviewer_id UUID,
    ADD COLUMN IF NOT EXISTS reviewee_id UUID,
    ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(20) CHECK (reviewer_role IN ('client', 'provider')),
    ADD COLUMN IF NOT EXISTS professionalism_rating INTEGER CHECK (
        professionalism_rating BETWEEN 1 AND 5
    ),
    ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (
        value_rating BETWEEN 1 AND 5
    ),
    ADD COLUMN IF NOT EXISTS cooperation_rating INTEGER CHECK (
        cooperation_rating BETWEEN 1 AND 5
    ),
    ADD COLUMN IF NOT EXISTS title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS provider_response TEXT,
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
-- Add constraint if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_ratings_avis'
        AND conrelid = 'avis'::regclass
) THEN
ALTER TABLE avis
ADD CONSTRAINT valid_ratings_avis CHECK (
        (
            reviewer_role = 'client'
            AND note_communication IS NOT NULL
        )
        OR (
            reviewer_role = 'provider'
            AND note_ponctualite IS NOT NULL
        )
    );
END IF;
END $$;
-- Review reminders (NEW TABLE)
CREATE TABLE IF NOT EXISTS review_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('client', 'provider')),
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- 3. TRUST & SAFETY - IDENTITY VERIFICATION
-- ============================================================================
-- Verification documents (NEW TABLE)
CREATE TABLE IF NOT EXISTS verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN (
            'id_card',
            'passport',
            'drivers_license',
            'business_license',
            'tax_registration',
            'insurance_certificate',
            'professional_certification'
        )
    ),
    document_url TEXT NOT NULL,
    -- Secure storage URL
    document_number VARCHAR(100),
    -- Masked for security
    expiry_date DATE,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    -- Verification status
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
        verification_status IN (
            'pending',
            'in_review',
            'approved',
            'rejected',
            'expired'
        )
    ),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    -- Admin who verified
    rejection_reason TEXT,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    -- Store additional info like document scan quality
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- User verification status summary
CREATE TABLE IF NOT EXISTS user_verification_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- Email & Phone verification
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    -- Identity verification
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    -- Business verification (for providers)
    business_verified BOOLEAN DEFAULT false,
    business_verified_at TIMESTAMPTZ,
    -- Trust score (calculated)
    trust_score INTEGER DEFAULT 0 CHECK (
        trust_score BETWEEN 0 AND 100
    ),
    trust_level VARCHAR(20) DEFAULT 'new' CHECK (
        trust_level IN (
            'new',
            'basic',
            'verified',
            'trusted',
            'superhost'
        )
    ),
    -- Badges earned
    badges TEXT [] DEFAULT '{}',
    -- ['email_verified', 'id_verified', 'superhost']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Background check records (for providers)
CREATE TABLE IF NOT EXISTS background_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL CHECK (
        check_type IN (
            'criminal_record',
            'credit_check',
            'reference_check'
        )
    ),
    check_status VARCHAR(20) DEFAULT 'pending' CHECK (
        check_status IN (
            'pending',
            'in_progress',
            'passed',
            'failed'
        )
    ),
    provider_name VARCHAR(100),
    -- Third-party verification provider
    external_reference_id VARCHAR(100),
    result_details JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- 4. ENHANCED SEARCH FILTERS
-- ============================================================================
-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_name VARCHAR(100) NOT NULL,
    -- Search criteria (stored as JSONB for flexibility)
    search_criteria JSONB NOT NULL DEFAULT '{}',
    -- {prestation, ville, price_range, dates, etc.}
    -- Alerts
    alert_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (
        alert_frequency IN ('instant', 'daily', 'weekly')
    ),
    last_alert_sent TIMESTAMPTZ,
    -- Activity
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Search history for recommendations
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    -- For anonymous users
    search_query TEXT,
    search_filters JSONB DEFAULT '{}',
    results_count INTEGER,
    clicked_annonce_id INTEGER REFERENCES annonces(id),
    clicked_position INTEGER,
    -- Position in search results
    searched_at TIMESTAMPTZ DEFAULT NOW()
);
-- Price alerts for favorites
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    annonce_id INTEGER NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    target_price DECIMAL(10, 2),
    current_price DECIMAL(10, 2),
    alert_triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, annonce_id)
);
-- User preferences for personalized search
CREATE TABLE IF NOT EXISTS user_search_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferred_prestations TEXT [] DEFAULT '{}',
    preferred_locations TEXT [] DEFAULT '{}',
    price_range_min DECIMAL(10, 2),
    price_range_max DECIMAL(10, 2),
    preferred_providers UUID [] DEFAULT '{}',
    browsing_history JSONB DEFAULT '[]',
    -- Recently viewed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_provider_dates ON blocked_slots(prestataire_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(service_start_datetime, service_end_datetime);
-- Review indexes
CREATE INDEX IF NOT EXISTS idx_avis_reviewee ON avis(reviewee_id, visible);
CREATE INDEX IF NOT EXISTS idx_avis_reservation ON avis(reservation_id);
CREATE INDEX IF NOT EXISTS idx_avis_rating ON avis(note);
-- Verification indexes
CREATE INDEX IF NOT EXISTS idx_verification_docs_user ON verification_documents(user_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_user_verification_status_user ON user_verification_status(user_id);
-- Search indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id, alert_enabled);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_annonce ON price_alerts(user_id, annonce_id, alert_triggered);
-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply trigger to relevant tables
CREATE TRIGGER update_provider_availability_updated_at BEFORE
UPDATE ON provider_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instant_booking_settings_updated_at BEFORE
UPDATE ON instant_booking_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avis_updated_at BEFORE
UPDATE ON avis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_documents_updated_at BEFORE
UPDATE ON verification_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_verification_status_updated_at BEFORE
UPDATE ON user_verification_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to calculate provider's average rating
CREATE OR REPLACE FUNCTION calculate_provider_rating(provider_id_param UUID) RETURNS DECIMAL(3, 2) AS $$
DECLARE avg_rating DECIMAL(3, 2);
BEGIN
SELECT ROUND(AVG(note)::numeric, 2) INTO avg_rating
FROM avis
WHERE reviewee_id = provider_id_param
    AND reviewer_role = 'client'
    AND visible = true;
RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;
-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(user_id_param UUID) RETURNS INTEGER AS $$
DECLARE score INTEGER := 0;
verification_record RECORD;
reviews_count INTEGER;
avg_rating DECIMAL(3, 2);
BEGIN -- Get verification status
SELECT * INTO verification_record
FROM user_verification_status
WHERE user_id = user_id_param;
-- Email verified: +10 points
IF verification_record.email_verified THEN score := score + 10;
END IF;
-- Phone verified: +10 points
IF verification_record.phone_verified THEN score := score + 10;
END IF;
-- Identity verified: +30 points
IF verification_record.identity_verified THEN score := score + 30;
END IF;
-- Business verified: +20 points
IF verification_record.business_verified THEN score := score + 20;
END IF;
-- Reviews: up to 30 points
SELECT COUNT(*),
    AVG(note) INTO reviews_count,
    avg_rating
FROM avis
WHERE reviewee_id = user_id_param
    AND visible = true;
IF reviews_count > 0 THEN score := score + LEAST(reviews_count * 2, 20);
-- 2 points per review, max 20
score := score + (avg_rating * 2)::INTEGER;
-- Up to 10 points for rating
END IF;
RETURN LEAST(score, 100);
-- Cap at 100
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on new tables
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
-- Provider availability policies
CREATE POLICY "Providers can manage their own availability" ON provider_availability FOR ALL USING (auth.uid() = prestataire_id);
CREATE POLICY "Everyone can view provider availability" ON provider_availability FOR
SELECT USING (true);
-- Reviews policies
CREATE POLICY "Users can view visible reviews" ON avis FOR
SELECT USING (visible = true);
CREATE POLICY "Users can create reviews for their bookings" ON avis FOR
INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewees can respond to their reviews" ON avis FOR
UPDATE USING (auth.uid() = reviewee_id);
-- Verification documents policies (privacy protected)
CREATE POLICY "Users can manage their own documents" ON verification_documents FOR ALL USING (auth.uid() = user_id);
-- Saved searches policies
CREATE POLICY "Users can manage their own saved searches" ON saved_searches FOR ALL USING (auth.uid() = user_id);
-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================
-- Initialize verification status for existing users
INSERT INTO user_verification_status (user_id, email_verified, trust_score)
SELECT id,
    true,
    10
FROM auth.users
WHERE NOT EXISTS (
        SELECT 1
        FROM user_verification_status
        WHERE user_id = auth.users.id
    );
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
SELECT 'Phase 1 schema migration completed successfully!' AS status;