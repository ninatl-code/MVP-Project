import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterParti from '../../components/FooterParti';
import { LinearGradient } from 'expo-linear-gradient';

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
  photos?: string;
}

interface Stats {
  totalReservations: number;
  totalFavoris: number;
  totalCommandes: number;
}

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [villeNom, setVilleNom] = useState("");
  const [stats, setStats] = useState<Stats>({
    totalReservations: 0,
    totalFavoris: 0,
    totalCommandes: 0
  });
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    loadStats();
  }, []);

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
            await supabase.auth.signOut();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setFormData({
        nom: data.nom || '',
        email: data.email || '',
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
    setLoading(false);
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('client_id', user.id);

      const { data: favoris } = await supabase
        .from('favoris')
        .select('id')
        .eq('user_id', user.id);

      const { data: commandes } = await supabase
        .from('commandes')
        .select('id')
        .eq('client_id', user.id);

      setStats({
        totalReservations: reservations?.length || 0,
        totalFavoris: favoris?.length || 0,
        totalCommandes: commandes?.length || 0
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } else {
      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setEditMode(false);
      fetchProfile();
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
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
                {profile?.photos ? (
                  <Image source={{ uri: profile.photos }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{getInitials(profile?.nom || 'U')}</Text>
                  </View>
                )}
              </View>

              <View style={styles.nameSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{profile?.nom || 'Utilisateur'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Particulier</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="location" size={14} color="white" />
                    <Text style={styles.infoText}>{villeNom || 'Ville non renseignée'}</Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  {!editMode ? (
                    <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
                      <Ionicons name="create-outline" size={16} color={COLORS.text} />
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
          </View>
        </LinearGradient>

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
                    <Text style={styles.infoValue}>{profile?.email || 'Non renseigné'}</Text>
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
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
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
                  Une bonne présentation aide les prestataires à mieux comprendre vos attentes.
                </Text>
              </View>
            )}
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
      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  
  // Header gradient
  headerGradient: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 30 },
  headerContent: { gap: 20 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 16, borderWidth: 3, borderColor: 'white' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  
  nameSection: { flex: 1, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 24, fontWeight: 'bold', color: 'white', flex: 1 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editButton: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  editButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  saveButton: { backgroundColor: COLORS.success, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  
  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: 100, backgroundColor: COLORS.background, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  
  // Card
  card: { backgroundColor: COLORS.background, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
  // Info list
  infoList: { gap: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.backgroundLight, padding: 12, borderRadius: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.primary, marginBottom: 2 },
  infoValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  
  // Form
  formGroup: { gap: 12 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.backgroundLight },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  
  // Bio
  bioText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  bioInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.backgroundLight, minHeight: 120, textAlignVertical: 'top' },
  bioHint: { fontSize: 12, color: COLORS.textLight, marginTop: 8 },
  
  // Logout
  logoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  logoutSubtitle: {
    fontSize: 13,
    color: COLORS.textLight
  }
});
