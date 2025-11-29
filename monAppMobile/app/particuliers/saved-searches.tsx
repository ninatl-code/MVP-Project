import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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

interface SavedSearch {
  id: string;
  search_name: string;
  search_criteria: {
    ville?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    keywords?: string;
    dateRange?: string;
    rating?: number;
  };
  notification_enabled: boolean;
  last_run_at?: string;
  results_count: number;
  created_at: string;
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

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

  const runSearch = async (search: SavedSearch) => {
    try {
      // Update last_run_at
      await supabase
        .from('saved_searches')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', search.id);

      // Navigate to search page with criteria
      const criteria = search.search_criteria;
      const params = new URLSearchParams();
      
      if (criteria.ville) params.append('ville', criteria.ville);
      if (criteria.category) params.append('category', criteria.category);
      if (criteria.minPrice) params.append('minPrice', criteria.minPrice.toString());
      if (criteria.maxPrice) params.append('maxPrice', criteria.maxPrice.toString());
      if (criteria.keywords) params.append('keywords', criteria.keywords);
      if (criteria.rating) params.append('rating', criteria.rating.toString());

      router.push(`/search?${params.toString()}` as any);
    } catch (error) {
      console.error('Error running search:', error);
      Alert.alert('Erreur', 'Impossible d\'exécuter la recherche');
    }
  };

  const toggleNotifications = async (searchId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notification_enabled: !currentState })
        .eq('id', searchId);

      if (error) throw error;

      setSavedSearches(prev =>
        prev.map(s => s.id === searchId ? { ...s, notification_enabled: !currentState } : s)
      );

      Alert.alert(
        'Succès',
        !currentState ? 'Notifications activées' : 'Notifications désactivées'
      );
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Erreur', 'Impossible de modifier les notifications');
    }
  };

  const deleteSearch = async (searchId: string) => {
    Alert.alert(
      'Confirmer',
      'Supprimer cette recherche sauvegardée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('saved_searches')
                .delete()
                .eq('id', searchId);

              if (error) throw error;

              setSavedSearches(prev => prev.filter(s => s.id !== searchId));
              Alert.alert('Succès', 'Recherche supprimée');
            } catch (error) {
              console.error('Error deleting search:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la recherche');
            }
          },
        },
      ]
    );
  };

  const saveCurrentSearch = async () => {
    if (!searchName.trim()) {
      Alert.alert('Attention', 'Veuillez donner un nom à cette recherche');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Get current search parameters from URL or state
      // This is a placeholder - you'd get actual search criteria from your search context
      const searchCriteria = {
        keywords: 'photographe',
        ville: 'Paris',
        minPrice: 50,
        maxPrice: 200,
      };

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          search_name: searchName.trim(),
          search_criteria: searchCriteria,
          notification_enabled: true,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Recherche sauvegardée');
      setSearchName('');
      setShowCreateModal(false);
      fetchSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la recherche');
    } finally {
      setSaving(false);
    }
  };

  const formatCriteria = (criteria: SavedSearch['search_criteria']) => {
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

  const formatDate = (dateString: string) => {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recherches sauvegardées</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {savedSearches.length} recherche{savedSearches.length > 1 ? 's' : ''} sauvegardée{savedSearches.length > 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {savedSearches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune recherche sauvegardée</Text>
            <Text style={styles.emptyText}>
              Sauvegardez vos recherches fréquentes pour y accéder rapidement
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Créer une recherche</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchesList}>
            {savedSearches.map((search) => (
              <View key={search.id} style={styles.searchCard}>
                <TouchableOpacity
                  style={styles.searchMain}
                  onPress={() => runSearch(search)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchHeader}>
                    <View style={styles.searchIconContainer}>
                      <Ionicons name="bookmark" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.searchInfo}>
                      <Text style={styles.searchName}>{search.search_name}</Text>
                      <Text style={styles.searchCriteria} numberOfLines={2}>
                        {formatCriteria(search.search_criteria)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.searchMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.metaText}>
                        {search.last_run_at
                          ? `Lancée ${formatDate(search.last_run_at)}`
                          : 'Jamais lancée'}
                      </Text>
                    </View>
                    {search.results_count > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons name="document-text-outline" size={16} color={COLORS.success} />
                        <Text style={styles.metaText}>{search.results_count} résultats</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.searchActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleNotifications(search.id, search.notification_enabled)}
                  >
                    <Ionicons
                      name={search.notification_enabled ? 'notifications' : 'notifications-off'}
                      size={20}
                      color={search.notification_enabled ? COLORS.primary : COLORS.textLight}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => runSearch(search)}
                  >
                    <Ionicons name="play-circle" size={20} color={COLORS.success} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteSearch(search.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle recherche</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nom de la recherche</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Photographes Paris"
                value={searchName}
                onChangeText={setSearchName}
                autoFocus
              />

              <Text style={styles.helperText}>
                💡 Cette recherche utilisera vos critères actuels
              </Text>

              <TouchableOpacity
                style={[styles.saveButton, !searchName.trim() && styles.saveButtonDisabled]}
                onPress={saveCurrentSearch}
                disabled={saving || !searchName.trim()}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="bookmark" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Sauvegarder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchesList: {
    padding: 20,
    gap: 16,
  },
  searchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchMain: {
    padding: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  searchIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  searchCriteria: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  searchMeta: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  searchActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
