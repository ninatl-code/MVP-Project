import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import FooterPresta from '../../components/FooterPresta';

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171'
};

export default function KPIsPrestataire() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois');
  const [stats, setStats] = useState({
    // Métriques principales
    caJour: 0,
    caSemaine: 0,
    caMois: 0,
    caAnnee: 0,
    totalReservations: 0,
    tauxConversion: 0,
    tauxAnnulation: 0,
    panierMoyen: 0,
    
    // Clients
    totalClients: 0,
    clientsNouveaux: 0,
    clientsRecurrents: 0,
    
    // Comparaison
    caMoisActuel: 0,
    caMoisPrecedent: 0,
    evolutionPourcent: 0,
    
    // Avis
    noteMoyenne: 0,
    totalAvis: 0,
  });

  const [chartData, setChartData] = useState({
    caParMois: [] as number[],
    moisLabels: [] as string[],
    servicesPopulaires: [] as any[],
    statutsRepartition: [] as any[]
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch des métriques principales
      const [
        reservations,
        avis,
        caParMoisData,
        servicesData,
        clientsData,
        comparaisonData
      ] = await Promise.all([
        supabase.from('reservations').select('*, status, montant, date').eq('prestataire_id', user.id),
        supabase.from('avis').select('note').eq('prestataire_id', user.id),
        fetchCAParMois(user.id),
        fetchServicesPopulaires(user.id),
        fetchStatsClients(user.id),
        fetchComparaisonMois(user.id)
      ]);

      const allReservations = reservations.data || [];
      const reservationsConfirmees = allReservations.filter(r => 
        ['confirmed', 'paid', 'acompte_paye', 'completed'].includes(r.status)
      );
      const reservationsAnnulees = allReservations.filter(r => 
        ['cancelled', 'annulee', 'refused', 'refusee'].includes(r.status)
      );

      // CA par période
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const caJour = reservationsConfirmees
        .filter(r => new Date(r.date) >= today)
        .reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

      const caSemaine = reservationsConfirmees
        .filter(r => new Date(r.date) >= weekStart)
        .reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

      const caMois = reservationsConfirmees
        .filter(r => new Date(r.date) >= monthStart)
        .reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

      const caAnnee = reservationsConfirmees
        .filter(r => new Date(r.date) >= yearStart)
        .reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

      const tauxConversion = allReservations.length > 0 
        ? (reservationsConfirmees.length / allReservations.length) * 100 
        : 0;

      const tauxAnnulation = allReservations.length > 0 
        ? (reservationsAnnulees.length / allReservations.length) * 100 
        : 0;

      const panierMoyen = reservationsConfirmees.length > 0
        ? reservationsConfirmees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0) / reservationsConfirmees.length
        : 0;

      const notesAvis = avis.data || [];
      const noteMoyenne = notesAvis.length > 0 
        ? notesAvis.reduce((sum, a) => sum + a.note, 0) / notesAvis.length 
        : 0;

      setStats({
        caJour,
        caSemaine,
        caMois,
        caAnnee,
        totalReservations: allReservations.length,
        tauxConversion: Math.round(tauxConversion),
        tauxAnnulation: Math.round(tauxAnnulation),
        panierMoyen: Math.round(panierMoyen * 100) / 100,
        totalClients: clientsData.total,
        clientsNouveaux: clientsData.nouveaux,
        clientsRecurrents: clientsData.recurrents,
        caMoisActuel: comparaisonData.actuel,
        caMoisPrecedent: comparaisonData.precedent,
        evolutionPourcent: comparaisonData.evolution,
        noteMoyenne: Math.round(noteMoyenne * 10) / 10,
        totalAvis: notesAvis.length
      });

      setChartData({
        caParMois: caParMoisData.montants,
        moisLabels: caParMoisData.labels,
        servicesPopulaires: servicesData,
        statutsRepartition: calculateStatutsRepartition(allReservations)
      });

    } catch (error) {
      console.error('Erreur fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCAParMois = async (userId: string) => {
    const { data } = await supabase
      .from('reservations')
      .select('date, montant, status')
      .eq('prestataire_id', userId)
      .gte('date', new Date(new Date().setMonth(new Date().getMonth() - 11)).toISOString());

    const montantsByMonth: { [key: string]: number } = {};
    data?.forEach(r => {
      if (['confirmed', 'paid', 'acompte_paye', 'completed'].includes(r.status)) {
        const month = new Date(r.date).toLocaleDateString('fr-FR', { month: 'short' });
        montantsByMonth[month] = (montantsByMonth[month] || 0) + parseFloat(r.montant || 0);
      }
    });

    const labels = Object.keys(montantsByMonth);
    const montants = Object.values(montantsByMonth);

    return { labels, montants };
  };

  const fetchServicesPopulaires = async (userId: string) => {
    const { data } = await supabase
      .from('reservations')
      .select('annonce_id, montant, status, annonces(titre)')
      .eq('prestataire_id', userId)
      .in('status', ['confirmed', 'paid', 'acompte_paye', 'completed']);

    const serviceStats: { [key: string]: { count: number; ca: number; titre: string } } = {};
    
    data?.forEach(r => {
      const annonceTitre = (r.annonces as any)?.titre || 'Service inconnu';
      if (!serviceStats[r.annonce_id]) {
        serviceStats[r.annonce_id] = { count: 0, ca: 0, titre: annonceTitre };
      }
      serviceStats[r.annonce_id].count++;
      serviceStats[r.annonce_id].ca += parseFloat(r.montant || 0);
    });

    return Object.values(serviceStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const fetchStatsClients = async (userId: string) => {
    const { data } = await supabase
      .from('reservations')
      .select('particulier_id')
      .eq('prestataire_id', userId)
      .in('status', ['confirmed', 'paid', 'acompte_paye', 'completed']);

    const clientCounts: { [key: string]: number } = {};
    data?.forEach(r => {
      clientCounts[r.particulier_id] = (clientCounts[r.particulier_id] || 0) + 1;
    });

    const total = Object.keys(clientCounts).length;
    const nouveaux = Object.values(clientCounts).filter(count => count === 1).length;
    const recurrents = total - nouveaux;

    return { total, nouveaux, recurrents };
  };

  const fetchComparaisonMois = async (userId: string) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: currentMonth } = await supabase
      .from('reservations')
      .select('montant')
      .eq('prestataire_id', userId)
      .in('status', ['confirmed', 'paid', 'acompte_paye', 'completed'])
      .gte('date', currentMonthStart.toISOString());

    const { data: lastMonth } = await supabase
      .from('reservations')
      .select('montant')
      .eq('prestataire_id', userId)
      .in('status', ['confirmed', 'paid', 'acompte_paye', 'completed'])
      .gte('date', lastMonthStart.toISOString())
      .lte('date', lastMonthEnd.toISOString());

    const actuel = currentMonth?.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0) || 0;
    const precedent = lastMonth?.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0) || 0;
    const evolution = precedent > 0 ? ((actuel - precedent) / precedent) * 100 : 0;

    return { actuel, precedent, evolution: Math.round(evolution) };
  };

  const calculateStatutsRepartition = (reservations: any[]) => {
    const statusCounts: { [key: string]: number } = {};
    reservations.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const colors = ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6'];
    return Object.entries(statusCounts).map(([status, count], index) => ({
      name: status,
      population: count,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
  };

  const getCAByPeriod = () => {
    switch (period) {
      case 'jour': return stats.caJour;
      case 'semaine': return stats.caSemaine;
      case 'mois': return stats.caMois;
      case 'annee': return stats.caAnnee;
      default: return stats.caMois;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de vos statistiques...</Text>
        </View>
        <FooterPresta />
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📊 Dashboard Analytics</Text>
          <Text style={styles.subtitle}>Vue d'ensemble de votre activité</Text>
        </View>

        {/* Sélecteur de période */}
        <View style={styles.periodSelector}>
          {(['jour', 'semaine', 'mois', 'annee'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CA principal */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Ionicons name="cash-outline" size={32} color={COLORS.success} />
            <View style={styles.mainCardContent}>
              <Text style={styles.mainCardLabel}>Chiffre d'affaires</Text>
              <Text style={styles.mainCardValue}>{getCAByPeriod().toFixed(2)} €</Text>
            </View>
          </View>
          
          {stats.evolutionPourcent !== 0 && (
            <View style={styles.evolutionBadge}>
              <Ionicons 
                name={stats.evolutionPourcent > 0 ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={stats.evolutionPourcent > 0 ? COLORS.success : COLORS.error} 
              />
              <Text style={[styles.evolutionText, { 
                color: stats.evolutionPourcent > 0 ? COLORS.success : COLORS.error 
              }]}>
                {stats.evolutionPourcent > 0 ? '+' : ''}{stats.evolutionPourcent}% vs mois dernier
              </Text>
            </View>
          )}
        </View>

        {/* Métriques clés */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <Text style={styles.metricValue}>{stats.totalReservations}</Text>
            <Text style={styles.metricLabel}>Réservations</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.metricValue}>{stats.tauxConversion}%</Text>
            <Text style={styles.metricLabel}>Taux conversion</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={styles.metricValue}>{stats.totalClients}</Text>
            <Text style={styles.metricLabel}>Clients</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="card" size={24} color={COLORS.warning} />
            <Text style={styles.metricValue}>{stats.panierMoyen.toFixed(0)} €</Text>
            <Text style={styles.metricLabel}>Panier moyen</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.metricValue}>{stats.noteMoyenne}/5</Text>
            <Text style={styles.metricLabel}>Note moyenne</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
            <Text style={styles.metricValue}>{stats.tauxAnnulation}%</Text>
            <Text style={styles.metricLabel}>Taux annulation</Text>
          </View>
        </View>

        {/* Graphique CA sur 12 mois */}
        {chartData.caParMois.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Évolution du CA (12 derniers mois)</Text>
            <LineChart
              data={{
                labels: chartData.moisLabels,
                datasets: [{ data: chartData.caParMois }]
              }}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Clients nouveaux vs récurrents */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>👥 Répartition des clients</Text>
          <View style={styles.clientStats}>
            <View style={styles.clientStatItem}>
              <View style={[styles.clientStatBar, { width: `${(stats.clientsNouveaux / stats.totalClients) * 100}%`, backgroundColor: COLORS.success }]} />
              <Text style={styles.clientStatLabel}>Nouveaux: {stats.clientsNouveaux}</Text>
            </View>
            <View style={styles.clientStatItem}>
              <View style={[styles.clientStatBar, { width: `${(stats.clientsRecurrents / stats.totalClients) * 100}%`, backgroundColor: COLORS.primary }]} />
              <Text style={styles.clientStatLabel}>Récurrents: {stats.clientsRecurrents}</Text>
            </View>
          </View>
        </View>

        {/* Top 5 services */}
        {chartData.servicesPopulaires.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🏆 Services les plus demandés</Text>
            {chartData.servicesPopulaires.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceRank}>
                  <Text style={styles.serviceRankText}>{index + 1}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.titre}</Text>
                  <Text style={styles.serviceStats}>
                    {service.count} réservations • {service.ca.toFixed(2)} €
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Répartition par statut */}
        {chartData.statutsRepartition.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📊 Répartition des réservations</Text>
            <PieChart
              data={chartData.statutsRepartition}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Comparaison mensuelle */}
        <View style={styles.comparisonCard}>
          <Text style={styles.chartTitle}>📅 Comparaison mensuelle</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Mois actuel</Text>
              <Text style={styles.comparisonValue}>{stats.caMoisActuel.toFixed(2)} €</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={COLORS.textLight} />
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Mois précédent</Text>
              <Text style={styles.comparisonValue}>{stats.caMoisPrecedent.toFixed(2)} €</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight
  },
  periodButtonTextActive: {
    color: '#fff'
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  mainCardContent: {
    flex: 1
  },
  mainCardLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4
  },
  mainCardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  evolutionText: {
    fontSize: 13,
    fontWeight: '600'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center'
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  clientStats: {
    gap: 12
  },
  clientStatItem: {
    marginBottom: 12
  },
  clientStatBar: {
    height: 32,
    borderRadius: 8,
    marginBottom: 8
  },
  clientStatLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500'
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  serviceRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff'
  },
  serviceInfo: {
    flex: 1
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  serviceStats: {
    fontSize: 12,
    color: COLORS.textLight
  },
  comparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center'
  },
  comparisonLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  }
});

