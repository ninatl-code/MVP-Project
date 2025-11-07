-- ==============================================
-- AMÉLIORATIONS SCHEMA POUR OUTIL DOCUMENTS
-- ==============================================
-- 1. AJOUTER COLONNES MANQUANTES À deliverables
ALTER TABLE deliverables
ADD COLUMN IF NOT EXISTS customization JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS export_count INTEGER DEFAULT 0;
-- 2. NOUVELLE TABLE : Personnalisations de documents
CREATE TABLE IF NOT EXISTS document_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    font_family TEXT DEFAULT 'Inter',
    font_size INTEGER DEFAULT 14,
    margin_top INTEGER DEFAULT 20,
    margin_bottom INTEGER DEFAULT 20,
    margin_left INTEGER DEFAULT 20,
    margin_right INTEGER DEFAULT 20,
    header_height INTEGER DEFAULT 60,
    footer_height INTEGER DEFAULT 40,
    custom_styles JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. NOUVELLE TABLE : Historique des exports
CREATE TABLE IF NOT EXISTS document_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'html', 'png')),
    file_url TEXT,
    file_size BIGINT,
    exported_by UUID REFERENCES users(id),
    export_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 4. AMÉLIORER deliverable_templates avec metadata
ALTER TABLE deliverable_templates
ADD COLUMN IF NOT EXISTS preview_image TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT [] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (
        difficulty_level IN ('beginner', 'intermediate', 'advanced')
    ),
    ADD COLUMN IF NOT EXISTS estimated_time INTEGER,
    -- en minutes
ADD COLUMN IF NOT EXISTS default_customization JSONB DEFAULT '{}';
-- 5. INDEX pour performance
CREATE INDEX IF NOT EXISTS idx_deliverables_project_phase ON deliverables(project_id, phase_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_templates_type ON deliverable_templates(type_id);
CREATE INDEX IF NOT EXISTS idx_document_customizations_deliverable ON document_customizations(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_document_exports_deliverable ON document_exports(deliverable_id);
-- 6. TRIGGERS pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_document_customizations_updated_at BEFORE
UPDATE ON document_customizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();