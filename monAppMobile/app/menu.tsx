import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import FooterParti from '../components/FooterParti';
import FooterPresta from '../components/FooterPresta';

export default function Menu() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'particulier' | 'prestataire' | null>(null);
  const [stats, setStats] = useState({
    reservations: 0,
    devis: 0,
    annonces: 0,
    messages: 0
  });
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    
    // Récupérer l'utilisateur authentifié
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      router.replace('/login');
      return;
    }

    setUser(authUser);

    // Récupérer le profil avec le rôle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, nom, photos')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      console.error('Erreur profil:', profileError);
      router.replace('/login');
      return;
    }

    setUserRole(profile.role);

    // Charger les statistiques selon le rôle
    if (profile.role === 'prestataire') {
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
    } else {
      // Particulier
      const [devisRes, reservationsRes] = await Promise.all([
        supabase.from('devis').select('id', { count: 'exact', head: true }).eq('particulier_id', authUser.id),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('particulier_id', authUser.id)
      ]);

      setStats({
        reservations: reservationsRes.count || 0,
        devis: devisRes.count || 0,
        annonces: 0,
        messages: 0
      });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#635BFF" />
      </View>
    );
  }

  if (!userRole) {
    return null;
  }

  // Rendu conditionnel selon le rôle
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {userRole === 'prestataire' ? 'Tableau de Bord Prestataire' : 'Mon Espace'}
          </Text>
          <Text style={styles.subtitle}>
            Bonjour, {user?.email?.split('@')[0]}
          </Text>
        </View>

        {/* Cards de statistiques */}
        <View style={styles.statsGrid}>
          {userRole === 'prestataire' ? (
            <>
              <StatCard 
                title="Réservations" 
                value={stats.reservations} 
                icon="📅"
                onPress={() => router.push('/prestataires/reservations')}
              />
              <StatCard 
                title="Devis" 
                value={stats.devis} 
                icon="📝"
                onPress={() => router.push('/prestataires/devis')}
              />
              <StatCard 
                title="Annonces" 
                value={stats.annonces} 
                icon="📢"
                onPress={() => router.push('/prestataires/annonces')}
              />
              <StatCard 
                title="Messages" 
                value={stats.messages} 
                icon="💬"
                onPress={() => router.push('/prestataires/messages')}
              />
            </>
          ) : (
            <>
              <StatCard 
                title="Mes Devis" 
                value={stats.devis} 
                icon="📝"
                onPress={() => router.push('/particuliers/search')}
              />
              <StatCard 
                title="Mes Réservations" 
                value={stats.reservations} 
                icon="📅"
                onPress={() => router.push('/particuliers/search')}
              />
              <StatCard 
                title="Rechercher" 
                value="→" 
                icon="🔍"
                onPress={() => router.push('/particuliers/search')}
              />
              <StatCard 
                title="Mon Profil" 
                value="→" 
                icon="👤"
                onPress={() => router.push('/particuliers/profil')}
              />
            </>
          )}
        </View>

        {/* Actions rapides */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          {userRole === 'prestataire' ? (
            <>
              <ActionButton 
                title="📊 Voir les KPIs" 
                onPress={() => router.push('/prestataires/kpis')}
              />
              <ActionButton 
                title="📅 Calendrier" 
                onPress={() => router.push('/prestataires/calendrier')}
              />
              <ActionButton 
                title="💰 Factures" 
                onPress={() => router.push('/prestataires/invoice')}
              />
            </>
          ) : (
            <>
              <ActionButton 
                title="🔍 Rechercher un service" 
                onPress={() => router.push('/particuliers/search')}
              />
              <ActionButton 
                title="💬 Mes messages" 
                onPress={() => router.push('/particuliers/messages')}
              />
              <ActionButton 
                title="🔔 Notifications" 
                onPress={() => router.push('/particuliers/notification')}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer adapté au rôle */}
      {userRole === 'prestataire' ? <FooterPresta /> : <FooterParti />}
    </SafeAreaView>
  );
}

// Composant StatCard
function StatCard({ title, value, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

// Composant ActionButton
function ActionButton({ title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{title}</Text>
      <Text style={styles.actionButtonArrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour le footer
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#635BFF',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#222',
  },
  actionButtonArrow: {
    fontSize: 18,
    color: '#635BFF',
  },
});