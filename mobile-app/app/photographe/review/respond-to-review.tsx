import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  star: '#FFC107',
};

interface Review {
  id: string;
  reviewer_id: string;
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
  reservation: {
    annonces: {
      titre: string;
    };
  };
}

export default function ProviderRespondPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reviewId = params.reviewId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    fetchReview();
  }, []);

  const fetchReview = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id(prenom, nom),
          reservation:reservation_id(
            annonces(titre)
          )
        `)
        .eq('id', reviewId)
        .single();

      if (error) throw error;
      setReview(data);
      setResponse(data.provider_response || '');
    } catch (error) {
      console.error('Error fetching review:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'avis');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (response.trim().length < 10) {
      Alert.alert('Attention', 'Votre réponse doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .update({
          provider_response: response.trim(),
          provider_response_date: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      // Send notification to reviewer
      await supabase.from('notifications').insert({
        user_id: review?.reviewer_id,
        type: 'reponse_avis',
        titre: 'Réponse à votre avis',
        message: `Le prestataire a répondu à votre avis`,
        lien: `/avis/${reviewId}`,
      });

      Alert.alert(
        'Réponse publiée',
        'Votre réponse a été publiée avec succès',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Erreur', 'Impossible de publier votre réponse. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
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

  if (!review) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Avis introuvable</Text>
        </View>
        <FooterPresta />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.headerTitle}>Répondre à l'avis</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Original Review */}
          <View style={styles.reviewCard}>
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
              {renderStars(review.overall_rating)}
            </View>

            <Text style={styles.serviceName}>{review.reservation?.annonces?.titre}</Text>
            <Text style={styles.reviewComment}>{review.comment}</Text>

            {/* Detailed Ratings */}
            {(review.communication_rating || review.professionalism_rating || review.value_rating) && (
              <View style={styles.detailedRatings}>
                {review.communication_rating && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Communication</Text>
                    <View style={styles.miniStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.communication_rating! ? 'star' : 'star-outline'}
                          size={14}
                          color={COLORS.star}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {review.professionalism_rating && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Professionnalisme</Text>
                    <View style={styles.miniStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.professionalism_rating! ? 'star' : 'star-outline'}
                          size={14}
                          color={COLORS.star}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {review.value_rating && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Rapport qualité/prix</Text>
                    <View style={styles.miniStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.value_rating! ? 'star' : 'star-outline'}
                          size={14}
                          color={COLORS.star}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Response Section */}
          <View style={styles.responseSection}>
            <Text style={styles.sectionTitle}>
              {review.provider_response ? 'Modifier votre réponse' : 'Votre réponse'}
            </Text>
            <TextInput
              style={styles.responseInput}
              placeholder="Répondez à cet avis de manière professionnelle et courtoise..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={6}
              value={response}
              onChangeText={setResponse}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{response.length} caractères (min. 10)</Text>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <View style={styles.guidelinesText}>
              <Text style={styles.guidelinesTitle}>💡 Bonnes pratiques</Text>
              <Text style={styles.guidelineItem}>• Remerciez le client pour son retour</Text>
              <Text style={styles.guidelineItem}>• Restez professionnel et courtois</Text>
              <Text style={styles.guidelineItem}>• Abordez les points soulevés si nécessaire</Text>
              <Text style={styles.guidelineItem}>• Montrez votre engagement qualité</Text>
            </View>
          </View>

          {/* Example Response */}
          {!review.provider_response && (
            <View style={styles.exampleCard}>
              <Text style={styles.exampleTitle}>📝 Exemple de réponse</Text>
              <Text style={styles.exampleText}>
                "Merci beaucoup pour votre confiance et ce retour très positif ! Je suis ravi que la
                prestation ait répondu à vos attentes. Au plaisir de vous revoir pour un prochain projet !"
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitResponse}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                {review.provider_response ? 'Modifier la réponse' : 'Publier la réponse'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 180 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: COLORS.textLight },

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

  reviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  reviewerName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  reviewDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  starsRow: { flexDirection: 'row', gap: 2 },

  serviceName: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
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
  },
  detailedRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailedRatingLabel: { fontSize: 13, color: COLORS.textLight },
  miniStars: { flexDirection: 'row', gap: 2 },

  responseSection: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  responseInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 8,
  },

  guidelinesCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  guidelinesText: { flex: 1 },
  guidelinesTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  guidelineItem: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  exampleCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
  },
  exampleTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  exampleText: { fontSize: 14, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },

  footer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
