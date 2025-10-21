import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';

export default function KPIsPrestataire() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReservations: 0,
    chiffreAffaires: 0,
    noteMoyenne: 0,
    totalAvis: 0,
    annoncesActives: 0,
    tauxConfirmation: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [reservations, annonces, avis] = await Promise.all([
      supabase.from('reservations').select('*, status, montant').eq('prestataire_id', user.id),
      supabase.from('annonces').select('id, actif, rate').eq('prestataire', user.id),
      supabase.from('avis').select('note').eq('prestataire_id', user.id)
    ]);

    const totalReservations = reservations.data?.length || 0;
    const reservationsConfirmees = reservations.data?.filter(r => r.status === 'confirmed' || r.status === 'paid' || r.status === 'completed') || [];
    const chiffreAffaires = reservationsConfirmees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
    const annoncesActives = annonces.data?.filter(a => a.actif).length || 0;
    const tauxConfirmation = totalReservations > 0 ? (reservationsConfirmees.length / totalReservations) * 100 : 0;
    
    const notesAvis = avis.data || [];
    const noteMoyenne = notesAvis.length > 0 ? notesAvis.reduce((sum, a) => sum + a.note, 0) / notesAvis.length : 0;

    setStats({
      totalReservations,
      chiffreAffaires,
      noteMoyenne: Math.round(noteMoyenne * 10) / 10,
      totalAvis: notesAvis.length,
      annoncesActives,
      tauxConfirmation: Math.round(tauxConfirmation)
    });

    setLoading(false);
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
        <Text style={styles.title}>📊 Mes Statistiques</Text>

        <View style={styles.grid}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{stats.chiffreAffaires.toFixed(2)} MAD</Text>
            <Text style={styles.statLabel}>Chiffre d'affaires</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValue}>{stats.totalReservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{stats.noteMoyenne}/5</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statValue}>{stats.totalAvis}</Text>
            <Text style={styles.statLabel}>Avis clients</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.statIcon}>📢</Text>
            <Text style={styles.statValue}>{stats.annoncesActives}</Text>
            <Text style={styles.statLabel}>Annonces actives</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E0F2F1' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{stats.tauxConfirmation}%</Text>
            <Text style={styles.statLabel}>Taux de confirmation</Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 24
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 24,
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
    marginBottom: 12
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  }
});
