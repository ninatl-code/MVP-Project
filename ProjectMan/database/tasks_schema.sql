-- ==============================================
-- SCHEMA POUR LA TABLE TASKS (Planning Smartsheet)
-- ==============================================

-- Table des tâches pour le planning
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assignee TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'À faire' CHECK (status IN ('À faire', 'En cours', 'Terminé', 'En attente', 'Bloqué')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
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
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(project_id, order_index);

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

-- RLS (Row Level Security) - optionnel
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Politique RLS basique (à adapter selon vos besoins d'authentification)
CREATE POLICY IF NOT EXISTS "Users can view tasks from their projects" ON tasks
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE created_by = auth.uid() 
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert tasks in their projects" ON tasks
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE created_by = auth.uid() 
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update tasks in their projects" ON tasks
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE created_by = auth.uid() 
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY IF NOT EXISTS "Users can delete tasks in their projects" ON tasks
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE created_by = auth.uid() 
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );