import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

// Configuration multilingue
const LANGUAGES = {
  en: {
    title: "Project Management Dashboard",
    welcome: "Welcome,",
    createProject: "Create New Project",
    myProjects: "My Projects",
    recentProjects: "Recent Projects",
    allProjects: "All Projects",
    noProjects: "No projects yet. Create your first project!",
    projectName: "Project Name",
    description: "Description",
    status: "Status",
    phase: "Phase",
    created: "Created",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    archive: "Archive",
    settings: "Settings",
    profile: "Profile",
    logout: "Logout",
    language: "Language",
    searchProjects: "Search projects...",
    filterBy: "Filter by",
    sortBy: "Sort by",
    draft: "Draft",
    active: "Active", 
    completed: "Completed",
    archived: "Archived",
    initiation: "Initiation",
    planning: "Planning",
    execution: "Execution",
    monitoring: "Monitoring & Control",
    closure: "Closure"
  },
  fr: {
    title: "Tableau de Bord Gestion de Projet",
    welcome: "Bienvenue,",
    createProject: "Créer un Nouveau Projet",
    myProjects: "Mes Projets",
    recentProjects: "Projets Récents",
    allProjects: "Tous les Projets",
    noProjects: "Aucun projet pour l'instant. Créez votre premier projet !",
    projectName: "Nom du Projet",
    description: "Description",
    status: "Statut",
    phase: "Phase",
    created: "Créé le",
    actions: "Actions",
    view: "Voir",
    edit: "Modifier",
    delete: "Supprimer",
    archive: "Archiver",
    settings: "Paramètres",
    profile: "Profil",
    logout: "Déconnexion",
    language: "Langue",
    searchProjects: "Rechercher des projets...",
    filterBy: "Filtrer par",
    sortBy: "Trier par",
    draft: "Brouillon",
    active: "Actif",
    completed: "Terminé",
    archived: "Archivé",
    initiation: "Initialisation",
    planning: "Planification", 
    execution: "Exécution",
    monitoring: "Suivi & Contrôle",
    closure: "Clôture"
  }
};

export default function ProjectManPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const t = LANGUAGES[user?.language || 'en'] || LANGUAGES.en;

  // Récupérer l'utilisateur connecté et ses projets
  useEffect(() => {
    async function loadUserData() {
      try {
        // Vérifier l'authentification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('No authenticated user');
          setLoading(false);
          return;
        }

        // Récupérer les données utilisateur
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

        // Récupérer les phases pour le mapping
        const { data: phasesData, error: phasesError } = await supabase
          .from('phases')
          .select('*')
          .order('order_index');
        
        if (!phasesError && phasesData) {
          const phasesMap = {};
          phasesData.forEach(phase => {
            phasesMap[phase.id] = phase.name.toLowerCase();
          });
          setPhases(phasesMap);
        }

        // Récupérer les projets de l'utilisateur
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            *,
            project_phases (
              status,
              phase_id,
              phases (
                name,
                order_index
              )
            )
          `)
          .eq('owner_id', userData.id)
          .order('created_at', { ascending: false });
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        } else {
          // Traiter les données des projets pour ajouter la phase actuelle
          const processedProjects = projectsData.map(project => {
            // Trouver la phase actuelle (en cours ou la plus avancée)
            let currentPhase = 'initiation';
            if (project.project_phases && project.project_phases.length > 0) {
              const inProgressPhase = project.project_phases.find(pp => pp.status === 'in_progress');
              if (inProgressPhase) {
                currentPhase = inProgressPhase.phases.name.toLowerCase();
              } else {
                // Prendre la dernière phase commencée
                const completedPhases = project.project_phases
                  .filter(pp => pp.status === 'completed')
                  .sort((a, b) => b.phases.order_index - a.phases.order_index);
                if (completedPhases.length > 0) {
                  currentPhase = completedPhases[0].phases.name.toLowerCase();
                }
              }
            }
            
            return {
              ...project,
              phase: currentPhase
            };
          });
          
          setProjects(processedProjects);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  const handleCreateProject = () => {
    // Navigation vers la page de création de projet
    window.location.href = '/create-project';
  };

  const handleViewProject = (projectId) => {
    window.location.href = `/project?id=${projectId}`;
  };

  const handleEditProject = (projectId) => {
    window.location.href = `/project/${projectId}/edit`;
  };

  const handleDeleteProject = async (projectId) => {
    if (confirm(user?.language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce projet ?' : 'Are you sure you want to delete this project?')) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('owner_id', user.id);
        
        if (error) {
          console.error('Error deleting project:', error);
          alert(user?.language === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting project');
        } else {
          setProjects(projects.filter(p => p.id !== projectId));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleLanguageChange = async (newLang) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ language: newLang })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating language:', error);
      } else {
        setUser({ ...user, language: newLang });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6B7280',
      active: '#10B981', 
      completed: '#3B82F6',
      archived: '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.logo}>ProjectHub</h1>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.userSection}>
              <span style={styles.welcomeText}>
                {t.welcome} {user.full_name}
              </span>
              <button 
                style={styles.userMenuButton}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                👤
              </button>
              
              {showUserMenu && (
                <div style={styles.userMenu}>
                  <div style={styles.menuItem}>
                    {t.language}:
                    <select 
                      value={user.language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      style={styles.languageSelect}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                  <div style={styles.menuItem}>{t.profile}</div>
                  <div style={styles.menuItem}>{t.settings}</div>
                  <div style={styles.menuItem} onClick={handleLogout}>{t.logout}</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.main}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading...</p>
            </div>
          ) : !user ? (
            <div style={styles.authContainer}>
              <p>Please log in to access your projects.</p>
              <button 
                style={styles.createButton}
                onClick={() => window.location.href = '/login'}
              >
                Login
              </button>
            </div>
          ) : (
            <>
          {/* Action Bar */}
          <div style={styles.actionBar}>
            <button style={styles.createButton} onClick={handleCreateProject}>
              + {t.createProject}
            </button>
            
            <div style={styles.searchAndFilter}>
              <input
                type="text"
                placeholder={t.searchProjects}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">{t.allProjects}</option>
                <option value="draft">{t.draft}</option>
                <option value="active">{t.active}</option>
                <option value="completed">{t.completed}</option>
                <option value="archived">{t.archived}</option>
              </select>
            </div>
          </div>

          {/* Projects Section */}
          <div style={styles.projectsSection}>
            <h2 style={styles.sectionTitle}>{t.myProjects}</h2>
            
            {filteredProjects.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <p style={styles.emptyText}>{t.noProjects}</p>
                <button style={styles.createButton} onClick={handleCreateProject}>
                  {t.createProject}
                </button>
              </div>
            ) : (
              <div style={styles.projectsGrid}>
                {filteredProjects.map(project => (
                  <div key={project.id} style={styles.projectCard}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.projectTitle}>{project.name}</h3>
                      <span 
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(project.status)
                        }}
                      >
                        {t[project.status]}
                      </span>
                    </div>
                    
                    <p style={styles.projectDescription}>
                      {project.description}
                    </p>
                    
                    <div style={styles.projectMeta}>
                      <div style={styles.metaItem}>
                        <strong>{t.phase}:</strong> {t[project.phase]}
                      </div>
                      <div style={styles.metaItem}>
                        <strong>{t.created}:</strong> {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div style={styles.cardActions}>
                      <button 
                        style={styles.actionButton}
                        onClick={() => handleViewProject(project.id)}
                      >
                        {t.view}
                      </button>
                      <button 
                        style={styles.actionButton}
                        onClick={() => handleEditProject(project.id)}
                      >
                        {t.edit}
                      </button>
                      <button 
                        style={{...styles.actionButton, ...styles.deleteButton}}
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  
  headerLeft: {},
  
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  
  headerRight: {},
  
  userSection: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  
  welcomeText: {
    color: '#64748b',
    fontSize: '0.875rem'
  },
  
  userMenuButton: {
    backgroundColor: '#e2e8f0',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '1.2rem'
  },
  
  userMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '0.5rem',
    minWidth: '200px',
    zIndex: 10
  },
  
  menuItem: {
    padding: '0.5rem',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  
  languageSelect: {
    marginLeft: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '0.25rem'
  },
  
  main: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    gap: '1rem'
  },
  
  createButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  
  searchAndFilter: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  
  searchInput: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    minWidth: '300px'
  },
  
  filterSelect: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem'
  },
  
  projectsSection: {},
  
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  
  emptyText: {
    color: '#64748b',
    fontSize: '1.1rem',
    marginBottom: '1.5rem'
  },
  
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  
  projectCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s'
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  
  projectTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  
  statusBadge: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  
  projectDescription: {
    color: '#64748b',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    marginBottom: '1rem'
  },
  
  projectMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  
  metaItem: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  
  actionButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  
  deleteButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px'
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  
  authContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  }
};
