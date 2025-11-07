import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const LANGUAGES = {
  en: {
    title: 'Workflow Generator',
    backToProject: '← Back to Project',
    workflowDesign: 'Workflow Design',
    addStep: 'Add Step',
    removeStep: 'Remove',
    stepName: 'Step Name',
    stepType: 'Step Type',
    description: 'Description',
    responsible: 'Responsible',
    conditions: 'Conditions',
    actions: 'Actions',
    generatePDF: 'Generate PDF',
    saveDocument: 'Save Document',
    preview: 'Preview',
    start: 'Start',
    process: 'Process',
    decision: 'Decision',
    end: 'End',
    approval: 'Approval'
  },
  fr: {
    title: 'Générateur de Workflow',
    backToProject: '← Retour au Projet',
    workflowDesign: 'Conception de Workflow',
    addStep: 'Ajouter une Étape',
    removeStep: 'Supprimer',
    stepName: 'Nom de l\'Étape',
    stepType: 'Type d\'Étape',
    description: 'Description',
    responsible: 'Responsable',
    conditions: 'Conditions',
    actions: 'Actions',
    generatePDF: 'Générer PDF',
    saveDocument: 'Sauvegarder',
    preview: 'Aperçu',
    start: 'Début',
    process: 'Processus',
    decision: 'Décision',
    end: 'Fin',
    approval: 'Validation'
  }
};

export default function WorkflowGenerator() {
  const router = useRouter();
  const { projectId, typeId } = router.query;
  
  console.log('Workflow Generator - Paramètres:', { projectId, typeId });
  
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Données du workflow
  const [workflowTitle, setWorkflowTitle] = useState('');
  const [steps, setSteps] = useState([{
    id: 1,
    name: '',
    type: 'start',
    description: '',
    responsible: '',
    conditions: '',
    actions: '',
    order: 1
  }]);
  
  const t = LANGUAGES[language];

  useEffect(() => {
    if (projectId && typeId) {
      loadData();
    } else if (router.isReady) {
      // Si les paramètres manquent après que le router soit prêt
      console.error('Paramètres manquants:', { projectId, typeId });
      alert('Paramètres de navigation manquants. Retour à la liste des projets.');
      router.push('/projectman');
    }
  }, [projectId, typeId, router.isReady]);

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
        setLanguage(userData.language || 'fr');
      }

      // Get project data
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (projectData) {
        setProject(projectData);
        setWorkflowTitle(`Workflow - ${projectData.name}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  const addStep = () => {
    const newStep = {
      id: steps.length + 1,
      name: '',
      type: 'process',
      description: '',
      responsible: '',
      conditions: '',
      actions: '',
      order: steps.length + 1
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const updateStep = (stepId, field, value) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  const moveStep = (stepId, direction) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    const newSteps = [...steps];
    if (direction === 'up' && stepIndex > 0) {
      [newSteps[stepIndex], newSteps[stepIndex - 1]] = [newSteps[stepIndex - 1], newSteps[stepIndex]];
    } else if (direction === 'down' && stepIndex < steps.length - 1) {
      [newSteps[stepIndex], newSteps[stepIndex + 1]] = [newSteps[stepIndex + 1], newSteps[stepIndex]];
    }
    
    // Update order numbers
    newSteps.forEach((step, index) => {
      step.order = index + 1;
    });
    
    setSteps(newSteps);
  };

  const getStepIcon = (type) => {
    switch (type) {
      case 'start': return '🚀';
      case 'process': return '⚙️';
      case 'decision': return '❓';
      case 'approval': return '✅';
      case 'end': return '🏁';
      default: return '📋';
    }
  };

  const getStepColor = (type) => {
    switch (type) {
      case 'start': return '#10b981';
      case 'process': return '#3b82f6';
      case 'decision': return '#f59e0b';
      case 'approval': return '#8b5cf6';
      case 'end': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const saveDocument = async () => {
    if (!user || !project || !projectId || !typeId) {
      alert('Informations manquantes pour la sauvegarde');
      return;
    }
    
    setSaving(true);
    try {
      const documentData = {
        title: workflowTitle,
        steps: steps,
        generatedAt: new Date().toISOString(),
        projectId: projectId
      };

      const { data: newDeliverable, error } = await supabase
        .from('deliverables')
        .insert([{
          project_id: projectId,
          type_id: typeId,
          title: workflowTitle,
          content: documentData,
          status: 'draft',
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving document:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
      } else {
        alert('🔄 Workflow sauvegardé avec succès !');
        // Retour vers la page du projet
        router.push(`/project/${projectId}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const generatePDF = async () => {
    const element = document.getElementById('workflow-preview');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${workflowTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t.title} - {project?.name}</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <button 
            style={styles.backButton}
            onClick={() => router.push(`/project/${projectId}`)}
          >
            {t.backToProject}
          </button>
          
          <h1 style={styles.title}>{t.workflowDesign}</h1>
          
          <div style={styles.actions}>
            <button 
              style={styles.saveButton}
              onClick={saveDocument}
              disabled={saving}
            >
              {saving ? 'Sauvegarde...' : t.saveDocument}
            </button>
            <button 
              style={styles.pdfButton}
              onClick={generatePDF}
            >
              {t.generatePDF}
            </button>
          </div>
        </header>

        <div style={styles.content}>
          {/* Form Section */}
          <div style={styles.formSection}>
            <div style={styles.titleSection}>
              <label style={styles.label}>Titre du Workflow</label>
              <input
                type="text"
                style={styles.titleInput}
                value={workflowTitle}
                onChange={(e) => setWorkflowTitle(e.target.value)}
                placeholder="Nom du workflow..."
              />
            </div>

            {/* Steps Section */}
            <div style={styles.stepsSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Étapes du Workflow</h3>
                <button style={styles.addButton} onClick={addStep}>
                  {t.addStep}
                </button>
              </div>

              {steps.map((step, index) => (
                <div key={step.id} style={styles.stepCard}>
                  <div style={styles.stepHeader}>
                    <div style={styles.stepInfo}>
                      <span style={styles.stepNumber}>#{step.order}</span>
                      <span style={{
                        ...styles.stepType,
                        backgroundColor: getStepColor(step.type)
                      }}>
                        {getStepIcon(step.type)} {t[step.type]}
                      </span>
                    </div>
                    <div style={styles.stepControls}>
                      <button 
                        style={styles.moveButton}
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button 
                        style={styles.moveButton}
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={index === steps.length - 1}
                      >
                        ↓
                      </button>
                      <button 
                        style={styles.removeButton}
                        onClick={() => removeStep(step.id)}
                      >
                        {t.removeStep}
                      </button>
                    </div>
                  </div>

                  <div style={styles.stepForm}>
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{t.stepName}</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={step.name}
                          onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                          placeholder="Nom de l'étape"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{t.stepType}</label>
                        <select
                          style={styles.select}
                          value={step.type}
                          onChange={(e) => updateStep(step.id, 'type', e.target.value)}
                        >
                          <option value="start">🚀 {t.start}</option>
                          <option value="process">⚙️ {t.process}</option>
                          <option value="decision">❓ {t.decision}</option>
                          <option value="approval">✅ {t.approval}</option>
                          <option value="end">🏁 {t.end}</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{t.responsible}</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={step.responsible}
                          onChange={(e) => updateStep(step.id, 'responsible', e.target.value)}
                          placeholder="Responsable de l'étape"
                        />
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.description}</label>
                      <textarea
                        style={styles.textarea}
                        value={step.description}
                        onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                        placeholder="Description de l'étape..."
                        rows="2"
                      />
                    </div>

                    {step.type === 'decision' && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{t.conditions}</label>
                        <textarea
                          style={styles.textarea}
                          value={step.conditions}
                          onChange={(e) => updateStep(step.id, 'conditions', e.target.value)}
                          placeholder="Conditions pour cette décision..."
                          rows="2"
                        />
                      </div>
                    )}

                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.actions}</label>
                      <textarea
                        style={styles.textarea}
                        value={step.actions}
                        onChange={(e) => updateStep(step.id, 'actions', e.target.value)}
                        placeholder="Actions à effectuer..."
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div style={styles.previewSection}>
            <h3 style={styles.previewTitle}>{t.preview}</h3>
            <div id="workflow-preview" style={styles.preview}>
              <div style={styles.previewHeader}>
                <h2 style={styles.previewDocTitle}>{workflowTitle}</h2>
                <p style={styles.previewProject}>Projet: {project?.name}</p>
                <p style={styles.previewDate}>Généré le: {new Date().toLocaleDateString('fr-FR')}</p>
              </div>

              <div style={styles.workflowDiagram}>
                {steps.map((step, index) => (
                  <div key={step.id} style={styles.workflowStep}>
                    <div style={{
                      ...styles.stepBox,
                      backgroundColor: getStepColor(step.type)
                    }}>
                      <div style={styles.stepIcon}>{getStepIcon(step.type)}</div>
                      <div style={styles.stepContent}>
                        <h4 style={styles.stepTitle}>{step.name || `Étape ${step.order}`}</h4>
                        <p style={styles.stepDesc}>{step.description}</p>
                        {step.responsible && (
                          <p style={styles.stepResponsible}>👤 {step.responsible}</p>
                        )}
                        {step.conditions && (
                          <div style={styles.stepConditions}>
                            <strong>Conditions:</strong> {step.conditions}
                          </div>
                        )}
                        {step.actions && (
                          <div style={styles.stepActions}>
                            <strong>Actions:</strong> {step.actions}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div style={styles.arrow}>↓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  backButton: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },

  actions: {
    display: 'flex',
    gap: '0.75rem'
  },

  saveButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  pdfButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    padding: '2rem',
    maxWidth: '1600px',
    margin: '0 auto'
  },

  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    height: 'fit-content'
  },

  titleSection: {
    marginBottom: '2rem'
  },

  titleInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    boxSizing: 'border-box'
  },

  stepsSection: {
    marginTop: '2rem'
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },

  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },

  addButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  stepCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1rem',
    backgroundColor: '#fafafa'
  },

  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },

  stepInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },

  stepNumber: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },

  stepType: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  stepControls: {
    display: 'flex',
    gap: '0.5rem'
  },

  moveButton: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontWeight: '700'
  },

  removeButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },

  stepForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },

  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.25rem'
  },

  input: {
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box'
  },

  select: {
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box'
  },

  textarea: {
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    resize: 'vertical',
    boxSizing: 'border-box'
  },

  previewSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    height: 'fit-content'
  },

  previewTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem'
  },

  preview: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '2rem',
    backgroundColor: '#ffffff',
    minHeight: '600px'
  },

  previewHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '1rem'
  },

  previewDocTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0'
  },

  previewProject: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 0.25rem 0'
  },

  previewDate: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    margin: 0
  },

  workflowDiagram: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },

  workflowStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
  },

  stepBox: {
    width: '100%',
    maxWidth: '400px',
    padding: '1.5rem',
    borderRadius: '12px',
    color: '#ffffff',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },

  stepIcon: {
    fontSize: '2rem',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },

  stepContent: {
    textAlign: 'center'
  },

  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0'
  },

  stepDesc: {
    fontSize: '0.875rem',
    opacity: 0.9,
    margin: '0 0 0.5rem 0'
  },

  stepResponsible: {
    fontSize: '0.75rem',
    opacity: 0.8,
    margin: '0 0 0.5rem 0'
  },

  stepConditions: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '0.5rem',
    borderRadius: '6px',
    marginTop: '0.5rem',
    textAlign: 'left'
  },

  stepActions: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '0.5rem',
    borderRadius: '6px',
    marginTop: '0.5rem',
    textAlign: 'left'
  },

  arrow: {
    fontSize: '2rem',
    color: '#6b7280',
    margin: '0.5rem 0'
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