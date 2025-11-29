-- =============================================
-- PHASE 2 DATABASE SCHEMA (UPDATED FOR EXISTING DB)
-- Features: Dynamic Pricing, Analytics, Messaging, Cancellation Policies
-- =============================================
--
-- ⚠️ IMPORTANT: AVANT D'EXÉCUTER CE SCRIPT
-- 1. Ce script utilise auth.users(id) pour les FK utilisateurs (Supabase Auth)
-- 2. Vos colonnes prestataire_id et particulier_id référencent auth.users(id)
-- 3. Convention française: prestataire_id, particulier_id, annonce_id
--
-- 📝 NOTES:
-- - dynamic_pricing_rules EXISTE DÉJÀ (9 colonnes)
-- - conversations EXISTE DÉJÀ (7 colonnes)
-- - Ajoute seulement les colonnes manquantes
-- =============================================
-- =============================================
-- FEATURE 5: DYNAMIC PRICING TOOLS
-- =============================================
-- TABLE dynamic_pricing_rules ALREADY EXISTS (9 columns)
-- Add missing columns if needed
ALTER TABLE dynamic_pricing_rules
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS adjusted_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS description TEXT;
-- Create indexes if not exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_pricing_rules_provider'
) THEN CREATE INDEX idx_pricing_rules_provider ON dynamic_pricing_rules(provider_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_pricing_rules_annonce'
) THEN CREATE INDEX idx_pricing_rules_annonce ON dynamic_pricing_rules(annonce_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_pricing_rules_active'
) THEN CREATE INDEX idx_pricing_rules_active ON dynamic_pricing_rules(is_active)
WHERE is_active = true;
END IF;
END $$;
-- Table: price_history
-- Tracks price changes over time for analytics
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annonce_id UUID NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2) NOT NULL,
    change_reason VARCHAR(100),
    -- 'manual', 'seasonal_rule', 'demand_rule', etc.
    applied_rule_id UUID REFERENCES dynamic_pricing_rules(id) ON DELETE
    SET NULL,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_annonce ON price_history(annonce_id);
CREATE INDEX IF NOT EXISTS idx_price_history_provider ON price_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(changed_at DESC);
-- =============================================
-- FEATURE 6: PROVIDER ANALYTICS DASHBOARD
-- =============================================
-- Table: provider_analytics
-- Aggregated analytics data (updated daily via cron job or trigger)
CREATE TABLE IF NOT EXISTS provider_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Date range
    period_type VARCHAR(20) NOT NULL CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'yearly')
    ),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Booking metrics
    total_bookings INTEGER DEFAULT 0,
    confirmed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    -- Revenue metrics
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    avg_booking_value DECIMAL(10, 2) DEFAULT 0,
    cancellation_revenue_loss DECIMAL(10, 2) DEFAULT 0,
    -- Performance metrics
    response_rate_percentage DECIMAL(5, 2) DEFAULT 0,
    -- % of messages responded to within 24h
    acceptance_rate_percentage DECIMAL(5, 2) DEFAULT 0,
    -- % of booking requests accepted
    cancellation_rate_percentage DECIMAL(5, 2) DEFAULT 0,
    -- Client metrics
    new_clients INTEGER DEFAULT 0,
    repeat_clients INTEGER DEFAULT 0,
    -- Review metrics
    total_reviews INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    -- View metrics
    profile_views INTEGER DEFAULT 0,
    annonce_views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(provider_id, period_type, period_start)
);
CREATE INDEX IF NOT EXISTS idx_analytics_provider_period ON provider_analytics(provider_id, period_type, period_start DESC);
-- Table: earnings_breakdown
-- Detailed earnings by annonce/service
CREATE TABLE IF NOT EXISTS earnings_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    annonce_id UUID REFERENCES annonces(id) ON DELETE
    SET NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        bookings_count INTEGER DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        avg_price DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_earnings_provider ON earnings_breakdown(provider_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_annonce ON earnings_breakdown(annonce_id);
-- =============================================
-- FEATURE 7: MESSAGING ENHANCEMENTS
-- =============================================
-- TABLE conversations ALREADY EXISTS (7 columns: id, artist_id, client_id, last_message, annonce_id, created_at, updated_at)
-- Add missing columns
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS prestataire_id UUID,
    -- If not using artist_id
ADD COLUMN IF NOT EXISTS booking_id UUID,
    ADD COLUMN IF NOT EXISTS last_message_text TEXT,
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_message_sender_id UUID,
    ADD COLUMN IF NOT EXISTS unread_count_client INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unread_count_provider INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_archived_by_client BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_archived_by_provider BOOLEAN DEFAULT false;
-- Update existing data: map last_message → last_message_text
UPDATE conversations
SET last_message_text = last_message
WHERE last_message_text IS NULL;
-- Create indexes if not exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_conversations_client'
) THEN CREATE INDEX idx_conversations_client ON conversations(client_id, last_message_at DESC);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_conversations_provider'
) THEN CREATE INDEX idx_conversations_provider ON conversations(artist_id, last_message_at DESC);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_conversations_booking'
) THEN CREATE INDEX idx_conversations_booking ON conversations(booking_id);
END IF;
END $$;
-- Table: messages
-- Individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT,
    -- Attachments (photos, documents)
    attachments JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"type": "image", "url": "storage_url", "name": "photo.jpg", "size": 1024000}]
    -- Message type
    message_type VARCHAR(50) DEFAULT 'text' CHECK (
        message_type IN (
            'text',
            'template',
            'system',
            'booking_request',
            'booking_confirmation'
        )
    ),
    -- Template ID (if using predefined template)
    template_id UUID,
    -- Read status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    -- Delivery status
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;
-- Table: message_templates
-- Predefined message templates for quick responses
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    -- Category for organization
    category VARCHAR(50) DEFAULT 'general' CHECK (
        category IN (
            'greeting',
            'availability',
            'pricing',
            'confirmation',
            'followup',
            'general'
        )
    ),
    use_count INTEGER DEFAULT 0,
    -- Track popularity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_provider ON message_templates(provider_id, category);
-- =============================================
-- FEATURE 8: FLEXIBLE CANCELLATION POLICIES
-- =============================================
-- Table: cancellation_policies
-- Provider-defined cancellation policies
CREATE TABLE IF NOT EXISTS cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    -- Policy type
    policy_type VARCHAR(50) NOT NULL CHECK (
        policy_type IN ('flexible', 'moderate', 'strict', 'custom')
    ),
    -- Refund rules (JSONB array of time-based rules)
    refund_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [
    --   {"hours_before": 48, "refund_percentage": 100},
    --   {"hours_before": 24, "refund_percentage": 50},
    --   {"hours_before": 0, "refund_percentage": 0}
    -- ]
    -- Additional fees
    cancellation_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    cancellation_fee_fixed DECIMAL(10, 2) DEFAULT 0,
    -- Policy description (shown to clients)
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    -- One default policy per provider
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_provider ON cancellation_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_default ON cancellation_policies(provider_id, is_default) WHERE is_default = true;
-- Table: cancellation_requests
-- Tracks cancellation requests and approvals
CREATE TABLE IF NOT EXISTS cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    -- Who initiated cancellation
    cancelled_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cancelled_by_role VARCHAR(20) NOT NULL CHECK (cancelled_by_role IN ('client', 'provider')),
    -- Cancellation reason
    cancellation_reason TEXT NOT NULL,
    cancellation_category VARCHAR(50) CHECK (
        cancellation_category IN (
            'schedule_conflict',
            'emergency',
            'weather',
            'found_alternative',
            'price_issue',
            'other'
        )
    ),
    -- Applied policy
    policy_id UUID REFERENCES cancellation_policies(id) ON DELETE
    SET NULL,
        -- Refund calculation
        original_amount DECIMAL(10, 2) NOT NULL,
        refund_amount DECIMAL(10, 2) NOT NULL,
        refund_percentage DECIMAL(5, 2) NOT NULL,
        cancellation_fee DECIMAL(10, 2) DEFAULT 0,
        -- Hours before booking start
        hours_before_booking DECIMAL(10, 2),
        -- Status
        status VARCHAR(50) DEFAULT 'pending' CHECK (
            status IN ('pending', 'approved', 'rejected', 'refunded')
        ),
        -- Admin review (if disputes arise)
        reviewed_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        review_notes TEXT,
        -- Timestamps
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        processed_at TIMESTAMP WITH TIME ZONE,
        refunded_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking ON cancellation_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_cancelled_by ON cancellation_requests(cancelled_by);
-- =============================================
-- HELPER FUNCTIONS
-- =============================================
-- Function: Calculate dynamic price based on rules
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
        p_annonce_id UUID,
        p_booking_date DATE,
        p_booking_time TIME,
        p_duration_hours INTEGER
    ) RETURNS DECIMAL(10, 2) AS $$
DECLARE v_base_price DECIMAL(10, 2);
v_final_price DECIMAL(10, 2);
v_rule RECORD;
BEGIN -- Get base price from annonce
SELECT price INTO v_base_price
FROM annonces
WHERE id = p_annonce_id;
v_final_price := v_base_price;
-- Apply active pricing rules (ordered by priority)
FOR v_rule IN
SELECT *
FROM dynamic_pricing_rules
WHERE (
        annonce_id = p_annonce_id
        OR annonce_id IS NULL
    )
    AND is_active = true
ORDER BY priority DESC LOOP -- Apply rule based on type (simplified logic - should be more complex in production)
    CASE
        v_rule.rule_type
        WHEN 'seasonal' THEN IF p_booking_date BETWEEN (v_rule.rule_config->>'start_date')::DATE AND (v_rule.rule_config->>'end_date')::DATE THEN v_final_price := v_final_price * (v_rule.rule_config->>'price_multiplier')::DECIMAL;
END IF;
WHEN 'duration_based' THEN IF p_duration_hours >= (v_rule.rule_config->>'min_duration_hours')::INTEGER THEN v_final_price := v_final_price * (
    1 - (v_rule.rule_config->>'discount_percentage')::DECIMAL / 100
);
END IF;
WHEN 'day_of_week' THEN -- Check if booking day is in rule's days array
-- Simplified - production would parse JSONB array properly
NULL;
ELSE NULL;
END CASE
;
END LOOP;
RETURN ROUND(v_final_price, 2);
END;
$$ LANGUAGE plpgsql;
-- Function: Calculate refund amount based on cancellation policy
CREATE OR REPLACE FUNCTION calculate_refund_amount(p_booking_id UUID, p_policy_id UUID) RETURNS TABLE (
        refund_amount DECIMAL(10, 2),
        refund_percentage DECIMAL(5, 2),
        cancellation_fee DECIMAL(10, 2)
    ) AS $$
DECLARE v_booking_start TIMESTAMP WITH TIME ZONE;
v_booking_price DECIMAL(10, 2);
v_hours_before DECIMAL(10, 2);
v_refund_rules JSONB;
v_rule JSONB;
v_refund_pct DECIMAL(5, 2) := 0;
v_cancellation_fee_pct DECIMAL(5, 2);
v_cancellation_fee_fixed DECIMAL(10, 2);
BEGIN -- Get booking details
SELECT start_time,
    price INTO v_booking_start,
    v_booking_price
FROM bookings
WHERE id = p_booking_id;
-- Calculate hours before booking
v_hours_before := EXTRACT(
    EPOCH
    FROM (v_booking_start - now())
) / 3600;
-- Get policy rules
SELECT refund_rules,
    cancellation_fee_percentage,
    cancellation_fee_fixed INTO v_refund_rules,
    v_cancellation_fee_pct,
    v_cancellation_fee_fixed
FROM cancellation_policies
WHERE id = p_policy_id;
-- Find applicable refund percentage
FOR v_rule IN
SELECT *
FROM jsonb_array_elements(v_refund_rules) LOOP IF v_hours_before >= (v_rule->>'hours_before')::DECIMAL THEN v_refund_pct := (v_rule->>'refund_percentage')::DECIMAL;
EXIT;
END IF;
END LOOP;
-- Calculate amounts
RETURN QUERY
SELECT ROUND(v_booking_price * v_refund_pct / 100, 2) AS refund_amount,
    v_refund_pct AS refund_percentage,
    ROUND(
        v_booking_price * v_cancellation_fee_pct / 100 + v_cancellation_fee_fixed,
        2
    ) AS cancellation_fee;
END;
$$ LANGUAGE plpgsql;
-- Function: Update provider analytics (call daily via cron)
CREATE OR REPLACE FUNCTION update_provider_analytics(
        p_provider_id UUID,
        p_period_type VARCHAR,
        p_period_start DATE,
        p_period_end DATE
    ) RETURNS VOID AS $$
DECLARE v_analytics RECORD;
BEGIN -- Calculate metrics
SELECT COUNT(*) FILTER (
        WHERE status != 'cancelled'
    ) AS total_bookings,
    COUNT(*) FILTER (
        WHERE status = 'confirmed'
    ) AS confirmed_bookings,
    COUNT(*) FILTER (
        WHERE status = 'cancelled'
    ) AS cancelled_bookings,
    COUNT(*) FILTER (
        WHERE status = 'completed'
    ) AS completed_bookings,
    COALESCE(
        SUM(price) FILTER (
            WHERE status = 'completed'
        ),
        0
    ) AS total_revenue,
    COALESCE(
        AVG(price) FILTER (
            WHERE status != 'cancelled'
        ),
        0
    ) AS avg_booking_value INTO v_analytics
FROM bookings
WHERE provider_id = p_provider_id
    AND created_at::DATE BETWEEN p_period_start AND p_period_end;
-- Insert or update analytics
INSERT INTO provider_analytics (
        provider_id,
        period_type,
        period_start,
        period_end,
        total_bookings,
        confirmed_bookings,
        cancelled_bookings,
        completed_bookings,
        total_revenue,
        avg_booking_value
    )
VALUES (
        p_provider_id,
        p_period_type,
        p_period_start,
        p_period_end,
        v_analytics.total_bookings,
        v_analytics.confirmed_bookings,
        v_analytics.cancelled_bookings,
        v_analytics.completed_bookings,
        v_analytics.total_revenue,
        v_analytics.avg_booking_value
    ) ON CONFLICT (provider_id, period_type, period_start) DO
UPDATE
SET total_bookings = EXCLUDED.total_bookings,
    confirmed_bookings = EXCLUDED.confirmed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    total_revenue = EXCLUDED.total_revenue,
    avg_booking_value = EXCLUDED.avg_booking_value,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
-- =============================================
-- TRIGGERS
-- =============================================
-- Trigger: Auto-update timestamps
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_pricing_rules_timestamp BEFORE
UPDATE ON dynamic_pricing_rules FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_analytics_timestamp BEFORE
UPDATE ON provider_analytics FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_conversations_timestamp BEFORE
UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_templates_timestamp BEFORE
UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_policies_timestamp BEFORE
UPDATE ON cancellation_policies FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_cancellation_requests_timestamp BEFORE
UPDATE ON cancellation_requests FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Trigger: Update conversation last_message info when new message sent
CREATE OR REPLACE FUNCTION update_conversation_last_message() RETURNS TRIGGER AS $$ BEGIN
UPDATE conversations
SET last_message_text = NEW.message_text,
    last_message_at = NEW.created_at,
    last_message_sender_id = NEW.sender_id,
    unread_count_client = CASE
        WHEN NEW.receiver_id = client_id THEN unread_count_client + 1
        ELSE unread_count_client
    END,
    unread_count_provider = CASE
        WHEN NEW.receiver_id = provider_id THEN unread_count_provider + 1
        ELSE unread_count_provider
    END,
    updated_at = now()
WHERE id = NEW.conversation_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_conversation_on_new_message
AFTER
INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
-- Trigger: Reset unread count when messages are marked as read
CREATE OR REPLACE FUNCTION reset_unread_count() RETURNS TRIGGER AS $$ BEGIN IF NEW.is_read = true
    AND OLD.is_read = false THEN
UPDATE conversations
SET unread_count_client = CASE
        WHEN NEW.receiver_id = client_id THEN GREATEST(unread_count_client - 1, 0)
        ELSE unread_count_client
    END,
    unread_count_provider = CASE
        WHEN NEW.receiver_id = provider_id THEN GREATEST(unread_count_provider - 1, 0)
        ELSE unread_count_provider
    END
WHERE id = NEW.conversation_id;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER reset_unread_on_message_read
AFTER
UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION reset_unread_count();
-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS on all tables
ALTER TABLE dynamic_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;
-- Pricing rules: Only provider can manage their own rules
CREATE POLICY pricing_rules_provider ON dynamic_pricing_rules FOR ALL USING (auth.uid() = provider_id);
-- Price history: Provider can view their own, clients can view for annonces they're interested in
CREATE POLICY price_history_provider ON price_history FOR
SELECT USING (auth.uid() = provider_id);
CREATE POLICY price_history_public ON price_history FOR
SELECT USING (
        annonce_id IN (
            SELECT id
            FROM annonces
            WHERE is_active = true
        )
    );
-- Analytics: Only provider can view their own analytics
CREATE POLICY analytics_provider ON provider_analytics FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY earnings_provider ON earnings_breakdown FOR ALL USING (auth.uid() = provider_id);
-- Conversations: Participants can view/update their own conversations
CREATE POLICY conversations_participants ON conversations FOR ALL USING (
    auth.uid() = client_id
    OR auth.uid() = provider_id
);
-- Messages: Participants can view/send messages in their conversations
CREATE POLICY messages_participants ON messages FOR
SELECT USING (
        conversation_id IN (
            SELECT id
            FROM conversations
            WHERE client_id = auth.uid()
                OR provider_id = auth.uid()
        )
    );
CREATE POLICY messages_send ON messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND conversation_id IN (
            SELECT id
            FROM conversations
            WHERE client_id = auth.uid()
                OR provider_id = auth.uid()
        )
    );
CREATE POLICY messages_update_own ON messages FOR
UPDATE USING (
        auth.uid() = receiver_id
        OR auth.uid() = sender_id
    );
-- Templates: Provider can manage their own templates
CREATE POLICY templates_provider ON message_templates FOR ALL USING (auth.uid() = provider_id);
-- Cancellation policies: Provider manages their own, clients can view
CREATE POLICY policies_provider ON cancellation_policies FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY policies_public ON cancellation_policies FOR
SELECT USING (is_active = true);
-- Cancellation requests: Booking participants can view/create
CREATE POLICY cancellation_requests_participants ON cancellation_requests FOR ALL USING (
    booking_id IN (
        SELECT id
        FROM bookings
        WHERE client_id = auth.uid()
            OR provider_id = auth.uid()
    )
);
-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================
-- Predefined cancellation policy templates
INSERT INTO cancellation_policies (
        id,
        provider_id,
        policy_name,
        policy_type,
        refund_rules,
        description,
        is_default,
        is_active
    )
VALUES -- Flexible policy (default example - update provider_id to actual UUID)
    (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'Flexible Cancellation',
        'flexible',
        '[{"hours_before": 24, "refund_percentage": 100}, {"hours_before": 0, "refund_percentage": 50}]'::jsonb,
        'Full refund if cancelled 24+ hours before. 50% refund if less than 24 hours.',
        false,
        true
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- COMPLETION NOTES
-- =============================================
-- TODO: Run this SQL in Supabase SQL Editor
-- TODO: Verify all RLS policies work correctly
-- TODO: Create storage buckets for message attachments: `message_attachments`
-- TODO: Set up storage policies for message file uploads
-- TODO: Create cron job to call update_provider_analytics() daily
-- TODO: Add indexes for frequently queried fields based on usage patterns
-- Phase 2 Schema Complete ✅