import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigation } from 'expo-router';
import Header from '../../components/HeaderPresta';

export default function MenuPrestataire() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    reservations: 0,
    devis: 0,
    annonces: 0,
    messages: 0
  });
  const navigation = useNavigation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      (navigation as any).navigate('login');
      return;
    }

    setUser(authUser);

    // Charger les statistiques
    const [reservationsRes, devisRes, annoncesRes, messagesRes] = await Promise.all([
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('prestataire_id', authUser.id),
      supabase.from('devis').select('id', { count: 'exact', head: true }).eq('prestataire_id', authUser.id),
      supabase.from('annonces').select('id', { count: 'exact', head: true }).eq('prestataire', authUser.id),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('artist_id', authUser.id)
    ]);

    setStats({
      reservations: reservationsRes.count || 0,
      devis: devisRes.count || 0,
      annonces: annoncesRes.count || 0,
      messages: messagesRes.count || 0
    });

    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            (navigation as any).navigate('login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Espace Prestataire</Text>
          <Text style={styles.subtitle}>Bienvenue sur votre tableau de bord</Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E8EAF6' }]}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>{stats.reservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{stats.devis}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3CD' }]}>
            <Text style={styles.statIcon}>📢</Text>
            <Text style={styles.statValue}>{stats.annonces}</Text>
            <Text style={styles.statLabel}>Annonces</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statValue}>{stats.messages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        {/* Menu principal */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu principal</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/calendrier')}
          >
            <Text style={styles.menuIcon}>📅</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Planning</Text>
              <Text style={styles.menuSubtitle}>Gérer mon calendrier de réservations</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/prestations')}
          >
            <Text style={styles.menuIcon}>📢</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mes annonces</Text>
              <Text style={styles.menuSubtitle}>Gérer mes services et prestations</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/devis')}
          >
            <Text style={styles.menuIcon}>📝</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Devis</Text>
              <Text style={styles.menuSubtitle}>Consulter et répondre aux demandes</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/reservations')}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Réservations</Text>
              <Text style={styles.menuSubtitle}>Gérer mes réservations</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/messages')}
          >
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Messages</Text>
              <Text style={styles.menuSubtitle}>Communiquer avec mes clients</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/kpis')}
          >
            <Text style={styles.menuIcon}>📊</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Statistiques</Text>
              <Text style={styles.menuSubtitle}>Voir mes performances</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/profil')}
          >
            <Text style={styles.menuIcon}>👤</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mon profil</Text>
              <Text style={styles.menuSubtitle}>Modifier mes informations</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('prestataires/notification')}
          >
            <Text style={styles.menuIcon}>🔔</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Voir mes notifications</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.menuIcon}>🚪</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#EF4444' }]}>Déconnexion</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 24
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    padding: 16,
    paddingBottom: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16
  },
  menuContent: {
    flex: 1
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  menuArrow: {
    fontSize: 20,
    color: '#9CA3AF'
  },
  logoutButton: {
    borderBottomWidth: 0
  }
});
