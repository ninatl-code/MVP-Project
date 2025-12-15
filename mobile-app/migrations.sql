-- Migration: Synchronize with existing production database structure
-- Date: 2024
-- Version: 001
-- NOTE: This migration aligns with the ACTUAL schema from Supabase (existingdatabase.md)

-- 1. CREATE integrations TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographe_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'google_calendar', 'outlook', 'paypal')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photographe_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_photographe_id ON public.integrations(photographe_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

-- 2. ENSURE profils_photographe table exists (ALREADY CONFIRMED IN SCHEMA)
-- This table already exists and has the full structure - no action needed

-- 3. ENSURE galeries_livraison is properly indexed
-- Table columns: id, reservation_id, photographe_id, client_id (NOT particulier_id!)
CREATE INDEX IF NOT EXISTS idx_galeries_livraison_prestataire_id ON public.galeries_livraison(photographe_id);
CREATE INDEX IF NOT EXISTS idx_galeries_livraison_client_id ON public.galeries_livraison(client_id);

-- 4. ENSURE conversations table is properly indexed
-- Table has: client_id, photographe_id (NOT prestataire_id directly!)
CREATE INDEX IF NOT EXISTS idx_conversations_photographe_id ON public.conversations(photographe_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);

-- 5. VERIFY statistiques_avis exists (CONFIRMED IN SCHEMA - DO NOT CREATE provider_analytics!)
-- This table already exists with: photographe_id, note_globale_moyenne, total_avis, etc.

-- 6. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_avis_reviewee_id ON public.avis(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_avis_reviewer_id ON public.avis(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_photographe_id ON public.reservations(photographe_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON public.reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_packages_types_photographe_id ON public.packages_types(photographe_id);

-- 7. ENSURE RLS POLICIES
ALTER TABLE IF EXISTS public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "photographers_can_manage_own_integrations" ON public.integrations
  FOR ALL USING (auth.uid() = photographe_id) WITH CHECK (auth.uid() = photographe_id);

-- FINAL: Run this to verify all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
