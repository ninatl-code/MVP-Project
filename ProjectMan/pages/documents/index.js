import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const LANGUAGES = {
  en: {
    title: "My Documents",
    backToDashboard: "← Back to Dashboard",
    createNew: "+ Create New Document",
    search: "Search documents...",
    filterByStatus: "Filter by Status",
    allStatuses: "All Statuses",
    filterByType: "Filter by Type",
    allTypes: "All Types",
    noDocuments: "No documents found",
    createFirst: "Create your first document from templates",
    browseTemplates: "Browse Templates",
    draft: "Draft",
    in_review: "In Review",
    validated: "Validated",
    lastModified: "Last modified",
    project: "Project",
    type: "Type",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this document?",
    loading: "Loading documents..."
  },
  fr: {
    title: "Mes Documents",
    backToDashboard: "← Retour au Tableau de Bord",
    createNew: "+ Créer un Nouveau Document",
    search: "Rechercher des documents...",
    filterByStatus: "Filtrer par Statut",
    allStatuses: "Tous les Statuts",
    filterByType: "Filtrer par Type",
    allTypes: "Tous les Types",
    noDocuments: "Aucun document trouvé",
    createFirst: "Créez votre premier document à partir des modèles",
    browseTemplates: "Parcourir les Modèles",
    draft: "Brouillon",
    in_review: "En Révision",
    validated: "Validé",
    lastModified: "Dernière modification",
    project: "Projet",
    type: "Type",
    actions: "Actions",
    edit: "Modifier",
    delete: "Supprimer",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer ce document ?",
    loading: "Chargement des documents..."
  }
};

const STATUS_COLORS = {
  draft: '#f59e0b',
  in_review: '#3b82f6',
  validated: '#10b981'
};

export default function DocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  const t = LANGUAGES[language];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter, typeFilter]);

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

        // Get user's documents
        const { data: documentsData } = await supabase
          .from('deliverables')
          .select(`
            *,
            deliverable_types (name, description),
            projects (name)
          `)
          .eq('created_by', userData.id)
          .order('updated_at', { ascending: false });

        setDocuments(documentsData || []);
      }

      // Get deliverable types for filter
      const { data: typesData } = await supabase
        .from('deliverable_types')
        .select('*')
        .order('name');

      setDeliverableTypes(typesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterDocuments() {
    let filtered = [...documents];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.deliverable_types?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.projects?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(doc => doc.type_id === typeFilter);
    }

    setFilteredDocuments(filtered);
  }

  const handleDelete = async (documentId, documentTitle) => {
    if (!confirm(`${t.confirmDelete}\n"${documentTitle}"`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document: ' + error.message);
      } else {
        // Remove from local state
        setDocuments(documents.filter(doc => doc.id !== documentId));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while deleting');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <div style={styles.headerContent}>
            <button 
              style={styles.backButton}
              onClick={() => router.push('/projectman')}
            >
              {t.backToDashboard}
            </button>
            
            <div style={styles.headerTop}>
              <h1 style={styles.title}>{t.title}</h1>
              <button 
                style={styles.createButton}
                onClick={() => router.push('/documents/templates')}
              >
                {t.createNew}
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filtersContent}>
            <div style={styles.searchGroup}>
              <input
                type="text"
                placeholder={t.search}
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={styles.filterGroup}>
              <select 
                style={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t.allStatuses}</option>
                <option value="draft">{t.draft}</option>
                <option value="in_review">{t.in_review}</option>
                <option value="validated">{t.validated}</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <select 
                style={styles.select}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">{t.allTypes}</option>
                {deliverableTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <main style={styles.main}>
          {filteredDocuments.length === 0 ? (
            <div style={styles.emptyState}>
              {documents.length === 0 ? (
                <>
                  <div style={styles.emptyIcon}>📄</div>
                  <h3 style={styles.emptyTitle}>{t.noDocuments}</h3>
                  <p style={styles.emptyText}>{t.createFirst}</p>
                  <button 
                    style={styles.createButtonLarge}
                    onClick={() => router.push('/documents/templates')}
                  >
                    {t.browseTemplates}
                  </button>
                </>
              ) : (
                <p style={styles.emptyText}>No documents match your filters</p>
              )}
            </div>
          ) : (
            <div style={styles.documentsList}>
              {filteredDocuments.map(doc => (
                <div key={doc.id} style={styles.documentCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitle}>
                      <h3 style={styles.documentTitle}>{doc.title}</h3>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: STATUS_COLORS[doc.status] || '#6b7280'
                      }}>
                        {t[doc.status] || doc.status}
                      </span>
                    </div>
                    <div style={styles.cardMeta}>
                      <span style={styles.metaItem}>
                        <strong>{t.type}:</strong> {doc.deliverable_types?.name}
                      </span>
                      <span style={styles.metaItem}>
                        <strong>{t.project}:</strong> {doc.projects?.name}
                      </span>
                      <span style={styles.metaItem}>
                        <strong>{t.lastModified}:</strong> {formatDate(doc.updated_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.cardActions}>
                    <button 
                      style={styles.editButton}
                      onClick={() => router.push(`/documents/edit/${doc.id}`)}
                    >
                      {t.edit}
                    </button>
                    <button 
                      style={styles.deleteButton}
                      onClick={() => handleDelete(doc.id, doc.title)}
                    >
                      {t.delete}
                    </button>
                  </div>
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

  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#111827',
    margin: 0
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
    transition: 'all 0.2s'
  },

  filters: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f3f4f6',
    padding: '1.5rem 2rem'
  },

  filtersContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap'
  },

  searchGroup: {
    flex: '2',
    minWidth: '300px'
  },

  filterGroup: {
    flex: '1',
    minWidth: '150px'
  },

  searchInput: {
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

  main: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },

  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },

  documentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },

  cardHeader: {
    flex: 1
  },

  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },

  documentTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },

  statusBadge: {
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },

  metaItem: {
    fontSize: '0.875rem',
    color: '#6b7280'
  },

  cardActions: {
    display: 'flex',
    gap: '0.75rem',
    marginLeft: '1rem'
  },

  editButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  deleteButton: {
    backgroundColor: '#ef4444',
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
    padding: '4rem 2rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb'
  },

  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },

  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem'
  },

  emptyText: {
    color: '#6b7280',
    fontSize: '1rem',
    marginBottom: '2rem'
  },

  createButtonLarge: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.875rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
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