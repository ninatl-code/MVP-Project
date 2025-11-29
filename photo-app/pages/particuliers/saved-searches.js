import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';
import HeaderParti from '../../components/HeaderParti';

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
};

export default function SavedSearchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    fetchSavedSearches();
  };

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (search) => {
    try {
      await supabase
        .from('saved_searches')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', search.id);

      const criteria = search.search_criteria;
      const params = new URLSearchParams();
      
      if (criteria.ville) params.append('ville', criteria.ville);
      if (criteria.category) params.append('category', criteria.category);
      if (criteria.minPrice) params.append('minPrice', criteria.minPrice.toString());
      if (criteria.maxPrice) params.append('maxPrice', criteria.maxPrice.toString());
      if (criteria.keywords) params.append('keywords', criteria.keywords);

      router.push(`/search?${params.toString()}`);
    } catch (error) {
      console.error('Error running search:', error);
      alert('Impossible d\'exécuter la recherche');
    }
  };

  const toggleNotifications = async (searchId, currentState) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notification_enabled: !currentState })
        .eq('id', searchId);

      if (error) throw error;

      setSavedSearches(prev =>
        prev.map(s => s.id === searchId ? { ...s, notification_enabled: !currentState } : s)
      );
    } catch (error) {
      console.error('Error toggling notifications:', error);
      alert('Impossible de modifier les notifications');
    }
  };

  const deleteSearch = async (searchId) => {
    if (!confirm('Supprimer cette recherche sauvegardée ?')) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error('Error deleting search:', error);
      alert('Impossible de supprimer la recherche');
    }
  };

  const formatCriteria = (criteria) => {
    const parts = [];
    if (criteria.ville) parts.push(criteria.ville);
    if (criteria.category) parts.push(criteria.category);
    if (criteria.minPrice || criteria.maxPrice) {
      parts.push(`${criteria.minPrice || 0}€ - ${criteria.maxPrice || '∞'}€`);
    }
    if (criteria.keywords) parts.push(`"${criteria.keywords}"`);
    if (criteria.rating) parts.push(`${criteria.rating}⭐+`);
    return parts.join(' • ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais lancée';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

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
        <title>Recherches sauvegardées - Shooty</title>
      </Head>

      <HeaderParti />

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Recherches sauvegardées</h1>
            <p style={styles.subtitle}>
              {savedSearches.length} recherche{savedSearches.length > 1 ? 's' : ''} sauvegardée{savedSearches.length > 1 ? 's' : ''}
            </p>
          </div>
          <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
            <span style={{fontSize: 20}}>+</span> Nouvelle recherche
          </button>
        </div>

        {savedSearches.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{fontSize: 64}}>🔍</span>
            <h2 style={styles.emptyTitle}>Aucune recherche sauvegardée</h2>
            <p style={styles.emptyText}>
              Sauvegardez vos recherches fréquentes pour y accéder rapidement
            </p>
            <button style={styles.createButtonLarge} onClick={() => setShowCreateModal(true)}>
              Créer une recherche
            </button>
          </div>
        ) : (
          <div style={styles.searchesGrid}>
            {savedSearches.map(search => (
              <div key={search.id} style={styles.searchCard}>
                <div style={styles.searchHeader}>
                  <span style={{fontSize: 32}}>🔖</span>
                  <div style={styles.searchInfo}>
                    <h3 style={styles.searchName}>{search.search_name}</h3>
                    <p style={styles.searchCriteria}>{formatCriteria(search.search_criteria)}</p>
                  </div>
                </div>

                <div style={styles.searchMeta}>
                  <span style={styles.metaText}>
                    ⏰ {formatDate(search.last_run_at)}
                  </span>
                  {search.results_count > 0 && (
                    <span style={styles.metaText}>
                      📄 {search.results_count} résultats
                    </span>
                  )}
                </div>

                <div style={styles.searchActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => toggleNotifications(search.id, search.notification_enabled)}
                    title={search.notification_enabled ? 'Désactiver notifications' : 'Activer notifications'}
                  >
                    {search.notification_enabled ? '🔔' : '🔕'}
                  </button>

                  <button
                    style={{...styles.actionButton, ...styles.runButton}}
                    onClick={() => runSearch(search)}
                  >
                    ▶️ Lancer
                  </button>

                  <button
                    style={{...styles.actionButton, ...styles.deleteButton}}
                    onClick={() => deleteSearch(search.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Nouvelle recherche</h2>
              <button onClick={() => setShowCreateModal(false)} style={styles.closeButton}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <label style={styles.inputLabel}>Nom de la recherche</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ex: Photographes Paris"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                autoFocus
              />

              <p style={styles.helperText}>
                💡 Cette recherche utilisera vos critères actuels
              </p>

              <button
                style={{
                  ...styles.saveButton,
                  ...((!searchName.trim() || saving) && styles.saveButtonDisabled),
                }}
                onClick={async () => {
                  if (!searchName.trim()) return;
                  setSaving(true);
                  // Save logic here
                  setSaving(false);
                  setShowCreateModal(false);
                }}
                disabled={saving || !searchName.trim()}
              >
                {saving ? 'Sauvegarde...' : '🔖 Sauvegarder'}
              </button>
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
    padding: '32px 24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButtonLarge: {
    backgroundColor: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: 12,
    padding: '14px 28px',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
  },
  searchesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: 24,
  },
  searchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s',
  },
  searchHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  searchCriteria: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: '20px',
  },
  searchMeta: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.border}`,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  searchActions: {
    display: 'flex',
    gap: 8,
  },
  actionButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.background,
    cursor: 'pointer',
    fontSize: 14,
  },
  runButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    color: 'white',
    border: 'none',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
    border: 'none',
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
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
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
    padding: 24,
  },
  inputLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    fontSize: 15,
    fontFamily: 'inherit',
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 20,
  },
  saveButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    backgroundColor: COLORS.primary,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
