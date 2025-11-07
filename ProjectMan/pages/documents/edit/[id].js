import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const LANGUAGES = {
  en: {
    title: "Edit Document",
    backToDocuments: "← Back to Documents",
    preview: "Preview",
    customize: "Customize",
    export: "Export",
    save: "Save",
    saving: "Saving...",
    exporting: "Exporting...",
    documentTitle: "Document Title",
    content: "Content",
    customization: "Customization",
    logoUpload: "Upload Logo",
    primaryColor: "Primary Color",
    secondaryColor: "Secondary Color",
    fontFamily: "Font Family",
    fontSize: "Font Size",
    exportPDF: "Export as PDF",
    exportWord: "Export as Word",
    loading: "Loading document...",
    documentNotFound: "Document not found",
    unsavedChanges: "You have unsaved changes",
    confirmDiscard: "Are you sure you want to discard changes?"
  },
  fr: {
    title: "Modifier le Document",
    backToDocuments: "← Retour aux Documents",
    preview: "Aperçu",
    customize: "Personnaliser",
    export: "Exporter",
    save: "Enregistrer",
    saving: "Enregistrement...",
    exporting: "Exportation...",
    documentTitle: "Titre du Document",
    content: "Contenu",
    customization: "Personnalisation",
    logoUpload: "Télécharger un Logo",
    primaryColor: "Couleur Principale",
    secondaryColor: "Couleur Secondaire",
    fontFamily: "Police de Caractère",
    fontSize: "Taille de Police",
    exportPDF: "Exporter en PDF",
    exportWord: "Exporter en Word",
    loading: "Chargement du document...",
    documentNotFound: "Document non trouvé",
    unsavedChanges: "Vous avez des modifications non sauvegardées",
    confirmDiscard: "Êtes-vous sûr de vouloir abandonner les modifications ?"
  }
};

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Inter',
  'Roboto',
  'Open Sans'
];

export default function EditDocumentPage() {
  const router = useRouter();
  const { id: documentId } = router.query;
  const previewRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [document, setDocument] = useState(null);
  const [originalDocument, setOriginalDocument] = useState(null);
  const [customization, setCustomization] = useState({
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Inter',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20
  });
  const [activeTab, setActiveTab] = useState('content');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = LANGUAGES[language];

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  // Detect unsaved changes
  useEffect(() => {
    if (originalDocument && document) {
      const hasChanges = JSON.stringify(originalDocument) !== JSON.stringify(document);
      setHasUnsavedChanges(hasChanges);
    }
  }, [document, originalDocument]);

  // Warning before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = t.unsavedChanges;
        return t.unsavedChanges;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, t]);

  async function loadDocument() {
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

      // Get document with all related data
      const { data: docData, error: docError } = await supabase
        .from('deliverables')
        .select(`
          *,
          deliverable_types (name, description),
          projects (name),
          deliverable_templates (name, content)
        `)
        .eq('id', documentId)
        .single();

      if (docError || !docData) {
        console.error('Error fetching document:', docError);
        setDocument(null);
        setLoading(false);
        return;
      }

      setDocument(docData);
      setOriginalDocument({ ...docData });

      // Get existing customization
      const { data: customData } = await supabase
        .from('document_customizations')
        .select('*')
        .eq('deliverable_id', documentId)
        .single();

      if (customData) {
        setCustomization({
          logoUrl: customData.logo_url || '',
          primaryColor: customData.primary_color || '#2563eb',
          secondaryColor: customData.secondary_color || '#64748b',
          fontFamily: customData.font_family || 'Inter',
          fontSize: customData.font_size || 14,
          marginTop: customData.margin_top || 20,
          marginBottom: customData.margin_bottom || 20,
          marginLeft: customData.margin_left || 20,
          marginRight: customData.margin_right || 20
        });
      }

    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!document) return;

    setSaving(true);
    try {
      // Update document
      const { error: docError } = await supabase
        .from('deliverables')
        .update({
          title: document.title,
          content: document.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (docError) {
        console.error('Error updating document:', docError);
        alert('Error saving document: ' + docError.message);
        return;
      }

      // Upsert customization
      const { error: customError } = await supabase
        .from('document_customizations')
        .upsert({
          deliverable_id: documentId,
          logo_url: customization.logoUrl,
          primary_color: customization.primaryColor,
          secondary_color: customization.secondaryColor,
          font_family: customization.fontFamily,
          font_size: customization.fontSize,
          margin_top: customization.marginTop,
          margin_bottom: customization.marginBottom,
          margin_left: customization.marginLeft,
          margin_right: customization.marginRight,
          updated_at: new Date().toISOString()
        });

      if (customError) {
        console.error('Error saving customization:', customError);
      }

      // Update original document to reset unsaved changes
      setOriginalDocument({ ...document });
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error saving:', error);
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
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

      pdf.save(`${document.title || 'document'}.pdf`);

      // Log export
      await supabase
        .from('document_exports')
        .insert({
          deliverable_id: documentId,
          format: 'pdf',
          exported_by: user.id,
          export_settings: { 
            customization_applied: true,
            export_date: new Date().toISOString()
          }
        });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF');
    } finally {
      setExporting(false);
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

  if (!document) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2>{t.documentNotFound}</h2>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/documents')}
          >
            {t.backToDocuments}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t.title} - {document.title} - ProjectHub</title>
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button 
              style={styles.backButton}
              onClick={() => {
                if (hasUnsavedChanges && !confirm(t.confirmDiscard)) {
                  return;
                }
                router.push('/documents');
              }}
            >
              {t.backToDocuments}
            </button>
            <h1 style={styles.title}>{document.title}</h1>
            {hasUnsavedChanges && (
              <span style={styles.unsavedIndicator}>●</span>
            )}
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.saveButton}
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? t.saving : t.save}
            </button>
            <button 
              style={styles.exportButton}
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? t.exporting : t.exportPDF}
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button 
            style={{
              ...styles.tab,
              ...(activeTab === 'content' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('content')}
          >
            {t.content}
          </button>
          <button 
            style={{
              ...styles.tab,
              ...(activeTab === 'customize' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('customize')}
          >
            {t.customize}
          </button>
          <button 
            style={{
              ...styles.tab,
              ...(activeTab === 'preview' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('preview')}
          >
            {t.preview}
          </button>
        </div>

        {/* Content */}
        <main style={styles.main}>
          {activeTab === 'content' && (
            <div style={styles.contentEditor}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.documentTitle}</label>
                <input
                  type="text"
                  style={styles.input}
                  value={document.title}
                  onChange={(e) => setDocument({
                    ...document,
                    title: e.target.value
                  })}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.content}</label>
                <textarea
                  style={styles.textarea}
                  value={document.content?.text || ''}
                  onChange={(e) => setDocument({
                    ...document,
                    content: {
                      ...document.content,
                      text: e.target.value
                    }
                  })}
                  rows={20}
                  placeholder="Enter your document content here..."
                />
              </div>
            </div>
          )}

          {activeTab === 'customize' && (
            <div style={styles.customizePanel}>
              <h3 style={styles.sectionTitle}>{t.customization}</h3>
              
              <div style={styles.customizeGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.primaryColor}</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization({
                      ...customization,
                      primaryColor: e.target.value
                    })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.secondaryColor}</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={customization.secondaryColor}
                    onChange={(e) => setCustomization({
                      ...customization,
                      secondaryColor: e.target.value
                    })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.fontFamily}</label>
                  <select
                    style={styles.select}
                    value={customization.fontFamily}
                    onChange={(e) => setCustomization({
                      ...customization,
                      fontFamily: e.target.value
                    })}
                  >
                    {FONT_FAMILIES.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.fontSize}</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={customization.fontSize}
                    onChange={(e) => setCustomization({
                      ...customization,
                      fontSize: parseInt(e.target.value) || 14
                    })}
                    min="8"
                    max="24"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div style={styles.previewContainer}>
              <div 
                ref={previewRef}
                style={{
                  ...styles.preview,
                  fontFamily: customization.fontFamily,
                  fontSize: `${customization.fontSize}px`,
                  padding: `${customization.marginTop}px ${customization.marginRight}px ${customization.marginBottom}px ${customization.marginLeft}px`
                }}
              >
                {customization.logoUrl && (
                  <div style={styles.logoContainer}>
                    <img 
                      src={customization.logoUrl} 
                      alt="Logo" 
                      style={styles.logo}
                    />
                  </div>
                )}
                
                <h1 style={{
                  ...styles.previewTitle,
                  color: customization.primaryColor
                }}>
                  {document.title}
                </h1>
                
                <div style={styles.previewContent}>
                  {document.content?.text?.split('\n').map((paragraph, index) => (
                    <p key={index} style={styles.previewParagraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
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
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },

  headerRight: {
    display: 'flex',
    gap: '1rem'
  },

  backButton: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.5rem 0'
  },

  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },

  unsavedIndicator: {
    color: '#ef4444',
    fontSize: '1.5rem',
    lineHeight: 1
  },

  saveButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  exportButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  tabs: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex'
  },

  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },

  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6'
  },

  main: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },

  contentEditor: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  customizePanel: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  customizeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },

  previewContainer: {
    display: 'flex',
    justifyContent: 'center'
  },

  preview: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    minHeight: '800px',
    width: '210mm', // A4 width
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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

  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    resize: 'vertical'
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

  colorInput: {
    width: '100%',
    height: '40px',
    padding: '0.25rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem'
  },

  logoContainer: {
    textAlign: 'center',
    marginBottom: '2rem'
  },

  logo: {
    maxHeight: '80px',
    maxWidth: '200px'
  },

  previewTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '2rem',
    textAlign: 'center'
  },

  previewContent: {
    lineHeight: '1.6'
  },

  previewParagraph: {
    marginBottom: '1rem'
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