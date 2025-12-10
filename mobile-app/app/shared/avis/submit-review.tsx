import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FooterParti from '@/components/client/FooterParti';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

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
  star: '#FFC107',
};

interface Reservation {
  id: string;
  prestataire_id: string;
  annonce_id: string;
  date_debut: string;
  annonces: {
    titre: string;
    profiles: {
      prenom: string;
      nom: string;
    };
  };
}

export default function SubmitReviewPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reservationId = params.reservationId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  
  // Rating states
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  
  // Review content
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchReservation();
  }, []);

  const fetchReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, annonces(titre, profiles(prenom, nom))')
        .eq('id', reservationId)
        .single();

      if (error) throw error;
      setReservation(data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 5 photos');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (overallRating === 0) {
      Alert.alert('Attention', 'Veuillez donner une note globale');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Attention', 'Votre commentaire doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileName = `review_${reservationId}_${Date.now()}_${Math.random()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('review_photos')
            .upload(fileName, {
              uri: photo,
              type: 'image/jpeg',
              name: fileName,
            } as any);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('review_photos')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        }
      }

      // Create review
      const reviewData = {
        reservation_id: reservationId,
        reviewer_id: user.id,
        reviewee_id: reservation?.prestataire_id,
        reviewer_type: 'client',
        overall_rating: overallRating,
        communication_rating: communicationRating || null,
        professionalism_rating: professionalismRating || null,
        value_rating: valueRating || null,
        comment: comment.trim(),
        photos: photoUrls,
      };

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (reviewError) throw reviewError;

      // Send notification to provider
      await supabase.from('notifications').insert({
        user_id: reservation?.prestataire_id,
        type: 'nouvel_avis',
        titre: 'Nouvel avis reçu',
        message: `Vous avez reçu un nouvel avis de ${user.email}`,
        lien: `/prestataires/avis`,
      });

      Alert.alert(
        'Merci !',
        'Votre avis a été publié avec succès',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error submitting review:', error);
      
      if (error.code === '23505') {
        Alert.alert('Erreur', 'Vous avez déjà laissé un avis pour cette réservation');
      } else {
        Alert.alert('Erreur', 'Impossible de publier votre avis. Veuillez réessayer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, setRating: (rating: number) => void, label: string) => {
    return (
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? COLORS.star : COLORS.border}
              />
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.headerTitle}>Laisser un avis</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Service Info */}
          {reservation && (
            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Ionicons name="briefcase" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{reservation.annonces.titre}</Text>
                <Text style={styles.providerName}>
                  {reservation.annonces.profiles.prenom} {reservation.annonces.profiles.nom}
                </Text>
                <Text style={styles.serviceDate}>
                  {new Date(reservation.date_debut).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Overall Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note globale *</Text>
            {renderStars(overallRating, setOverallRating, '')}
          </View>

          {/* Detailed Ratings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes détaillées (optionnel)</Text>
            {renderStars(communicationRating, setCommunicationRating, 'Communication')}
            {renderStars(professionalismRating, setProfessionalismRating, 'Professionnalisme')}
            {renderStars(valueRating, setValueRating, 'Rapport qualité/prix')}
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votre commentaire *</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Partagez votre expérience avec ce prestataire..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={6}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{comment.length} caractères (min. 10)</Text>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionTitle}>Photos (optionnel)</Text>
              <Text style={styles.photoCount}>{photos.length}/5</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="camera" size={32} color={COLORS.primary} />
                  <Text style={styles.addPhotoText}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <View style={styles.guidelinesText}>
              <Text style={styles.guidelinesTitle}>💡 Conseils pour un bon avis</Text>
              <Text style={styles.guidelineItem}>• Soyez honnête et constructif</Text>
              <Text style={styles.guidelineItem}>• Mentionnez des détails concrets</Text>
              <Text style={styles.guidelineItem}>• Respectez les règles de la communauté</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>Publier l'avis</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 180 },
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

  serviceCard: {
    flexDirection: 'row',
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
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  providerName: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  serviceDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  section: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  ratingRow: { marginBottom: 16 },
  ratingLabel: { fontSize: 14, color: COLORS.text, marginBottom: 8 },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },

  commentInput: {
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

  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoCount: { fontSize: 14, color: COLORS.textLight },
  photoScroll: { marginTop: 8 },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },

  guidelinesCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  guidelinesText: { flex: 1 },
  guidelinesTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  guidelineItem: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

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
