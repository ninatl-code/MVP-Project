import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  warning: '#F59E0B',
  star: '#FFC107'
};

interface Reservation {
  id: string;
  annonce_id: number;
  prestataire: {
    id: string;
    nom: string;
    photo: string;
  };
  annonce: {
    titre: string;
  };
  date: string;
}

export default function LaisserAvisPage() {
  const { reservationId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  // Notes
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [noteQualite, setNoteQualite] = useState(0);
  const [notePonctualite, setNotePonctualite] = useState(0);
  const [noteCommunication, setNoteCommunication] = useState(0);
  const [noteRapportQualitePrix, setNoteRapportQualitePrix] = useState(0);

  // Contenu
  const [titre, setTitre] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [recommande, setRecommande] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadReservation();
  }, [reservationId]);

  const loadReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          date,
          annonce_id,
          profiles!reservations_prestataire_id_fkey(id, nom, photo),
          annonces(titre)
        `)
        .eq('id', reservationId)
        .single();

      if (error) throw error;

      setReservation({
        id: data.id,
        annonce_id: data.annonce_id,
        prestataire: {
          id: (data.profiles as any).id,
          nom: (data.profiles as any).nom,
          photo: (data.profiles as any).photo
        },
        annonce: {
          titre: (data.annonces as any)?.titre || 'Service'
        },
        date: data.date
      });
    } catch (error) {
      console.error('Erreur chargement réservation:', error);
      Alert.alert('Erreur', 'Impossible de charger la réservation');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (note: number, setNote: (n: number) => void, label: string) => {
    return (
      <View style={styles.criteriaRow}>
        <Text style={styles.criteriaLabel}>{label}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setNote(star)}>
              <Ionicons
                name={star <= note ? 'star' : 'star-outline'}
                size={32}
                color={star <= note ? COLORS.star : COLORS.textLight}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 5 photos');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisation d\'accès aux photos nécessaire');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      aspect: [4, 3]
    });

    if (!result.canceled && result.assets[0]) {
      // Dans un vrai projet, uploader sur Supabase Storage
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (noteGlobale === 0) {
      Alert.alert('Note requise', 'Veuillez donner une note globale');
      return;
    }

    if (!commentaire.trim()) {
      Alert.alert('Commentaire requis', 'Veuillez écrire un commentaire');
      return;
    }

    if (commentaire.length < 20) {
      Alert.alert('Commentaire trop court', 'Minimum 20 caractères');
      return;
    }

    if (recommande === null) {
      Alert.alert('Recommandation', 'Recommandez-vous ce prestataire ?');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Upload des photos vers Supabase Storage (à adapter)
      const photoUrls: string[] = [];
      for (const photoUri of photos) {
        // TODO: Upload vers Supabase Storage
        photoUrls.push(photoUri); // Temporaire
      }

      // Créer l'avis
      const { error } = await supabase.from('avis').insert({
        prestataire_id: reservation?.prestataire.id,
        particulier_id: user.id,
        reservation_id: reservationId,
        annonce_id: reservation?.annonce_id,
        note: Math.round(noteGlobale), // Colonne existante INTEGER
        note_globale: noteGlobale, // Nouvelle colonne DECIMAL ajoutée par migration
        note_qualite: noteQualite || null,
        note_ponctualite: notePonctualite || null,
        note_communication: noteCommunication || null,
        note_rapport_qualite_prix: noteRapportQualitePrix || null,
        titre: titre.trim() || null,
        commentaire: commentaire.trim(),
        photos: photoUrls.length > 0 ? photoUrls : null,
        recommande: recommande,
        visible: true,
        verifie: true
      });

      if (error) throw error;

      Alert.alert(
        '✅ Avis publié',
        'Merci pour votre avis !',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erreur publication avis:', error);
      Alert.alert('Erreur', 'Impossible de publier l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Réservation introuvable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header avec infos prestataire */}
        <View style={styles.header}>
          <Image
            source={{ uri: reservation.prestataire.photo || 'https://via.placeholder.com/80' }}
            style={styles.prestatairePhoto}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.prestataireName}>{reservation.prestataire.nom}</Text>
            <Text style={styles.serviceName}>{reservation.annonce.titre}</Text>
            <Text style={styles.serviceDate}>
              {new Date(reservation.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Note globale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note globale *</Text>
          <View style={styles.globalStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setNoteGlobale(star)}>
                <Ionicons
                  name={star <= noteGlobale ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= noteGlobale ? COLORS.star : COLORS.textLight}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes détaillées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes détaillées (optionnel)</Text>
          {renderStars(noteQualite, setNoteQualite, 'Qualité du service')}
          {renderStars(notePonctualite, setNotePonctualite, 'Ponctualité')}
          {renderStars(noteCommunication, setNoteCommunication, 'Communication')}
          {renderStars(noteRapportQualitePrix, setNoteRapportQualitePrix, 'Rapport qualité/prix')}
        </View>

        {/* Titre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Titre de votre avis</Text>
          <TextInput
            style={styles.inputTitre}
            placeholder="Ex: Excellent photographe !"
            value={titre}
            onChangeText={setTitre}
            maxLength={100}
          />
        </View>

        {/* Commentaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votre commentaire *</Text>
          <TextInput
            style={styles.inputCommentaire}
            placeholder="Décrivez votre expérience (minimum 20 caractères)"
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={6}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{commentaire.length}/1000</Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (optionnel, max 5)</Text>
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recommandation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommanderiez-vous ce prestataire ? *</Text>
          <View style={styles.recommandeButtons}>
            <TouchableOpacity
              style={[
                styles.recommandeButton,
                recommande === true && styles.recommandeButtonActive
              ]}
              onPress={() => setRecommande(true)}
            >
              <Ionicons
                name="thumbs-up"
                size={24}
                color={recommande === true ? '#fff' : COLORS.primary}
              />
              <Text
                style={[
                  styles.recommandeButtonText,
                  recommande === true && styles.recommandeButtonTextActive
                ]}
              >
                Oui, je recommande
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recommandeButton,
                recommande === false && styles.recommandeButtonActive
              ]}
              onPress={() => setRecommande(false)}
            >
              <Ionicons
                name="thumbs-down"
                size={24}
                color={recommande === false ? '#fff' : COLORS.textLight}
              />
              <Text
                style={[
                  styles.recommandeButtonText,
                  recommande === false && styles.recommandeButtonTextActive
                ]}
              >
                Non
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Publier mon avis</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          En publiant cet avis, vous acceptez qu'il soit visible publiquement.
          Votre avis doit être honnête et basé sur votre expérience réelle.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    gap: 16
  },
  prestatairePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  headerInfo: {
    flex: 1
  },
  prestataireName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2
  },
  serviceDate: {
    fontSize: 12,
    color: COLORS.textLight
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16
  },
  globalStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  criteriaLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4
  },
  inputTitre: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text
  },
  inputCommentaire: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addPhotoText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4
  },
  recommandeButtons: {
    gap: 12
  },
  recommandeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12
  },
  recommandeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  recommandeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  recommandeButtonTextActive: {
    color: '#fff'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 16,
    borderRadius: 12
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
    lineHeight: 18
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 40
  }
});
