import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const LANGUAGES = {
  en: {
    title: "Document Templates",
    subtitle: "Choose a template to create your document",
    backToDashboard: "← Back to Dashboard",
    selectProject: "Select Project",
    createDocument: "Create Document",
    templates: "Templates",
    byPhase: "By Project Phase",
    allTemplates: "All Templates",
    loading: "Loading templates...",
    noTemplates: "No templates available",
    phases: ["Initiation", "Planning", "Execution", "Monitoring & Control", "Closure"],
    selectProjectFirst: "Please select a project first",
    creating: "Creating document..."
  },
  fr: {
    title: "Modèles de Documents",
    subtitle: "Choisissez un modèle pour créer votre document",
    backToDashboard: "← Retour au Tableau de Bord",
    selectProject: "Sélectionner un Projet",
    createDocument: "Créer le Document",
    templates: "Modèles",
    byPhase: "Par Phase de Projet",
    allTemplates: "Tous les Modèles",
    loading: "Chargement des modèles...",
    noTemplates: "Aucun modèle disponible",
    phases: ["Initialisation", "Planification", "Exécution", "Suivi & Contrôle", "Clôture"],
    selectProjectFirst: "Veuillez d'abord sélectionner un projet",
    creating: "Création du document..."
  }
};

export default function DocumentTemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = LANGUAGES[language];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();

      if (userData) {
        setUser(userData);
        setLanguage(userData.language || 'en');

        // Get user's projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, status')
          .eq('owner_id', userData.id)
          .order('updated_at', { ascending: false });

        setProjects(projectsData || []);
      }

      // Get phases
      const { data: phasesData } = await supabase
        .from('phases')
        .select('*')
        .order('order_index');

      setPhases(phasesData || []);

      // Get deliverable types with templates count
      const { data: typesData } = await supabase
        .from('deliverable_types')
        .select(`
          *,
          phases (name, order_index),
          deliverable_templates (id)
        `)
        .order('name');

      setDeliverableTypes(typesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateDocument = async (typeId) => {
    if (!selectedProject) {
      alert(t.selectProjectFirst);
      return;
    }

    setCreating(true);
    
    try {
      // Find the selected type and its phase
      const selectedType = deliverableTypes.find(type => type.id === typeId);
      
      const { data: newDeliverable, error } = await supabase
        .from('deliverables')
        .insert([{
          project_id: selectedProject,
          phase_id: selectedType?.phase_id,
          type_id: typeId,
          title: `New ${selectedType?.name}`,
          status: 'draft',
          created_by: user.id,
          content: {}
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        alert('Error: ' + error.message);
      } else {
        router.push(`/documents/edit/${newDeliverable.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const filteredTypes = selectedPhase === 'all' 
    ? deliverableTypes 
    : deliverableTypes.filter(type => type.phases?.order_index === parseInt(selectedPhase));

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t.title} - ProjectHub</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/projectman')}
          >
            {t.backToDashboard}
          </button>
          
          <div style={styles.headerContent}>
            <h1 style={styles.title}>{t.title}</h1>
            <p style={styles.subtitle}>{t.subtitle}</p>
          </div>
        </header>

        {/* Controls */}
        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>{t.selectProject}</label>
            <select 
              style={styles.select}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">{t.selectProject}</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>{t.byPhase}</label>
            <select 
              style={styles.select}
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
            >
              <option value="all">{t.allTemplates}</option>
              {phases.map((phase, index) => (
                <option key={phase.id} value={phase.order_index}>
                  {t.phases[index]} ({phase.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <main style={styles.main}>
          {filteredTypes.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>{t.noTemplates}</p>
            </div>
          ) : (
            <div style={styles.templatesGrid}>
              {filteredTypes.map(type => (
                <div key={type.id} style={styles.templateCard}>
                  <div style={styles.templateIcon}>📄</div>
                  <h3 style={styles.templateName}>{type.name}</h3>
                  <p style={styles.templateDesc}>
                    {type.description || 'Document template'}
                  </p>
                  {type.phases && (
                    <div style={styles.phaseTag}>
                      {t.phases[type.phases.order_index] || type.phases.name}
                    </div>
                  )}
                  <button 
                    style={styles.createButton}
                    onClick={() => handleCreateDocument(type.id)}
                    disabled={!selectedProject || creating}
                  >
                    {creating ? t.creating : t.createDocument}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  backButton: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    padding: '0.5rem 0'
  },

  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto'
  },

  title: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  subtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    margin: 0
  },

  controls: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f3f4f6',
    padding: '1.5rem 2rem',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap'
  },

  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '200px'
  },

  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },

  select: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff'
  },

  main: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },

  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem'
  },

  templateCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  templateIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },

  templateName: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.75rem'
  },

  templateDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },

  phaseTag: {
    display: 'inline-block',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },

  createButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%'
  },

  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb'
  },

  emptyText: {
    color: '#6b7280',
    fontSize: '1.125rem'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '1rem'
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};