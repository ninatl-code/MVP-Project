import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  Image,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textLight: '#6B7280',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

interface Zone {
  id: string;
  ville_centre: string;
  rayon_km: number;
  isTemp?: boolean;
}

export default function CreateAnnonce() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [tarifUnit, setTarifUnit] = useState('');
  const [unitTarif, setUnitTarif] = useState('');
  const [prixFixe, setPrixFixe] = useState(false);
  const [acomptePercent, setAcomptePercent] = useState('');
  const [equipement, setEquipement] = useState('');
  const [conditionsAnnulation, setConditionsAnnulation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  
  // Modal states
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZoneVille, setNewZoneVille] = useState('');
  const [newZoneRayon, setNewZoneRayon] = useState('50');
  
  // Lists
  const [prestationsList, setPrestationsList] = useState<{id: string, nom: string, type: string}[]>([]);
  const [prestationId, setPrestationId] = useState('');

  useEffect(() => {
    fetchPrestations();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à vos photos');
      }
    }
  };

  const fetchPrestations = async () => {
    const { data, error } = await supabase
      .from('prestations')
      .select('id, nom, type')
      .order('nom');
    
    if (error) {
      console.error('Erreur chargement prestations:', error);
      Alert.alert('Erreur', 'Impossible de charger les types de prestations');
      return;
    }
    
    if (data) {
      console.log('Prestations chargées:', data.length);
      setPrestationsList(data);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhotos([...photos, result.assets[0].base64]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger l\'image');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const addZone = () => {
    if (!newZoneVille.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une ville');
      return;
    }
    
    const rayon = parseInt(newZoneRayon);
    if (rayon < 1 || rayon > 200) {
      Alert.alert('Erreur', 'Le rayon doit être entre 1 et 200 km');
      return;
    }

    setZones([...zones, {
      id: `temp_${Date.now()}`,
      ville_centre: newZoneVille.trim(),
      rayon_km: rayon,
      isTemp: true
    }]);
    
    setNewZoneVille('');
    setNewZoneRayon('50');
    setShowZoneModal(false);
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!titre || !type || !prestationId) {
          Alert.alert('Champs requis', 'Veuillez sélectionner un type de prestation');
          return false;
        }
        return true;
      case 2:
        if (!description) {
          Alert.alert('Champs requis', 'Veuillez ajouter une description');
          return false;
        }
        return true;
      case 3:
        if (prixFixe && (!tarifUnit || (type === 'service' && !unitTarif))) {
          Alert.alert('Champs requis', 'Veuillez renseigner le tarif');
          return false;
        }
        if (type === 'service' && !conditionsAnnulation) {
          Alert.alert('Champs requis', 'Veuillez sélectionner des conditions d\'annulation');
          return false;
        }
        return true;
      case 4:
        if (zones.length === 0) {
          Alert.alert('Champs requis', 'Veuillez définir au moins une zone d\'intervention');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        setLoading(false);
        return;
      }

      // Validation finale
      if (!titre || !description || zones.length === 0) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
        setLoading(false);
        return;
      }

      // Calculer nb_heure selon l'unité
      let nbHeure = null;
      if (unitTarif) {
        switch (unitTarif) {
          case 'heure': nbHeure = 1; break;
          case 'demi_journee': nbHeure = 4; break;
          case 'jour': nbHeure = 8; break;
          default: nbHeure = null;
        }
      }

      const insertData = {
        titre,
        prestation: prestationId || null,
        description,
        photos: photos.length > 0 ? photos : [],
        tarif_unit: tarifUnit ? parseFloat(tarifUnit) : null,
        unit_tarif: type === 'produit' ? 'forfait' : (unitTarif || null),
        prix_fixe: prixFixe,
        acompte_percent: acomptePercent ? parseInt(acomptePercent) : null,
        equipement: equipement || null,
        conditions_annulation: type === 'service' ? (conditionsAnnulation || null) : null,
        nb_heure: nbHeure,
        prestataire: user.id,
        actif: true
      };

      console.log('Données à insérer:', insertData);

      const { data: insertedAnnonce, error: insertError } = await supabase
        .from('annonces')
        .insert([insertData])
        .select('id')
        .single();

      if (insertError) {
        console.error('Erreur insertion:', insertError);
        throw insertError;
      }

      if (!insertedAnnonce) {
        throw new Error('Annonce non créée');
      }

      // Sauvegarder les zones d'intervention
      if (zones.length > 0) {
        const zonesData = zones.map(zone => ({
          prestataire_id: user.id,
          annonce_id: insertedAnnonce.id,
          ville_centre: zone.ville_centre,
          rayon_km: zone.rayon_km,
          active: true
        }));

        console.log('Données zones:', zonesData);

        const { error: zonesError } = await supabase
          .from('zones_intervention')
          .insert(zonesData);

        if (zonesError) {
          console.error('Erreur zones:', zonesError);
          Alert.alert(
            'Avertissement',
            'Annonce créée mais erreur lors de l\'ajout des zones d\'intervention'
          );
        }
      }

      Alert.alert(
        'Succès',
        'Annonce créée avec succès!',
        [{
          text: 'OK',
          onPress: () => {
            // Utiliser replace pour remplacer la page actuelle et forcer le refresh
            router.replace('/prestataires/prestations' as any);
          }
        }]
      );

    } catch (error: any) {
      console.error('Erreur complète:', error);
      const errorMessage = error.message || error.hint || error.details || 'Impossible de créer l\'annonce';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 5 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Type de prestation</Text>
      <Text style={styles.stepDescription}>
        Sélectionnez le type de service que vous proposez
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Prestation *</Text>
        <View style={styles.pickerContainer}>
          <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.pickerInput}
            value={titre}
            placeholder="Sélectionner..."
            editable={false}
            onPressIn={() => {
              if (prestationsList.length === 0) {
                Alert.alert('Erreur', 'Aucune prestation disponible');
                return;
              }
              Alert.alert(
                'Type de prestation',
                'Sélectionnez votre prestation',
                [
                  ...prestationsList.map(p => ({
                    text: p.nom,
                    onPress: () => {
                      setTitre(p.nom);
                      setType(p.type);
                      setPrestationId(p.id);
                    }
                  })),
                  { text: 'Annuler', style: 'cancel' }
                ]
              );
            }}
          />
          <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
        </View>
      </View>

      {type && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Type: {type === 'service' ? 'Service' : 'Produit'}</Text>
            <Text style={styles.infoText}>
              {type === 'service' 
                ? 'Service ponctuel ou récurrent avec tarification horaire/journée'
                : 'Produit avec modèles et tarifs fixes'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Description</Text>
      <Text style={styles.stepDescription}>
        Décrivez votre prestation en détail
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez votre prestation, ce qui est inclus, vos compétences..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length} / 500</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Équipement fourni</Text>
        <TextInput
          style={styles.input}
          value={equipement}
          onChangeText={setEquipement}
          placeholder="Ex: Appareil photo professionnel, Objectifs..."
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tarification</Text>
      <Text style={styles.stepDescription}>
        Définissez vos tarifs et conditions
      </Text>

      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={() => setPrixFixe(!prixFixe)}
      >
        <Ionicons 
          name={prixFixe ? 'checkbox' : 'square-outline'} 
          size={24} 
          color={COLORS.primary} 
        />
        <Text style={styles.checkboxLabel}>Prix fixe</Text>
      </TouchableOpacity>

      {prixFixe && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarif unitaire * (MAD)</Text>
            <TextInput
              style={styles.input}
              value={tarifUnit}
              onChangeText={setTarifUnit}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>

          {type === 'service' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unité de tarification *</Text>
              <View style={styles.unitSelector}>
                {['heure', 'demi_journee', 'jour', 'seance'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      unitTarif === unit && styles.unitButtonActive
                    ]}
                    onPress={() => setUnitTarif(unit)}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      unitTarif === unit && styles.unitButtonTextActive
                    ]}>
                      {unit === 'heure' ? 'Heure' : 
                       unit === 'demi_journee' ? 'Demi-journée' :
                       unit === 'jour' ? 'Jour' : 'Séance'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Acompte requis (%)</Text>
        <TextInput
          style={styles.input}
          value={acomptePercent}
          onChangeText={setAcomptePercent}
          placeholder="0"
          keyboardType="number-pad"
        />
      </View>

      {type === 'service' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Conditions d'annulation *</Text>
          <View style={styles.conditionsContainer}>
            {['Flexible', 'Modéré', 'Strict'].map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.conditionCard,
                  conditionsAnnulation === condition && styles.conditionCardActive,
                  {
                    borderColor: conditionsAnnulation === condition 
                      ? (condition === 'Flexible' ? '#10B981' : 
                         condition === 'Modéré' ? '#F59E0B' : '#EF4444')
                      : COLORS.border
                  }
                ]}
                onPress={() => setConditionsAnnulation(condition)}
              >
                <Text style={[
                  styles.conditionTitle,
                  conditionsAnnulation === condition && {
                    color: condition === 'Flexible' ? '#10B981' : 
                           condition === 'Modéré' ? '#F59E0B' : '#EF4444'
                  }
                ]}>{condition}</Text>
                <Text style={styles.conditionDescription}>
                  {condition === 'Flexible' 
                    ? 'Annulation gratuite 24h avant'
                    : condition === 'Modéré'
                    ? 'Remboursement partiel selon délai'
                    : 'Pas de remboursement'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Zones d'intervention</Text>
      <Text style={styles.stepDescription}>
        Définissez où vous intervenez
      </Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowZoneModal(true)}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter une zone</Text>
      </TouchableOpacity>

      {zones.length > 0 && (
        <View style={styles.zonesList}>
          {zones.map((zone) => (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneInfo}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <View style={styles.zoneText}>
                  <Text style={styles.zoneVille}>{zone.ville_centre}</Text>
                  <Text style={styles.zoneRayon}>Rayon: {zone.rayon_km} km</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeZone(zone.id)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {zones.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Aucune zone définie</Text>
        </View>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Photos</Text>
      <Text style={styles.stepDescription}>
        Ajoutez des photos de votre travail
      </Text>

      <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
        <Ionicons name="camera" size={32} color={COLORS.primary} />
        <Text style={styles.addPhotoText}>Ajouter une photo</Text>
      </TouchableOpacity>

      {photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${photo}` }}
                style={styles.photoImage}
              />
              <TouchableOpacity
                style={styles.photoDeleteButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une annonce</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonSecondary]}
            onPress={prevStep}
          >
            <Text style={styles.footerButtonTextSecondary}>Précédent</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 5 ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary, currentStep === 1 && { flex: 1 }]}
            onPress={nextStep}
          >
            <Text style={styles.footerButtonText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.footerButtonText}>
              {loading ? 'Création...' : 'Créer l\'annonce'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal Zone */}
      <Modal
        visible={showZoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowZoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une zone</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ville centre *</Text>
              <TextInput
                style={styles.input}
                value={newZoneVille}
                onChangeText={setNewZoneVille}
                placeholder="Ex: Casablanca"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rayon (km) *</Text>
              <TextInput
                style={styles.input}
                value={newZoneRayon}
                onChangeText={setNewZoneRayon}
                placeholder="50"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowZoneModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={addZone}
              >
                <Text style={styles.modalButtonTextConfirm}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight
  },
  stepNumberActive: {
    color: '#fff'
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4
  },
  stepLineActive: {
    backgroundColor: COLORS.primary
  },
  content: {
    flex: 1,
    paddingHorizontal: 20
  },
  stepContent: {
    paddingVertical: 24
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  stepDescription: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'right'
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14
  },
  inputIcon: {
    marginRight: 10
  },
  pickerInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16
  },
  infoContent: {
    flex: 1,
    marginLeft: 12
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 10
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  unitButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text
  },
  unitButtonTextActive: {
    color: '#fff'
  },
  conditionsContainer: {
    gap: 12
  },
  conditionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: COLORS.card
  },
  conditionCardActive: {
    backgroundColor: '#F9FAFB'
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  conditionDescription: {
    fontSize: 13,
    color: COLORS.textLight
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  zonesList: {
    gap: 12
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  zoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  zoneText: {
    marginLeft: 12
  },
  zoneVille: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2
  },
  zoneRayon: {
    fontSize: 13,
    color: COLORS.textLight
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginTop: 12
  },
  addPhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginBottom: 20
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
    marginTop: 8
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative'
  },
  photoImage: {
    width: '100%',
    height: '100%'
  },
  photoDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12
  },
  footerButtonPrimary: {
    backgroundColor: COLORS.primary
  },
  footerButtonSecondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  footerButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6'
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  modalButtonTextConfirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
});
