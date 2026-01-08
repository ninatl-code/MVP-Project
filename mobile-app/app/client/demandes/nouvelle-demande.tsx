import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabaseClient';
import { COLORS } from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { id: 'portrait', label: 'Portrait / Book' },
  { id: 'event', label: 'Événement (mariage, anniversaire, corporate)' },
  { id: 'product', label: 'Shooting produit' },
  { id: 'real_estate', label: 'Immobilier / Architecture' },
  { id: 'fashion', label: 'Mode / Éditorial' },
  { id: 'family', label: 'Grossesse / Naissance / Famille' },
  { id: 'corporate', label: 'Corporate / Portrait pro' },
  { id: 'reportage', label: 'Reportage (entreprise, artisan)' },
];

const STYLES = [
  { id: 'luminous', label: 'Lumineux / Naturel' },
  { id: 'dark_moody', label: 'Dark & Moody' },
  { id: 'studio', label: 'Studio / Fond uni' },
  { id: 'lifestyle', label: 'Lifestyle / Spontané' },
  { id: 'artistic', label: 'Artistique / Créatif' },
  { id: 'vintage', label: 'Vintage / Argentique' },
];

const USAGE_TYPES = [
  { id: 'album', label: 'Album photo' },
  { id: 'prints', label: 'Tirage imprimés' },
  { id: 'social', label: 'Réseaux sociaux' },
  { id: 'website', label: 'Site web' },
  { id: 'advertising', label: 'Publicité / Marketing' },
  { id: 'commercial', label: 'Usage commercial' },
];

const RETOUCHING_LEVELS = [
  { id: 'basic', label: 'Basique (crop, lumière, couleurs)' },
  { id: 'standard', label: 'Standard (+ retouche peau, yeux)' },
  { id: 'advanced', label: 'Avancée (retouche créative complète)' },
];

interface BookingRequest {
  titre: string;
  description: string;
  categorie: string;
  type_evenement: string;
  nb_personnes: number;
  lieu: string;
  ville: string;
  code_postal: string;
  date_souhaitee: Date;
  duree_estimee_heures: number;
  type_prestation: string[];
  style_souhaite: string[];
  nb_photos_souhaitees: number;
  niveau_retouche: string;
  budget_max: number;
  services_souhaites: {
    maquillage: boolean;
    coiffure: boolean;
    stylisme: boolean;
  };
  contraintes_horaires: string;
  instructions_speciales: string;
  photos_inspiration: string[];
}

export default function NouvelleDemandeClient() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<BookingRequest>({
    titre: '',
    description: '',
    categorie: '',
    type_evenement: '',
    nb_personnes: 1,
    lieu: '',
    ville: '',
    code_postal: '',
    date_souhaitee: new Date(),
    duree_estimee_heures: 2,
    type_prestation: [],
    style_souhaite: [],
    nb_photos_souhaitees: 50,
    niveau_retouche: 'standard',
    budget_max: 1000,
    services_souhaites: {
      maquillage: false,
      coiffure: false,
      stylisme: false,
    },
    contraintes_horaires: '',
    instructions_speciales: '',
    photos_inspiration: [],
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const validateStep = () => {
    if (step === 1) {
      if (!request.titre.trim()) {
        Alert.alert('Champ obligatoire', 'Veuillez saisir un titre');
        return false;
      }
      if (!request.description.trim()) {
        Alert.alert('Champ obligatoire', 'Veuillez saisir une description');
        return false;
      }
      if (!request.categorie) {
        Alert.alert('Champ obligatoire', 'Veuillez sélectionner une catégorie');
        return false;
      }
    }
    if (step === 2) {
      if (!request.lieu.trim()) {
        Alert.alert('Champ obligatoire', 'Veuillez saisir un lieu');
        return false;
      }
      if (!request.ville.trim()) {
        Alert.alert('Champ obligatoire', 'Veuillez saisir une ville');
        return false;
      }
      if (!request.code_postal.trim()) {
        Alert.alert('Champ obligatoire', 'Veuillez saisir un code postal');
        return false;
      }
      if (request.code_postal.length !== 5) {
        Alert.alert('Code postal invalide', 'Le code postal doit contenir exactement 5 chiffres');
        return false;
      }
    }
    return true;
  };

  const pickMoodboardPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setRequest(prev => ({
          ...prev,
          photos_inspiration: [...prev.photos_inspiration, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error('Erreur upload:', error);
    }
  };

  const submitRequest = async () => {
    // Validation des champs obligatoires
    if (!request.titre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return;
    }
    if (!request.description.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une description');
      return;
    }
    if (!request.categorie) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return;
    }
    if (!request.lieu.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un lieu');
      return;
    }
    if (!request.ville.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une ville');
      return;
    }
    if (!request.code_postal.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code postal');
      return;
    }
    if (request.code_postal.length !== 5) {
      Alert.alert('Erreur', 'Le code postal doit contenir exactement 5 chiffres');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer le profile ID du client (particulier)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('role', 'particulier')
        .single();

      if (profileError || !profile) {
        console.error('Erreur profil:', profileError);
        throw new Error('Profil introuvable');
      }

      // Créer la demande dans Supabase
      const { error } = await supabase
        .from('demandes_client')
        .insert({
          client_id: profile.id,
          titre: request.titre,
          description: request.description,
          categorie: request.categorie,
          type_evenement: request.type_evenement || null,
          nb_personnes: request.nb_personnes || null,
          lieu: request.lieu,
          ville: request.ville,
          code_postal: request.code_postal || null,
          date_souhaitee: request.date_souhaitee.toISOString().split('T')[0],
          duree_estimee_heures: request.duree_estimee_heures || null,
          type_prestation: request.type_prestation.length > 0 ? request.type_prestation : [],
          style_souhaite: request.style_souhaite.length > 0 ? request.style_souhaite : [],
          nb_photos_souhaitees: request.nb_photos_souhaitees || null,
          niveau_retouche: request.niveau_retouche || null,
          budget_max: request.budget_max || null,
          services_souhaites: request.services_souhaites,
          contraintes_horaires: request.contraintes_horaires || null,
          instructions_speciales: request.instructions_speciales || null,
          photos_inspiration: request.photos_inspiration.length > 0 ? request.photos_inspiration : [],
          statut: 'ouverte',
        });

      if (error) throw error;

      Alert.alert(
        'Demande créée !',
        'Votre demande a été publiée. Les photographes correspondants vont recevoir une notification.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/client/demandes/mes-demandes'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepsContainer}>
      {[1, 2, 3, 4, 5].map(s => (
        <View
          key={s}
          style={[
            styles.stepDot,
            step >= s && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header fixe avec gradient */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Nouvelle demande</Text>
            <Text style={styles.headerSubtitle}>Étape {step}/5 - Champs obligatoires: titre, description, catégorie, lieu, ville</Text>
          </View>
        </View>
        {renderStepIndicator()}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: INFORMATIONS DE BASE */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>📝 Informations de base</Text>
            <Text style={styles.stepDescription}>Titre et description de votre demande</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre de la demande *</Text>
              <TextInput
                style={styles.input}
                value={request.titre}
                onChangeText={text => setRequest({ ...request, titre: text })}
                placeholder="Ex: Shooting mariage champêtre"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description détaillée *</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.description}
                onChangeText={text => setRequest({ ...request, description: text })}
                placeholder="Décrivez votre besoin en détail..."
                multiline
              />
            </View>

            <Text style={styles.label}>Catégorie *</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.optionButton,
                  request.categorie === cat.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, categorie: cat.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.categorie === cat.id && styles.radioSelected,
                  ]}
                />
                <Text style={[
                  styles.optionText,
                  request.categorie === cat.id && styles.optionTextSelected,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 24 }]}>Styles photographiques (optionnel)</Text>
            <View style={styles.gridContainer}>
              {STYLES.map(style => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.chip,
                    request.style_souhaite.includes(style.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setRequest(prev => ({
                      ...prev,
                      style_souhaite: prev.style_souhaite.includes(style.id)
                        ? prev.style_souhaite.filter(s => s !== style.id)
                        : [...prev.style_souhaite, style.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    request.style_souhaite.includes(style.id) && styles.chipTextSelected,
                  ]}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: LOCALISATION & PARTICIPANTS */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>📍 Localisation & Participants</Text>
            <Text style={styles.stepDescription}>Où et avec combien de personnes ?</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Lieu *</Text>
              <TextInput
                style={styles.input}
                value={request.lieu}
                onChangeText={text => setRequest({ ...request, lieu: text })}
                placeholder="Ex: Studio photo, Domicile, Parc..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={styles.input}
                value={request.ville}
                onChangeText={text => setRequest({ ...request, ville: text })}
                placeholder="Paris"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Code postal *</Text>
              <TextInput
                style={styles.input}
                value={request.code_postal}
                onChangeText={text => {
                  // Limiter à 5 chiffres maximum
                  const numericValue = text.replace(/[^0-9]/g, '').slice(0, 5);
                  setRequest({ ...request, code_postal: numericValue });
                }}
                placeholder="75001"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de personnes</Text>
              <TextInput
                style={styles.input}
                value={request.nb_personnes === 0 ? '' : request.nb_personnes.toString()}
                onChangeText={text => setRequest({ ...request, nb_personnes: text === '' ? 0 : parseInt(text) || 0 })}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type d'événement (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={request.type_evenement}
                onChangeText={text => setRequest({ ...request, type_evenement: text })}
                placeholder="Ex: Mariage, Anniversaire, Corporate..."
              />
            </View>
          </View>
        )}

        {/* STEP 3: SERVICES & LIVRABLES */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>✨ Services & Livrables</Text>
            <Text style={styles.stepDescription}>Services additionnels et nombre de photos</Text>

            <TouchableOpacity
              style={styles.checkboxGroup}
              onPress={() => setRequest({ ...request, services_souhaites: { ...request.services_souhaites, maquillage: !request.services_souhaites.maquillage } })}
            >
              <Text style={styles.checkbox}>
                {request.services_souhaites.maquillage ? '☑️' : '☐'} Maquillage
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxGroup}
              onPress={() => setRequest({ ...request, services_souhaites: { ...request.services_souhaites, coiffure: !request.services_souhaites.coiffure } })}
            >
              <Text style={styles.checkbox}>
                {request.services_souhaites.coiffure ? '☑️' : '☐'} Coiffure
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxGroup}
              onPress={() => setRequest({ ...request, services_souhaites: { ...request.services_souhaites, stylisme: !request.services_souhaites.stylisme } })}
            >
              <Text style={styles.checkbox}>
                {request.services_souhaites.stylisme ? '☑️' : '☐'} Stylisme
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 20 }]}>Types de prestation</Text>
            <View style={styles.gridContainer}>
              {USAGE_TYPES.map(usage => (
                <TouchableOpacity
                  key={usage.id}
                  style={[
                    styles.chip,
                    request.type_prestation.includes(usage.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setRequest(prev => ({
                      ...prev,
                      type_prestation: prev.type_prestation.includes(usage.id)
                        ? prev.type_prestation.filter(u => u !== usage.id)
                        : [...prev.type_prestation, usage.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    request.type_prestation.includes(usage.id) && styles.chipTextSelected,
                  ]}>
                    {usage.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de photos souhaité</Text>
              <TextInput
                style={styles.input}
                value={request.nb_photos_souhaitees === 0 ? '' : request.nb_photos_souhaitees.toString()}
                onChangeText={text => setRequest({ ...request, nb_photos_souhaitees: text === '' ? 0 : parseInt(text) || 0 })}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>

            <Text style={styles.label}>Niveau de retouche</Text>
            {RETOUCHING_LEVELS.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionButton,
                  request.niveau_retouche === level.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, niveau_retouche: level.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.niveau_retouche === level.id && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{level.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 4: BUDGET & CONTRAINTES */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>💰 Budget & Contraintes</Text>
            <Text style={styles.stepDescription}>Votre budget et contraintes horaires</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Budget max (€)</Text>
              <TextInput
                style={styles.input}
                value={request.budget_max.toString()}
                onChangeText={text => setRequest({ ...request, budget_max: parseInt(text) || 1000 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraintes horaires (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.contraintes_horaires}
                onChangeText={text => setRequest({ ...request, contraintes_horaires: text })}
                placeholder="Ex: disponible uniquement le matin, après 14h..."
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instructions spéciales (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.instructions_speciales}
                onChangeText={text => setRequest({ ...request, instructions_speciales: text })}
                placeholder="Ex: accessibilité handicapé, allergie à un produit, préférences particulières..."
                multiline
              />
            </View>
          </View>
        )}

        {/* STEP 5: DATE & INSPIRATIONS */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>📅 Date & Inspirations</Text>
            <Text style={styles.stepDescription}>Date souhaitée et photos d'inspiration</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date souhaitée</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ fontSize: 15, color: '#2C3E50' }}>{request.date_souhaitee.toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={request.date_souhaitee}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    setRequest({ ...request, date_souhaitee: selectedDate });
                    setShowDatePicker(false);
                  } else if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                  }
                }}
              />
            )}

            {showDatePicker && Platform.OS === 'ios' && (
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Sélectionner une date</Text>
                    <DateTimePicker
                      value={request.date_souhaitee}
                      mode="date"
                      display="inline"
                      themeVariant="light"
                      accentColor="#5C6BC0"
                      textColor="#000000"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setRequest({ ...request, date_souhaitee: selectedDate });
                        }
                      }}
                      style={{ backgroundColor: '#FFFFFF' }}
                    />
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonCancel]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonTextCancel}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonOk]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonTextOk}>OK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durée estimée (heures)</Text>
              <TextInput
                style={styles.input}
                value={request.duree_estimee_heures === 0 ? '' : request.duree_estimee_heures.toString()}
                onChangeText={text => setRequest({ ...request, duree_estimee_heures: text === '' ? 0 : parseInt(text) || 0 })}
                keyboardType="numeric"
                placeholder="2"
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Photos d'inspiration (optionnel)</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickMoodboardPhoto}>
              <Text style={styles.addPhotoText}>+ Ajouter une photo</Text>
            </TouchableOpacity>

            <View style={styles.moodboardGrid}>
              {request.photos_inspiration.map((photo, index) => (
                <View key={index} style={styles.moodboardItem}>
                  <Image source={{ uri: photo }} style={styles.moodboardImage} />
                  <TouchableOpacity
                    onPress={() => setRequest({
                      ...request,
                      photos_inspiration: request.photos_inspiration.filter((_, i) => i !== index),
                    })}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation & Submit */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep(step - 1)}
            >
              <Ionicons name="arrow-back" size={20} color="#5C6BC0" />
              <Text style={styles.buttonSecondaryText}>Précédent</Text>
            </TouchableOpacity>
          )}

          {step < 5 ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, { flex: step === 1 ? 1 : 0.5 }]}
              onPress={() => {
                if (validateStep()) {
                  setStep(step + 1);
                }
              }}
            >
              <Text style={styles.buttonPrimaryText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, { flex: 0.5 }]}
              onPress={submitRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.buttonPrimaryText}>Publier</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerContainer: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8EBF0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3E50',
    backgroundColor: '#FAFBFC',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  optionButtonSelected: {
    backgroundColor: '#EEF1FF',
    borderColor: '#5C6BC0',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#BDC3C7',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#5C6BC0',
    borderWidth: 6,
  },
  optionText: {
    fontSize: 15,
    color: '#34495E',
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#5C6BC0',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    backgroundColor: '#FAFBFC',
  },
  chipSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  chipText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  checkboxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  checkbox: {
    fontSize: 15,
    color: '#34495E',
    flex: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  budgetInput: {
    flex: 1,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#5C6BC0',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FF',
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  moodboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  moodboardItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  moodboardImage: {
    width: '100%',
    height: '100%',
  },
  deleteText: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EBF0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#5C6BC0',
    ...Platform.select({
      ios: {
        shadowColor: '#5C6BC0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  buttonSecondaryText: {
    color: '#5C6BC0',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  modalButtonOk: {
    backgroundColor: '#5C6BC0',
  },
  modalButtonTextCancel: {
    color: '#5C6BC0',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextOk: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
