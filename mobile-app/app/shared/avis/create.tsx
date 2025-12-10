import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import StarRating from '@/components/avis/StarRating';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  error: '#EF4444',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB'
};

interface ReservationDetails {
  id: string;
  annonce_id: string;
  prestataire_id: string;
  annonce_titre: string;
  prestataire_nom: string;
  prestataire_photo?: string;
  date: string;
}

export default function CreateAvis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reservation_id } = params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  
  // Formulaire
  const [rating, setRating] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchReservationDetails();
  }, [reservation_id]);

  const fetchReservationDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          annonce_id,
          prestataire_id,
          date,
          annonces!inner(titre),
          prestataire:profiles!prestataire_id(nom, photos)
        `)
        .eq('id', reservation_id)
        .eq('particulier_id', user.id)
        .eq('status', 'completed')
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert('Erreur', 'Réservation introuvable ou non terminée');
        router.back();
        return;
      }

      // Vérifier si un avis existe déjà
      const { data: existingAvis } = await supabase
        .from('avis')
        .select('id')
        .eq('reservation_id', reservation_id)
        .single();

      if (existingAvis) {
        Alert.alert('Information', 'Vous avez déjà laissé un avis pour cette réservation');
        router.back();
        return;
      }

      const annonces = Array.isArray(data.annonces) ? data.annonces[0] : data.annonces;
      const prestataire = Array.isArray(data.prestataire) ? data.prestataire[0] : data.prestataire;
      
      setReservation({
        id: data.id,
        annonce_id: data.annonce_id,
        prestataire_id: data.prestataire_id,
        annonce_titre: annonces?.titre || 'Prestation',
        prestataire_nom: prestataire?.nom || 'Prestataire',
        prestataire_photo: prestataire?.photos,
        date: data.date
      });
    } catch (error) {
      console.error('Erreur chargement réservation:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la réservation');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 3 photos');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder aux photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (rating === 0) {
      Alert.alert('Note requise', 'Veuillez attribuer une note');
      return false;
    }
    if (commentaire.trim().length < 10) {
      Alert.alert('Commentaire requis', 'Veuillez écrire un commentaire d\'au moins 10 caractères');
      return false;
    }
    if (commentaire.trim().length > 500) {
      Alert.alert('Commentaire trop long', 'Le commentaire ne peut pas dépasser 500 caractères');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !reservation) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Insérer l'avis
      const { data: avisData, error: avisError } = await supabase
        .from('avis')
        .insert({
          reservation_id: reservation.id,
          particulier_id: user.id,
          prestataire_id: reservation.prestataire_id,
          annonce_id: reservation.annonce_id,
          note: rating,
          commentaire: commentaire.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (avisError) throw avisError;

      // Calculer la nouvelle moyenne pour le prestataire
      const { data: allAvis } = await supabase
        .from('avis')
        .select('note')
        .eq('prestataire_id', reservation.prestataire_id);

      if (allAvis && allAvis.length > 0) {
        const moyenne = allAvis.reduce((sum, a) => sum + a.note, 0) / allAvis.length;
        const nombreAvis = allAvis.length;

        // Mettre à jour le profil du prestataire
        await supabase
          .from('profiles')
          .update({
            note_moyenne: moyenne,
            nombre_avis: nombreAvis
          })
          .eq('id', reservation.prestataire_id);
      }

      // Créer une notification pour le prestataire
      await supabase.from('notifications').insert({
        user_id: reservation.prestataire_id,
        type: 'nouvel_avis',
        contenu: `Vous avez reçu un nouvel avis (${rating} étoiles) pour "${reservation.annonce_titre}"`,
        lu: false,
        created_at: new Date().toISOString()
      });

      Alert.alert(
        'Avis publié !',
        'Merci pour votre retour. Votre avis a été publié avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Erreur publication avis:', error);
      Alert.alert('Erreur', 'Impossible de publier votre avis. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Réservation introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Laisser un avis</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Info prestataire */}
          <View style={styles.prestataireSection}>
            <View style={styles.prestataireCard}>
              {reservation.prestataire_photo ? (
                <Image
                  source={{ uri: reservation.prestataire_photo }}
                  style={styles.prestatairePhoto}
                />
              ) : (
                <View style={styles.prestatairePhotoPlaceholder}>
                  <Ionicons name="person" size={32} color={COLORS.textLight} />
                </View>
              )}
              <View style={styles.prestataireInfo}>
                <Text style={styles.prestataireName}>{reservation.prestataire_nom}</Text>
                <Text style={styles.annonceTitle} numberOfLines={2}>
                  {reservation.annonce_titre}
                </Text>
                <Text style={styles.reservationDate}>
                  {new Date(reservation.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Formulaire */}
          <View style={styles.formSection}>
            {/* Notation */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Votre note *</Text>
              <View style={styles.ratingContainer}>
                <StarRating
                  rating={rating}
                  size={40}
                  editable
                  onRatingChange={setRating}
                />
                <Text style={styles.ratingText}>
                  {rating === 0 ? 'Touchez pour noter' : `${rating}/5`}
                </Text>
              </View>
            </View>

            {/* Commentaire */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Votre commentaire * ({commentaire.length}/500)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Partagez votre expérience avec ce prestataire..."
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Décrivez votre expérience : qualité du service, ponctualité, professionnalisme, etc.
              </Text>
            </View>

            {/* Photos */}
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>Photos (optionnel) - Max 3</Text>
              <View style={styles.photosGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 3 && (
                  <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.addPhotoText}>Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bouton de publication */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.background} />
                  <Text style={styles.submitButtonText}>Publier mon avis</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Votre avis sera visible publiquement et aidera d'autres clients à faire leur choix.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center'
  },
  backButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  prestataireSection: {
    padding: 20
  },
  prestataireCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  prestatairePhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16
  },
  prestatairePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  prestataireInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  prestataireName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4
  },
  annonceTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4
  },
  reservationDate: {
    fontSize: 12,
    color: COLORS.textLight
  },
  formSection: {
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  ratingSection: {
    marginBottom: 24
  },
  ratingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  ratingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  commentSection: {
    marginBottom: 24
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic'
  },
  photosSection: {
    marginBottom: 24
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  photoContainer: {
    position: 'relative'
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.background,
    borderRadius: 12
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  addPhotoText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18
  }
});
