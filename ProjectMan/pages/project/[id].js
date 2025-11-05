import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import HeaderParti from '../../components/HeaderParti';

// Removed: DELIVERABLES_BY_PHASE - now loaded dynamically from deliverable_types table

// Noms des phases
const PHASE_NAMES = {
  en: ['Initiation', 'Planning', 'Execution', 'Monitoring & Control', 'Closure'],
  fr: ['Initialisation', 'Planification', 'Exécution', 'Suivi & Contrôle', 'Clôture']
};

// Couleurs des statuts de phase
const STATUS_COLORS = {
  not_started: '#93c5fd', // 🩵 Bleu clair
  in_progress: '#fb923c', // 🟠 Orange
  completed: '#4ade80'    // 🟢 Vert
};

// Traductions
const LANGUAGES = {
  en: {
    backToProjects: '← Back',
    overview: 'Overview',
    editProject: 'Edit',
    changeStatus: 'Change Status',
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
    deliverables: 'Deliverables',
    selectDeliverable: 'Select a deliverable to view or edit',
    addDeliverable: '+ Add Deliverable',
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    statusDraft: 'Draft',
    statusInReview: 'In Review',
    statusValidated: 'Validated',
    loading: 'Loading...'
  },
  fr: {
    backToProjects: '← Retour',
    overview: 'Vue d\'ensemble',
    editProject: 'Modifier',
    changeStatus: 'Changer le Statut',
    draft: 'Brouillon',
    active: 'Actif',
    completed: 'Terminé',
    archived: 'Archivé',
    deliverables: 'Livrables',
    selectDeliverable: 'Sélectionnez un livrable à voir ou modifier',
    addDeliverable: '+ Ajouter un Livrable',
    notStarted: 'Non Commencé',
    inProgress: 'En Cours',
    statusDraft: 'Brouillon',
    statusInReview: 'En Révision',
    statusValidated: 'Validé',
    loading: 'Chargement...'
  }
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState(null);
  const [projectPhases, setProjectPhases] = useState([]);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [projectDeliverables, setProjectDeliverables] = useState([]);
  const [selectedDeliverableType, setSelectedDeliverableType] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const t = LANGUAGES[language];
  const phaseNames = PHASE_NAMES[language];
  
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

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      if (userData) {
        setLanguage(userData.language || 'en');
        setCurrentUser(userData);
      }

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
        
      if (projectError) {
        console.error('Error:', projectError);
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Get project phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', id)
        .order('phase_id');

      console.log('Project Phases loaded:', phasesData);
      console.log('Project Phases error:', phasesError);
      
      setProjectPhases(phasesData || []);
      
      // Load deliverable types for all phases
      await loadDeliverableTypes();
      
      // Load existing deliverables for this project
      await loadProjectDeliverables();

      setLoading(false);

    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  }

  async function loadDeliverableTypes() {
    try {
      const { data, error } = await supabase
        .from('deliverable_types')
        .select('*')
        .order('phase_id');
      
      console.log('Loading deliverable types - data:', data);
      console.log('Loading deliverable types - error:', error);
      
      if (!error) {
        setDeliverableTypes(data || []);
      } else {
        console.error('Error loading deliverable types:', error);
      }
    } catch (error) {
      console.error('Error loading deliverable types:', error);
    }
  }

  async function loadProjectDeliverables() {
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select(`
          *,
          deliverable_type:deliverable_types!deliverables_type_id_fkey(id, name, phase_id),
          assignee_user:users!deliverables_assigned_to_fkey(id, full_name)
        `)
        .eq('project_id', id);
      
      if (!error) {
        setProjectDeliverables(data || []);
      }
    } catch (error) {
      console.error('Error loading deliverables:', error);
    }
  }

  async function loadTemplates(typeId) {
    try {
      const { data, error } = await supabase
        .from('deliverable_templates')
        .select('*')
        .eq('type_id', typeId);
      
      if (!error) {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  const getPhaseStatus = (phaseIndex) => {
    if (!projectPhases.length) return 'not_started';
    const phase = projectPhases[phaseIndex];
    return phase ? phase.status : 'not_started';
  };

  const handlePhaseClick = async (phaseIndex) => {
    setSelectedPhaseIndex(phaseIndex);
    setSelectedDeliverableType(null);
    setShowTemplateModal(false);
    
    // Update phase to in_progress if not_started
    if (getPhaseStatus(phaseIndex) === 'not_started' && projectPhases[phaseIndex]) {
      await supabase
        .from('project_phases')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', projectPhases[phaseIndex].id);
      
      loadProjectData();
    }
  };

  const handleDeliverableTypeClick = async (deliverableType) => {
    setSelectedDeliverableType(deliverableType);
    
    // Load templates for this deliverable type
    await loadTemplates(deliverableType.id);
    
    // Show template selection modal
    setShowTemplateModal(true);
  };

  const handleCreateFromTemplate = async (templateId) => {
    try {
      // Get template content first
      const { data: template } = await supabase
        .from('deliverable_templates')
        .select('content')
        .eq('id', templateId)
        .single();

      // Create new deliverable from template
      const { data: newDeliverable, error } = await supabase
        .from('deliverables')
        .insert({
          project_id: id,
          phase_id: currentPhaseId,
          type_id: selectedDeliverableType.id,
          template_id: templateId,
          type: selectedDeliverableType.name,
          title: selectedDeliverableType.name,
          content: template?.content || {},
          data: template?.content || {},
          status: 'draft',
          created_by: currentUser.id,
          assigned_to: currentUser.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        return;
      }

      // Redirect to deliverable page
      router.push(`/project/${id}/${newDeliverable.id}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateFromScratch = async () => {
    try {
      // Create new deliverable without template
      const { data: newDeliverable, error } = await supabase
        .from('deliverables')
        .insert({
          project_id: id,
          phase_id: currentPhaseId,
          type_id: selectedDeliverableType.id,
          template_id: null,
          type: selectedDeliverableType.name,
          title: selectedDeliverableType.name,
          content: {},
          data: {},
          status: 'draft',
          created_by: currentUser.id,
          assigned_to: currentUser.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        return;
      }

      // Redirect to deliverable page
      router.push(`/project/${id}/${newDeliverable.id}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOpenExistingDeliverable = (deliverableId) => {
    router.push(`/project/${id}/${deliverableId}`);
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
    return <div style={styles.errorContainer}>Project not found</div>;
  }

  // Get current phase ID
  const currentPhase = projectPhases[selectedPhaseIndex];
  const currentPhaseId = currentPhase?.phase_id;
  
  // Debug: log pour voir ce qui se passe
  console.log('Selected Phase Index:', selectedPhaseIndex);
  console.log('Current Phase:', currentPhase);
  console.log('Current Phase ID:', currentPhaseId);
  console.log('All Deliverable Types:', deliverableTypes);
  console.log('Project Phases:', projectPhases);
  
  // Filter deliverable types for the selected phase
  const phaseDeliverableTypes = deliverableTypes.filter(dt => {
    console.log(`Comparing dt.phase_id (${dt.phase_id}) with currentPhaseId (${currentPhaseId})`);
    return dt.phase_id === currentPhaseId;
  });
  
  console.log('Filtered Phase Deliverable Types:', phaseDeliverableTypes);
  
  // Get existing deliverables for current phase
  const phaseExistingDeliverables = projectDeliverables.filter(d => 
    d.phase_id === currentPhaseId || 
    (d.deliverable_type && phaseDeliverableTypes.some(dt => dt.id === d.type_id))
  );

  return (
    <>
      <Head>
        <title>{project.name} - ProjectHub</title>
        <style>{`
          * {
            scroll-behavior: smooth;
          }
          body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
      </Head>

      <HeaderParti />

      <div style={styles.container}>
        {/* HEADER - Zone 1 */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={() => router.push('/projectman')}>
              {t.backToProjects}
            </button>
            <h1 style={styles.projectTitle}>{project.name}</h1>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: project.status === 'active' ? '#10b981' :
                              project.status === 'completed' ? '#3b82f6' :
                              project.status === 'archived' ? '#6b7280' : '#9ca3af'
            }}>
              {t[project.status] || project.status}
            </span>
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.overviewButton}
              onClick={() => router.push(`/project/${id}/overview`)}
            >
              {t.overview}
            </button>
            <button style={styles.editButton}>{t.editProject}</button>
          </div>
        </header>

        {/* PHASES - Zone 2 (horizontal) */}
        <div style={styles.phasesBar}>
          {phaseNames.map((phaseName, index) => {
            const status = getPhaseStatus(index);
            const isSelected = selectedPhaseIndex === index;
            
            return (
              <div
                key={index}
                style={{
                  ...styles.phaseCard,
                  backgroundColor: STATUS_COLORS[status],
                  border: isSelected ? '4px solid #1e293b' : '2px solid transparent',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isSelected 
                    ? '0 8px 24px rgba(30, 41, 59, 0.25), 0 0 0 4px rgba(59, 130, 246, 0.2)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  filter: isSelected ? 'brightness(1.1)' : 'brightness(1)',
                  outline: isSelected ? '3px solid rgba(59, 130, 246, 0.3)' : 'none',
                  outlineOffset: '2px'
                }}
                onClick={() => handlePhaseClick(index)}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                  }}>
                    ✓
                  </div>
                )}
                <div style={styles.phaseIcon}>
                  {status === 'not_started' && '○'}
                  {status === 'in_progress' && '◐'}
                  {status === 'completed' && '●'}
                </div>
                <div style={styles.phaseText}>
                  <div style={{
                    ...styles.phaseName,
                    color: isSelected ? '#0f172a' : '#111827',
                    fontWeight: isSelected ? '700' : '600'
                  }}>
                    {phaseName}
                  </div>
                  <div style={{
                    ...styles.phaseStatusText,
                    fontWeight: isSelected ? '600' : '500'
                  }}>
                    {status === 'not_started' && t.notStarted}
                    {status === 'in_progress' && t.inProgress}
                    {status === 'completed' && t.completed}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN CONTENT - Zone 3 (2 colonnes) */}
        <div style={styles.mainContent}>
          {/* LEFT PANEL: Deliverables List */}
          <div style={styles.leftPanel}>
            <h3 style={styles.panelTitle}>
              📄 {t.deliverables}
            </h3>
            
            <div style={styles.deliverablesList}>
              {/* Existing deliverables */}
              {phaseExistingDeliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  style={{
                    ...styles.deliverableItem,
                    backgroundColor: '#e0f2fe',
                    borderLeft: '5px solid #10b981'
                  }}
                  onClick={() => handleOpenExistingDeliverable(deliverable.id)}
                >
                  <div style={styles.deliverableIcon}>✅</div>
                  <div style={styles.deliverableContent}>
                    <div style={styles.deliverableName}>{deliverable.title}</div>
                    <div style={{
                      ...styles.deliverableStatusBadge,
                      backgroundColor: 
                        deliverable.status === 'validated' ? '#10b981' :
                        deliverable.status === 'in_review' ? '#fbbf24' : '#9ca3af'
                    }}>
                      {deliverable.status === 'draft' && t.statusDraft}
                      {deliverable.status === 'in_review' && t.statusInReview}
                      {deliverable.status === 'validated' && t.statusValidated}
                    </div>
                  </div>
                  <div style={{
                    marginLeft: 'auto',
                    color: '#10b981',
                    fontSize: '1.25rem',
                    fontWeight: '700'
                  }}>
                    →
                  </div>
                </div>
              ))}
              
              {/* Available deliverable types to create */}
              {phaseDeliverableTypes.map((deliverableType) => {
                const isSelected = selectedDeliverableType?.id === deliverableType.id;
                const alreadyExists = phaseExistingDeliverables.some(d => 
                  d.type_id === deliverableType.id || d.type === deliverableType.name
                );
                
                // Don't show if already created
                if (alreadyExists) return null;
                
                return (
                  <div
                    key={deliverableType.id}
                    style={{
                      ...styles.deliverableItem,
                      backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                      borderLeft: isSelected ? '5px solid #3b82f6' : '5px solid transparent',
                      borderRight: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      borderTop: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      borderBottom: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      boxShadow: isSelected 
                        ? '0 4px 16px rgba(59, 130, 246, 0.25)' 
                        : '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transform: isSelected ? 'translateX(8px) scale(1.02)' : 'translateX(0) scale(1)'
                    }}
                    onClick={() => handleDeliverableTypeClick(deliverableType)}
                  >
                    <div style={{
                      ...styles.deliverableIcon,
                      fontSize: isSelected ? '1.5rem' : '1.25rem',
                      filter: isSelected ? 'brightness(1.2)' : 'brightness(1)'
                    }}>
                      📄
                    </div>
                    <div style={styles.deliverableContent}>
                      <div style={{
                        ...styles.deliverableName,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#1e40af' : '#111827'
                      }}>
                        {deliverableType.name}
                      </div>
                      <div style={{
                        ...styles.deliverableStatusBadge,
                        backgroundColor: '#6b7280'
                      }}>
                        + Create New
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{
                        marginLeft: 'auto',
                        color: '#3b82f6',
                        fontSize: '1.25rem',
                        fontWeight: '700'
                      }}>
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Template Selection or Empty State */}
          <div style={styles.rightPanel}>
            {showTemplateModal && selectedDeliverableType ? (
              <div style={styles.templateSelectionContainer}>
                <div style={styles.editorHeader}>
                  <h2 style={styles.editorTitle}>
                    Create: {selectedDeliverableType.name}
                  </h2>
                  <button 
                    style={styles.closeButton}
                    onClick={() => {
                      setShowTemplateModal(false);
                      setSelectedDeliverableType(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={styles.editorContent}>
                  {/* Create from Scratch Option */}
                  <div 
                    style={styles.createOption}
                    onClick={handleCreateFromScratch}
                  >
                    <div style={styles.createOptionIcon}>✨</div>
                    <div>
                      <h3 style={styles.createOptionTitle}>Start from Scratch</h3>
                      <p style={styles.createOptionDesc}>
                        Create a blank {selectedDeliverableType.name} document
                      </p>
                    </div>
                    <div style={styles.createOptionArrow}>→</div>
                  </div>

                  {/* Templates Section */}
                  {templates.length > 0 && (
                    <>
                      <div style={styles.templatesDivider}>
                        <span>OR USE A TEMPLATE</span>
                      </div>
                      
                      <div style={styles.templatesGrid}>
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            style={styles.templateCard}
                            onClick={() => handleCreateFromTemplate(template.id)}
                          >
                            <div style={styles.templateIcon}>📋</div>
                            <h4 style={styles.templateName}>{template.name}</h4>
                            <p style={styles.templateDesc}>{template.description}</p>
                            <button style={styles.useTemplateBtn}>Use Template</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {templates.length === 0 && (
                    <div style={styles.noTemplates}>
                      <p>No templates available for this deliverable type.</p>
                      <p style={{fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem'}}>
                        You can create from scratch or contact your administrator to add templates.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1.5rem',
                  opacity: 0.3
                }}>
                  📝
                </div>
                <p style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  {t.selectDeliverable}
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#94a3b8'
                }}>
                  Sélectionnez un livrable dans la liste de gauche pour commencer
                </p>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingTop: '0'
  },
  
  // HEADER STYLES
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    padding: '1.5rem 2.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  
  headerRight: {
    display: 'flex',
    gap: '0.75rem'
  },
  
  backButton: {
    backgroundColor: '#f1f5f9',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.625rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#e2e8f0'
    }
  },
  
  projectTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  
  statusBadge: {
    color: '#ffffff',
    padding: '0.375rem 0.875rem',
    borderRadius: '12px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  
  overviewButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
    ':hover': {
      backgroundColor: '#2563eb',
      boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)'
    }
  },
  
  editButton: {
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#cbd5e1',
      backgroundColor: '#f8fafc'
    }
  },
  
  // PHASES BAR STYLES
  phasesBar: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    padding: '2rem 2.5rem',
    display: 'flex',
    gap: '1.25rem',
    overflowX: 'auto',
    position: 'sticky',
    top: '84px',
    zIndex: 9,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  
  phaseCard: {
    minWidth: '190px',
    padding: '1.5rem 1.25rem',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)'
    }
  },
  
  phaseIcon: {
    fontSize: '1.75rem',
    fontWeight: '700'
  },
  
  phaseText: {
    flex: 1
  },
  
  phaseName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  
  phaseStatusText: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#374151'
  },
  
  // MAIN CONTENT STYLES
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '2rem',
    padding: '2rem 2.5rem',
    minHeight: 'calc(100vh - 280px)',
    alignItems: 'start'
  },
  
  // LEFT PANEL
  leftPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    position: 'sticky',
    top: '220px',
    maxHeight: 'calc(100vh - 240px)'
  },
  
  panelTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    padding: '1.5rem 1.5rem 1rem',
    borderBottom: '2px solid #e2e8f0',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  
  deliverablesList: {
    padding: '1.25rem',
    overflowY: 'auto',
    flex: 1,
    scrollBehavior: 'smooth'
  },
  
  deliverableItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.125rem',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    ':hover': {
      transform: 'translateX(4px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }
  },
  
  deliverableIcon: {
    fontSize: '1.25rem'
  },
  
  deliverableContent: {
    flex: 1
  },
  
  deliverableName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  
  deliverableStatusBadge: {
    display: 'inline-block',
    color: '#ffffff',
    padding: '0.125rem 0.5rem',
    borderRadius: '8px',
    fontSize: '0.6875rem',
    fontWeight: '600'
  },
  
  addButton: {
    width: '100%',
    backgroundColor: '#f8fafc',
    color: '#3b82f6',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '1rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.75rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9',
      borderColor: '#3b82f6',
      color: '#2563eb'
    }
  },
  
  // RIGHT PANEL
  rightPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '600px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  
  deliverableEditor: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  
  editorHeader: {
    borderBottom: '2px solid #e2e8f0',
    padding: '1.75rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  
  editorTitle: {
    fontSize: '1.375rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  
  editorActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  
  actionButton: {
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.625rem 1.125rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9',
      borderColor: '#cbd5e1',
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
  },
  
  editorContent: {
    flex: 1,
    padding: '2rem 2.5rem',
    overflowY: 'auto',
    backgroundColor: '#ffffff'
  },
  
  editorPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px dashed #cbd5e1'
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
    fontSize: '1rem',
    padding: '3rem'
  },
  
  // LOADING
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
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#6b7280'
  },
  
  // TEMPLATE SELECTION STYLES
  templateSelectionContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
    lineHeight: 1,
    transition: 'color 0.2s',
    ':hover': {
      color: '#1e293b'
    }
  },
  
  createOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '2rem',
    backgroundColor: '#f8fafc',
    border: '3px solid #e2e8f0',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '2rem',
    ':hover': {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)'
    }
  },
  
  createOptionIcon: {
    fontSize: '3rem',
    lineHeight: 1
  },
  
  createOptionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  
  createOptionDesc: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0
  },
  
  createOptionArrow: {
    marginLeft: 'auto',
    fontSize: '2rem',
    color: '#3b82f6',
    fontWeight: '700'
  },
  
  templatesDivider: {
    textAlign: 'center',
    margin: '2rem 0',
    position: 'relative'
  },
  
  'templatesDivider span': {
    backgroundColor: '#ffffff',
    padding: '0 1rem',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginTop: '1.5rem'
  },
  
  templateCard: {
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.75rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'center',
    ':hover': {
      borderColor: '#3b82f6',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
      transform: 'translateY(-4px)'
    }
  },
  
  templateIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  
  templateName: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.75rem 0'
  },
  
  templateDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    lineHeight: 1.5
  },
  
  useTemplateBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  
  noTemplates: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b'
  }
};
