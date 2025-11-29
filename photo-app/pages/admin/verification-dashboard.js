import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';
import HeaderPresta from '../../components/HeaderPresta';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

const DOCUMENT_TYPE_LABELS = {
  identity_card: 'Carte d\'identité',
  business_license: 'Licence professionnelle',
  insurance: 'Assurance professionnelle',
  address_proof: 'Justificatif de domicile',
};

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

export default function VerificationDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalUsers: 0,
  });
  const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchDocuments();
      fetchStats();
    }
  }, [filter, loading]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('particuliers')
        .select('statut')
        .eq('id', user.id)
        .single();

      if (profile?.statut !== 'admin') {
        alert('Accès non autorisé');
        router.push('/');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('verification_documents')
        .select(`
          *,
          prestataires:provider_id(
            nom,
            prenom,
            email,
            telephone
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('verification_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allDocs, error: docsError } = await supabase
        .from('verification_documents')
        .select('verification_status');

      if (docsError) throw docsError;

      const { data: users, error: usersError } = await supabase
        .from('user_verification_status')
        .select('id');

      if (usersError) throw usersError;

      const pending = allDocs?.filter(d => d.verification_status === 'pending').length || 0;
      const approved = allDocs?.filter(d => d.verification_status === 'approved').length || 0;
      const rejected = allDocs?.filter(d => d.verification_status === 'rejected').length || 0;

      setStats({
        pending,
        approved,
        rejected,
        totalUsers: users?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (documentId) => {
    if (!confirm('Êtes-vous sûr de vouloir approuver ce document ?')) return;

    setProcessingId(documentId);

    try {
      // Update document status
      const { error: docError } = await supabase
        .from('verification_documents')
        .update({ 
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (docError) throw docError;

      // Get document details
      const doc = documents.find(d => d.id === documentId);
      
      // Update user verification status
      const updateData = {};
      if (doc.document_type === 'identity_card') {
        updateData.identity_verified = true;
      } else if (doc.document_type === 'business_license') {
        updateData.business_verified = true;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('user_verification_status')
          .update(updateData)
          .eq('user_id', doc.provider_id);
      }

      // Send notification
      await supabase.from('notifications').insert({
        user_id: doc.provider_id,
        type: 'verification_approved',
        titre: 'Document approuvé',
        message: `Votre ${DOCUMENT_TYPE_LABELS[doc.document_type]} a été approuvé`,
      });

      alert('Document approuvé avec succès');
      fetchDocuments();
      fetchStats();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error approving document:', error);
      alert('Erreur lors de l\'approbation du document');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (documentId) => {
    if (!rejectionReason.trim()) {
      alert('Veuillez indiquer la raison du rejet');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir rejeter ce document ?')) return;

    setProcessingId(documentId);

    try {
      // Update document status
      const { error: docError } = await supabase
        .from('verification_documents')
        .update({ 
          verification_status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          verified_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (docError) throw docError;

      // Get document details
      const doc = documents.find(d => d.id === documentId);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: doc.provider_id,
        type: 'verification_rejected',
        titre: 'Document rejeté',
        message: `Votre ${DOCUMENT_TYPE_LABELS[doc.document_type]} a été rejeté: ${rejectionReason}`,
      });

      alert('Document rejeté');
      fetchDocuments();
      fetchStats();
      setSelectedDocument(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting document:', error);
      alert('Erreur lors du rejet du document');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const provider = doc.prestataires;
    const search = searchTerm.toLowerCase();
    return (
      provider?.nom?.toLowerCase().includes(search) ||
      provider?.prenom?.toLowerCase().includes(search) ||
      provider?.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Head>
        <title>Vérification des documents - Admin</title>
      </Head>

      <HeaderPresta />

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Vérification des documents</h1>
          <p style={styles.subtitle}>Gérez les demandes de vérification des prestataires</p>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: COLORS.warning + '20' }}>
              <span style={{ fontSize: 24 }}>⏳</span>
            </div>
            <div>
              <div style={styles.statValue}>{stats.pending}</div>
              <div style={styles.statLabel}>En attente</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: COLORS.success + '20' }}>
              <span style={{ fontSize: 24 }}>✅</span>
            </div>
            <div>
              <div style={styles.statValue}>{stats.approved}</div>
              <div style={styles.statLabel}>Approuvés</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: COLORS.error + '20' }}>
              <span style={{ fontSize: 24 }}>❌</span>
            </div>
            <div>
              <div style={styles.statValue}>{stats.rejected}</div>
              <div style={styles.statLabel}>Rejetés</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: COLORS.info + '20' }}>
              <span style={{ fontSize: 24 }}>👥</span>
            </div>
            <div>
              <div style={styles.statValue}>{stats.totalUsers}</div>
              <div style={styles.statLabel}>Utilisateurs</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.filterButtons}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterButton,
                ...(filter === 'all' ? styles.filterButtonActive : {}),
              }}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('pending')}
              style={{
                ...styles.filterButton,
                ...(filter === 'pending' ? styles.filterButtonActive : {}),
              }}
            >
              En attente ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('approved')}
              style={{
                ...styles.filterButton,
                ...(filter === 'approved' ? styles.filterButtonActive : {}),
              }}
            >
              Approuvés
            </button>
            <button
              onClick={() => setFilter('rejected')}
              style={{
                ...styles.filterButton,
                ...(filter === 'rejected' ? styles.filterButtonActive : {}),
              }}
            >
              Rejetés
            </button>
          </div>

          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Documents List */}
        <div style={styles.documentsGrid}>
          {filteredDocuments.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 48, marginBottom: 16 }}>📄</span>
              <p style={styles.emptyText}>Aucun document trouvé</p>
            </div>
          ) : (
            filteredDocuments.map(doc => (
              <div key={doc.id} style={styles.documentCard}>
                <div style={styles.documentHeader}>
                  <div>
                    <h3 style={styles.documentTitle}>
                      {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    </h3>
                    <p style={styles.providerName}>
                      {doc.prestataires?.prenom} {doc.prestataires?.nom}
                    </p>
                    <p style={styles.providerEmail}>{doc.prestataires?.email}</p>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        doc.verification_status === 'pending'
                          ? COLORS.warning + '20'
                          : doc.verification_status === 'approved'
                          ? COLORS.success + '20'
                          : COLORS.error + '20',
                      color:
                        doc.verification_status === 'pending'
                          ? COLORS.warning
                          : doc.verification_status === 'approved'
                          ? COLORS.success
                          : COLORS.error,
                    }}
                  >
                    {STATUS_LABELS[doc.verification_status]}
                  </div>
                </div>

                <div style={styles.documentInfo}>
                  <p style={styles.infoText}>
                    📅 Soumis le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {doc.verified_at && (
                    <p style={styles.infoText}>
                      ✓ Vérifié le {new Date(doc.verified_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {doc.rejection_reason && (
                  <div style={styles.rejectionBox}>
                    <p style={styles.rejectionLabel}>Raison du rejet:</p>
                    <p style={styles.rejectionText}>{doc.rejection_reason}</p>
                  </div>
                )}

                <div style={styles.documentActions}>
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    style={styles.viewButton}
                  >
                    Voir le document
                  </button>

                  {doc.verification_status === 'pending' && (
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleApprove(doc.id)}
                        disabled={processingId === doc.id}
                        style={styles.approveButton}
                      >
                        {processingId === doc.id ? 'Traitement...' : '✓ Approuver'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setRejectionReason('');
                        }}
                        disabled={processingId === doc.id}
                        style={styles.rejectButton}
                      >
                        ✗ Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Document Modal */}
      {selectedDocument && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDocument(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {DOCUMENT_TYPE_LABELS[selectedDocument.document_type]}
              </h2>
              <button
                onClick={() => setSelectedDocument(null)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.providerInfo}>
                <h3 style={styles.sectionTitle}>Informations du prestataire</h3>
                <p><strong>Nom:</strong> {selectedDocument.prestataires?.prenom} {selectedDocument.prestataires?.nom}</p>
                <p><strong>Email:</strong> {selectedDocument.prestataires?.email}</p>
                <p><strong>Téléphone:</strong> {selectedDocument.prestataires?.telephone}</p>
              </div>

              <div style={styles.documentPreview}>
                <img
                  src={selectedDocument.document_url}
                  alt="Document"
                  style={styles.documentImage}
                />
              </div>

              {selectedDocument.verification_status === 'pending' && (
                <div style={styles.reviewSection}>
                  <h3 style={styles.sectionTitle}>Action de vérification</h3>
                  
                  <textarea
                    placeholder="Raison du rejet (obligatoire si vous rejetez)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={styles.textarea}
                    rows={4}
                  />

                  <div style={styles.modalActions}>
                    <button
                      onClick={() => handleApprove(selectedDocument.id)}
                      disabled={processingId === selectedDocument.id}
                      style={styles.approveButtonLarge}
                    >
                      {processingId === selectedDocument.id ? 'Traitement...' : '✓ Approuver ce document'}
                    </button>
                    <button
                      onClick={() => handleReject(selectedDocument.id)}
                      disabled={processingId === selectedDocument.id || !rejectionReason.trim()}
                      style={{
                        ...styles.rejectButtonLarge,
                        opacity: !rejectionReason.trim() ? 0.5 : 1,
                      }}
                    >
                      ✗ Rejeter ce document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: `4px solid ${COLORS.border}`,
    borderTop: `4px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterButtons: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    color: COLORS.background,
    borderColor: COLORS.primary,
  },
  searchInput: {
    padding: '8px 16px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 14,
    minWidth: 250,
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: 20,
  },
  documentCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  providerEmail: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  documentInfo: {
    marginBottom: 16,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.border}`,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  rejectionBox: {
    backgroundColor: COLORS.error + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: COLORS.text,
  },
  documentActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  viewButton: {
    padding: '10px 16px',
    borderRadius: 8,
    border: `1px solid ${COLORS.primary}`,
    backgroundColor: COLORS.background,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: COLORS.success,
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  rejectButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: COLORS.error,
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: COLORS.backgroundLight,
    fontSize: 18,
    cursor: 'pointer',
  },
  modalBody: {
    padding: 20,
  },
  providerInfo: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text,
  },
  documentPreview: {
    marginBottom: 20,
  },
  documentImage: {
    width: '100%',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
  },
  reviewSection: {
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 20,
  },
  textarea: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: 16,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
  },
  approveButtonLarge: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: COLORS.success,
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer',
  },
  rejectButtonLarge: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: COLORS.error,
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer',
  },
};
