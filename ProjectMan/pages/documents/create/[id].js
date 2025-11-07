import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

const LANGUAGES = {
  en: {
    title: "Create Document",
    backToTemplates: "← Back to Templates",
    selectProject: "Select Project",
    documentTitle: "Document Title",
    create: "Create Document",
    creating: "Creating...",
    selectProjectFirst: "Please select a project first",
    titleRequired: "Document title is required",
    loading: "Loading..."
  },
  fr: {
    title: "Créer un Document",
    backToTemplates: "← Retour aux Modèles",
    selectProject: "Sélectionner un Projet",
    documentTitle: "Titre du Document",
    create: "Créer le Document",
    creating: "Création...",
    selectProjectFirst: "Veuillez d'abord sélectionner un projet",
    titleRequired: "Le titre du document est requis",
    loading: "Chargement..."
  }
};

export default function CreateDocumentPage() {
  const router = useRouter();
  const { id: typeId } = router.query;
  
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deliverableType, setDeliverableType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = LANGUAGES[language];

  useEffect(() => {
    if (typeId) {
      loadData();
    }
  }, [typeId]);

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

      // Get deliverable type
      const { data: typeData } = await supabase
        .from('deliverable_types')
        .select(`
          *,
          phases (name, order_index)
        `)
        .eq('id', typeId)
        .single();

      if (typeData) {
        setDeliverableType(typeData);
        setDocumentTitle(`New ${typeData.name}`);

        // Get templates for this type
        const { data: templatesData } = await supabase
          .from('deliverable_templates')
          .select('*')
          .eq('type_id', typeId)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        setTemplates(templatesData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!selectedProject) {
      alert(t.selectProjectFirst);
      return;
    }

    if (!documentTitle.trim()) {
      alert(t.titleRequired);
      return;
    }

    setCreating(true);

    try {
      // Get template content if selected
      let templateContent = {};
      if (selectedTemplate) {
        const { data: templateData } = await supabase
          .from('deliverable_templates')
          .select('content')
          .eq('id', selectedTemplate)
          .single();
        
        if (templateData) {
          templateContent = templateData.content;
        }
      }

      // Create deliverable
      const { data: newDeliverable, error } = await supabase
        .from('deliverables')
        .insert([{
          project_id: selectedProject,
          phase_id: deliverableType?.phase_id,
          type_id: typeId,
          template_id: selectedTemplate || null,
          title: documentTitle.trim(),
          content: templateContent,
          status: 'draft',
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        alert('Error: ' + error.message);
      } else {
        // Redirect to edit page
        router.push(`/documents/edit/${newDeliverable.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (!deliverableType) {
    return (
      <div style={styles.container}>
        <p>Document type not found</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t.title} - {deliverableType.name} - ProjectHub</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/documents/templates')}
          >
            {t.backToTemplates}
          </button>
          
          <div style={styles.headerContent}>
            <h1 style={styles.title}>
              {t.title}: {deliverableType.name}
            </h1>
            <p style={styles.subtitle}>
              {deliverableType.description}
            </p>
          </div>
        </header>

        {/* Form */}
        <main style={styles.main}>
          <div style={styles.form}>
            <div style={styles.formGroup}>
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

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.documentTitle}</label>
              <input
                type="text"
                style={styles.input}
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={t.documentTitle}
              />
            </div>

            {templates.length > 0 && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Template (Optional)</label>
                <select 
                  style={styles.select}
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">No template (blank document)</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              style={styles.createButton}
              onClick={handleCreate}
              disabled={creating || !selectedProject || !documentTitle.trim()}
            >
              {creating ? t.creating : t.create}
            </button>
          </div>

          {/* Template Preview (if available) */}
          {templates.length > 0 && (
            <div style={styles.templatesSection}>
              <h3 style={styles.sectionTitle}>Available Templates</h3>
              <div style={styles.templatesGrid}>
                {templates.map(template => (
                  <div 
                    key={template.id} 
                    style={{
                      ...styles.templateCard,
                      ...(selectedTemplate === template.id ? styles.selectedTemplate : {})
                    }}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h4 style={styles.templateName}>{template.name}</h4>
                    <p style={styles.templateDesc}>
                      {template.description || 'Template description'}
                    </p>
                  </div>
                ))}
              </div>
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
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0
  },

  main: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '3rem'
  },

  form: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    height: 'fit-content',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  formGroup: {
    marginBottom: '1.5rem'
  },

  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },

  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box'
  },

  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  },

  createButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.875rem 2rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    marginTop: '1rem'
  },

  templatesSection: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem'
  },

  templatesGrid: {
    display: 'grid',
    gap: '1rem'
  },

  templateCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  selectedTemplate: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },

  templateName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  templateDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0
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