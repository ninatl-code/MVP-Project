import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '../../components/FooterPresta';
import RealTimeNotifications from '../../components/RealTimeNotifications';

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
    devis: 0,
    annonces: 0,
    messages: 0,
    chiffreAffaires: 0
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/login');
      return;
    }

    setUserId(authUser.id);

    // Récupérer le profil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('nom, photos')
      .eq('id', authUser.id)
      .single();
    setProfile(profileData);

    // Charger les statistiques
    const [reservationsRes, devisRes, annoncesRes, messagesRes] = await Promise.all([
      supabase.from('reservations').select('id, montant, status').eq('prestataire_id', authUser.id),
      supabase.from('devis').select('id', { count: 'exact' }).eq('prestataire_id', authUser.id),
      supabase.from('annonces').select('id', { count: 'exact' }).eq('prestataire', authUser.id),
      supabase.from('conversations').select('id', { count: 'exact' }).eq('artist_id', authUser.id).eq('lu', false)
    ]);

    // Calculer le CA
    const reservationsPayees = reservationsRes.data?.filter(r => r.status === 'paid' || r.status === 'confirmed') || [];
    const ca = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

    setStats({
      reservations: reservationsRes.data?.length || 0,
      devis: devisRes.data?.length || 0,
      annonces: annoncesRes.data?.length || 0,
      messages: messagesRes.data?.length || 0,
      chiffreAffaires: ca
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
          <Text style={styles.greeting}>Tableau de bord</Text>
          <Text style={styles.userName}>{profile?.nom || 'Prestataire'}</Text>
          <Text style={styles.subtitle}>Gérez votre activité en un clin d'œil</Text>
        </LinearGradient>

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
            onPress={() => router.push('/prestataires/devis')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{stats.devis}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: COLORS.warning }]}
            onPress={() => router.push('/prestataires/prestations')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="megaphone" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.annonces}</Text>
            <Text style={styles.statLabel}>Annonces</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#EDE9FE', borderColor: COLORS.purple }]}
            onPress={() => router.push('/prestataires/messages')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{stats.messages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
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
            onPress={() => router.push('/prestataires/calendrier')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Planning</Text>
              <Text style={styles.menuSubtitle}>Gérer mon calendrier</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/prestations')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="megaphone" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mes annonces</Text>
              <Text style={styles.menuSubtitle}>Gérer mes services</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/devis')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="document-text" size={24} color={COLORS.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Devis</Text>
              <Text style={styles.menuSubtitle}>Répondre aux demandes</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/reservations')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.purple} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Réservations</Text>
              <Text style={styles.menuSubtitle}>Gérer mes rendez-vous</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

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
            onPress={() => router.push('/prestataires/kpis' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="stats-chart" size={24} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Tableau de bord</Text>
              <Text style={styles.menuSubtitle}>Statistiques et KPIs</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

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
            onPress={() => router.push('/prestataires/profil')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="person" size={24} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mon profil</Text>
              <Text style={styles.menuSubtitle}>Gérer mes informations</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/prestataires/notification-settings' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="notifications" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Préférences</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/prestataires/integrations' as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="link" size={24} color={COLORS.purple} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Intégrations</Text>
              <Text style={styles.menuSubtitle}>Calendrier, paiements...</Text>
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
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  userName: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },

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
