import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Documents par phase
const DELIVERABLES_BY_PHASE = {
  initiation: [
    { id: 'project-charter', title: 'Charte de projet', titleEn: 'Project Charter' },
    { id: 'stakeholder-analysis', title: 'Analyse des parties prenantes', titleEn: 'Stakeholder Analysis' },
    { id: 'business-case', title: 'Business Case', titleEn: 'Business Case' },
    { id: 'project-workflow', title: 'Project workflow', titleEn: 'Project Workflow' },
    { id: 'kickoff-deck', title: 'Kick-off Deck', titleEn: 'Kick-off Deck' }
  ],
  planning: [
    { id: 'pmp', title: 'PMP', titleEn: 'Project Management Plan' },
    { id: 'wbs', title: 'WBS', titleEn: 'Work Breakdown Structure' },
    { id: 'gantt', title: 'Gantt', titleEn: 'Gantt Chart' },
    { id: 'budget', title: 'Budget', titleEn: 'Budget Plan' },
    { id: 'risks', title: 'Registre des risques', titleEn: 'Risk Register' },
    { id: 'communication-plan', title: 'Plan de communication', titleEn: 'Communication Plan' }
  ],
  execution: [
    { id: 'dashboard', title: 'Tableau de bord', titleEn: 'Dashboard' },
    { id: 'progress-reports', title: 'Rapports d\'avancement', titleEn: 'Progress Reports' },
    { id: 'change-log', title: 'Change Log / Incidents', titleEn: 'Change Log / Issues' }
  ],
  monitoring: [
    { id: 'eva-report', title: 'EVA Report', titleEn: 'Earned Value Analysis Report' },
    { id: 'planning-update', title: 'Planning/Budget Update', titleEn: 'Planning/Budget Update' },
    { id: 'risk-register-update', title: 'Registre des risques mis à jour', titleEn: 'Updated Risk Register' }
  ],
  closure: [
    { id: 'closure-report', title: 'Rapport de clôture', titleEn: 'Closure Report' },
    { id: 'lessons-learned', title: 'REX', titleEn: 'Lessons Learned' },
    { id: 'final-acceptance', title: 'PV de recette finale', titleEn: 'Final Acceptance Report' }
  ]
};

// Configuration multilingue
const LANGUAGES = {
  en: {
    title: "Project Management",
    backToDashboard: "← Back to Dashboard",
    phases: {
      initiation: "Initiation",
      planning: "Planning", 
      execution: "Execution",
      monitoring: "Monitoring & Control",
      closure: "Closure"
    },
    phaseDescriptions: {
      initiation: "Define the project and obtain initial approval",
      planning: "Plan activities, resources and risks",
      execution: "Deliver outputs and track progress",
      monitoring: "Measure performance and correct deviations",
      closure: "Finalize and evaluate the project"
    },
    selectDocument: "Select a document to create or edit",
    availableTemplates: "Available Templates",
    createFromScratch: "Create from Scratch",
    useTemplate: "Use Template",
    customize: "Customize",
    projectName: "Project Name",
    noProject: "Project not found"
  },
  fr: {
    title: "Gestion de Projet",
    backToDashboard: "← Retour au tableau de bord",
    phases: {
      initiation: "Initialisation",
      planning: "Planification",
      execution: "Exécution", 
      monitoring: "Suivi & Contrôle",
      closure: "Clôture"
    },
    phaseDescriptions: {
      initiation: "Définir le projet et obtenir l'approbation initiale",
      planning: "Planifier les activités, les ressources et les risques",
      execution: "Réaliser les livrables et suivre le progrès",
      monitoring: "Mesurer la performance et corriger les écarts",
      closure: "Finaliser et évaluer le projet"
    },
    selectDocument: "Sélectionnez un document à créer ou modifier",
    availableTemplates: "Templates Disponibles",
    createFromScratch: "Créer à partir de zéro",
    useTemplate: "Utiliser le Template",
    customize: "Personnaliser",
    projectName: "Nom du Projet",
    noProject: "Projet introuvable"
  }
};

export default function ProjectPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('initiation');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectPhases, setProjectPhases] = useState({});
  
  const t = LANGUAGES[user?.language || 'en'] || LANGUAGES.en;
  
  const phases = ['initiation', 'planning', 'execution', 'monitoring', 'closure'];
  
  useEffect(() => {
    async function loadProjectData() {
      if (!id) return;
      
      try {
        // Récupérer l'utilisateur connecté
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();
        
        setUser(userData);

        // Récupérer le projet
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select(`
            *,
            project_phases (
              status,
              started_at,
              completed_at,
              phase_id,
              phases (
                id,
                name,
                order_index
              )
            )
          `)
          .eq('id', id)
          .single();
        
        if (projectError) {
          console.error('Error fetching project:', projectError);
        } else {
          setProject(projectData);
          
          // Construire l'état des phases
          const phasesStatus = {};
          if (projectData.project_phases) {
            projectData.project_phases.forEach(pp => {
              const phaseName = pp.phases.name.toLowerCase();
              phasesStatus[phaseName] = pp.status;
            });
          }
          setProjectPhases(phasesStatus);
        }
        
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [id, router]);

  const getPhaseStatus = (phase) => {
    return projectPhases[phase] || 'not_started';
  };

  const getPhaseColor = (phase) => {
    const status = getPhaseStatus(phase);
    const colors = {
      not_started: '#e2e8f0',
      in_progress: '#fbbf24',
      completed: '#10b981'
    };
    return colors[status] || colors.not_started;
  };

  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
  };

  const handleCreateDocument = (fromTemplate = false) => {
    // Navigation vers l'éditeur de document
    const params = new URLSearchParams({
      projectId: id,
      phase: selectedPhase,
      documentType: selectedDocument.id,
      template: fromTemplate ? 'true' : 'false'
    });
    
    router.push(`/document-editor?${params.toString()}`);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>{t.noProject}</h2>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/projectman')}
          >
            {t.backToDashboard}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{project.name} - {t.title}</title>
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
          <h1 style={styles.projectTitle}>{project.name}</h1>
        </header>

        {/* Phases Navigation */}
        <div style={styles.phasesContainer}>
          {phases.map((phase, index) => (
            <div
              key={phase}
              style={{
                ...styles.phaseCard,
                backgroundColor: getPhaseColor(phase),
                border: selectedPhase === phase ? '3px solid #3b82f6' : '1px solid #e2e8f0'
              }}
              onClick={() => setSelectedPhase(phase)}
            >
              <div style={styles.phaseNumber}>{index + 1}</div>
              <div style={styles.phaseContent}>
                <h3 style={styles.phaseTitle}>{t.phases[phase]}</h3>
                <p style={styles.phaseDescription}>{t.phaseDescriptions[phase]}</p>
                <div style={styles.phaseStatus}>
                  {getPhaseStatus(phase) === 'completed' && '✓ Completed'}
                  {getPhaseStatus(phase) === 'in_progress' && '⏳ In Progress'}
                  {getPhaseStatus(phase) === 'not_started' && '○ Not Started'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Documents List */}
          <div style={styles.documentsPanel}>
            <h3 style={styles.panelTitle}>
              {t.phases[selectedPhase]} - Documents
            </h3>
            
            {DELIVERABLES_BY_PHASE[selectedPhase].map(document => (
              <div
                key={document.id}
                style={{
                  ...styles.documentItem,
                  backgroundColor: selectedDocument?.id === document.id ? '#e0f2fe' : '#ffffff'
                }}
                onClick={() => handleDocumentSelect(document)}
              >
                <div style={styles.documentIcon}>📄</div>
                <div style={styles.documentContent}>
                  <h4 style={styles.documentTitle}>
                    {user?.language === 'fr' ? document.title : document.titleEn}
                  </h4>
                </div>
              </div>
            ))}
          </div>

          {/* Document Details */}
          <div style={styles.detailsPanel}>
            {selectedDocument ? (
              <div style={styles.documentDetails}>
                <h3 style={styles.detailsTitle}>
                  {user?.language === 'fr' ? selectedDocument.title : selectedDocument.titleEn}
                </h3>
                
                <div style={styles.templateSection}>
                  <h4>{t.availableTemplates}</h4>
                  <div style={styles.templateGrid}>
                    <div style={styles.templateCard}>
                      <div style={styles.templatePreview}>📋</div>
                      <h5>Standard Template</h5>
                      <p>Pre-formatted document with standard sections</p>
                      <button 
                        style={styles.templateButton}
                        onClick={() => handleCreateDocument(true)}
                      >
                        {t.useTemplate}
                      </button>
                    </div>
                    
                    <div style={styles.templateCard}>
                      <div style={styles.templatePreview}>⚙️</div>
                      <h5>Custom Template</h5>
                      <p>Customizable template with your branding</p>
                      <button 
                        style={styles.templateButton}
                        onClick={() => handleCreateDocument(true)}
                      >
                        {t.customize}
                      </button>
                    </div>
                  </div>
                  
                  <div style={styles.scratchSection}>
                    <button 
                      style={styles.scratchButton}
                      onClick={() => handleCreateDocument(false)}
                    >
                      {t.createFromScratch}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.noSelection}>
                <p>{t.selectDocument}</p>
              </div>
            )}
          </div>
        </div>
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
    padding: '1rem 2rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  
  backButton: {
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569'
  },
  
  projectTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  
  phasesContainer: {
    display: 'flex',
    gap: '1rem',
    padding: '2rem',
    overflowX: 'auto'
  },
  
  phaseCard: {
    minWidth: '200px',
    padding: '1.5rem',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  
  phaseNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    marginBottom: '1rem',
    color: '#1e293b'
  },
  
  phaseContent: {
    flex: 1
  },
  
  phaseTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: '#1e293b'
  },
  
  phaseDescription: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 1rem 0',
    lineHeight: 1.4
  },
  
  phaseStatus: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#475569'
  },
  
  mainContent: {
    display: 'flex',
    gap: '2rem',
    padding: '0 2rem 2rem 2rem',
    height: 'calc(100vh - 300px)'
  },
  
  documentsPanel: {
    width: '300px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    overflowY: 'auto'
  },
  
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  
  documentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '0.5rem'
  },
  
  documentIcon: {
    fontSize: '1.5rem'
  },
  
  documentContent: {
    flex: 1
  },
  
  documentTitle: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1e293b',
    margin: 0
  },
  
  detailsPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0'
  },
  
  documentDetails: {},
  
  detailsTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  
  templateSection: {},
  
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  
  templateCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center'
  },
  
  templatePreview: {
    fontSize: '2rem',
    marginBottom: '0.5rem'
  },
  
  templateButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  
  scratchSection: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  
  scratchButton: {
    backgroundColor: '#64748b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  
  noSelection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
    fontSize: '1rem'
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh'
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
  
  error: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    margin: '2rem',
    border: '1px solid #e2e8f0'
  }
};