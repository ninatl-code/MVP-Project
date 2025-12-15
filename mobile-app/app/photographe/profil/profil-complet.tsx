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
  Switch,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../lib/supabaseClient';
import { COLORS } from '../../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FooterPresta from '../../../components/photographe/FooterPresta';

// Types et constantes
const SPECIALISATIONS = [
  { id: 'portrait', label: 'Portrait / Book' },
  { id: 'event', label: 'Événement' },
  { id: 'product', label: 'Produit' },
  { id: 'real_estate', label: 'Immobilier' },
  { id: 'fashion', label: 'Mode' },
  { id: 'family', label: 'Famille' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'reportage', label: 'Reportage' },
];

const STYLES = [
  { id: 'luminous', label: 'Lumineux' },
  { id: 'dark_moody', label: 'Dark & Moody' },
  { id: 'studio', label: 'Studio' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'artistic', label: 'Artistique' },
  { id: 'vintage', label: 'Vintage' },
];

const EQUIPMENT = [
  { id: 'drones', label: 'Drones' },
  { id: 'lighting', label: 'Éclairage Pro' },
  { id: 'studio', label: 'Équipement Studio' },
  { id: 'macro', label: 'Objectif Macro' },
  { id: 'wide_angle', label: 'Grand Angle' },
  { id: 'stabilizers', label: 'Stabilisateurs' },
];

interface PhotographerProfile {
  id?: string;
  nom: string;
  email: string;
  telephone: string;
  bio: string;
  nom_entreprise: string;
  site_web: string;
  annees_experience: number;
  specialisations: string[];
  styles_photo: string[];
  equipe: {
    solo_only: boolean;
    num_assistants: number;
    has_makeup: boolean;
    has_stylist: boolean;
    has_videographer: boolean;
  };
  materiel: Record<string, boolean>;
  tarifs: Record<string, { min: number; max: number }>;
  tarif_deplacements: number;
  tarif_studio: number;
  rayon_deplacement: number;
  mobile: boolean;
  studio: boolean;
  adresse_studio: string;
  disponibilite: {
    weekdays: boolean;
    weekends: boolean;
    evenings: boolean;
  };
  delai_min_booking: number;
  instagram: string;
  facebook: string;
  linkedin: string;
  assurance_pro: boolean;
  portfolio_photos: string[];
  verification_status?: 'amateur' | 'pro';
  siret?: string;
  business_name?: string;
}

const DEFAULT_TARIFS = {
  portrait: { min: 150, max: 500 },
  event: { min: 500, max: 3000 },
  product: { min: 200, max: 1000 },
  real_estate: { min: 300, max: 1500 },
  fashion: { min: 400, max: 2000 },
  family: { min: 150, max: 600 },
  corporate: { min: 300, max: 1500 },
  reportage: { min: 400, max: 2000 },
};

export default function ProfilComplet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<PhotographerProfile>({
    nom: '',
    email: '',
    telephone: '',
    bio: '',
    nom_entreprise: '',
    site_web: '',
    annees_experience: 0,
    specialisations: [],
    styles_photo: [],
    equipe: {
      solo_only: true,
      num_assistants: 0,
      has_makeup: false,
      has_stylist: false,
      has_videographer: false,
    },
    materiel: {},
    tarifs: DEFAULT_TARIFS,
    tarif_deplacements: 0,
    tarif_studio: 0,
    rayon_deplacement: 50,
    mobile: true,
    studio: false,
    adresse_studio: '',
    disponibilite: {
      weekdays: true,
      weekends: true,
      evenings: false,
    },
    delai_min_booking: 14,
    instagram: '',
    facebook: '',
    linkedin: '',
    assurance_pro: false,
    portfolio_photos: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load basic profile info from profiles table
      const { data: basicProfileData } = await supabase
        .from('profiles')
        .select('nom, email, telephone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      // Load detailed photographer profile from profils_photographe
      const { data: photoData, error } = await supabase
        .from('profils_photographe')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // DEBUG: Log what we got
      console.log('basicProfileData:', basicProfileData);
      console.log('photoData nom:', photoData?.nom);
      console.log('photoData telephone:', photoData?.telephone);

      if (error) {
        console.error('Erreur chargement profil:', error);
      }

      // Build complete profile with data from both tables
      const newProfile = {
        nom: basicProfileData?.email || profile.nom, // TEST: use email to debug
        email: basicProfileData?.email || profile.email || '',
        telephone: basicProfileData?.email || profile.telephone, // TEST: use email to debug
        bio: photoData?.bio || '',
        nom_entreprise: photoData?.nom_entreprise || '',
        site_web: photoData?.site_web || '',
        annees_experience: photoData?.annees_experience || 0,
        specialisations: photoData?.specialisations || [],
        styles_photo: photoData?.styles_photo || [],
        equipe: photoData?.equipe || {
          solo_only: true,
          num_assistants: 0,
          has_makeup: false,
          has_stylist: false,
          has_videographer: false,
        },
        materiel: photoData?.materiel || {},
        tarifs: photoData?.tarifs_indicatifs || DEFAULT_TARIFS,
        tarif_deplacements: photoData?.tarif_deplacements || 0,
        tarif_studio: photoData?.tarif_studio || 0,
        rayon_deplacement: photoData?.rayon_deplacement_km || 50,
        mobile: photoData?.mobile !== false,
        studio: photoData?.studio || false,
        adresse_studio: photoData?.adresse_studio || '',
        disponibilite: photoData?.disponibilite || {
          weekdays: true,
          weekends: true,
          evenings: false,
        },
        delai_min_booking: photoData?.delai_min_booking || 14,
        instagram: photoData?.instagram || '',
        facebook: photoData?.facebook || '',
        linkedin: photoData?.linkedin || '',
        assurance_pro: photoData?.assurance_pro || false,
        portfolio_photos: photoData?.portfolio_photos || [],
        verification_status: photoData?.verification_status || 'amateur',
        siret: photoData?.siret || undefined,
        business_name: photoData?.business_name || undefined,
      };

      setProfile(newProfile as PhotographerProfile);

      // Load profile photo (avatar_url)
      if (basicProfileData?.avatar_url) {
        setProfilePhotoUri(basicProfileData.avatar_url);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Sauvegarder les infos de base dans profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: profile.nom,
          email: profile.email,
          telephone: profile.telephone,
        })
        .eq('id', user.id);

      // Sauvegarder les détails photographe
      const { error: photoError } = await supabase
        .from('profils_photographe')
        .update({
          bio: profile.bio,
          nom_entreprise: profile.nom_entreprise,
          site_web: profile.site_web,
          annees_experience: profile.annees_experience,
          specialisations: profile.specialisations,
          styles_photo: profile.styles_photo,
          equipe: profile.equipe,
          materiel: profile.materiel,
          tarifs_indicatifs: profile.tarifs,
          tarif_deplacements: profile.tarif_deplacements,
          tarif_studio: profile.tarif_studio,
          rayon_deplacement_km: profile.rayon_deplacement,
          mobile: profile.mobile,
          studio: profile.studio,
          adresse_studio: profile.adresse_studio,
          disponibilite: profile.disponibilite,
          delai_min_booking: profile.delai_min_booking,
          instagram: profile.instagram,
          facebook: profile.facebook,
          linkedin: profile.linkedin,
          assurance_pro: profile.assurance_pro,
          portfolio_photos: profile.portfolio_photos,
          verification_status: profile.verification_status || 'amateur',
          siret: profile.siret || null,
          business_name: profile.business_name || null,
        })
        .eq('id', user.id);

      if (profileError || photoError) {
        throw profileError || photoError;
      }

      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  const pickPortfolioPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        // TODO: Upload to Supabase storage and get URL
        setProfile(prev => ({
          ...prev,
          portfolio_photos: [...prev.portfolio_photos, result.assets[0].uri],
        }));
      }
    } catch (error) {
      console.error('Erreur upload:', error);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setSaving(true);

        try {
          // Get user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Non authentifié');

          // Read file as base64
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });

          // Convert base64 to blob
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          const fileName = `profile_${user.id}_${Date.now()}.jpg`;
          const filePath = `photos/${fileName}`;

          // Try to upload to storage
          const { data, error } = await supabase.storage
            .from('photos')
            .upload(filePath, byteArray, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          let photoUrl = imageUri; // Fallback to local URI

          if (!error && data) {
            // Get public URL if upload successful
            const { data: publicUrlData } = supabase.storage
              .from('photos')
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              photoUrl = publicUrlData.publicUrl;
            }
          }

          // Update profiles table with photo (either cloud URL or local URI)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: photoUrl })
            .eq('id', user.id);

          if (updateError) {
            throw updateError;
          }

          setProfilePhotoUri(photoUrl);
          setSaving(false);
          Alert.alert('Succès', 'Photo de profil mise à jour');
        } catch (error: any) {
          // Fallback: save local URI if cloud storage fails
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('profiles')
                .update({ avatar_url: imageUri })
                .eq('id', user.id);
              setProfilePhotoUri(imageUri);
              setSaving(false);
              Alert.alert('Succès', 'Photo de profil mise à jour (stockage local)');
            }
          } catch (fallbackError) {
            setSaving(false);
            console.error('Erreur fallback:', fallbackError);
            Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
          }
        }
      }
    } catch (error: any) {
      setSaving(false);
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors de la sélection');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header avec flèche retour et bouton sauvegarder */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Complet</Text>
        <TouchableOpacity 
          style={[styles.saveHeaderButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'infos', label: 'Infos' },
          { id: 'specialites', label: 'Spécialités' },
          { id: 'tarifs', label: 'Tarifs' },
          { id: 'localisation', label: 'Localisation' },
          { id: 'verification', label: 'Vérification' },
          { id: 'portfolio', label: 'Portfolio' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB: INFOS GÉNÉRALES */}
        {activeTab === 'infos' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations Professionnelles</Text>

            {/* Photo de profil */}
            <View style={styles.profilePhotoSection}>
              <View style={styles.profilePhotoContainer}>
                {profilePhotoUri ? (
                  <Image 
                    source={{ uri: profilePhotoUri }} 
                    style={styles.profilePhoto} 
                  />
                ) : (
                  <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                    <Ionicons name="person" size={48} color={COLORS.primary} />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.editPhotoButton}
                  onPress={pickProfilePhoto}
                  disabled={saving}
                >
                  <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={styles.profilePhotoLabel}>Photo de profil</Text>
              <Text style={styles.profilePhotoHint}>Cliquez sur l'appareil photo pour changer</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={profile.nom}
                onChangeText={text => setProfile({ ...profile, nom: text })}
                placeholder="Votre nom complet"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={profile.email}
                editable={false}
                placeholder="Email"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={profile.telephone}
                onChangeText={text => setProfile({ ...profile, telephone: text })}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom de l'entreprise</Text>
              <TextInput
                style={styles.input}
                value={profile.nom_entreprise}
                onChangeText={text => setProfile({ ...profile, nom_entreprise: text })}
                placeholder="Ex: Studio Lumineux"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio professionnelle</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={profile.bio}
                onChangeText={text => setProfile({ ...profile, bio: text })}
                placeholder="Décrivez votre approche photographique..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Années d'expérience</Text>
              <TextInput
                style={styles.input}
                value={profile.annees_experience.toString()}
                onChangeText={text => setProfile({
                  ...profile,
                  annees_experience: parseInt(text) || 0,
                })}
                placeholder="Ex: 8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Site web</Text>
              <TextInput
                style={styles.input}
                value={profile.site_web}
                onChangeText={text => setProfile({ ...profile, site_web: text })}
                placeholder="https://exemple.com"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={profile.instagram}
                onChangeText={text => setProfile({ ...profile, instagram: text })}
                placeholder="@username"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={profile.facebook}
                onChangeText={text => setProfile({ ...profile, facebook: text })}
                placeholder="URL Facebook"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput
                style={styles.input}
                value={profile.linkedin}
                onChangeText={text => setProfile({ ...profile, linkedin: text })}
                placeholder="URL LinkedIn"
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Assurance Responsabilité Civile Pro</Text>
              <Switch
                value={profile.assurance_pro}
                onValueChange={value => setProfile({ ...profile, assurance_pro: value })}
              />
            </View>
          </View>
        )}

        {/* TAB: SPÉCIALITÉS */}
        {activeTab === 'specialites' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spécialités & Services</Text>

            <Text style={styles.subLabel}>Spécialisations (sélectionnez au moins une)</Text>
            <View style={styles.gridContainer}>
              {SPECIALISATIONS.map(spec => (
                <TouchableOpacity
                  key={spec.id}
                  style={[
                    styles.chip,
                    profile.specialisations.includes(spec.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setProfile(prev => ({
                      ...prev,
                      specialisations: prev.specialisations.includes(spec.id)
                        ? prev.specialisations.filter(s => s !== spec.id)
                        : [...prev.specialisations, spec.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    profile.specialisations.includes(spec.id) && styles.chipTextSelected,
                  ]}>
                    {spec.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Styles photographiques</Text>
            <View style={styles.gridContainer}>
              {STYLES.map(style => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.chip,
                    profile.styles_photo.includes(style.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setProfile(prev => ({
                      ...prev,
                      styles_photo: prev.styles_photo.includes(style.id)
                        ? prev.styles_photo.filter(s => s !== style.id)
                        : [...prev.styles_photo, style.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    profile.styles_photo.includes(style.id) && styles.chipTextSelected,
                  ]}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Équipement</Text>
            <View style={styles.gridContainer}>
              {EQUIPMENT.map(eq => (
                <TouchableOpacity
                  key={eq.id}
                  style={[
                    styles.chip,
                    profile.materiel[eq.id] && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setProfile(prev => ({
                      ...prev,
                      materiel: {
                        ...prev.materiel,
                        [eq.id]: !prev.materiel[eq.id],
                      },
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    profile.materiel[eq.id] && styles.chipTextSelected,
                  ]}>
                    {eq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Équipe</Text>
            <View style={styles.switchGroup}>
              <Text style={styles.label}>Travail en solo uniquement</Text>
              <Switch
                value={profile.equipe.solo_only}
                onValueChange={value => setProfile({
                  ...profile,
                  equipe: { ...profile.equipe, solo_only: value },
                })}
              />
            </View>

            {!profile.equipe.solo_only && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre d'assistants</Text>
                <TextInput
                  style={styles.input}
                  value={profile.equipe.num_assistants.toString()}
                  onChangeText={text => setProfile({
                    ...profile,
                    equipe: { ...profile.equipe, num_assistants: parseInt(text) || 0 },
                  })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Maquilleur professionnel</Text>
              <Switch
                value={profile.equipe.has_makeup}
                onValueChange={value => setProfile({
                  ...profile,
                  equipe: { ...profile.equipe, has_makeup: value },
                })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Styliste</Text>
              <Switch
                value={profile.equipe.has_stylist}
                onValueChange={value => setProfile({
                  ...profile,
                  equipe: { ...profile.equipe, has_stylist: value },
                })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Vidéographe</Text>
              <Switch
                value={profile.equipe.has_videographer}
                onValueChange={value => setProfile({
                  ...profile,
                  equipe: { ...profile.equipe, has_videographer: value },
                })}
              />
            </View>
          </View>
        )}

        {/* TAB: TARIFS */}
        {activeTab === 'tarifs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarification</Text>

            {Object.entries(profile.tarifs).map(([categorie, tarif]) => (
              <View key={categorie} style={styles.tarifCard}>
                <Text style={styles.tarifTitle}>
                  {SPECIALISATIONS.find(s => s.id === categorie)?.label || categorie}
                </Text>
                <View style={styles.tarifRow}>
                  <View style={styles.tarifInput}>
                    <Text style={styles.label}>Min (€)</Text>
                    <TextInput
                      style={styles.input}
                      value={tarif.min.toString()}
                      onChangeText={text => setProfile({
                        ...profile,
                        tarifs: {
                          ...profile.tarifs,
                          [categorie]: {
                            ...tarif,
                            min: parseInt(text) || 0,
                          },
                        },
                      })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.tarifInput}>
                    <Text style={styles.label}>Max (€)</Text>
                    <TextInput
                      style={styles.input}
                      value={tarif.max.toString()}
                      onChangeText={text => setProfile({
                        ...profile,
                        tarifs: {
                          ...profile.tarifs,
                          [categorie]: {
                            ...tarif,
                            max: parseInt(text) || 0,
                          },
                        },
                      })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tarif déplacements (€/km après 30km)</Text>
              <TextInput
                style={styles.input}
                value={profile.tarif_deplacements.toString()}
                onChangeText={text => setProfile({
                  ...profile,
                  tarif_deplacements: parseInt(text) || 0,
                })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tarif location studio (€/heure, si applicable)</Text>
              <TextInput
                style={styles.input}
                value={profile.tarif_studio.toString()}
                onChangeText={text => setProfile({
                  ...profile,
                  tarif_studio: parseInt(text) || 0,
                })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Délai minimum de booking (jours)</Text>
              <TextInput
                style={styles.input}
                value={profile.delai_min_booking.toString()}
                onChangeText={text => setProfile({
                  ...profile,
                  delai_min_booking: parseInt(text) || 0,
                })}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* TAB: LOCALISATION */}
        {activeTab === 'localisation' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation & Mobilité</Text>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Je me déplace sur site</Text>
              <Switch
                value={profile.mobile}
                onValueChange={value => setProfile({ ...profile, mobile: value })}
              />
            </View>

            {profile.mobile && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rayon de déplacement (km)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.rayon_deplacement.toString()}
                  onChangeText={text => setProfile({
                    ...profile,
                    rayon_deplacement: parseInt(text) || 50,
                  })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Je dispose d'un studio</Text>
              <Switch
                value={profile.studio}
                onValueChange={value => setProfile({ ...profile, studio: value })}
              />
            </View>

            {profile.studio && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Adresse du studio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={profile.adresse_studio}
                  onChangeText={text => setProfile({ ...profile, adresse_studio: text })}
                  placeholder="123 Rue de Paris, 75001 Paris"
                  multiline
                />
              </View>
            )}

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Disponibilités</Text>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>En semaine</Text>
              <Switch
                value={profile.disponibilite.weekdays}
                onValueChange={value => setProfile({
                  ...profile,
                  disponibilite: { ...profile.disponibilite, weekdays: value },
                })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Weekends</Text>
              <Switch
                value={profile.disponibilite.weekends}
                onValueChange={value => setProfile({
                  ...profile,
                  disponibilite: { ...profile.disponibilite, weekends: value },
                })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Soirées</Text>
              <Switch
                value={profile.disponibilite.evenings}
                onValueChange={value => setProfile({
                  ...profile,
                  disponibilite: { ...profile.disponibilite, evenings: value },
                })}
              />
            </View>
          </View>
        )}

        {/* TAB: VÉRIFICATION */}
        {activeTab === 'verification' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut de Vérification</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vous êtes...</Text>
              <View style={styles.gridContainer}>
                {[
                  { id: 'amateur', label: 'Amateur' },
                  { id: 'pro', label: 'Professionnel' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.chip,
                      profile.verification_status === option.id && styles.chipSelected,
                    ]}
                    onPress={() => setProfile({ ...profile, verification_status: option.id as 'amateur' | 'pro' })}
                  >
                    <Text style={[
                      styles.chipText,
                      profile.verification_status === option.id && styles.chipTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {profile.verification_status === 'pro' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Numéro SIRET</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.siret || ''}
                    onChangeText={text => setProfile({ ...profile, siret: text })}
                    placeholder="Entrez votre numéro SIRET"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Raison sociale</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.business_name || ''}
                    onChangeText={text => setProfile({ ...profile, business_name: text })}
                    placeholder="Nom de votre entreprise"
                  />
                </View>
              </>
            )}

            <View style={[styles.card, { backgroundColor: '#F0F9FF', borderColor: '#0EA5E9', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Ionicons name="information" size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: '#0EA5E9', fontSize: 14 }]}>Vérification</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }}>
                Votre statut actuel: <Text style={{ fontWeight: 'bold' }}>
                  {profile.verification_status === 'pro' ? 'Professionnel' : 'Amateur'}
                </Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 }}>
                Les professionnels doivent fournir un SIRET valide et une preuve d'assurance. Cela vous donne accès à plus de fonctionnalités.
              </Text>
            </View>
          </View>
        )}

        {/* TAB: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <Text style={styles.subLabel}>Ajoutez des photos de vos travaux</Text>

            <TouchableOpacity style={styles.addPhotoButton} onPress={pickPortfolioPhoto}>
              <Text style={styles.addPhotoText}>+ Ajouter une photo</Text>
            </TouchableOpacity>

            <View style={styles.portfolioGrid}>
              {profile.portfolio_photos.map((photo, index) => (
                <View key={index} style={styles.portfolioItem}>
                  <Image source={{ uri: photo }} style={styles.portfolioImage} />
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => setProfile({
                      ...profile,
                      portfolio_photos: profile.portfolio_photos.filter((_, i) => i !== index),
                    })}
                  >
                    <Text style={styles.deletePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  saveHeaderButton: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 100,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profilePhotoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profilePhotoPlaceholder: {
    backgroundColor: '#F5F5F5',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  profilePhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  profilePhotoHint: {
    fontSize: 12,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '500',
  },
  tarifCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 12,
  },
  tarifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tarifRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tarifInput: {
    flex: 1,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
