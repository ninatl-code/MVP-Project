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

const LOCATION_TYPES = [
  { id: 'indoor', label: 'Intérieur' },
  { id: 'outdoor', label: 'Extérieur' },
  { id: 'studio', label: 'Studio' },
  { id: 'home', label: 'Domicile' },
  { id: 'workplace', label: 'Entreprise' },
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

const COMFORT_LEVELS = [
  { id: 'shy', label: 'Timide / Stressé par la photo' },
  { id: 'neutral', label: 'Neutre / Normal' },
  { id: 'comfortable', label: 'À l\'aise devant la caméra' },
  { id: 'professional', label: 'Expérience photo' },
];

const ATMOSPHERES = [
  { id: 'natural', label: 'Naturelle / Spontanée' },
  { id: 'posed', label: 'Posée / Structurée' },
  { id: 'fun', label: 'Fun / Ludique' },
  { id: 'serious', label: 'Sérieuse / Corporate' },
];

interface BookingRequest {
  category: string;
  styles: string[];
  location_address: string;
  location_city: string;
  location_type: string;
  studio_needed: boolean;
  studio_provider?: string;
  total_people: number;
  people_in_photos: number;
  has_children: boolean;
  children_age?: number;
  has_babies: boolean;
  needs_makeup: boolean;
  needs_hair: boolean;
  needs_stylist: boolean;
  usage_types: string[];
  num_photos: number;
  retouching_level: string;
  budget_min: number;
  budget_max: number;
  atmosphere: string;
  comfort_level: string;
  special_requirements: string;
  event_date: Date;
  session_duration: number;
  constraints: string;
  reference_photos: string[];
  moodboard_notes: string;
}

export default function NouvelleDemandeClient() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<BookingRequest>({
    category: '',
    styles: [],
    location_address: '',
    location_city: '',
    location_type: '',
    studio_needed: false,
    total_people: 1,
    people_in_photos: 1,
    has_children: false,
    has_babies: false,
    needs_makeup: false,
    needs_hair: false,
    needs_stylist: false,
    usage_types: [],
    num_photos: 50,
    retouching_level: 'standard',
    budget_min: 300,
    budget_max: 1000,
    atmosphere: 'natural',
    comfort_level: 'neutral',
    special_requirements: '',
    event_date: new Date(),
    session_duration: 2,
    constraints: '',
    reference_photos: [],
    moodboard_notes: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

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
          reference_photos: [...prev.reference_photos, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error('Erreur upload:', error);
    }
  };

  const submitRequest = async () => {
    // Validation: seuls category et event_date sont obligatoires
    if (!request.category) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Créer la demande dans Supabase
      const { error } = await supabase
        .from('demandes_client')
        .insert({
          client_id: user.id,
          category: request.category,
          styles_recherches: request.styles.length > 0 ? request.styles : null,
          location_address: request.location_address || null,
          location_city: request.location_city || null,
          location_type: request.location_type || null,
          studio_needed: request.studio_needed,
          studio_provider: request.studio_provider || null,
          total_people: request.total_people || 1,
          people_in_photos: request.people_in_photos || 1,
          has_children: request.has_children,
          children_age: request.children_age || null,
          has_babies: request.has_babies,
          needs_makeup: request.needs_makeup,
          needs_hair: request.needs_hair,
          needs_stylist: request.needs_stylist,
          usage_types: request.usage_types.length > 0 ? request.usage_types : null,
          num_photos: request.num_photos || 50,
          retouching_level: request.retouching_level,
          budget_min: request.budget_min || null,
          budget_max: request.budget_max || null,
          atmosphere: request.atmosphere,
          comfort_level: request.comfort_level,
          special_requirements: request.special_requirements || null,
          event_date: request.event_date,
          session_duration: request.session_duration || 2,
          constraints: request.constraints || null,
          reference_photos: request.reference_photos.length > 0 ? request.reference_photos : null,
          moodboard_notes: request.moodboard_notes || null,
          status: 'pending',
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
            <Text style={styles.headerSubtitle}>Étape {step}/5 - Tous les champs sont optionnels sauf la catégorie</Text>
          </View>
        </View>
        {renderStepIndicator()}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: CATÉGORIE & STYLE */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>📸 Catégorie & Style</Text>
            <Text style={styles.stepDescription}>Décrivez votre besoin photo en quelques mots</Text>

            <Text style={styles.label}>Quelle est votre besoin ? *</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.optionButton,
                  request.category === cat.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, category: cat.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.category === cat.id && styles.radioSelected,
                  ]}
                />
                <Text style={[
                  styles.optionText,
                  request.category === cat.id && styles.optionTextSelected,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 24 }]}>Styles photographiques (optionnel, multi-sélection)</Text>
            <View style={styles.gridContainer}>
              {STYLES.map(style => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.chip,
                    request.styles.includes(style.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setRequest(prev => ({
                      ...prev,
                      styles: prev.styles.includes(style.id)
                        ? prev.styles.filter(s => s !== style.id)
                        : [...prev.styles, style.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    request.styles.includes(style.id) && styles.chipTextSelected,
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
              <Text style={styles.label}>Adresse (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={request.location_address}
                onChangeText={text => setRequest({ ...request, location_address: text })}
                placeholder="123 Rue de Paris"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={request.location_city}
                onChangeText={text => setRequest({ ...request, location_city: text })}
                placeholder="Paris"
              />
            </View>

            <Text style={styles.label}>Type de lieu (optionnel)</Text>
            {LOCATION_TYPES.map(loc => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.optionButton,
                  request.location_type === loc.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, location_type: loc.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.location_type === loc.id && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{loc.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre total de personnes</Text>
              <TextInput
                style={styles.input}
                value={request.total_people.toString()}
                onChangeText={text => setRequest({ ...request, total_people: parseInt(text) || 1 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Personnes à photographier</Text>
              <TextInput
                style={styles.input}
                value={request.people_in_photos.toString()}
                onChangeText={text => setRequest({ ...request, people_in_photos: parseInt(text) || 1 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.checkboxGroup}>
              <Text style={styles.checkbox}>
                {request.has_children ? '☑️' : '☐'} Enfants présents
              </Text>
              <TouchableOpacity
                onPress={() => setRequest({ ...request, has_children: !request.has_children })}
              />
            </View>

            <View style={styles.checkboxGroup}>
              <Text style={styles.checkbox}>
                {request.has_babies ? '☑️' : '☐'} Bébés présents
              </Text>
              <TouchableOpacity
                onPress={() => setRequest({ ...request, has_babies: !request.has_babies })}
              />
            </View>
          </View>
        )}

        {/* STEP 3: SERVICES & LIVRABLES */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>✨ Services & Livrables</Text>
            <Text style={styles.stepDescription}>Services additionnels et nombre de photos</Text>

            <View style={styles.checkboxGroup}>
              <Text style={styles.checkbox}>
                {request.needs_makeup ? '☑️' : '☐'} Maquillage/Coiffure
              </Text>
              <TouchableOpacity
                onPress={() => setRequest({ ...request, needs_makeup: !request.needs_makeup })}
              />
            </View>

            <View style={styles.checkboxGroup}>
              <Text style={styles.checkbox}>
                {request.needs_stylist ? '☑️' : '☐'} Styliste
              </Text>
              <TouchableOpacity
                onPress={() => setRequest({ ...request, needs_stylist: !request.needs_stylist })}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Usages des photos</Text>
            <View style={styles.gridContainer}>
              {USAGE_TYPES.map(usage => (
                <TouchableOpacity
                  key={usage.id}
                  style={[
                    styles.chip,
                    request.usage_types.includes(usage.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setRequest(prev => ({
                      ...prev,
                      usage_types: prev.usage_types.includes(usage.id)
                        ? prev.usage_types.filter(u => u !== usage.id)
                        : [...prev.usage_types, usage.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    request.usage_types.includes(usage.id) && styles.chipTextSelected,
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
                value={request.num_photos.toString()}
                onChangeText={text => setRequest({ ...request, num_photos: parseInt(text) || 50 })}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Niveau de retouche</Text>
            {RETOUCHING_LEVELS.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionButton,
                  request.retouching_level === level.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, retouching_level: level.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.retouching_level === level.id && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{level.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 4: BUDGET & PRÉFÉRENCES */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>💰 Budget & Préférences</Text>
            <Text style={styles.stepDescription}>Votre budget et l'ambiance souhaitée</Text>

            <View style={styles.budgetRow}>
              <View style={styles.budgetInput}>
                <Text style={styles.label}>Budget min (€)</Text>
                <TextInput
                  style={styles.input}
                  value={request.budget_min.toString()}
                  onChangeText={text => setRequest({ ...request, budget_min: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.label}>Budget max (€)</Text>
                <TextInput
                  style={styles.input}
                  value={request.budget_max.toString()}
                  onChangeText={text => setRequest({ ...request, budget_max: parseInt(text) || 1000 })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Ambiance recherchée</Text>
            {ATMOSPHERES.map(atm => (
              <TouchableOpacity
                key={atm.id}
                style={[
                  styles.optionButton,
                  request.atmosphere === atm.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, atmosphere: atm.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.atmosphere === atm.id && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{atm.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 20 }]}>Votre aisance devant la caméra</Text>
            {COMFORT_LEVELS.map(comfort => (
              <TouchableOpacity
                key={comfort.id}
                style={[
                  styles.optionButton,
                  request.comfort_level === comfort.id && styles.optionButtonSelected,
                ]}
                onPress={() => setRequest({ ...request, comfort_level: comfort.id })}
              >
                <View
                  style={[
                    styles.radio,
                    request.comfort_level === comfort.id && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{comfort.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Besoins spécifiques</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.special_requirements}
                onChangeText={text => setRequest({ ...request, special_requirements: text })}
                placeholder="Ex: accessibilité handicapé, allergie à un produit..."
                multiline
              />
            </View>
          </View>
        )}

        {/* STEP 5: LOGISTIQUE & MOODBOARD */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>📅 Logistique & Moodboard</Text>
            <Text style={styles.stepDescription}>Date, durée et inspirations visuelles</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date de l'événement</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>{request.event_date.toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={request.event_date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setRequest({ ...request, event_date: selectedDate });
                  }
                }}
              />
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durée de la séance (heures)</Text>
              <TextInput
                style={styles.input}
                value={request.session_duration.toString()}
                onChangeText={text => setRequest({ ...request, session_duration: parseInt(text) || 1 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraintes logistiques</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.constraints}
                onChangeText={text => setRequest({ ...request, constraints: text })}
                placeholder="Ex: parking limité, accès difficile, horaires limités..."
                multiline
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Moodboard (photos de référence)</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickMoodboardPhoto}>
              <Text style={styles.addPhotoText}>+ Ajouter une photo</Text>
            </TouchableOpacity>

            <View style={styles.moodboardGrid}>
              {request.reference_photos.map((photo, index) => (
                <View key={index} style={styles.moodboardItem}>
                  <Image source={{ uri: photo }} style={styles.moodboardImage} />
                  <TouchableOpacity
                    onPress={() => setRequest({
                      ...request,
                      reference_photos: request.reference_photos.filter((_, i) => i !== index),
                    })}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes sur le style recherché</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={request.moodboard_notes}
                onChangeText={text => setRequest({ ...request, moodboard_notes: text })}
                placeholder="Décrivez le style, ambiance, références..."
                multiline
              />
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
              onPress={() => setStep(step + 1)}
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
});
