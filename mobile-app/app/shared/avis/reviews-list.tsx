import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FooterParti from '@/components/client/FooterParti';
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
  star: '#FFC107',
};

interface Review {
  id: string;
  overall_rating: number;
  communication_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  comment: string;
  photos?: string[];
  created_at: string;
  provider_response?: string;
  provider_response_date?: string;
  reviewer: {
    prenom?: string;
    nom?: string;
  };
}

export default function ReviewsListPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const providerId = params.providerId as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id(prenom, nom)
        `)
        .eq('reviewee_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) {
      setStats({ averageRating: 0, totalReviews: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      return;
    }

    const total = reviewsData.reduce((sum, r) => sum + r.overall_rating, 0);
    const average = total / reviewsData.length;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach((r) => {
      distribution[r.overall_rating as keyof typeof distribution]++;
    });

    setStats({
      averageRating: average,
      totalReviews: reviewsData.length,
      ratingDistribution: distribution,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={size}
            color={COLORS.star}
          />
        ))}
      </View>
    );
  };

  const renderRatingBar = (stars: number, count: number) => {
    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
    return (
      <View style={styles.ratingBarRow}>
        <Text style={styles.ratingBarLabel}>{stars}</Text>
        <Ionicons name="star" size={14} color={COLORS.star} />
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterParti />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Avis</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.averageRatingBox}>
                <Text style={styles.averageRatingNumber}>{stats.averageRating.toFixed(1)}</Text>
                {renderStars(Math.round(stats.averageRating), 20)}
                <Text style={styles.totalReviews}>{stats.totalReviews} avis</Text>
              </View>
              <View style={styles.ratingDistribution}>
                {[5, 4, 3, 2, 1].map((stars) =>
                  renderRatingBar(stars, stats.ratingDistribution[stars as keyof typeof stats.ratingDistribution])
                )}
              </View>
            </View>
          </View>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyStateTitle}>Aucun avis pour le moment</Text>
              <Text style={styles.emptyStateText}>Les avis apparaîtront ici après vos prestations</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Reviewer Info */}
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>
                      {review.reviewer?.prenom || 'Utilisateur'} {review.reviewer?.nom?.[0] || ''}.
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {renderStars(review.overall_rating, 18)}
                </View>

                {/* Comment */}
                <Text style={styles.reviewComment}>{review.comment}</Text>

                {/* Detailed Ratings */}
                {(review.communication_rating || review.professionalism_rating || review.value_rating) && (
                  <View style={styles.detailedRatings}>
                    {review.communication_rating && (
                      <View style={styles.detailedRatingRow}>
                        <Text style={styles.detailedRatingLabel}>Communication</Text>
                        {renderStars(review.communication_rating, 14)}
                      </View>
                    )}
                    {review.professionalism_rating && (
                      <View style={styles.detailedRatingRow}>
                        <Text style={styles.detailedRatingLabel}>Professionnalisme</Text>
                        {renderStars(review.professionalism_rating, 14)}
                      </View>
                    )}
                    {review.value_rating && (
                      <View style={styles.detailedRatingRow}>
                        <Text style={styles.detailedRatingLabel}>Rapport qualité/prix</Text>
                        {renderStars(review.value_rating, 14)}
                      </View>
                    )}
                  </View>
                )}

                {/* Photos */}
                {review.photos && review.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                    {review.photos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.reviewPhoto} />
                    ))}
                  </ScrollView>
                )}

                {/* Provider Response */}
                {review.provider_response && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.primary} />
                      <Text style={styles.responseTitle}>Réponse du prestataire</Text>
                    </View>
                    <Text style={styles.responseText}>{review.provider_response}</Text>
                    {review.provider_response_date && (
                      <Text style={styles.responseDate}>
                        {new Date(review.provider_response_date).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <FooterParti />
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

  statsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: { flexDirection: 'row', gap: 24 },
  averageRatingBox: {
    alignItems: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  averageRatingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  ratingDistribution: { flex: 1, justifyContent: 'center' },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingBarLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    width: 12,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.star,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 13,
    color: COLORS.textLight,
    width: 30,
    textAlign: 'right',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInfo: { flex: 1 },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },

  detailedRatings: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailedRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailedRatingLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  photosScroll: {
    marginBottom: 12,
  },
  reviewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },

  responseContainer: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  responseText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  responseDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
  },
});
