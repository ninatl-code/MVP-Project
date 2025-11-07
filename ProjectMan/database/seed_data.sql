-- ==============================================
-- DONNÉES D'EXEMPLE POUR L'OUTIL DE DOCUMENTS
-- ==============================================
-- 1. PHASES DE PROJET (Standard PMI)
INSERT INTO phases (id, name, order_index, description)
VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        'Initiation',
        0,
        'Project initiation and charter creation'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'Planning',
        1,
        'Detailed project planning and documentation'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'Execution',
        2,
        'Project execution and deliverable creation'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'Monitoring',
        3,
        'Project monitoring and control activities'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'Closure',
        4,
        'Project closure and lessons learned'
    ) ON CONFLICT (id) DO NOTHING;
-- 2. TYPES DE LIVRABLES PAR PHASE
-- Phase Initiation
INSERT INTO deliverable_types (id, name, description, phase_id)
VALUES (
        '650e8400-e29b-41d4-a716-446655440001',
        'Project Charter',
        'Document that formally authorizes the project',
        '550e8400-e29b-41d4-a716-446655440001'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440002',
        'Stakeholder Register',
        'List of project stakeholders and their information',
        '550e8400-e29b-41d4-a716-446655440001'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440003',
        'Business Case',
        'Justification for the project investment',
        '550e8400-e29b-41d4-a716-446655440001'
    ),
    -- Phase Planning
    (
        '650e8400-e29b-41d4-a716-446655440004',
        'Project Plan',
        'Comprehensive project management plan',
        '550e8400-e29b-41d4-a716-446655440002'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440005',
        'Work Breakdown Structure',
        'Hierarchical breakdown of project work',
        '550e8400-e29b-41d4-a716-446655440002'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440006',
        'Gantt Chart',
        'Visual project timeline and dependencies',
        '550e8400-e29b-41d4-a716-446655440002'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440007',
        'Risk Register',
        'Identified risks and mitigation strategies',
        '550e8400-e29b-41d4-a716-446655440002'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440008',
        'Budget Plan',
        'Detailed project budget and cost breakdown',
        '550e8400-e29b-41d4-a716-446655440002'
    ),
    -- Phase Execution
    (
        '650e8400-e29b-41d4-a716-446655440009',
        'Status Report',
        'Regular project progress reporting',
        '550e8400-e29b-41d4-a716-446655440003'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440010',
        'Meeting Minutes',
        'Record of project meetings and decisions',
        '550e8400-e29b-41d4-a716-446655440003'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440011',
        'Change Request',
        'Formal request for project changes',
        '550e8400-e29b-41d4-a716-446655440003'
    ),
    -- Phase Monitoring
    (
        '650e8400-e29b-41d4-a716-446655440012',
        'Performance Dashboard',
        'Visual KPI tracking and metrics',
        '550e8400-e29b-41d4-a716-446655440004'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440013',
        'Quality Report',
        'Quality assurance and control documentation',
        '550e8400-e29b-41d4-a716-446655440004'
    ),
    -- Phase Closure
    (
        '650e8400-e29b-41d4-a716-446655440014',
        'Project Closure Report',
        'Final project summary and outcomes',
        '550e8400-e29b-41d4-a716-446655440005'
    ),
    (
        '650e8400-e29b-41d4-a716-446655440015',
        'Lessons Learned',
        'Knowledge gained throughout the project',
        '550e8400-e29b-41d4-a716-446655440005'
    ) ON CONFLICT (id) DO NOTHING;
-- 3. MODÈLES DE DOCUMENTS (Templates)
-- Template pour Project Charter
INSERT INTO deliverable_templates (
        id,
        name,
        description,
        type_id,
        content,
        is_public,
        created_at
    )
VALUES (
        '750e8400-e29b-41d4-a716-446655440001',
        'Standard Project Charter',
        'Professional project charter template',
        '1244f220-e7d5-40d0-94aa-b5a8d85afb14',
        '{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "title": {"en": "Project Charter", "fr": "Charte Projet"},
      "required": true
    },
    {
      "id": "project_overview",
      "type": "content", 
      "title": {"en": "Project Overview", "fr": "Vue d''ensemble du Projet"},
      "fields": [
        {
          "id": "project_name",
          "type": "text",
          "label": {"en": "Project Name", "fr": "Nom du Projet"},
          "placeholder": {"en": "Enter project name", "fr": "Saisir le nom du projet"},
          "required": true
        },
        {
          "id": "project_description", 
          "type": "textarea",
          "label": {"en": "Project Description", "fr": "Description du Projet"},
          "rows": 4
        }
      ]
    },
    {
      "id": "objectives",
      "type": "content",
      "title": {"en": "Project Objectives", "fr": "Objectifs du Projet"},
      "fields": [
        {
          "id": "main_objectives",
          "type": "textarea", 
          "label": {"en": "Main Objectives", "fr": "Objectifs Principaux"},
          "rows": 5
        }
      ]
    },
    {
      "id": "stakeholders",
      "type": "content",
      "title": {"en": "Key Stakeholders", "fr": "Parties Prenantes Clés"},
      "fields": [
        {
          "id": "project_sponsor",
          "type": "text",
          "label": {"en": "Project Sponsor", "fr": "Sponsor du Projet"}
        },
        {
          "id": "project_manager", 
          "type": "text",
          "label": {"en": "Project Manager", "fr": "Chef de Projet"}
        }
      ]
    }
  ],
  "defaultStyle": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#64748b", 
    "fontFamily": "Inter",
    "fontSize": 14
  }
}',
        true,
        NOW()
    ),
    -- Template pour Gantt Chart
    (
        '750e8400-e29b-41d4-a716-446655440002',
        'Interactive Gantt Chart',
        'Visual project timeline template',
        'b8c2b644-3636-4c3e-8a98-1788150d6edd',
        '{
  "sections": [
    {
      "id": "header",
      "type": "header", 
      "title": {"en": "Project Timeline", "fr": "Calendrier du Projet"},
      "required": true
    },
    {
      "id": "timeline_overview",
      "type": "content",
      "title": {"en": "Timeline Overview", "fr": "Vue d''ensemble du Calendrier"},
      "fields": [
        {
          "id": "project_start",
          "type": "date",
          "label": {"en": "Project Start Date", "fr": "Date de Début"}
        },
        {
          "id": "project_end",
          "type": "date", 
          "label": {"en": "Project End Date", "fr": "Date de Fin"}
        }
      ]
    },
    {
      "id": "milestones",
      "type": "table",
      "title": {"en": "Key Milestones", "fr": "Jalons Clés"},
      "columns": [
        {"id": "milestone", "label": {"en": "Milestone", "fr": "Jalon"}},
        {"id": "date", "label": {"en": "Target Date", "fr": "Date Cible"}},
        {"id": "status", "label": {"en": "Status", "fr": "Statut"}}
      ]
    }
  ],
  "defaultStyle": {
    "primaryColor": "#059669",
    "secondaryColor": "#6b7280",
    "fontFamily": "Inter", 
    "fontSize": 12
  }
}',
        true,
        NOW()
    ),
    -- Template pour Status Report
    (
        '750e8400-e29b-41d4-a716-446655440003',
        'Comprehensive Status Report',
        'Weekly/Monthly project status template',
        'f6642312-b8c1-4f97-b993-6408ff1b9cbf',
        '{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "title": {"en": "Project Status Report", "fr": "Rapport de Statut du Projet"}, 
      "required": true
    },
    {
      "id": "summary",
      "type": "content",
      "title": {"en": "Executive Summary", "fr": "Résumé Exécutif"},
      "fields": [
        {
          "id": "overall_status",
          "type": "select",
          "label": {"en": "Overall Status", "fr": "Statut Général"},
          "options": [
            {"value": "green", "label": {"en": "On Track", "fr": "En Bonne Voie"}},
            {"value": "yellow", "label": {"en": "At Risk", "fr": "À Risque"}}, 
            {"value": "red", "label": {"en": "Critical", "fr": "Critique"}}
          ]
        },
        {
          "id": "progress_percentage",
          "type": "number",
          "label": {"en": "Progress %", "fr": "Avancement %"},
          "min": 0,
          "max": 100
        }
      ]
    },
    {
      "id": "achievements",
      "type": "content", 
      "title": {"en": "Key Achievements", "fr": "Réalisations Clés"},
      "fields": [
        {
          "id": "achievements_list",
          "type": "textarea",
          "label": {"en": "Achievements This Period", "fr": "Réalisations de Cette Période"},
          "rows": 4
        }
      ]
    },
    {
      "id": "issues",
      "type": "content",
      "title": {"en": "Issues & Risks", "fr": "Problèmes & Risques"},
      "fields": [
        {
          "id": "current_issues",
          "type": "textarea", 
          "label": {"en": "Current Issues", "fr": "Problèmes Actuels"},
          "rows": 3
        },
        {
          "id": "risks",
          "type": "textarea",
          "label": {"en": "Identified Risks", "fr": "Risques Identifiés"}, 
          "rows": 3
        }
      ]
    }
  ],
  "defaultStyle": {
    "primaryColor": "#dc2626",
    "secondaryColor": "#64748b",
    "fontFamily": "Arial",
    "fontSize": 11
  }
}',
        true,
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
-- 4. PROJET D'EXEMPLE POUR TESTER
-- Insérer un utilisateur exemple (remplacez l'auth_id par un vrai UUID d'auth)
-- INSERT INTO users (id, auth_id, full_name, language) VALUES 
-- ('850e8400-e29b-41d4-a716-446655440001', 'YOUR_AUTH_UUID_HERE', 'Test User', 'fr')
-- ON CONFLICT (auth_id) DO NOTHING;
-- Projet exemple
-- INSERT INTO projects (id, owner_id, name, description, status, start_date) VALUES
-- ('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 'Site E-commerce MVP', 'Développement d''une plateforme de vente en ligne', 'active', '2024-01-15')
-- ON CONFLICT (id) DO NOTHING;