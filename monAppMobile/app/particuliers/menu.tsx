import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FooterParti from '../../components/FooterParti';
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

interface Stats {
  totalReservations: number;
  totalFavoris: number;
  totalDevis: number;
  messagesNonLus: number;
}

export default function ParticularHomeMenu() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ nom: string; photos: string[] } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalReservations: 0,
    totalFavoris: 0,
    totalDevis: 0,
    messagesNonLus: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setUserId(user.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('nom, photos')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    // Charger les statistiques
    const [reservationsRes, favorisRes, devisRes, messagesRes] = await Promise.all([
      supabase.from('reservations').select('id', { count: 'exact' }).eq('client_id', user.id),
      supabase.from('favoris').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('devis').select('id', { count: 'exact' }).eq('particulier_id', user.id),
      supabase.from('conversations').select('id', { count: 'exact' }).eq('client_id', user.id).eq('lu', false)
    ]);

    setStats({
      totalReservations: reservationsRes.data?.length || 0,
      totalFavoris: favorisRes.data?.length || 0,
      totalDevis: devisRes.data?.length || 0,
      messagesNonLus: messagesRes.data?.length || 0
    });

    setLoading(false);
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
          style={styles.header}
        >
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{profile?.nom || 'Utilisateur'}</Text>
          <Text style={styles.subtitle}>Découvrez vos services de photographie</Text>
        </LinearGradient>

        {/* Statistiques en cartes */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E8F5E9', borderColor: COLORS.success }]}
            onPress={() => router.push('/particuliers/reservations')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{stats.totalReservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
            onPress={() => router.push('/particuliers/favoris')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="heart" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{stats.totalFavoris}</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#DBEAFE', borderColor: COLORS.info }]}
            onPress={() => router.push('/particuliers/devis')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={24} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{stats.totalDevis}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#EDE9FE', borderColor: COLORS.purple }]}
            onPress={() => router.push('/particuliers/messages')}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.statValue}>{stats.messagesNonLus}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Menu principal */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/particuliers/search')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="search" size={24} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Explorer les annonces</Text>
              <Text style={styles.menuSubtitle}>Trouvez le photographe idéal</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/particuliers/reservations')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mes réservations</Text>
              <Text style={styles.menuSubtitle}>Gérer mes rendez-vous</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/particuliers/devis')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mes devis</Text>
              <Text style={styles.menuSubtitle}>Consulter mes demandes</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/particuliers/favoris')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={24} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mes favoris</Text>
              <Text style={styles.menuSubtitle}>Voir mes annonces favorites</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/particuliers/profil')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="person" size={24} color={COLORS.purple} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mon profil</Text>
              <Text style={styles.menuSubtitle}>Gérer mes informations</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <FooterParti />
      <RealTimeNotifications userId={userId} triggerNotification={null} />
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

  // Menu
  menuSection: { marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.background, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, padding: 20, paddingBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  menuSubtitle: { fontSize: 14, color: COLORS.textLight }
});