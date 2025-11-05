import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Configuration multilingue
const LANGUAGES = {
  en: {
    title: "ProjectHub",
    createProject: "+ Create Project",
    myProjects: "My Projects",
    noProjects: "No projects yet. Create your first project!",
    projectName: "Project Name",
    startDate: "Start Date",
    endDate: "End Date (optional)",
    cancel: "Cancel",
    create: "Create",
    draft: "Draft",
    active: "Active", 
    completed: "Completed",
    archived: "Archived",
    progress: "Progress",
    lastActivity: "Last activity",
    logout: "Logout",
    creatingProject: "Creating project..."
  },
  fr: {
    title: "ProjectHub",
    createProject: "+ Créer un Projet",
    myProjects: "Mes Projets",
    noProjects: "Aucun projet. Créez votre premier projet !",
    projectName: "Nom du Projet",
    startDate: "Date de Début",
    endDate: "Date de Fin (optionnel)",
    cancel: "Annuler",
    create: "Créer",
    draft: "Brouillon",
    active: "Actif",
    completed: "Terminé",
    archived: "Archivé",
    progress: "Avancement",
    lastActivity: "Dernière activité",
    logout: "Déconnexion",
    creatingProject: "Création du projet..."
  }
};

const STATUS_COLORS = {
  draft: '#95a5a6',
  active: '#3498db',
  completed: '#27ae60',
  archived: '#7f8c8d'
};

export default function ProjectManPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [language, setLanguage] = useState('en');
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const t = LANGUAGES[language];

  // Load user and projects
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        setLoading(false);
        return;
      }

      setUser(userData);
      setLanguage(userData.language || 'en');

      // Get projects with phases
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_phases (
            status,
            phase_id
          )
        `)
        .eq('owner_id', userData.id)
        .order('updated_at', { ascending: false });
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      } else {
        // Calculate progress for each project
        const projectsWithProgress = projectsData.map(project => {
          const phases = project.project_phases || [];
          const totalPhases = 5; // We have 5 phases
          const completedPhases = phases.filter(p => p.status === 'completed').length;
          const progress = phases.length > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
          
          return {
            ...project,
            progress
          };
        });
        
        setProjects(projectsWithProgress);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert(t.projectName + ' is required');
      return;
    }

    setCreating(true);

    try {
      // Create project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([{
          owner_id: user.id,
          name: projectName.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          status: 'draft'
        }])
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        alert('Error creating project: ' + projectError.message);
        setCreating(false);
        return;
      }

      // Get all phases
      const { data: phasesData } = await supabase
        .from('phases')
        .select('id')
        .order('order_index');

      // Create project_phases entries
      if (phasesData) {
        const projectPhases = phasesData.map(phase => ({
          project_id: newProject.id,
          phase_id: phase.id,
          status: 'not_started'
        }));

        await supabase
          .from('project_phases')
          .insert(projectPhases);
      }

      // Reset form and close modal
      setProjectName('');
      setStartDate('');
      setEndDate('');
      setShowModal(false);
      setCreating(false);

      // Reload projects
      loadData();

    } catch (error) {
      console.error('Error:', error);
      setCreating(false);
    }
  };

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    if (user) {
      await supabase
        .from('users')
        .update({ language: newLang })
        .eq('id', user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>
      
      <div style={styles.container}>
        {/* Top Bar */}
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h1 style={styles.logo}>ProjectHub</h1>
            <button style={styles.createButton} onClick={() => setShowModal(true)}>
              {t.createProject}
            </button>
          </div>
          
          <div style={styles.topBarRight}>
            <button style={styles.langButton} onClick={() => handleLanguageChange(language === 'en' ? 'fr' : 'en')}>
              {language === 'en' ? '🇬🇧' : '🇫🇷'}
            </button>
            <div style={styles.userProfile}>
              <span style={styles.userName}>{user?.full_name || 'User'}</span>
              <button style={styles.logoutButton} onClick={handleLogout}>
                {t.logout}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>{t.myProjects}</h2>
          
          {projects.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>{t.noProjects}</p>
              <button style={styles.createButtonLarge} onClick={() => setShowModal(true)}>
                {t.createProject}
              </button>
            </div>
          ) : (
            <div style={styles.projectsGrid}>
              {projects.map(project => (
                <div 
                  key={project.id} 
                  style={styles.projectCard}
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={styles.projectName}>{project.name}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[project.status]
                    }}>
                      {t[project.status]}
                    </span>
                  </div>
                  
                  <div style={styles.cardBody}>
                    <div style={styles.progressSection}>
                      <div style={styles.progressLabel}>
                        <span>{t.progress}</span>
                        <span style={styles.progressValue}>{project.progress}%</span>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${project.progress}%`
                        }}></div>
                      </div>
                    </div>
                    
                    <div style={styles.cardFooter}>
                      <span style={styles.lastActivity}>
                        {t.lastActivity}: {formatDate(project.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Create Project Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => !creating && setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>{t.createProject}</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.projectName}</label>
                <input
                  type="text"
                  style={styles.input}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t.projectName}
                  disabled={creating}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.startDate}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={creating}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.endDate}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={creating}
                />
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  style={styles.cancelButton} 
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  {t.cancel}
                </button>
                <button 
                  style={styles.submitButton} 
                  onClick={handleCreateProject}
                  disabled={creating}
                >
                  {creating ? t.creatingProject : t.create}
                </button>
              </div>
            </div>
          </div>
        )}
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
  
  topBar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  
  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  
  createButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)'
  },
  
  langButton: {
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    fontSize: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  
  userName: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  
  logoutButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  main: {
    padding: '2.5rem 2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1.5rem'
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
    fontSize: '1.125rem',
    marginBottom: '1.5rem'
  },
  
  createButtonLarge: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  
  projectCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem'
  },
  
  projectName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    flex: 1
  },
  
  statusBadge: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: '0.75rem'
  },
  
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  
  progressValue: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
    borderRadius: '4px'
  },
  
  cardFooter: {
    paddingTop: '0.75rem',
    borderTop: '1px solid #f3f4f6'
  },
  
  lastActivity: {
    fontSize: '0.8125rem',
    color: '#9ca3af'
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1.5rem'
  },
  
  formGroup: {
    marginBottom: '1.25rem'
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
    borderRadius: '8px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '2rem'
  },
  
  cancelButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  submitButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
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
