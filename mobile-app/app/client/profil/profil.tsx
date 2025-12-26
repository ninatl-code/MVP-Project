import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B'
};

interface Profile {
  nom: string;
  email: string;
  telephone: string;
  bio: string;
  ville_id: string;
  avatar_url?: string;
}

export default function ClientProfil() {
  const router = useRouter();
  const { user, profileId, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [villeNom, setVilleNom] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalReservations: 0,
    totalDemandes: 0,
    totalDepenses: 0,
    totalAvis: 0
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchProfile();
    loadStats();
  }, [profileId]);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const loadStats = async () => {
    try {
      if (!profileId) return;

      // Get reservations for stats
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, montant_total, status')
        .eq('client_id', profileId);

      // Get avis for stats
      const { data: avis } = await supabase
        .from('avis')
        .select('id')
        .eq('reviewer_id', profileId);

      // Get demandes (service requests)
      const { data: demandes } = await supabase
        .from('demandes_client')
        .select('id')
        .eq('client_id', profileId);

      const totalReservations = reservations?.length || 0;
      const totalDemandes = demandes?.length || 0;
      
      const totalDepenses = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'completed'
      ).reduce((sum, r) => sum + (parseFloat(r.montant_total) || 0), 0) || 0;

      setStats({
        totalReservations,
        totalDemandes,
        totalDepenses,
        totalAvis: avis?.length || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const fetchProfile = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          nom: data.nom || '',
          email: data.email || user?.email || '',
          telephone: data.telephone || '',
          bio: data.bio || ''
        });

        if (data.ville_id) {
          const { data: villeData } = await supabase
            .from('villes')
            .select('ville')
            .eq('id', data.ville_id)
            .single();
          setVilleNom(villeData?.ville || '');
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nom: formData.nom,
          telephone: formData.telephone,
          bio: formData.bio
        })
        .eq('id', profileId);

      if (error) throw error;

      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setSaving(false);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        const imageUri = result.assets[0].uri;
        
        // Convert to base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });

        // Convert base64 to Uint8Array
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Upload to Supabase Storage
        const fileName = `profile_${profileId}_${Date.now()}.jpg`;
        const filePath = `photos/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, byteArray, {
            contentType: 'image/jpeg',
            upsert: true
          });

        let photoUrl = imageUri; // Fallback to local URI

        if (!uploadError && data) {
          // Get public URL if upload successful
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            photoUrl = publicUrlData.publicUrl;
          }
        }

        // Update profile with new photo URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: photoUrl })
          .eq('id', profileId);

        if (updateError) throw updateError;

        if (updateError) throw updateError;

        Alert.alert('Succès', 'Photo de profil mise à jour');
        fetchProfile();
      }
    } catch (error) {
      console.error('Erreur upload photo:', error);
      Alert.alert('Erreur', 'Impossible de télécharger la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{getInitials(profile?.nom || 'U')}</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.cameraButton}
                  onPress={pickProfilePhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={16} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.nameSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{profile?.nom || 'Utilisateur'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Client</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="location" size={14} color="white" />
                    <Text style={styles.infoText}>{villeNom || 'Localisation'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar" size={14} color="white" />
                    <Text style={styles.infoText}>{stats.totalReservations} réservations</Text>
                  </View>
                </View>

                {!editMode ? (
                  <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
                    <Ionicons name="create" size={16} color="white" />
                    <Text style={styles.editButtonText}>Modifier mon profil</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={16} color="white" />
                        <Text style={styles.saveButtonText}>Sauvegarder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Statistiques */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Mes statistiques</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: '#6366F1' }]}>
              <Ionicons name="calendar" size={20} color="#6366F1" />
              <Text style={styles.statValue}>{stats.totalReservations}</Text>
              <Text style={styles.statLabel}>Réservations</Text>
            </View>

            <View style={[styles.statCard, { borderColor: COLORS.success }]}>
              <Ionicons name="document-text" size={20} color={COLORS.success} />
              <Text style={styles.statValue}>{stats.totalDemandes}</Text>
              <Text style={styles.statLabel}>Demandes déposées</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
              <Ionicons name="cash" size={20} color="#F59E0B" />
              <Text style={[styles.statValue, { fontSize: 14 }]}>{formatCurrency(stats.totalDepenses)}</Text>
              <Text style={styles.statLabel}>Dépensé</Text>
            </View>

            <View style={[styles.statCard, { borderColor: COLORS.textLight }]}>
              <Ionicons name="star" size={20} color={COLORS.textLight} />
              <Text style={styles.statValue}>{stats.totalAvis}</Text>
              <Text style={styles.statLabel}>Avis donnés</Text>
            </View>
          </View>
        </View>

        {/* Informations personnelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
          </View>

          <View style={styles.card}>
            {!editMode ? (
              <View style={styles.infoList}>
                <View style={styles.infoCard}>
                  <Ionicons name="mail" size={20} color={COLORS.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{formData.email || 'Non renseigné'}</Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <Ionicons name="call" size={20} color={COLORS.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{profile?.telephone || 'Non renseigné'}</Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Ville</Text>
                    <Text style={styles.infoValue}>{villeNom || 'Non renseignée'}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <View style={styles.inputGroup}>
                  <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    value={formData.nom}
                    onChangeText={(text) => setFormData({ ...formData, nom: text })}
                    placeholder="Nom complet"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.email}
                    editable={false}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    value={formData.telephone}
                    onChangeText={(text) => setFormData({ ...formData, telephone: text })}
                    placeholder="Téléphone"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* À propos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>À propos de moi</Text>
          </View>

          <View style={styles.card}>
            {!editMode ? (
              <Text style={styles.bioText}>
                {profile?.bio || "Aucune description disponible. Cliquez sur 'Modifier mon profil' pour ajouter une présentation."}
              </Text>
            ) : (
              <View>
                <TextInput
                  style={styles.bioInput}
                  value={formData.bio}
                  onChangeText={(text) => setFormData({ ...formData, bio: text })}
                  placeholder="Parlez de vous, vos préférences, ce que vous recherchez..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={6}
                />
                <Text style={styles.bioHint}>
                  Une bonne présentation aide les photographes à mieux comprendre vos attentes.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Mes espaces</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/client/demandes/mes-demandes' as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#EDE7F6' }]}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>Mes demandes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/client/reservations/reservations' as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="calendar" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.actionText}>Mes réservations</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/client/Avis/avis-list' as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="star" size={24} color={COLORS.warning} />
                </View>
                <Text style={styles.actionText}>Mes avis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Déconnexion */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.sectionTitle}>Paramètres</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.logoutContainer} onPress={handleLogout}>
              <View style={styles.logoutLeft}>
                <View style={styles.logoutIconContainer}>
                  <Ionicons name="log-out-outline" size={24} color={COLORS.warning} />
                </View>
                <View>
                  <Text style={styles.logoutTitle}>Se déconnecter</Text>
                  <Text style={styles.logoutSubtitle}>Vous pourrez vous reconnecter à tout moment</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header avec gradient
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {},
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginRight: 10,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },

  // Statistiques
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Info cards (view mode)
  infoList: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Form (edit mode)
  formGroup: {
    gap: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputDisabled: {
    color: COLORS.textLight,
  },

  // Bio section
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },
  bioInput: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
  },
  bioHint: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Actions
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // Logout
  logoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
