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
import * as DocumentPicker from 'expo-document-picker';
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
  specialisations: string[];
  categories: string[];
  equipe: {
    solo_only: boolean;
    num_assistants: number;
    has_makeup: boolean;
    has_stylist: boolean;
    has_videographer: boolean;
  };
  materiel: Record<string, boolean>;
  tarifs: Record<string, { min: number; max: number }>;
  frais_deplacement_par_km: number;
  rayon_deplacement: number;
  mobile: boolean;
  studio: boolean;
  studio_adresse: string;
  preferences: {
    accepte_weekend: boolean;
    accepte_soiree: boolean;
  };
  instagram: string;
  facebook: string;
  linkedin: string;
  documents_assurance: string;
  portfolio_photos: string[];
  statut_validation?: string;
  statut_pro?: boolean;
  siret?: string;
  document_identite_url?: string;
  identite_verifiee?: boolean;
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

const CATEGORIES = [
  { id: 'portrait', label: 'Portrait / Book' },
  { id: 'event', label: 'Événement' },
  { id: 'product', label: 'Produit' },
  { id: 'real_estate', label: 'Immobilier' },
  { id: 'fashion', label: 'Mode' },
  { id: 'family', label: 'Famille' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'reportage', label: 'Reportage' },
];

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
    specialisations: [],
    categories: [],
    equipe: {
      solo_only: true,
      num_assistants: 0,
      has_makeup: false,
      has_stylist: false,
      has_videographer: false,
    },
    materiel: {},
    tarifs: DEFAULT_TARIFS,
    frais_deplacement_par_km: 0,
    rayon_deplacement: 50,
    mobile: true,
    studio: false,
    studio_adresse: '',
    preferences: {
      accepte_weekend: true,
      accepte_soiree: false,
    },
    instagram: '',
    facebook: '',
    linkedin: '',
    documents_assurance: '',
    portfolio_photos: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [idDocRecto, setIdDocRecto] = useState<string | null>(null);
  const [idDocVerso, setIdDocVerso] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      console.log('🔄 loadProfile starting...');
      
      // Get session (plus fiable que getUser)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('❌ No session found');
        setLoading(false);
        return;
      }
      
      const user = session.user;
      console.log('✅ User found:', user.id);
      console.log('✅ User email:', user.email);

      // Load from profiles using auth_user_id AND role
      console.log('📥 Loading from profiles table...');
      const { data: basicProfileData, error: basicError } = await supabase
        .from('profiles')
        .select('id, nom, email, telephone, avatar_url')
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe')
        .maybeSingle();

      console.log('✅ profiles data:', basicProfileData);
      console.log('⚠️ profiles error:', basicError);

      // Stocker le profiles.id pour l'utiliser dans saveProfile
      if (basicProfileData?.id) {
        setProfileId(basicProfileData.id);
        console.log('✅ profiles.id stored:', basicProfileData.id);
      }

      // Load detailed photographer profile from profils_photographe
      console.log('📥 Loading from profils_photographe...');
      const { data: photoData, error: photoError } = basicProfileData?.id
        ? await supabase
            .from('profils_photographe')
            .select('*')
            .eq('id', basicProfileData.id)
            .maybeSingle()
        : { data: null, error: null };

      console.log('✅ profils_photographe loaded:', photoData ? 'YES' : 'NO');
      console.log('⚠️ profils_photographe error:', photoError);

      // Build complete profile - use profiles data (priority) and profils_photographe as fallback
      const newProfile = {
        nom: basicProfileData?.nom || photoData?.nom || '',
        email: basicProfileData?.email || photoData?.email || user.email || '',
        telephone: basicProfileData?.telephone || photoData?.telephone || '',
        bio: photoData?.bio || '',
        nom_entreprise: photoData?.nom_entreprise || '',
        site_web: photoData?.site_web || '',
        specialisations: photoData?.specialisations || [],
        categories: photoData?.categories || [],
        equipe: photoData?.equipe || {
          solo_only: true,
          num_assistants: 0,
          has_makeup: false,
          has_stylist: false,
          has_videographer: false,
        },
        materiel: photoData?.materiel || {},
        tarifs: photoData?.tarifs_indicatifs || DEFAULT_TARIFS,
        frais_deplacement_par_km: photoData?.frais_deplacement_par_km || 0,
        rayon_deplacement: photoData?.rayon_deplacement_km || 50,
        mobile: photoData?.mobile !== false,
        studio: photoData?.studio || false,
        studio_adresse: photoData?.studio_adresse || '',
        preferences: photoData?.preferences || {
          accepte_weekend: true,
          accepte_soiree: false,
        },
        instagram: photoData?.instagram || '',
        facebook: photoData?.facebook || '',
        linkedin: photoData?.linkedin || '',
        documents_assurance: photoData?.documents_assurance || '',
        portfolio_photos: photoData?.portfolio_photos || [],
        statut_validation: photoData?.statut_validation || 'pending',
        statut_pro: photoData?.statut_pro || false,
        siret: photoData?.siret || undefined,
        document_identite_url: photoData?.document_identite_url || '',
        identite_verifiee: photoData?.identite_verifiee || false,
      };

      console.log('💾 Setting profile with nom:', newProfile.nom, 'tel:', newProfile.telephone);
      setProfile(newProfile as PhotographerProfile);

      // Load profile photo
      if (basicProfileData?.avatar_url) {
        console.log('🖼️ Loading avatar...');
        setProfilePhotoUri(basicProfileData.avatar_url);
      }

      // Load ID documents
      if (photoData?.document_identite_recto_url) {
        setIdDocRecto(photoData.document_identite_recto_url);
      }
      if (photoData?.document_identite_verso_url) {
        setIdDocVerso(photoData.document_identite_verso_url);
      }

      console.log('✅ loadProfile completed successfully');
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Non authentifié');
      const user = session.user;

      if (!profileId) {
        throw new Error('Profile ID manquant. Veuillez recharger la page.');
      }

      // Fonction helper pour convertir les chaînes vides en null
      const emptyToNull = (value: string | undefined) => {
        return value && value.trim() !== '' ? value : null;
      };

      // Sauvegarder les infos de base dans profiles (use auth_user_id AND role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: emptyToNull(profile.nom) || 'Utilisateur',
          email: profile.email,
          telephone: emptyToNull(profile.telephone),
        })
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe');

      // Sauvegarder les détails photographe (upsert pour créer si n'existe pas)
      // IMPORTANT: utiliser profileId qui est profiles.id, PAS auth_user_id
      const { error: photoError } = await supabase
        .from('profils_photographe')
        .upsert({
          id: profileId,  // UTILISER profiles.id stocké dans profileId
          bio: emptyToNull(profile.bio),
          nom_entreprise: emptyToNull(profile.nom_entreprise),
          site_web: emptyToNull(profile.site_web),
          specialisations: profile.specialisations || [],
          categories: profile.categories || [],
          equipe: profile.equipe,
          materiel: profile.materiel || {},
          tarifs_indicatifs: profile.tarifs,
          frais_deplacement_par_km: profile.frais_deplacement_par_km || 0,
          rayon_deplacement_km: profile.rayon_deplacement || 50,
          mobile: profile.mobile,
          studio: profile.studio,
          studio_adresse: emptyToNull(profile.studio_adresse),
          preferences: profile.preferences,
          instagram: emptyToNull(profile.instagram),
          facebook: emptyToNull(profile.facebook),
          linkedin: emptyToNull(profile.linkedin),
          documents_assurance: emptyToNull(profile.documents_assurance),
          portfolio_photos: profile.portfolio_photos || [],
          statut_validation: profile.statut_validation || 'pending',
          statut_pro: profile.statut_pro || false,
          siret: emptyToNull(profile.siret),
          document_identite_url: emptyToNull(profile.document_identite_url),
          document_identite_recto_url: idDocRecto,
          document_identite_verso_url: idDocVerso,
        });

      if (profileError || photoError) {
        throw profileError || photoError;
      }

      Alert.alert('Succès', 'Profil mis à jour');
      
      // Rediriger vers profil.tsx après sauvegarde
      router.push('/photographe/profil/profil');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  const pickIdDocument = async (side: 'recto' | 'verso', useCamera: boolean = false) => {
    try {
      let result;
      
      if (useCamera) {
        // Demander la permission de la caméra
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission refusée', 'Nous avons besoin de la permission d\'accéder à la caméra');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.9,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.9,
        });
      }

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setSaving(true);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) throw new Error('Non authentifié');

          // Read file as base64
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });

          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          const fileName = `id_${side}_${session.user.id}_${Date.now()}.jpg`;
          const filePath = `documents/${fileName}`;

          // Upload to storage
          const { data, error } = await supabase.storage
            .from('photos')
            .upload(filePath, byteArray, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });

          let docUrl = imageUri;

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage
              .from('photos')
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              docUrl = publicUrlData.publicUrl;
            }
          }

          // Update state
          if (side === 'recto') {
            setIdDocRecto(docUrl);
          } else {
            setIdDocVerso(docUrl);
          }

          // Update database immediately
          if (profileId) {
            const updateData = side === 'recto' 
              ? { document_identite_recto_url: docUrl }
              : { document_identite_verso_url: docUrl };
            
            await supabase
              .from('profils_photographe')
              .update(updateData)
              .eq('id', profileId);
          }

          setSaving(false);
          Alert.alert('Succès', `Document (${side}) téléchargé`);
        } catch (error: any) {
          setSaving(false);
          Alert.alert('Erreur', error.message || 'Impossible de télécharger le document');
        }
      }
    } catch (error: any) {
      setSaving(false);
      Alert.alert('Erreur', error.message || 'Erreur lors de la sélection');
    }
  };

  const pickIdDocumentPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'], // Only allow images, not PDFs since bucket doesn't support it
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setSaving(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Non authentifié');

        const file = result.assets[0];
        const fileUri = file.uri;
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });

        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const extension = file.name.split('.').pop() || 'jpg';
        const fileName = `id_document_${session.user.id}_${Date.now()}.${extension}`;
        const filePath = `documents/${fileName}`;

        // Upload to storage - force image content type
        const { data, error } = await supabase.storage
          .from('photos')
          .upload(filePath, byteArray, {
            contentType: file.mimeType || 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        let docUrl = fileUri;

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            docUrl = publicUrlData.publicUrl;
          }
        }

        // Set both recto (will be the PDF URL)
        setIdDocRecto(docUrl);
        
        // Update database
        if (profileId) {
          await supabase
            .from('profils_photographe')
            .update({ 
              document_identite_recto_url: docUrl,
              document_identite_verso_url: null // Clear verso if uploading PDF
            })
            .eq('id', profileId);
        }

        setSaving(false);
        Alert.alert('Succès', 'Document PDF téléchargé');
      } catch (error: any) {
        setSaving(false);
        Alert.alert('Erreur', error.message || 'Impossible de télécharger le PDF');
      }
    } catch (error: any) {
      setSaving(false);
      Alert.alert('Erreur', error.message || 'Erreur lors de la sélection');
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
              cacheControl: '3600',
              upsert: false
            });

          // Ne sauvegarder QUE si l'upload a réussi
          if (error || !data) {
            throw new Error(error?.message || 'Échec de l\'upload vers le stockage cloud');
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);
          
          if (!publicUrlData?.publicUrl) {
            throw new Error('Impossible d\'obtenir l\'URL publique');
          }

          const photoUrl = publicUrlData.publicUrl;

          // Update profiles table with photo (use auth_user_id AND role)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: photoUrl })
            .eq('auth_user_id', user.id)
            .eq('role', 'photographe');

          if (updateError) {
            throw updateError;
          }

          setProfilePhotoUri(photoUrl);
          setSaving(false);
          Alert.alert('Succès', 'Photo de profil mise à jour');
        } catch (error: any) {
          // Afficher une erreur claire sans fallback local
          setSaving(false);
          console.error('Erreur upload photo:', error);
          Alert.alert(
            'Erreur d\'upload', 
            'Impossible d\'enregistrer votre photo. Vérifiez votre connexion internet et réessayez.\n\n' + 
            (error.message || 'Erreur inconnue')
          );
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Document d'assurance (URL)</Text>
              <TextInput
                style={styles.input}
                value={profile.documents_assurance}
                onChangeText={text => setProfile({ ...profile, documents_assurance: text })}
                placeholder="URL du document d'assurance"
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

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Catégories</Text>
            <View style={styles.gridContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    profile.categories.includes(cat.id) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setProfile(prev => ({
                      ...prev,
                      categories: prev.categories.includes(cat.id)
                        ? prev.categories.filter(s => s !== cat.id)
                        : [...prev.categories, cat.id],
                    }));
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    profile.categories.includes(cat.id) && styles.chipTextSelected,
                  ]}>
                    {cat.label}
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
              <Text style={styles.label}>Frais déplacement par km (€/km)</Text>
              <TextInput
                style={styles.input}
                value={profile.frais_deplacement_par_km.toString()}
                onChangeText={text => setProfile({
                  ...profile,
                  frais_deplacement_par_km: parseFloat(text) || 0,
                })}
                keyboardType="numeric"
                placeholder="0"
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
                  value={profile.studio_adresse}
                  onChangeText={text => setProfile({ ...profile, studio_adresse: text })}
                  placeholder="123 Rue de Paris, 75001 Paris"
                  multiline
                />
              </View>
            )}

            <Text style={[styles.subLabel, { marginTop: 24 }]}>Disponibilités</Text>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Disponible les weekends</Text>
              <Switch
                value={profile.preferences.accepte_weekend}
                onValueChange={value => setProfile({
                  ...profile,
                  preferences: { ...profile.preferences, accepte_weekend: value },
                })}
              />
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Disponible en soirée</Text>
              <Switch
                value={profile.preferences.accepte_soiree}
                onValueChange={value => setProfile({
                  ...profile,
                  preferences: { ...profile.preferences, accepte_soiree: value },
                })}
              />
            </View>
          </View>
        )}

        {/* TAB: VÉRIFICATION */}
        {activeTab === 'verification' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut de Vérification</Text>
            
            <View style={styles.switchGroup}>
              <Text style={styles.label}>Je suis photographe professionnel</Text>
              <Switch
                value={profile.statut_pro || false}
                onValueChange={value => setProfile({ ...profile, statut_pro: value })}
              />
            </View>

            {profile.statut_pro && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro SIRET (obligatoire pour les professionnels)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.siret || ''}
                  onChangeText={text => setProfile({ ...profile, siret: text })}
                  placeholder="Entrez votre numéro SIRET"
                  keyboardType="numeric"
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24, fontSize: 16 }]}>Vérification d'identité</Text>

            <View style={[styles.card, { backgroundColor: (idDocRecto || idDocVerso) ? '#F0FDF4' : '#FEF3C7', borderColor: (idDocRecto || idDocVerso) ? '#10B981' : '#F59E0B', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Ionicons name={(idDocRecto || idDocVerso) ? "checkmark-circle" : "alert-circle"} size={20} color={(idDocRecto || idDocVerso) ? '#10B981' : '#F59E0B'} style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: (idDocRecto || idDocVerso) ? '#10B981' : '#F59E0B', fontSize: 14 }]}>
                  {(idDocRecto || idDocVerso) ? 'Document téléchargé' : 'Document requis'}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }}>
                {(idDocRecto || idDocVerso)
                  ? 'Votre pièce d\'identité a été téléchargée et est en cours de vérification.'
                  : 'Téléchargez votre carte d\'identité ou passeport (recto/verso ou PDF).'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Pièce d'identité (Images)</Text>
              
              {/* Recto */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.subLabel, { marginBottom: 8 }]}>Recto</Text>
                {idDocRecto ? (
                  <View style={styles.uploadedDocContainer}>
                    <Image source={{ uri: idDocRecto }} style={styles.uploadedDocImage} />
                    <TouchableOpacity 
                      style={styles.removeDocButton}
                      onPress={() => setIdDocRecto(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickIdDocument('recto', true)}
                      disabled={saving}
                    >
                      <Ionicons name="camera" size={20} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>Prendre photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickIdDocument('recto', false)}
                      disabled={saving}
                    >
                      <Ionicons name="images" size={20} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Verso */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.subLabel, { marginBottom: 8 }]}>Verso</Text>
                {idDocVerso ? (
                  <View style={styles.uploadedDocContainer}>
                    <Image source={{ uri: idDocVerso }} style={styles.uploadedDocImage} />
                    <TouchableOpacity 
                      style={styles.removeDocButton}
                      onPress={() => setIdDocVerso(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickIdDocument('verso', true)}
                      disabled={saving}
                    >
                      <Ionicons name="camera" size={20} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>Prendre photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickIdDocument('verso', false)}
                      disabled={saving}
                    >
                      <Ionicons name="images" size={20} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              {/* Additional Image Option */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.subLabel, { marginBottom: 8 }]}>Ou choisir une autre image</Text>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickIdDocumentPDF}
                  disabled={saving}
                >
                  <Ionicons name="images" size={20} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Choisir une image</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: '#F0F9FF', borderColor: '#0EA5E9', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Ionicons name="information" size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: '#0EA5E9', fontSize: 14 }]}>Pourquoi vérifier mon identité?</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }}>
                • Les photographes amateurs peuvent utiliser la plateforme sans restriction{"\n"}
                • Les professionnels doivent fournir un SIRET valide{"\n"}
                • La vérification d'identité augmente la confiance des clients{"\n"}
                • Accès à des fonctionnalités premium pour les comptes vérifiés
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  uploadButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadedDocContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  uploadedDocImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  removeDocButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
});
