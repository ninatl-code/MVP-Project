import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '@/components/photographe/FooterPresta';
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
  star: '#FFC107',
};

interface Review {
  id: string;
  overall_rating: number;
  comment: string;
  created_at: string;
  provider_response?: string;
  reviewer: {
    prenom?: string;
    nom?: string;
  };
  reservation: {
    annonces: {
      titre: string;
    };
  };
}

export default function ProviderReviewsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    pendingResponses: 0,
    thisMonth: 0,
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('avis')
        .select(`
          *,
          reviewer_profiles:reviewer_id(nom),
          reservation_info:reservation_id(
            annonce_id,
            annonce_data:annonce_id(titre)
          )
        `)
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map avis to Review format
      const formattedData = (data || []).map((avis: any) => ({
        id: avis.id,
        overall_rating: avis.note_globale || 5,
        comment: avis.commentaire,
        created_at: avis.created_at,
        provider_response: avis.provider_response,
        reviewer: {
          nom: avis.reviewer_profiles?.nom || 'Client',
        },
        reservation: {
          titre: avis.reservation_info?.annonce_data?.titre || 'Service',
        },
      }));

      setReviews(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.reduce((sum, r) => sum + r.overall_rating, 0);
    const average = reviewsData.length > 0 ? total / reviewsData.length : 0;
    const pending = reviewsData.filter((r) => !r.provider_response).length;
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonth = reviewsData.filter(
      (r) => new Date(r.created_at) >= thisMonthStart
    ).length;

    setStats({
      averageRating: average,
      totalReviews: reviewsData.length,
      pendingResponses: pending,
      thisMonth,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const getFilteredReviews = () => {
    if (filter === 'pending') {
      return reviews.filter((r) => !r.provider_response);
    }
    if (filter === 'responded') {
      return reviews.filter((r) => r.provider_response);
    }
    return reviews;
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={COLORS.star}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterPresta />
      </View>
    );
  }

  const filteredReviews = getFilteredReviews();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes Avis</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="star" size={24} color={COLORS.star} />
              </View>
              <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalReviews}</Text>
              <Text style={styles.statLabel}>Total avis</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingResponses}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="calendar" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats.thisMonth}</Text>
              <Text style={styles.statLabel}>Ce mois</Text>
            </View>
          </View>

          {/* Alert for Pending Responses */}
          {stats.pendingResponses > 0 && (
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>Réponses en attente</Text>
                <Text style={styles.alertDescription}>
                  Vous avez {stats.pendingResponses} avis sans réponse. Répondre rapidement améliore
                  votre image professionnelle !
                </Text>
              </View>
            </View>
          )}

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                Tous ({reviews.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
              onPress={() => setFilter('pending')}
            >
              <Text
                style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}
              >
                À répondre ({stats.pendingResponses})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'responded' && styles.filterTabActive]}
              onPress={() => setFilter('responded')}
            >
              <Text
                style={[styles.filterTabText, filter === 'responded' && styles.filterTabTextActive]}
              >
                Répondus ({reviews.length - stats.pendingResponses})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyStateTitle}>
                {filter === 'pending'
                  ? 'Aucun avis en attente'
                  : filter === 'responded'
                  ? 'Aucune réponse publiée'
                  : 'Aucun avis pour le moment'}
              </Text>
              <Text style={styles.emptyStateText}>
                {filter === 'all'
                  ? 'Les avis de vos clients apparaîtront ici'
                  : 'Changez de filtre pour voir plus d\'avis'}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewCard}
                onPress={() =>
                  router.push({
                    pathname: '/prestataires/respond-to-review' as any,
                    params: { reviewId: review.id },
                  })
                }
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>
                      {review.reviewer?.prenom || 'Client'} {review.reviewer?.nom?.[0] || ''}.
                    </Text>
                    <Text style={styles.serviceName}>{review.reservation?.annonces?.titre}</Text>
                  </View>
                  {renderStars(review.overall_rating)}
                </View>

                <Text style={styles.reviewComment} numberOfLines={3}>
                  {review.comment}
                </Text>

                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  {review.provider_response ? (
                    <View style={styles.respondedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={styles.respondedBadgeText}>Répondu</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.warning} />
                      <Text style={styles.pendingBadgeText}>Répondre</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  alertCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  alertText: { flex: 1 },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },

  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.accent,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  filterTabTextActive: {
    color: 'white',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },

  reviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInfo: { flex: 1 },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  serviceName: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
  },
  respondedBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.warning,
  },
});
