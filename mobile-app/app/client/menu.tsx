import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface Stats {
  demandes: number;
  devis: number;
  reservations: number;
  avis: number;
}

export default function ClientMenu() {
  const router = useRouter();
  const { user, profileId, activeRole, availableProfiles, switchProfile, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({ demandes: 0, devis: 0, reservations: 0, avis: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadStats = async () => {
    if (!profileId) return;

    try {
      // Compter les demandes
      const { count: demandesCount } = await supabase
        .from('demandes_client')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profileId);

      // Compter les devis
      const { count: devisCount } = await supabase
        .from('devis')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profileId);

      // Compter les réservations
      const { count: reservationsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profileId);

      // Compter les avis donnés
      const { count: avisCount } = await supabase
        .from('avis')
        .select('*', { count: 'exact', head: true })
        .eq('auteur_id', profileId);

      setStats({
        demandes: demandesCount || 0,
        devis: devisCount || 0,
        reservations: reservationsCount || 0,
        avis: avisCount || 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [profileId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleSwitchProfile = async () => {
    const photographeProfile = availableProfiles.find(p => p.role === 'photographe');
    if (photographeProfile) {
      await switchProfile(photographeProfile.id);
      setShowSwitchModal(false);
      router.replace('/photographe/menu');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutModal(false);
    router.replace('/auth/login');
  };

  const hasMultipleProfiles = availableProfiles.length > 1;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#130183" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#130183']} />
        }
      >
        {/* Header compact avec gradient */}
        <LinearGradient
          colors={['#130183', '#5C6BC0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Bonjour 👋</Text>
              <Text style={styles.headerTitle}>Mon espace</Text>
            </View>
            
            {hasMultipleProfiles && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setShowSwitchModal(true)}
              >
                <Ionicons name="swap-horizontal" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats compactes */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.demandes}</Text>
              <Text style={styles.statLabel}>Demandes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.devis}</Text>
              <Text style={styles.statLabel}>Devis</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.reservations}</Text>
              <Text style={styles.statLabel}>Réservations</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section "Comment trouver un photographe" */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.howItWorksTitle}>💡 Comment trouver un photographe ?</Text>
          <Text style={styles.howItWorksSubtitle}>Choisissez la méthode qui vous convient</Text>
          
          {/* Option 1 - Poster une demande (Recommandé) */}
          <TouchableOpacity
            style={styles.primaryOptionCard}
            onPress={() => router.push('/client/demandes/create-demande' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>⭐ Recommandé</Text>
            </View>
            <View style={styles.optionHeader}>
              <View style={styles.primaryIconCircle}>
                <Ionicons name="megaphone" size={26} color="#fff" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.primaryOptionTitle}>Poster une demande</Text>
                <Text style={styles.primaryOptionSubtitle}>Recevez plusieurs devis</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
            </View>
            <View style={styles.optionBenefits}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.benefitText}>Gratuit et sans engagement</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.benefitText}>Les photographes viennent à vous</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.benefitText}>Comparez facilement les offres</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2 - Rechercher */}
          <TouchableOpacity
            style={styles.secondaryOptionCard}
            onPress={() => router.push('/client/search/search' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.optionHeader}>
              <View style={styles.secondaryIconCircle}>
                <Ionicons name="search" size={24} color="#130183" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.secondaryOptionTitle}>Rechercher activement</Text>
                <Text style={styles.secondaryOptionSubtitle}>Parcourez les profils</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="#130183" />
            </View>
            <View style={styles.optionBenefits}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#5C6BC0" />
                <Text style={[styles.benefitText, { color: '#333' }]}>Consultez les portfolios</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#5C6BC0" />
                <Text style={[styles.benefitText, { color: '#333' }]}>Filtres détaillés (budget, lieu...)</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color="#5C6BC0" />
                <Text style={[styles.benefitText, { color: '#333' }]}>Contactez directement</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Menu rapide compact */}
        <View style={styles.quickMenuSection}>
          <Text style={styles.sectionTitle}>Mes espaces</Text>
          
          <View style={styles.compactGrid}>
            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/client/demandes/mes-demandes' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="document-text-outline" size={22} color="#130183" />
                {stats.demandes > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.demandes}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactMenuText}>Demandes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/client/devis/devis-list' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="receipt-outline" size={22} color="#130183" />
                {stats.devis > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.devis}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactMenuText}>Devis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/client/reservations/reservations-list' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="calendar-outline" size={22} color="#130183" />
                {stats.reservations > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.reservations}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactMenuText}>Réservations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/shared/messages/conversations' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="chatbubbles-outline" size={22} color="#130183" />
              </View>
              <Text style={styles.compactMenuText}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/client/packages/packages-list' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="cube-outline" size={22} color="#130183" />
              </View>
              <Text style={styles.compactMenuText}>Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactMenuItem}
              onPress={() => router.push('/client/Avis/avis-list' as any)}
            >
              <View style={styles.compactIconContainer}>
                <Ionicons name="star-outline" size={22} color="#130183" />
                {stats.avis > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.avis}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactMenuText}>Avis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Déconnexion */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF5350" />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de changement de profil */}
      <Modal
        visible={showSwitchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="swap-horizontal" size={32} color="#130183" />
              <Text style={styles.modalTitle}>Changer de profil</Text>
            </View>
            <Text style={styles.modalText}>
              Voulez-vous passer en mode Photographe ?
            </Text>
            <Text style={styles.modalSubtext}>
              Vous pourrez accéder aux demandes, créer des devis et gérer vos réservations.
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
                onPress={handleSwitchProfile}
              >
                <Ionicons name="checkmark" size={20} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.modalButtonTextConfirm}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de déconnexion */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="log-out" size={32} color="#EF5350" />
              <Text style={styles.modalTitle}>Déconnexion</Text>
            </View>
            <Text style={styles.modalText}>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: '#EF5350' }]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonTextConfirm}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header compact
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats compactes
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Section "Comment ça marche"
  howItWorksSection: {
    padding: 20,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  howItWorksSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },

  // Option principale (poster une demande)
  primaryOptionCard: {
    backgroundColor: '#130183',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#130183',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  primaryOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  primaryOptionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  optionBenefits: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
  },

  // Option secondaire (rechercher)
  secondaryOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: '#E8EAF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  secondaryOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  secondaryOptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },

  // Menu rapide compact
  quickMenuSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 14,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactMenuItem: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  compactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF5350',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  compactMenuText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  // Déconnexion
  logoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#EF5350',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF5350',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
    elevation: 2,
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modalButtonConfirm: {
    backgroundColor: '#130183',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
