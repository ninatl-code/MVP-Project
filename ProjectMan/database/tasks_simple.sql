-- SCHEMA SIMPLE POUR TESTS (sans RLS)
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des tâches pour le planning
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL, -- Simplifié pour les tests
    title TEXT NOT NULL,
    assignee TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'À faire',
    progress INTEGER DEFAULT 0,
    is_parent BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    indent_level INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Données de test
INSERT INTO tasks (project_id, title, assignee, start_date, end_date, notes, status, progress)
VALUES 
    ('test-project-1', 'Analyse des besoins', 'Alice', '2024-11-01', '2024-11-15', 'Recueillir les besoins clients', 'Terminé', 100),
    ('test-project-1', 'Conception architecture', 'Bob', '2024-11-10', '2024-11-25', 'Définir l''architecture technique', 'En cours', 60),
    ('test-project-1', 'Développement frontend', 'Charlie', '2024-11-20', '2024-12-15', 'Interface utilisateur', 'À faire', 0),
    ('test-project-1', 'Tests unitaires', 'Alice', '2024-12-01', '2024-12-10', 'Tests automatisés', 'À faire', 0),
    ('test-project-1', 'Déploiement', 'Bob', '2024-12-10', '2024-12-15', 'Mise en production', 'À faire', 0)
ON CONFLICT DO NOTHING;