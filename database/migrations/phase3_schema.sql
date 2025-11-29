-- =====================================================
-- PHASE 3 DATABASE SCHEMA (UPDATED FOR EXISTING DB)
-- AI Recommendations, Loyalty, Media, Integrations
-- =====================================================
--
-- ⚠️ IMPORTANT: AVANT D'EXÉCUTER CE SCRIPT
-- 1. Ce script utilise auth.users(id) pour les FK utilisateurs (Supabase Auth)
-- 2. Convention FRANÇAISE pour les FK:
--    - prestataire_id (au lieu de provider_id)
--    - particulier_id (au lieu de client_id)
--    - annonce_id (au lieu de service_id)
--
-- 📝 NOTES:
-- - Toutes les 22 tables Phase 3 sont NOUVELLES (aucun conflit)
-- - Utilise les tables existantes: annonces, avis, conversations
-- =====================================================
-- =====================================================
-- FEATURE 9: AI-POWERED RECOMMENDATIONS
-- =====================================================
-- User preferences and behavior tracking
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT CHECK (user_type IN ('client', 'provider')),
    preferred_categories TEXT [] DEFAULT '{}',
    preferred_locations TEXT [] DEFAULT '{}',
    preferred_price_range JSONB DEFAULT '{"min": 0, "max": 1000}'::JSONB,
    preferred_times JSONB DEFAULT '[]'::JSONB,
    -- Array of {day, start_time, end_time}
    search_history JSONB DEFAULT '[]'::JSONB,
    view_history JSONB DEFAULT '[]'::JSONB,
    booking_patterns JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT CHECK (
        recommendation_type IN (
            'service',
            'provider',
            'price_optimization',
            'time_slot',
            'bundle'
        )
    ),
    target_id UUID,
    -- ID of recommended service/provider
    score DECIMAL(5, 4) DEFAULT 0,
    -- Confidence score 0-1
    reasoning JSONB DEFAULT '{}'::JSONB,
    -- Why this was recommended
    metadata JSONB DEFAULT '{}'::JSONB,
    is_clicked BOOLEAN DEFAULT FALSE,
    is_converted BOOLEAN DEFAULT FALSE,
    -- Led to booking
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Service similarity matrix for collaborative filtering
CREATE TABLE IF NOT EXISTS service_similarity (
    service_a_id UUID REFERENCES annonces(id) ON DELETE CASCADE,
    service_b_id UUID REFERENCES annonces(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5, 4) DEFAULT 0,
    factors JSONB DEFAULT '{}'::JSONB,
    -- What makes them similar
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (service_a_id, service_b_id)
);
-- Provider performance scores
CREATE TABLE IF NOT EXISTS provider_scores (
    provider_id UUID PRIMARY KEY REFERENCES prestataires(user_id) ON DELETE CASCADE,
    overall_score DECIMAL(5, 2) DEFAULT 0,
    response_score DECIMAL(5, 2) DEFAULT 0,
    quality_score DECIMAL(5, 2) DEFAULT 0,
    reliability_score DECIMAL(5, 2) DEFAULT 0,
    value_score DECIMAL(5, 2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    recommendation_rank INTEGER DEFAULT 0,
    last_calculated TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- FEATURE 10: LOYALTY & GAMIFICATION
-- =====================================================
-- Loyalty points tracking
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT CHECK (user_type IN ('client', 'provider')),
    points_balance INTEGER DEFAULT 0,
    points_earned_total INTEGER DEFAULT 0,
    points_redeemed_total INTEGER DEFAULT 0,
    current_tier TEXT DEFAULT 'bronze',
    -- bronze, silver, gold, platinum
    next_tier_threshold INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
-- Points transaction history
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type TEXT CHECK (
        transaction_type IN (
            'earned',
            'redeemed',
            'expired',
            'bonus',
            'penalty'
        )
    ),
    points_amount INTEGER NOT NULL,
    reason TEXT,
    related_entity_type TEXT,
    -- booking, review, referral, achievement, etc.
    related_entity_id UUID,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Achievement badges
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    -- bookings, social, quality, milestones
    icon_name TEXT,
    tier TEXT DEFAULT 'bronze',
    -- bronze, silver, gold, platinum
    points_reward INTEGER DEFAULT 0,
    unlock_criteria JSONB NOT NULL,
    -- Conditions to unlock
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- User achievements (unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    progress_current INTEGER DEFAULT 0,
    progress_target INTEGER DEFAULT 1,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);
-- Rewards catalog
CREATE TABLE IF NOT EXISTS rewards_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    reward_type TEXT CHECK (
        reward_type IN (
            'discount',
            'free_service',
            'upgrade',
            'gift_card',
            'custom'
        )
    ),
    points_cost INTEGER NOT NULL,
    discount_value DECIMAL(10, 2),
    discount_type TEXT,
    -- percentage, fixed_amount
    applicable_to TEXT [],
    -- Categories or services
    stock_quantity INTEGER,
    stock_remaining INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    terms_conditions TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Reward redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards_catalog(id),
    points_spent INTEGER NOT NULL,
    redemption_code TEXT UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    used_on_booking_id UUID REFERENCES reservations(id),
    expires_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);
-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT CHECK (user_type IN ('client', 'provider')),
    period TEXT CHECK (
        period IN ('daily', 'weekly', 'monthly', 'all_time')
    ),
    metric_type TEXT,
    -- points, bookings, reviews, revenue
    score INTEGER DEFAULT 0,
    rank INTEGER,
    period_start DATE,
    period_end DATE,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period, metric_type, period_start)
);
-- =====================================================
-- FEATURE 11: ADVANCED MEDIA MANAGEMENT
-- =====================================================
-- Media library for portfolios
CREATE TABLE IF NOT EXISTS media_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES prestataires(user_id) ON DELETE CASCADE,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document')),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    -- bytes
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    -- for videos in seconds
    tags TEXT [] DEFAULT '{}',
    caption TEXT,
    alt_text TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB,
    -- EXIF, location, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Media albums/collections
CREATE TABLE IF NOT EXISTS media_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES prestataires(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Album media relationship
CREATE TABLE IF NOT EXISTS album_media (
    album_id UUID REFERENCES media_albums(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (album_id, media_id)
);
-- Media processing jobs (for video transcoding, image optimization)
CREATE TABLE IF NOT EXISTS media_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
    job_type TEXT CHECK (
        job_type IN (
            'transcode',
            'thumbnail',
            'optimize',
            'watermark'
        )
    ),
    status TEXT CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    output_url TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- FEATURE 12: INTEGRATION ECOSYSTEM
-- =====================================================
-- Third-party integrations configuration
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_type TEXT CHECK (
        integration_type IN (
            'calendar_google',
            'calendar_outlook',
            'calendar_apple',
            'payment_stripe',
            'payment_paypal',
            'social_facebook',
            'social_instagram',
            'social_twitter',
            'crm_hubspot',
            'accounting_quickbooks',
            'messaging_whatsapp',
            'messaging_telegram'
        )
    ),
    is_active BOOLEAN DEFAULT FALSE,
    credentials JSONB DEFAULT '{}'::JSONB,
    -- Encrypted tokens
    settings JSONB DEFAULT '{}'::JSONB,
    sync_enabled BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    sync_frequency TEXT DEFAULT 'manual',
    -- manual, hourly, daily
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, integration_type)
);
-- Integration sync logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    sync_type TEXT,
    -- import, export, bidirectional
    status TEXT CHECK (
        status IN ('started', 'success', 'failed', 'partial')
    ),
    items_processed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]'::JSONB,
    duration_ms INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
-- Webhook endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    event_types TEXT [] DEFAULT '{}',
    -- booking.created, booking.cancelled, etc.
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    attempt_number INTEGER DEFAULT 1,
    is_successful BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);
-- API keys for third-party developers
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    api_secret TEXT NOT NULL,
    permissions TEXT [] DEFAULT '{}',
    -- read:bookings, write:services, etc.
    rate_limit INTEGER DEFAULT 1000,
    -- requests per hour
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
-- AI Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_expires ON ai_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_provider_scores_rank ON provider_scores(recommendation_rank);
-- Loyalty indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_code ON reward_redemptions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON leaderboards(period, metric_type, period_start);
-- Media indexes
CREATE INDEX IF NOT EXISTS idx_media_library_provider ON media_library(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_media_library_type ON media_library(media_type);
CREATE INDEX IF NOT EXISTS idx_media_library_featured ON media_library(is_featured);
CREATE INDEX IF NOT EXISTS idx_media_albums_provider ON media_albums(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_media_processing_status ON media_processing_jobs(status);
-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
-- =====================================================
-- FUNCTIONS
-- =====================================================
-- Award points to user
CREATE OR REPLACE FUNCTION award_points(
        p_user_id UUID,
        p_points INTEGER,
        p_reason TEXT,
        p_related_entity_type TEXT DEFAULT NULL,
        p_related_entity_id UUID DEFAULT NULL
    ) RETURNS void AS $$
DECLARE v_new_balance INTEGER;
v_current_tier TEXT;
BEGIN -- Update or create loyalty points record
INSERT INTO loyalty_points (user_id, points_balance, points_earned_total)
VALUES (p_user_id, p_points, p_points) ON CONFLICT (user_id) DO
UPDATE
SET points_balance = loyalty_points.points_balance + p_points,
    points_earned_total = loyalty_points.points_earned_total + p_points,
    updated_at = NOW();
-- Record transaction
INSERT INTO points_transactions (
        user_id,
        transaction_type,
        points_amount,
        reason,
        related_entity_type,
        related_entity_id
    )
VALUES (
        p_user_id,
        'earned',
        p_points,
        p_reason,
        p_related_entity_type,
        p_related_entity_id
    );
-- Update tier if needed
SELECT points_balance INTO v_new_balance
FROM loyalty_points
WHERE user_id = p_user_id;
SELECT CASE
        WHEN v_new_balance >= 5000 THEN 'platinum'
        WHEN v_new_balance >= 2000 THEN 'gold'
        WHEN v_new_balance >= 500 THEN 'silver'
        ELSE 'bronze'
    END INTO v_current_tier;
UPDATE loyalty_points
SET current_tier = v_current_tier,
    next_tier_threshold = CASE
        v_current_tier
        WHEN 'bronze' THEN 500
        WHEN 'silver' THEN 2000
        WHEN 'gold' THEN 5000
        WHEN 'platinum' THEN 10000
    END
WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
-- Check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID) RETURNS void AS $$
DECLARE achievement RECORD;
progress INTEGER;
BEGIN FOR achievement IN
SELECT a.*,
    ua.progress_current
FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
    AND ua.user_id = p_user_id
WHERE a.is_active = TRUE
    AND (
        ua.is_unlocked IS FALSE
        OR ua.is_unlocked IS NULL
    ) LOOP -- Calculate progress based on criteria
    -- This is simplified - in reality, you'd evaluate each criterion
    -- If achievement unlocked
    IF progress >= achievement.progress_target THEN
INSERT INTO user_achievements (
        user_id,
        achievement_id,
        progress_current,
        progress_target,
        is_unlocked,
        unlocked_at
    )
VALUES (
        p_user_id,
        achievement.id,
        progress,
        achievement.progress_target,
        TRUE,
        NOW()
    ) ON CONFLICT (user_id, achievement_id) DO
UPDATE
SET is_unlocked = TRUE,
    unlocked_at = NOW(),
    progress_current = progress;
-- Award points
IF achievement.points_reward > 0 THEN PERFORM award_points(
    p_user_id,
    achievement.points_reward,
    'Achievement unlocked: ' || achievement.name,
    'achievement',
    achievement.id
);
END IF;
END IF;
END LOOP;
END;
$$ LANGUAGE plpgsql;
-- Calculate provider recommendation score
CREATE OR REPLACE FUNCTION calculate_provider_score(p_prestataire_id UUID) RETURNS DECIMAL AS $$
DECLARE v_response_score DECIMAL;
v_quality_score DECIMAL;
v_reliability_score DECIMAL;
v_value_score DECIMAL;
v_overall_score DECIMAL;
BEGIN -- Response score (based on avg response time)
SELECT COALESCE(
        AVG(
            EXTRACT(
                EPOCH
                FROM (accepte_a - cree_a)
            ) / 3600
        ),
        24
    ) INTO v_response_score
FROM reservations
WHERE prestataire_id = p_prestataire_id
    AND statut = 'confirme';
v_response_score := GREATEST(0, 100 - (v_response_score * 2));
-- Lower hours = higher score
-- Quality score (based on ratings)
SELECT COALESCE(AVG(note), 3) * 20 INTO v_quality_score
FROM avis
WHERE prestataire_id = p_prestataire_id;
-- Reliability score (completion rate)
SELECT COALESCE(
        (
            COUNT(*) FILTER (
                WHERE statut = 'termine'
            )::DECIMAL / NULLIF(COUNT(*), 0)
        ) * 100,
        50
    ) INTO v_reliability_score
FROM reservations
WHERE prestataire_id = p_prestataire_id
    AND statut IN ('confirme', 'termine', 'annule');
-- Value score (competitive pricing + reviews mentioning value)
v_value_score := 75;
-- Placeholder
-- Overall score
v_overall_score := (
    v_response_score * 0.25 + v_quality_score * 0.35 + v_reliability_score * 0.25 + v_value_score * 0.15
);
-- Update provider_scores table
INSERT INTO provider_scores (
        prestataire_id,
        overall_score,
        response_score,
        quality_score,
        reliability_score,
        value_score,
        last_calculated
    )
VALUES (
        p_prestataire_id,
        v_overall_score,
        v_response_score,
        v_quality_score,
        v_reliability_score,
        v_value_score,
        NOW()
    ) ON CONFLICT (prestataire_id) DO
UPDATE
SET overall_score = v_overall_score,
    response_score = v_response_score,
    quality_score = v_quality_score,
    reliability_score = v_reliability_score,
    value_score = v_value_score,
    last_calculated = NOW();
RETURN v_overall_score;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- TRIGGERS
-- =====================================================
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_user_preferences_updated_at BEFORE
UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_points_updated_at BEFORE
UPDATE ON loyalty_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_library_updated_at BEFORE
UPDATE ON media_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE
UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Award points on booking completion
CREATE OR REPLACE FUNCTION award_booking_points() RETURNS TRIGGER AS $$ BEGIN IF NEW.statut = 'termine'
    AND OLD.statut != 'termine' THEN -- Award points to client
    PERFORM award_points(
        NEW.particulier_id,
        FLOOR(NEW.prix_total / 10)::INTEGER,
        -- 1 point per $10
        'Booking completed',
        'booking',
        NEW.id
    );
-- Award points to provider
PERFORM award_points(
    NEW.prestataire_id,
    FLOOR(NEW.prix_total / 5)::INTEGER,
    -- 2 points per $10
    'Service completed',
    'booking',
    NEW.id
);
-- Check for achievements
PERFORM check_achievements(NEW.particulier_id);
PERFORM check_achievements(NEW.prestataire_id);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_award_booking_points
AFTER
UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION award_booking_points();
-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- AI recommendations policies
CREATE POLICY "Users can view own recommendations" ON ai_recommendations FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert recommendations" ON ai_recommendations FOR
INSERT WITH CHECK (true);
CREATE POLICY "Service can update recommendations" ON ai_recommendations FOR
UPDATE USING (true);
-- Provider scores - public read
CREATE POLICY "Anyone can view provider scores" ON provider_scores FOR
SELECT USING (true);
-- Loyalty points policies
CREATE POLICY "Users can view own points" ON loyalty_points FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON points_transactions FOR
SELECT USING (auth.uid() = user_id);
-- Achievements - public read
CREATE POLICY "Anyone can view achievements" ON achievements FOR
SELECT USING (true);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR
SELECT USING (auth.uid() = user_id);
-- Rewards catalog - public read
CREATE POLICY "Anyone can view rewards" ON rewards_catalog FOR
SELECT USING (is_active = true);
CREATE POLICY "Users can view own redemptions" ON reward_redemptions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can redeem rewards" ON reward_redemptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Leaderboards - public read
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR
SELECT USING (true);
-- Media library policies
CREATE POLICY "Providers can manage own media" ON media_library FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Anyone can view public media" ON media_library FOR
SELECT USING (true);
CREATE POLICY "Providers can manage own albums" ON media_albums FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Anyone can view public albums" ON media_albums FOR
SELECT USING (is_public = true);
-- Integration policies
CREATE POLICY "Users can manage own integrations" ON integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sync logs" ON integration_sync_logs FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM integrations
            WHERE id = integration_id
        )
    );
CREATE POLICY "Users can manage own webhooks" ON webhook_endpoints FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);
-- =====================================================
-- INITIAL DATA
-- =====================================================
-- Sample achievements
INSERT INTO achievements (
        name,
        description,
        category,
        icon_name,
        tier,
        points_reward,
        unlock_criteria
    )
VALUES (
        'First Booking',
        'Complete your first booking',
        'bookings',
        'checkmark-circle',
        'bronze',
        50,
        '{"bookings_completed": 1}'::JSONB
    ),
    (
        'Early Bird',
        'Book 5 services in advance',
        'bookings',
        'alarm',
        'bronze',
        100,
        '{"advance_bookings": 5}'::JSONB
    ),
    (
        'Regular Client',
        'Complete 10 bookings',
        'bookings',
        'star',
        'silver',
        200,
        '{"bookings_completed": 10}'::JSONB
    ),
    (
        'Super Client',
        'Complete 50 bookings',
        'bookings',
        'trophy',
        'gold',
        500,
        '{"bookings_completed": 50}'::JSONB
    ),
    (
        'Review Master',
        'Leave 10 helpful reviews',
        'social',
        'chatbubbles',
        'silver',
        150,
        '{"reviews_written": 10}'::JSONB
    ),
    (
        'Referral Champion',
        'Refer 5 friends',
        'social',
        'people',
        'gold',
        300,
        '{"referrals": 5}'::JSONB
    ),
    (
        'Top Provider',
        'Maintain 4.5+ rating with 20+ reviews',
        'quality',
        'star',
        'platinum',
        1000,
        '{"avg_rating": 4.5, "review_count": 20}'::JSONB
    ),
    (
        'Speed Demon',
        'Respond to 50 bookings within 1 hour',
        'quality',
        'flash',
        'gold',
        400,
        '{"fast_responses": 50}'::JSONB
    );
-- Sample rewards
INSERT INTO rewards_catalog (
        name,
        description,
        reward_type,
        points_cost,
        discount_value,
        discount_type,
        is_active
    )
VALUES (
        '$5 Off Next Booking',
        'Get $5 off your next service booking',
        'discount',
        100,
        5,
        'fixed_amount',
        true
    ),
    (
        '10% Discount Coupon',
        'Save 10% on any service',
        'discount',
        200,
        10,
        'percentage',
        true
    ),
    (
        '$20 Off Premium Services',
        'Get $20 off services over $100',
        'discount',
        400,
        20,
        'fixed_amount',
        true
    ),
    (
        'Free Service Upgrade',
        'Upgrade to premium service tier',
        'upgrade',
        500,
        NULL,
        NULL,
        true
    ),
    (
        '$50 Gift Card',
        'Redeem for $50 credit',
        'gift_card',
        1000,
        50,
        'fixed_amount',
        true
    );
COMMENT ON TABLE user_preferences IS 'Tracks user behavior and preferences for AI recommendations';
COMMENT ON TABLE ai_recommendations IS 'Stores AI-generated recommendations for users';
COMMENT ON TABLE loyalty_points IS 'User loyalty points balance and tier information';
COMMENT ON TABLE achievements IS 'Available badges and achievements';
COMMENT ON TABLE media_library IS 'Provider portfolio images, videos, and documents';
COMMENT ON TABLE integrations IS 'Third-party service integrations configuration';