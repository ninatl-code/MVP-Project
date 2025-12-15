import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Image, Alert } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import FooterPresta from '@/components/photographe/FooterPresta';

export default function ProfilPhotographe() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({ 
    totalAnnonces: 0, 
    totalReservations: 0, 
    chiffreAffaires: 0, 
    noteMoyenne: 0, 
    totalVues: 0 
  });
  const [villeNom, setVilleNom] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    loadStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Aucun utilisateur authentifié');
        router.replace('/auth/login');
        return;
      }

      setUserId(user.id);
      console.log('Récupération du profil pour user:', user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe')
        .maybeSingle();

      if (error) {
        console.error('Erreur Supabase:', error.message);
      }

      if (data) {
        console.log('Profil trouvé:', data);
        setProfile(data);
        
        // Load photographer details from profils_photographe
        const { data: photoData } = await supabase
          .from('profils_photographe')
          .select('bio, specialisations, annees_experience, tarifs_indicatifs, rayon_deplacement_km')
          .eq('id', user.id)
          .maybeSingle();

        if (photoData) {
          setProfile(prev => ({
            ...prev,
            ...photoData
          }));
        }
        
        if (data.ville_id) {
          const { data: villeData } = await supabase
            .from('villes')
            .select('ville')
            .eq('id', data.ville_id)
            .maybeSingle();
          setVilleNom(villeData?.ville || '');
        }
      } else {
        console.warn('Aucun profil trouvé pour cet utilisateur');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get reservations and avis for stats
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, montant_total, status')
        .eq('photographe_id', user.id);

      const { data: avis } = await supabase
        .from('avis')
        .select('note_globale')
        .eq('reviewee_id', user.id);

      const totalReservations = reservations?.length || 0;
      const reservationsPayees = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'confirmed' || r.status === 'completed'
      ) || [];
      
      const chiffreAffaires = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant_total) || 0), 0);
      
      const noteMoyenneNum = avis && avis.length > 0 ? 
        avis.reduce((sum, a) => sum + (a.note_globale || 0), 0) / avis.length : 0;

      setStats({
        totalAnnonces: totalReservations,
        totalReservations: totalReservations,
        chiffreAffaires: chiffreAffaires,
        noteMoyenne: Math.round(noteMoyenneNum * 10) / 10,
        totalVues: avis?.length || 0 // Use review count instead
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

  const checkAndConfigureSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Aucun utilisateur connecté');
        return;
      }

      // Vérifier la configuration du compte
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, telephone, assurance_pro, role')
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe')
        .maybeSingle();

      if (profileError) {
        Alert.alert('Erreur', `Erreur de vérification: ${profileError.message}`);
        return;
      }

      if (!profileData) {
        Alert.alert('Attention', 'Profil photographe non trouvé. Veuillez créer votre profil complet.');
        router.push('/photographe/profil/profil-complet');
        return;
      }

      // Vérifications de configuration
      const checklist = {
        email: !!user.email,
        telephone: !!profileData.telephone,
        assurance: !!profileData.assurance_pro,
        profileComplet: !!profileData.id
      };

      const isComplete = Object.values(checklist).every(v => v);

      if (isComplete) {
        Alert.alert('✓ Configuration complète', 'Votre compte est entièrement configuré');
      } else {
        const missing = Object.entries(checklist)
          .filter(([_, v]) => !v)
          .map(([k]) => {
            switch(k) {
              case 'email': return 'Email';
              case 'telephone': return 'Téléphone';
              case 'assurance': return 'Assurance professionnelle';
              case 'profileComplet': return 'Profil complet';
              default: return k;
            }
          })
          .join(', ');

        Alert.alert(
          'Configuration incomplète',
          `Informations manquantes:\n${missing}`,
          [
            { text: 'Annuler', onPress: () => {} },
            { text: 'Compléter', onPress: () => router.push('/photographe/profil/profil-complet') }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur vérification Supabase:', error);
      Alert.alert('Erreur', 'Impossible de vérifier la configuration');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Profil non trouvé</Text>
          <Text style={styles.debugText}>ID: {userId?.substring(0, 8)}...</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/photographe/profil/profil-complet')}
          >
            <Text style={styles.editButtonText}>Créer mon profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            {/* Avatar et nom */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {profile?.photos ? (
                  <Image source={{ uri: profile.photos }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{getInitials(profile?.nom || 'U')}</Text>
                  </View>
                )}
                <View style={styles.starBadge}>
                  <Ionicons name="star" size={16} color="#FFA500" />
                </View>
                <TouchableOpacity 
                  style={styles.editAvatarButton}
                  onPress={() => router.push('/photographe/profil/profil-complet')}
                >
                  <Ionicons name="camera" size={12} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.nameSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{profile?.nom || 'Utilisateur'}</Text>
                  <View style={[styles.roleBadge, { 
                    backgroundColor: profile?.statut_validation === 'pro' ? '#10B981' : 
                                    profile?.statut_validation === 'amateur' ? '#3B82F6' : 
                                    profile?.statut_validation === 'verifie' ? '#F59E0B' : '#888'
                  }]}>
                    <Text style={styles.roleBadgeText}>
                      {profile?.statut_validation === 'pro' ? 'Pro' : 
                       profile?.statut_validation === 'amateur' ? 'Amateur' :
                       profile?.statut_validation === 'verifie' ? 'Vérifié' : 'En attente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="location" size={14} color="white" />
                    <Text style={styles.infoText}>{profile?.ville || villeNom || 'Localisation'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="compass" size={14} color="white" />
                    <Text style={styles.infoText}>{profile?.rayon_deplacement_km || 20} km</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="star" size={14} color="white" />
                    <Text style={styles.infoText}>{stats.noteMoyenne}/5</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => router.push('/photographe/profil/profil-complet')}
                >
                  <Ionicons name="create" size={16} color="white" />
                  <Text style={styles.editButtonText}>Modifier mon profil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Statistiques */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Mes performances</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: COLORS.primary }]}>
              <Ionicons name="briefcase" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{stats.totalReservations}</Text>
              <Text style={styles.statLabel}>Prestations</Text>
            </View>

            <View style={[styles.statCard, { borderColor: COLORS.success }]}>
              <Ionicons name="cash" size={20} color={COLORS.success} />
              <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(stats.chiffreAffaires)}</Text>
              <Text style={styles.statLabel}>CA Total</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#6366F1' }]}>
              <Ionicons name="calendar" size={20} color="#6366F1" />
              <Text style={styles.statValue}>{stats.totalReservations}</Text>
              <Text style={styles.statLabel}>Réservations</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.noteMoyenne}/5</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>

            <View style={[styles.statCard, { borderColor: COLORS.textLight }]}>
              <Ionicons name="chatbox-ellipses" size={20} color={COLORS.textLight} />
              <Text style={styles.statValue}>{stats.totalVues}</Text>
              <Text style={styles.statLabel}>Avis</Text>
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
          </View>
        </View>

        {/* À propos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>À propos de moi</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.bioText}>
              {profile?.bio || "Aucune description disponible. Cliquez sur 'Modifier mon profil' pour ajouter une présentation."}
            </Text>
          </View>
        </View>
        {/* Détails professionnels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Détails professionnels</Text>
          </View>

          <View style={styles.card}>
            {profile?.annees_experience && (
              <View style={styles.infoCard}>
                <Ionicons name="time" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Expérience</Text>
                  <Text style={styles.infoValue}>{profile.annees_experience} ans</Text>
                </View>
              </View>
            )}

            {profile?.specialisations && Array.isArray(profile.specialisations) && profile.specialisations.length > 0 && (
              <View style={styles.infoCard}>
                <Ionicons name="camera" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Spécialisations</Text>
                  <Text style={styles.infoValue}>{profile.specialisations.join(', ')}</Text>
                </View>
              </View>
            )}

            {profile?.tarifs_indicatifs && (
              <View style={styles.infoCard}>
                <Ionicons name="cash" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tarifs indicatifs</Text>
                  <Text style={styles.infoValue}>
                    {profile.tarifs_indicatifs.min}€ - {profile.tarifs_indicatifs.max}€
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
        {/* Réseaux sociaux */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Mes réseaux sociaux</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.socialList}>
              {profile?.instagram && (
                <View style={styles.socialItem}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  <Text style={styles.socialText}>{profile.instagram}</Text>
                </View>
              )}
              {profile?.facebook && (
                <View style={styles.socialItem}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  <Text style={styles.socialText}>{profile.facebook}</Text>
                </View>
              )}
              {profile?.linkedin && (
                <View style={styles.socialItem}>
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                  <Text style={styles.socialText}>{profile.linkedin}</Text>
                </View>
              )}
              {profile?.site_web && (
                <View style={styles.socialItem}>
                  <Ionicons name="globe-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.socialText}>{profile.site_web}</Text>
                </View>
              )}
              {!profile?.instagram && !profile?.facebook && !profile?.linkedin && !profile?.site_web && (
                <Text style={styles.emptyText}>Aucun réseau social configuré</Text>
              )}
            </View>
          </View>
        </View>

        {/* Configuration Stripe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Compte Stripe</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.stripeInfo}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.stripeInfoText}>
                Configurez votre compte Stripe pour recevoir vos paiements
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.stripeButton}
              onPress={() => router.push('/photographe/integrations' as any)}
            >
              <Ionicons name="settings" size={20} color="white" />
              <Text style={styles.stripeButtonText}>Configurer Stripe</Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <View style={styles.stripeStatus}>
              <Text style={styles.stripeStatusLabel}>Statut:</Text>
              <View style={styles.stripeStatusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.stripeStatusText}>Non configuré</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 20 },
  headerGradient: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 30 },
  headerContent: { gap: 20 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 16, borderWidth: 3, borderColor: 'white' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  starBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: 'white', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, borderRadius: 12, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  nameSection: { flex: 1, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 24, fontWeight: 'bold', color: 'white', flex: 1 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  editButton: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  editButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: 100, backgroundColor: COLORS.background, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  card: { backgroundColor: COLORS.background, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoList: { gap: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.backgroundLight, padding: 12, borderRadius: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.primary, marginBottom: 2 },
  infoValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  bioText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  socialList: { gap: 12 },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.backgroundLight, padding: 12, borderRadius: 12 },
  socialText: { fontSize: 15, color: COLORS.text, flex: 1 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, fontSize: 14, paddingVertical: 20 },
  errorText: { color: COLORS.red, fontSize: 16, fontWeight: '600' },
  debugText: { color: COLORS.textLight, fontSize: 12, marginTop: 8 },
  verificationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  verificationButtonText: { fontSize: 16, fontWeight: '600', color: 'white', flex: 1 },
  stripeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.backgroundLight, padding: 12, borderRadius: 12, marginBottom: 16 },
  stripeInfoText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  stripeButton: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 12, marginBottom: 16 },
  stripeButtonText: { fontSize: 16, fontWeight: '600', color: 'white', flex: 1 },
  stripeStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripeStatusLabel: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  stripeStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.backgroundLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  stripeStatusText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
});
