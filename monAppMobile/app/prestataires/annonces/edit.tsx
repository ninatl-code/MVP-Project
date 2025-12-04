import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, TextInput, Switch, Image, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import FooterPresta from '../../../components/FooterPresta';

const { width } = Dimensions.get('window');

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
  info: '#3B82F6',
};

export default function EditAnnonce() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    titre: '',
    description: '',
    tarif_unit: '',
    unit_tarif: 'heure',
    prix_fixe: false,
    acompte_percent: '',
    equipement: '',
    conditions_annulation: 'Modéré',
    actif: true,
    // Nouveaux champs
    nb_photos_livrees: '',
    delai_livraison: '',
    retouche_incluse: true,
    styles_photo: [] as string[],
    lieu_shootings: [] as string[],
    deplacement_inclus: false,
    rayon_deplacement_km: '',
    video_disponible: false,
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchAnnonce();
  }, [id]);

  const fetchAnnonce = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select('*, prestations(nom, type)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Normaliser les conditions d'annulation pour gérer les différents formats
      let conditions = data.conditions_annulation || 'Modéré';
      // Gérer les cas où la valeur pourrait être vide ou invalide
      if (!['Flexible', 'Modéré', 'Strict'].includes(conditions)) {
        conditions = 'Modéré';
      }
      
      setForm({
        titre: data.titre || '',
        description: data.description || '',
        tarif_unit: data.tarif_unit?.toString() || '',
        unit_tarif: data.unit_tarif || 'heure',
        prix_fixe: Boolean(data.prix_fixe),
        acompte_percent: data.acompte_percent?.toString() || '',
        equipement: data.equipement || '',
        conditions_annulation: conditions,
        actif: Boolean(data.actif),
        // Nouveaux champs
        nb_photos_livrees: data.nb_photos_livrees?.toString() || '',
        delai_livraison: data.delai_livraison?.toString() || '',
        retouche_incluse: data.retouche_incluse !== false,
        styles_photo: data.styles_photo || [],
        lieu_shootings: data.lieu_shootings || [],
        deplacement_inclus: Boolean(data.deplacement_inclus),
        rayon_deplacement_km: data.rayon_deplacement_km?.toString() || '',
        video_disponible: Boolean(data.video_disponible),
      });
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Erreur chargement annonce:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'annonce');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!form.titre.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Erreur', 'La description est requise');
      return;
    }
    if (!form.tarif_unit || parseFloat(form.tarif_unit) <= 0) {
      Alert.alert('Erreur', 'Le tarif unitaire doit être supérieur à 0');
      return;
    }
    if (form.acompte_percent && (parseFloat(form.acompte_percent) < 0 || parseFloat(form.acompte_percent) > 100)) {
      Alert.alert('Erreur', 'L\'acompte doit être entre 0 et 100%');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('annonces')
        .update({
          titre: form.titre,
          description: form.description,
          tarif_unit: parseFloat(form.tarif_unit),
          unit_tarif: form.unit_tarif,
          prix_fixe: form.prix_fixe,
          acompte_percent: form.acompte_percent ? parseInt(form.acompte_percent) : null,
          equipement: form.equipement || null,
          conditions_annulation: form.conditions_annulation,
          actif: form.actif,
          photos: photos,
          // Nouveaux champs
          nb_photos_livrees: form.nb_photos_livrees ? parseInt(form.nb_photos_livrees) : null,
          delai_livraison: form.delai_livraison ? parseInt(form.delai_livraison) : null,
          retouche_incluse: form.retouche_incluse,
          styles_photo: form.styles_photo.length > 0 ? form.styles_photo : null,
          lieu_shootings: form.lieu_shootings.length > 0 ? form.lieu_shootings : null,
          deplacement_inclus: form.deplacement_inclus,
          rayon_deplacement_km: form.rayon_deplacement_km ? parseInt(form.rayon_deplacement_km) : null,
          video_disponible: form.video_disponible,
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Succès', 'Annonce mise à jour avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette annonce ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer les zones d'intervention
              await supabase.from('zones_intervention').delete().eq('annonce_id', id);
              
              // Supprimer l'annonce
              const { error } = await supabase.from('annonces').delete().eq('id', id);

              if (error) throw error;

              Alert.alert('Succès', 'Annonce supprimée', [
                { text: 'OK', onPress: () => router.replace('/prestataires/prestations') }
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'annonce');
            }
          }
        }
      ]
    );
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à vos photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        setUploadingPhoto(true);
        const newPhotos = result.assets.map(asset => 
          asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri
        );
        setPhotos([...photos, ...newPhotos]);
        setUploadingPhoto(false);
      }
    } catch (error) {
      console.error('Erreur sélection photos:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Voulez-vous vraiment supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            setPhotos(newPhotos);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Modifier l'annonce</Text>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            {/* Titre */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre de l'annonce *</Text>
              <TextInput
                style={styles.input}
                value={form.titre}
                onChangeText={(text) => setForm({ ...form, titre: text })}
                placeholder="Ex: Séance photo mariage"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder="Décrivez votre prestation..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Tarif */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tarif unitaire *</Text>
              <TextInput
                style={styles.input}
                value={form.tarif_unit}
                onChangeText={(text) => setForm({ ...form, tarif_unit: text.replace(/[^0-9.]/g, '') })}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Unité */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Unité de tarification</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                <TouchableOpacity
                  style={[styles.unitChip, form.unit_tarif === 'heure' && styles.unitChipActive]}
                  onPress={() => setForm({ ...form, unit_tarif: 'heure' })}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={18} 
                    color={form.unit_tarif === 'heure' ? 'white' : COLORS.primary} 
                  />
                  <Text style={[styles.unitChipText, form.unit_tarif === 'heure' && styles.unitChipTextActive]}>
                    Heure
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unitChip, form.unit_tarif === 'demi_journee' && styles.unitChipActive]}
                  onPress={() => setForm({ ...form, unit_tarif: 'demi_journee' })}
                >
                  <Ionicons 
                    name="sunny-outline" 
                    size={18} 
                    color={form.unit_tarif === 'demi_journee' ? 'white' : COLORS.primary} 
                  />
                  <Text style={[styles.unitChipText, form.unit_tarif === 'demi_journee' && styles.unitChipTextActive]}>
                    Demi-journée
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unitChip, form.unit_tarif === 'jour' && styles.unitChipActive]}
                  onPress={() => setForm({ ...form, unit_tarif: 'jour' })}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={18} 
                    color={form.unit_tarif === 'jour' ? 'white' : COLORS.primary} 
                  />
                  <Text style={[styles.unitChipText, form.unit_tarif === 'jour' && styles.unitChipTextActive]}>
                    Journée
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unitChip, form.unit_tarif === 'seance' && styles.unitChipActive]}
                  onPress={() => setForm({ ...form, unit_tarif: 'seance' })}
                >
                  <Ionicons 
                    name="camera-outline" 
                    size={18} 
                    color={form.unit_tarif === 'seance' ? 'white' : COLORS.primary} 
                  />
                  <Text style={[styles.unitChipText, form.unit_tarif === 'seance' && styles.unitChipTextActive]}>
                    Séance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unitChip, form.unit_tarif === 'forfait' && styles.unitChipActive]}
                  onPress={() => setForm({ ...form, unit_tarif: 'forfait' })}
                >
                  <Ionicons 
                    name="pricetag-outline" 
                    size={18} 
                    color={form.unit_tarif === 'forfait' ? 'white' : COLORS.primary} 
                  />
                  <Text style={[styles.unitChipText, form.unit_tarif === 'forfait' && styles.unitChipTextActive]}>
                    Forfait
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Prix fixe */}
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Prix fixe</Text>
                  <Text style={styles.hint}>Le prix ne varie pas selon la durée</Text>
                </View>
                <Switch
                  value={form.prix_fixe}
                  onValueChange={(value) => setForm({ ...form, prix_fixe: value })}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={form.prix_fixe ? COLORS.accent : COLORS.backgroundLight}
                />
              </View>
              
              <View style={[
                styles.infoBox,
                form.prix_fixe 
                  ? { borderColor: '#10B981', backgroundColor: '#ECFDF5' }
                  : { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }
              ]}>
                <Text style={[
                  styles.infoText,
                  { fontWeight: '600' },
                  form.prix_fixe ? { color: '#065F46' } : { color: '#92400E' }
                ]}>
                  {form.prix_fixe ? '✓ ' : 'ℹ️ '}
                  {form.prix_fixe 
                    ? 'Les clients pourront réserver directement cette prestation en ligne.'
                    : 'Les clients devront vous envoyer une demande de devis avant de pouvoir réserver.'}
                </Text>
              </View>
            </View>

            {/* Acompte */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Acompte à la réservation (%)</Text>
              <TextInput
                style={styles.input}
                value={form.acompte_percent}
                onChangeText={(text) => setForm({ ...form, acompte_percent: text.replace(/[^0-9]/g, '') })}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>Pourcentage du tarif demandé à la réservation</Text>
            </View>

            {/* Équipement */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Équipements fournis</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.equipement}
                onChangeText={(text) => setForm({ ...form, equipement: text })}
                placeholder="Ex: Appareil photo professionnel, éclairages..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Conditions d'annulation */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Conditions d'annulation</Text>
              
              {/* Flexible */}
              <TouchableOpacity 
                style={[
                  styles.conditionOption,
                  form.conditions_annulation === 'Flexible' && styles.conditionOptionSelected,
                  form.conditions_annulation === 'Flexible' && { borderColor: '#10B981', backgroundColor: '#ECFDF5' }
                ]}
                onPress={() => setForm({ ...form, conditions_annulation: 'Flexible' })}
              >
                <View style={styles.conditionHeader}>
                  <View style={[
                    styles.radioButton,
                    form.conditions_annulation === 'Flexible' && { borderColor: '#10B981' }
                  ]}>
                    {form.conditions_annulation === 'Flexible' && (
                      <View style={[styles.radioButtonInner, { backgroundColor: '#10B981' }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.conditionTitle,
                    form.conditions_annulation === 'Flexible' && { color: '#065F46', fontWeight: '700' }
                  ]}>
                    Flexible
                  </Text>
                </View>
                <Text style={[
                  styles.conditionDescription,
                  form.conditions_annulation === 'Flexible' && { color: '#047857' }
                ]}>
                  Annulation gratuite jusqu'à 24h avant la prestation
                </Text>
              </TouchableOpacity>

              {/* Modéré */}
              <TouchableOpacity 
                style={[
                  styles.conditionOption,
                  form.conditions_annulation === 'Modéré' && styles.conditionOptionSelected,
                  form.conditions_annulation === 'Modéré' && { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }
                ]}
                onPress={() => setForm({ ...form, conditions_annulation: 'Modéré' })}
              >
                <View style={styles.conditionHeader}>
                  <View style={[
                    styles.radioButton,
                    form.conditions_annulation === 'Modéré' && { borderColor: '#F59E0B' }
                  ]}>
                    {form.conditions_annulation === 'Modéré' && (
                      <View style={[styles.radioButtonInner, { backgroundColor: '#F59E0B' }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.conditionTitle,
                    form.conditions_annulation === 'Modéré' && { color: '#92400E', fontWeight: '700' }
                  ]}>
                    Modéré
                  </Text>
                </View>
                <Text style={[
                  styles.conditionDescription,
                  form.conditions_annulation === 'Modéré' && { color: '#B45309' }
                ]}>
                  Annulation gratuite jusqu'à 7 jours avant, remboursement de 50% ensuite
                </Text>
              </TouchableOpacity>

              {/* Strict */}
              <TouchableOpacity 
                style={[
                  styles.conditionOption,
                  form.conditions_annulation === 'Strict' && styles.conditionOptionSelected,
                  form.conditions_annulation === 'Strict' && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
                ]}
                onPress={() => setForm({ ...form, conditions_annulation: 'Strict' })}
              >
                <View style={styles.conditionHeader}>
                  <View style={[
                    styles.radioButton,
                    form.conditions_annulation === 'Strict' && { borderColor: '#EF4444' }
                  ]}>
                    {form.conditions_annulation === 'Strict' && (
                      <View style={[styles.radioButtonInner, { backgroundColor: '#EF4444' }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.conditionTitle,
                    form.conditions_annulation === 'Strict' && { color: '#991B1B', fontWeight: '700' }
                  ]}>
                    Strict
                  </Text>
                </View>
                <Text style={[
                  styles.conditionDescription,
                  form.conditions_annulation === 'Strict' && { color: '#DC2626' }
                ]}>
                  Aucun remboursement sauf en cas de force majeure justifiée
                </Text>
              </TouchableOpacity>
            </View>

            {/* Photos */}
            <View style={styles.formGroup}>
              <View style={styles.photosHeader}>
                <Text style={styles.label}>Photos de la prestation</Text>
                <Text style={styles.photoCount}>{photos.length} photo{photos.length > 1 ? 's' : ''}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.addPhotoButton}
                onPress={pickImages}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.addPhotoText}>Ajouter des photos</Text>
                  </>
                )}
              </TouchableOpacity>

              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                      {index === 0 && (
                        <View style={styles.mainPhotoBadge}>
                          <Text style={styles.mainPhotoText}>PRINCIPALE</Text>
                        </View>
                      )}
                      <View style={styles.photoIndex}>
                        <Text style={styles.photoIndexText}>#{index + 1}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deletePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={28} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {photos.length === 0 && (
                <View style={styles.noPhotosContainer}>
                  <Ionicons name="camera-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.noPhotosText}>Aucune photo ajoutée</Text>
                </View>
              )}

              <Text style={styles.hint}>
                💡 La première photo sera utilisée comme image principale de votre annonce
              </Text>
            </View>

            {/* Statut actif */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Annonce active</Text>
                <Text style={styles.hint}>Visible dans les résultats de recherche</Text>
              </View>
              <Switch
                value={form.actif}
                onValueChange={(value) => setForm({ ...form, actif: value })}
                trackColor={{ false: COLORS.border, true: COLORS.success }}
                thumbColor={form.actif ? COLORS.success : COLORS.backgroundLight}
              />
            </View>

            {/* Boutons d'action */}
            <View style={styles.actionsSection}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.previewButton]}
                onPress={() => router.push(`/prestataires/annonces/preview?id=${id}` as any)}
              >
                <Ionicons name="eye-outline" size={20} color={COLORS.info} />
                <Text style={[styles.actionButtonText, { color: COLORS.info }]}>Aperçu</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundLight },

  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  saveButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },

  content: { padding: 20 },

  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: 'row', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  textArea: { minHeight: 100, paddingTop: 12 },
  hint: { fontSize: 13, color: COLORS.textLight, marginTop: 6 },

  pickerContainer: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50 },
  
  unitScroll: {
    flexGrow: 0,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 10,
  },
  unitChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  unitChipTextActive: {
    color: 'white',
  },
  
  conditionOption: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  conditionOptionSelected: {
    borderWidth: 2,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  conditionDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
    marginLeft: 36,
  },

  infoBox: { 
    marginTop: 12, 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  infoText: { 
    fontSize: 13, 
    lineHeight: 18 
  },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, marginBottom: 20 },

  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  photosScroll: {
    marginBottom: 12,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  mainPhotoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainPhotoText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoIndexText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  noPhotosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  noPhotosText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },

  actionsSection: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 2 },
  previewButton: { backgroundColor: COLORS.background, borderColor: COLORS.info },
  deleteButton: { backgroundColor: COLORS.background, borderColor: COLORS.error },
  actionButtonText: { fontSize: 15, fontWeight: '600' },
});
