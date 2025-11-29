import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

interface SearchHistory {
  id: string;
  search_query: string;
  filters_applied: any;
  results_count: number;
  clicked_annonce_id?: string;
  search_duration_seconds?: number;
  created_at: string;
}

interface Recommendation {
  id: string;
  annonce_id: string;
  reason: string;
  confidence_score: number;
  annonces: {
    titre: string;
    photos?: string;
    rate: number;
    ville_id: string;
  };
}

export default function SearchHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'recommendations'>('history');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Fetch search history
      const { data: historyData, error: historyError } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setHistory(historyData || []);

      // Fetch recommendations
      const { data: recsData, error: recsError } = await supabase
        .from('user_recommendations')
        .select(`
          *,
          annonces:annonce_id(
            titre,
            photos,
            rate,
            ville_id
          )
        `)
        .eq('user_id', user.id)
        .order('confidence_score', { ascending: false })
        .limit(20);

      if (recsError) throw recsError;
      setRecommendations(recsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Confirmer',
      'Effacer tout l\'historique de recherche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from('search_history')
                .delete()
                .eq('user_id', user.id);

              if (error) throw error;

              setHistory([]);
              Alert.alert('Succès', 'Historique effacé');
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Erreur', 'Impossible d\'effacer l\'historique');
            }
          },
        },
      ]
    );
  };

  const deleteHistoryItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setHistory(prev => prev.filter(h => h.id !== itemId));
    } catch (error) {
      console.error('Error deleting history item:', error);
      Alert.alert('Erreur', 'Impossible de supprimer cet élément');
    }
  };

  const repeatSearch = (item: SearchHistory) => {
    // Navigate to search with filters
    const params = new URLSearchParams();
    params.append('query', item.search_query);
    router.push(`/search?${params.toString()}` as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('similar')) return 'layers';
    if (reason.includes('popular')) return 'trending-up';
    if (reason.includes('location')) return 'location';
    if (reason.includes('price')) return 'cash';
    return 'star';
  };

  const getReasonColor = (reason: string) => {
    if (reason.includes('similar')) return COLORS.primary;
    if (reason.includes('popular')) return COLORS.success;
    if (reason.includes('location')) return COLORS.warning;
    return COLORS.accent;
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
          <Text style={styles.headerTitle}>Historique & Suggestions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time"
              size={20}
              color={activeTab === 'history' ? 'white' : 'rgba(255,255,255,0.6)'}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Historique
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'recommendations' && styles.tabActive]}
            onPress={() => setActiveTab('recommendations')}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={activeTab === 'recommendations' ? 'white' : 'rgba(255,255,255,0.6)'}
            />
            <Text style={[styles.tabText, activeTab === 'recommendations' && styles.tabTextActive]}>
              Pour vous ({recommendations.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'history' ? (
          <>
            {history.length > 0 && (
              <View style={styles.clearContainer}>
                <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={styles.clearButtonText}>Effacer l'historique</Text>
                </TouchableOpacity>
              </View>
            )}

            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun historique</Text>
                <Text style={styles.emptyText}>
                  Vos recherches récentes apparaîtront ici
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {history.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <TouchableOpacity
                      style={styles.historyMain}
                      onPress={() => repeatSearch(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyIcon}>
                        <Ionicons name="search" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyQuery}>{item.search_query}</Text>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyMetaText}>
                            {formatDate(item.created_at)}
                          </Text>
                          {item.results_count > 0 && (
                            <>
                              <Text style={styles.metaDivider}>•</Text>
                              <Text style={styles.historyMetaText}>
                                {item.results_count} résultats
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteHistoryItem(item.id)}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {recommendations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucune recommandation</Text>
                <Text style={styles.emptyText}>
                  Effectuez des recherches pour obtenir des suggestions personnalisées
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>
                  ✨ Sélectionné pour vous
                </Text>
                {recommendations.map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={styles.recommendationCard}
                    onPress={() => router.push(`/annonces/${rec.annonce_id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recBadge}>
                      <Ionicons
                        name={getReasonIcon(rec.reason)}
                        size={24}
                        color={getReasonColor(rec.reason)}
                      />
                    </View>
                    <View style={styles.recContent}>
                      <Text style={styles.recTitle} numberOfLines={2}>
                        {rec.annonces.titre}
                      </Text>
                      <View style={styles.recMeta}>
                        <View style={styles.recRating}>
                          <Ionicons name="star" size={14} color="#FFC107" />
                          <Text style={styles.recRatingText}>{rec.annonces.rate}/5</Text>
                        </View>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>
                            {Math.round(rec.confidence_score * 100)}% match
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recReason} numberOfLines={2}>
                        {rec.reason}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  clearContainer: {
    padding: 20,
    paddingBottom: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
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
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  historyCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyQuery: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  metaDivider: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  deleteButton: {
    padding: 4,
  },
  recommendationCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recContent: {
    flex: 1,
    gap: 6,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  recMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recRatingText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  confidenceBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  recReason: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
});
