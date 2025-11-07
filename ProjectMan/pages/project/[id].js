import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

// Couleurs des statuts
const STATUS_COLORS = {
  draft: '#f59e0b',
  active: '#3b82f6', 
  completed: '#10b981',
  archived: '#6b7280',
  not_started: '#93c5fd',
  in_progress: '#fb923c',
  validated: '#10b981'
};

// Traductions
const LANGUAGES = {
  en: {
    backToProjects: '← Back to Projects',
    projectOverview: 'Project Overview',
    projectPhases: 'Project Phases',
    documents: 'Documents',
    createDocument: 'Create Document',
    editProject: 'Edit Project',
    projectDetails: 'Project Details',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
    progress: 'Progress',
    availableDocuments: 'Available Document Types',
    existingDocuments: 'Existing Documents',
    noDocuments: 'No documents created yet',
    createFirst: 'Create your first document',
    phase: 'Phase',
    type: 'Type',
    lastModified: 'Last Modified',
    actions: 'Actions',
    edit: 'Edit',
    view: 'View',
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    validated: 'Validated',
    loading: 'Loading project...'
  },
  fr: {
    backToProjects: '← Retour aux Projets',
    projectOverview: 'Aperçu du Projet',
    projectPhases: 'Phases du Projet',
    documents: 'Documents',
    createDocument: 'Créer un Document',
    editProject: 'Modifier le Projet',
    projectDetails: 'Détails du Projet',
    startDate: 'Date de Début',
    endDate: 'Date de Fin',
    status: 'Statut',
    progress: 'Avancement',
    availableDocuments: 'Types de Documents Disponibles',
    existingDocuments: 'Documents Existants',
    noDocuments: 'Aucun document créé',
    createFirst: 'Créez votre premier document',
    phase: 'Phase',
    type: 'Type',
    lastModified: 'Dernière Modification',
    actions: 'Actions',
    edit: 'Modifier',
    view: 'Voir',
    draft: 'Brouillon',
    active: 'Actif', 
    completed: 'Terminé',
    archived: 'Archivé',
    notStarted: 'Non Commencé',
    inProgress: 'En Cours',
    validated: 'Validé',
    loading: 'Chargement du projet...'
  }
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [projectPhases, setProjectPhases] = useState([]);
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [existingDeliverables, setExistingDeliverables] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  
  const t = LANGUAGES[language];
  
  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  async function loadProjectData() {
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
      }

      // Get project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
        
      if (projectError) {
        console.error('Error loading project:', projectError);
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Get all phases with detailed error handling
      console.log('🔍 Tentative de chargement des phases...');
      console.log('👤 Session utilisateur:', session?.user?.id);
      const { data: phasesData, error: phasesError } = await supabase
        .from('phases')
        .select('*');
      
      if (phasesError) {
        console.error('❌ Erreur lors du chargement des phases:', phasesError);
        console.error('❌ Détails de l\'erreur:', phasesError.message, phasesError.details, phasesError.hint);
        
        // Essayer avec seulement quelques colonnes
        console.log('🔄 Tentative avec colonnes spécifiques...');
        const { data: phasesDataRetry, error: phasesErrorRetry } = await supabase
          .from('phases')
          .select('id, name, description, order_index');
        
        if (phasesErrorRetry) {
          console.error('❌ Erreur phases (2ème tentative):', phasesErrorRetry);
        } else {
          console.log('✅ Phases chargées (2ème tentative):', phasesDataRetry);
          setPhases(phasesDataRetry || []);
          if (phasesDataRetry && phasesDataRetry.length > 0) {
            setSelectedPhase(phasesDataRetry[0]);
          }
        }
      } else {
        console.log('✅ Phases chargées avec succès:', phasesData);
        console.log('📊 Nombre de phases:', phasesData?.length || 0);
        setPhases(phasesData || []);
        if (phasesData && phasesData.length > 0) {
          setSelectedPhase(phasesData[0]);
          console.log('🎯 Phase sélectionnée:', phasesData[0]);
        }
      }

      // Get project phases status
      const { data: projectPhasesData } = await supabase
        .from('project_phases')
        .select(`
          *,
          phase:phases(*)
        `)
        .eq('project_id', id)
        .order('phase_id');
      
      setProjectPhases(projectPhasesData || []);
      
      // Get all deliverable types
      const { data: typesData } = await supabase
        .from('deliverable_types')
        .select(`
          *,
          phase:phases(*)
        `)
        .order('phase_id');
      
      setDeliverableTypes(typesData || []);
      
      // Get existing deliverables for this project
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select(`
          *,
          deliverable_types(name),
          phases(name, order_index)
        `)
        .eq('project_id', id)
        .order('updated_at', { ascending: false });
      
      setExistingDeliverables(deliverablesData || []);

      setLoading(false);

    } catch (error) {
      console.error('Error loading project data:', error);
      setLoading(false);
    }
  }

  const handleCreateDocument = (typeId) => {
    const selectedType = deliverableTypes.find(type => type.id === typeId);
    
    if (!selectedType) {
      console.error('Type de document non trouvé');
      return;
    }

    console.log('Type sélectionné:', selectedType.name);

    // Mapping des types vers les générateurs spécialisés (plus large)
    const typeGenerators = {
      'planning': 'planning',
      'plan': 'planning',
      'planification': 'planning',
      'gantt': 'planning',
      'calendrier': 'planning',
      'workflow': 'workflow-interactive',
      'processus': 'workflow-interactive',
      'procedure': 'workflow-interactive',
      'flux': 'workflow-interactive',
      'étapes': 'workflow-interactive',
      'etapes': 'workflow-interactive',
      'diagramme': 'workflow-interactive'
    };

    // Normaliser le nom du type pour la comparaison
    const typeName = selectedType.name.toLowerCase();
    let generatorPath = null;

    // Chercher une correspondance exacte ou partielle
    for (const [key, generator] of Object.entries(typeGenerators)) {
      if (typeName.includes(key)) {
        generatorPath = generator;
        console.log(`Correspondance trouvée: "${key}" -> ${generator}`);
        break;
      }
    }

    if (generatorPath) {
      // Rediriger vers le générateur spécialisé
      console.log(`Redirection vers: /documents/generators/${generatorPath}`);
      router.push(`/documents/generators/${generatorPath}?projectId=${id}&typeId=${typeId}`);
    } else {
      // Pour les autres types, rediriger vers un générateur générique ou une page de choix
      console.log('Aucun générateur spécialisé trouvé, redirection vers générateur planning par défaut');
      router.push(`/documents/generators/planning?projectId=${id}&typeId=${typeId}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

  const calculateProjectProgress = () => {
    if (projectPhases.length === 0) return 0;
    const completedPhases = projectPhases.filter(p => p.status === 'completed').length;
    return Math.round((completedPhases / projectPhases.length) * 100);
  };

  const getPhaseDeliverableTypes = (phaseId) => {
    return deliverableTypes.filter(type => type.phase_id === phaseId);
  };

  const getPhaseDeliverables = (phaseId) => {
    return existingDeliverables.filter(deliverable => deliverable.phase_id === phaseId);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2>Project not found</h2>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/projectman')}
          >
            {t.backToProjects}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{project.name} - ProjectHub</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <button 
              style={styles.backButton}
              onClick={() => router.push('/projectman')}
            >
              {t.backToProjects}
            </button>
            
            <div style={styles.projectHeader}>
              <div style={styles.projectInfo}>
                <h1 style={styles.projectTitle}>{project.name}</h1>
                <p style={styles.projectDescription}>{project.description}</p>
              </div>
              
              <div style={styles.projectMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>{t.status}:</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: STATUS_COLORS[project.status] || '#6b7280'
                  }}>
                    {t[project.status] || project.status}
                  </span>
                </div>
                
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>{t.progress}:</span>
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${calculateProjectProgress()}%`
                      }}></div>
                    </div>
                    <span style={styles.progressText}>{calculateProjectProgress()}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Phases Navigation */}
        <nav style={styles.phasesNav}>
          <div style={styles.phasesContent}>
            <div style={styles.phasesHeader}>
              <h3 style={styles.phasesTitle}>🎯 Phases du Projet</h3>
              <p style={styles.phasesSubtitle}>Cliquez sur une phase pour voir les documents disponibles</p>
            </div>
            <div style={styles.phasesButtons}>
            {/* Debug: Afficher le nombre de phases */}
            {phases.map((phase, index) => {
              const phaseStatus = projectPhases.find(p => p.phase_id === phase.id);
              return (
                <button
                  key={phase.id}
                  style={{
                    ...styles.phaseButton,
                    ...(selectedPhase?.id === phase.id ? styles.activePhaseButton : {})
                  }}
                  onClick={() => setSelectedPhase(phase)}
                >
                  <span style={styles.phaseNumber}>{index + 1}</span>
                  <span style={styles.phaseName}>{phase.name}</span>
                  {phaseStatus && (
                    <span style={{
                      ...styles.phaseStatusIndicator,
                      backgroundColor: STATUS_COLORS[phaseStatus.status] || '#6b7280'
                    }}></span>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={styles.main}>
          <div style={styles.contentGrid}>
            {/* Available Document Types */}
            <section style={styles.availableSection}>
              <h2 style={styles.sectionTitle}>
                📋 {t.availableDocuments} {selectedPhase ? `- ${selectedPhase.name}` : ''}
              </h2>
              
              {selectedPhase && (
                <div style={styles.documentTypes}>
                  {getPhaseDeliverableTypes(selectedPhase.id).length > 0 ? (
                    getPhaseDeliverableTypes(selectedPhase.id).map(type => (
                      <div key={type.id} style={styles.documentTypeCard}>
                        <div style={styles.typeIcon}>📄</div>
                        <h3 style={styles.typeName}>{type.name}</h3>
                        <p style={styles.typeDescription}>
                          {type.description || 'Document description'}
                        </p>
                        <button 
                          style={styles.createTypeButton}
                          onClick={() => handleCreateDocument(type.id)}
                        >
                          {t.createDocument}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>📋</div>
                      <h3 style={styles.emptyTitle}>Aucun type de document</h3>
                      <p style={styles.emptyText}>Aucun type de document n'est disponible pour cette phase</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Existing Documents */}
            <section style={styles.documentsSection}>
              <h2 style={styles.sectionTitle}>
                📊 {t.existingDocuments} {selectedPhase ? `- ${selectedPhase.name}` : ''}
              </h2>
              
              {selectedPhase && (
                <div style={styles.existingDocuments}>
                  {getPhaseDeliverables(selectedPhase.id).length > 0 ? (
                    getPhaseDeliverables(selectedPhase.id).map(doc => (
                      <div key={doc.id} style={styles.documentCard}>
                        <div style={styles.docIcon}>📄</div>
                        <div style={styles.docInfo}>
                          <h3 style={styles.docTitle}>{doc.title}</h3>
                          <p style={styles.docType}>{doc.deliverable_types?.name}</p>
                          <p style={styles.docDate}>
                            {t.lastModified}: {formatDate(doc.updated_at)}
                          </p>
                        </div>
                        <div style={styles.docActions}>
                          <span style={{
                            ...styles.docStatus,
                            backgroundColor: STATUS_COLORS[doc.status] || '#6b7280'
                          }}>
                            {t[doc.status] || doc.status}
                          </span>
                          <button 
                            style={styles.editDocButton}
                            onClick={() => router.push(`/documents/edit/${doc.id}`)}
                          >
                            {t.edit}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>📄</div>
                      <h3 style={styles.emptyTitle}>{t.noDocuments}</h3>
                      <p style={styles.emptyText}>{t.createFirst}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
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

  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto'
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

  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '2rem'
  },

  projectInfo: {
    flex: 1
  },

  projectTitle: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  projectDescription: {
    fontSize: '1.125rem',
    color: '#6b7280',
    margin: 0
  },

  projectMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minWidth: '300px'
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },

  metaLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    minWidth: '80px'
  },

  statusBadge: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1
  },

  progressBar: {
    flex: 1,
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

  progressText: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#3b82f6',
    minWidth: '40px'
  },

  phasesNav: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    borderTop: '1px solid #e2e8f0',
    padding: '1.5rem 2rem',
    overflow: 'auto',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  phasesContent: {
    maxWidth: '1280px',
    margin: '0 auto'
  },

  phasesHeader: {
    marginBottom: '1.5rem',
    textAlign: 'center'
  },

  phasesTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },

  phasesSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },

  phasesButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },

  phaseButton: {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#64748b',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    '&:hover': {
      borderColor: '#cbd5e1',
      backgroundColor: '#f1f5f9'
    }
  },

  activePhaseButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
    transform: 'translateY(-1px)'
  },

  phaseNumber: {
    fontSize: '0.75rem',
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: 'inherit',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    minWidth: '28px',
    textAlign: 'center',
    lineHeight: '1.2'
  },

  phaseName: {
    fontSize: '0.875rem',
    fontWeight: '600'
  },

  phaseStatusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginLeft: '0.25rem'
  },

  main: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },

  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem'
  },

  availableSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  documentsSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1.5rem'
  },

  documentTypes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  documentTypeCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    transition: 'all 0.2s'
  },

  typeIcon: {
    fontSize: '2rem',
    marginBottom: '1rem'
  },

  typeName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  typeDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },

  createTypeButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%'
  },

  existingDocuments: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  documentCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.2s'
  },

  docIcon: {
    fontSize: '1.5rem'
  },

  docInfo: {
    flex: 1
  },

  docTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.25rem'
  },

  docType: {
    fontSize: '0.875rem',
    color: '#3b82f6',
    marginBottom: '0.25rem'
  },

  docDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: 0
  },

  docActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },

  docStatus: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  editDocButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#6b7280'
  },

  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },

  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },

  emptyText: {
    fontSize: '0.875rem'
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
  },

  errorContainer: {
    textAlign: 'center',
    padding: '4rem 2rem'
  }
};