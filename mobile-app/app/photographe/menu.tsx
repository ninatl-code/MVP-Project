import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '@/components/photographe/FooterPresta';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

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
  info: '#3B82F6',
  purple: '#8B5CF6'
};

export default function MenuPrestataire() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    reservations: 0,
    demandes_vues: 0,
    devis_envoyes: 0,
    devis_acceptes: 0,
    messages: 0,
    chiffreAffaires: 0,
    tauxAcceptation: 0
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [missingSteps, setMissingSteps] = useState<string[]>([]);
  const router = useRouter();
  const { availableProfiles, switchProfile, profileId } = useAuth();

  // Gérer le StatusBar - blanc sur le fond dégradé
  useStatusBarStyle('light-content', '#5C6BC0');

  useEffect(() => {
    fetchData();
  }, []);

  const checkProfileCompleteness = async (userId: string) => {
    try {
      const { data: profilPhoto, error } = await supabase
        .from('profils_photographe')
        .select('bio, specialisations, portfolio_photos, rayon_deplacement_km, tarifs_indicatifs')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur vérification profil:', error);
        return;
      }

      const missing: string[] = [];

      if (!profilPhoto) {
        missing.push('Créer votre profil photographe');
      } else {
        if (!profilPhoto.bio || profilPhoto.bio.length < 50) {
          missing.push('Compléter votre biographie (min. 50 caractères)');
        }
        if (!profilPhoto.specialisations || profilPhoto.specialisations.length === 0) {
          missing.push('Sélectionner vos spécialisations');
        }
        if (!profilPhoto.portfolio_photos || profilPhoto.portfolio_photos.length < 3) {
          missing.push('Ajouter au moins 3 photos à votre portfolio');
        }
        if (!profilPhoto.rayon_deplacement_km || profilPhoto.rayon_deplacement_km <= 0) {
          missing.push('Définir votre rayon de déplacement');
        }
        if (!profilPhoto.tarifs_indicatifs || Object.keys(profilPhoto.tarifs_indicatifs).length === 0) {
          missing.push('Renseigner vos tarifs indicatifs');
        }
      }

      setProfileComplete(missing.length === 0);
      setMissingSteps(missing);
    } catch (error) {
      console.error('Erreur checkProfileCompleteness:', error);
    }
  };

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/auth/login');
      return;
    }

    setUserId(authUser.id);

    // Récupérer le profil + profil photographe
    const { data: profileData } = await supabase
      .from('profiles')
      .select('nom, photos')
      .eq('id', authUser.id)
      .single();
    setProfile(profileData);

    // Vérifier profil photographe complet
    await checkProfileCompleteness(authUser.id);

    // Charger les statistiques
    const [reservationsRes, devisRes, demandesRes, messagesRes] = await Promise.all([
      supabase.from('reservations').select('id, montant_total, statut_reservation').eq('photographe_id', authUser.id),
      supabase.from('devis').select('id, statut').eq('photographe_id', authUser.id),
      supabase.from('demandes_client').select('id, photographes_notifies').contains('photographes_notifies', [authUser.id]),
      supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', authUser.id).eq('lu', false)
    ]);

    // Calculer le CA
    const reservationsPayees = reservationsRes.data?.filter(r => 
      r.statut_reservation === 'confirmee' || r.statut_reservation === 'en_cours' || r.statut_reservation === 'terminee'
    ) || [];
    const ca = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant_total) || 0), 0);

    // Statistiques devis
    const devisData = devisRes.data || [];
    const devisAcceptes = devisData.filter(d => d.statut === 'accepte').length;
    const tauxAcceptation = devisData.length > 0 ? (devisAcceptes / devisData.length) * 100 : 0;

    setStats({
      reservations: reservationsRes.data?.length || 0,
      demandes_vues: demandesRes.data?.length || 0,
      devis_envoyes: devisData.length,
      devis_acceptes: devisAcceptes,
      messages: messagesRes.data?.length || 0,
      chiffreAffaires: ca,
      tauxAcceptation: Math.round(tauxAcceptation)
    });

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterPresta />
      </View>
    );
  }

  const handleSwitchProfile = async (newProfileId: string) => {
    await switchProfile(newProfileId);
    setShowSwitchModal(false);
    
    // Rediriger vers la page appropriée
    const newProfile = availableProfiles.find(p => p.id === newProfileId);
    if (newProfile?.role === 'particulier') {
      router.replace('/client/search/search');
    }
  };

  // Vérifier si l'utilisateur a plusieurs profils
  const hasMultipleProfiles = availableProfiles.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>Tableau de bord</Text>
              <Text style={styles.userName} numberOfLines={2}>{profile?.nom || 'Prestataire'}</Text>
            </View>
            {hasMultipleProfiles && (
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={() => setShowSwitchModal(true)}
              >
                <Ionicons name="swap-horizontal" size={20} color="white" />
                <Text style={styles.switchButtonText}>Passer en mode Client</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Section profil incomplet */}
        {!profileComplete && missingSteps.length > 0 && (
          <LinearGradient
            colors={['#FFF3CD', '#FFE8A3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.warningCard}
          >
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={24} color={COLORS.warning} />
              <Text style={styles.warningTitle}>Profil incomplet</Text>
            </View>
            <Text style={styles.warningSubtitle}>
              Complétez votre profil pour recevoir plus de demandes
            </Text>
            <View style={styles.missingSteps}>
              {missingSteps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => router.push('/photographe/profil/profil-complet')}
            >
              <Text style={styles.completeButtonText}>Compléter mon profil</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.warning} />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Statistiques en cartes */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E8F5E9', borderColor: COLORS.success }]}
            onPress={() => router.push('/prestataires/reservations')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{stats.reservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#DBEAFE', borderColor: COLORS.info }]}
            onPress={() => router.push('/photographe/demandes')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="mail" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{stats.demandes_vues}</Text>
            <Text style={styles.statLabel}>Demandes vues</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: COLORS.warning }]}
            onPress={() => router.push('/photographe/devis/devis-list' as any)}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.devis_envoyes}</Text>
            <Text style={styles.statLabel}>Devis envoyés</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#EDE9FE', borderColor: COLORS.purple }]}
            onPress={() => router.push('/photographe/calendar/calendrier')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{stats.devis_acceptes}</Text>
            <Text style={styles.statLabel}>Planning</Text>
          </TouchableOpacity>
        </View>

        {/* Carte CA */}
        <View style={styles.caSection}>
          <LinearGradient
            colors={[COLORS.success, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.caCard}
          >
            <View style={styles.caHeader}>
              <Ionicons name="trending-up" size={28} color="white" />
              <Text style={styles.caTitle}>Chiffre d'affaires</Text>
            </View>
            <Text style={styles.caValue}>{formatCurrency(stats.chiffreAffaires)}</Text>
            <Text style={styles.caSubtitle}>Total des réservations payées</Text>
          </LinearGradient>
        </View>

        {/* Section Gestion */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Gestion</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/media-library' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="images" size={24} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Médiathèque</Text>
              <Text style={styles.menuSubtitle}>Gérer mes photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/prestataires/reviews-dashboard' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Avis clients</Text>
              <Text style={styles.menuSubtitle}>Gérer ma réputation</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Section Finances */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Finances</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/invoice' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="receipt" size={24} color={COLORS.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Factures</Text>
              <Text style={styles.menuSubtitle}>Générer et consulter</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/pricing-rules' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetag" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Règles de tarification</Text>
              <Text style={styles.menuSubtitle}>Prix personnalisés</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/prestataires/remboursements' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="card" size={24} color={COLORS.purple} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Remboursements</Text>
              <Text style={styles.menuSubtitle}>Historique des paiements</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Section Paramètres */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Paramètres</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/ma-localisation' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="location" size={24} color={COLORS.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Ma localisation</Text>
              <Text style={styles.menuSubtitle}>Zones d'intervention</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/instant-booking-settings' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="flash" size={24} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Réservation instantanée</Text>
              <Text style={styles.menuSubtitle}>Paramètres</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <FooterPresta />
      <RealTimeNotifications 
        userId={userId} 
        userRole="prestataire"
        triggerNotification={null}
        onNotificationCountChange={setNotificationCount}
      />

      {/* Modal de confirmation de changement de profil */}
      <Modal
        visible={showSwitchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="swap-horizontal" size={32} color={COLORS.accent} />
              <Text style={styles.modalTitle}>Changer de profil</Text>
            </View>
            <Text style={styles.modalText}>
              Voulez-vous passer en mode Client ?
            </Text>
            <Text style={styles.modalSubtext}>
              Vous pourrez revenir en mode Photographe à tout moment.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSwitchModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  const clientProfile = availableProfiles.find(p => p.role === 'particulier');
                  if (clientProfile) handleSwitchProfile(clientProfile.id);
                }}
              >
                <Ionicons name="checkmark" size={20} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.modalButtonTextConfirm}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { padding: 24, paddingTop: 40, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTextContainer: { flex: 1 },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  userName: { fontSize: 26, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', flex: 1, flexWrap: 'wrap' },
  
  // Switch Button
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1
  },
  modalText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22
  },
  modalSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
    lineHeight: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  modalButtonCancel: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.accent
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },

  // Warning Card (Profil incomplet)
  warningCard: {
    margin: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  warningSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  missingSteps: {
    gap: 10,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.warning,
  },

  // Stats
  statsSection: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: 160, backgroundColor: COLORS.background, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIconContainer: { marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },

  // CA Card
  caSection: { paddingHorizontal: 16, marginBottom: 16 },
  caCard: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  caHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  caTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
  caValue: { fontSize: 40, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  caSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },

  // Menu
  menuSection: { marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.background, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, padding: 20, paddingBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  menuSubtitle: { fontSize: 14, color: COLORS.textLight }
});
