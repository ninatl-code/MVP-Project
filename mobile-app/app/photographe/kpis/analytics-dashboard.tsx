import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabaseClient';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';
import FooterPresta from '@/components/photographe/FooterPresta';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const PERIOD_OPTIONS = ['daily', 'weekly', 'monthly', 'yearly'];

interface Analytics {
  total_revenue: number;
  avg_booking_value: number;
  cancellation_revenue_loss: number;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  response_rate_percentage: number;
  acceptance_rate_percentage: number;
  cancellation_rate_percentage: number;
  new_clients: number;
  repeat_clients: number;
  avg_rating: number;
  total_reviews: number;
}

interface Earning {
  annonces?: { titre: string };
  bookings_count: number;
  avg_price: number;
  total_earnings: number;
}

export default function AnalyticsDashboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Gérer le StatusBar - blanc sur le fond dégradé
  useStatusBarStyle('light-content', '#5C6BC0');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('User not authenticated');
        return;
      }
      setProviderId(user.id);

      // Get latest analytics for selected period
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('provider_analytics')
        .select('*')
        .eq('provider_id', user.id)
        .eq('period_type', selectedPeriod)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (analyticsError && analyticsError.code !== 'PGRST116') {
        throw analyticsError;
      }

      setAnalytics(analyticsData);

      // Get earnings breakdown
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings_breakdown')
        .select(`
          *,
          annonces (titre)
        `)
        .eq('provider_id', user.id)
        .order('total_earnings', { ascending: false })
        .limit(5);

      if (earningsError) throw earningsError;
      setEarnings(earningsData || []);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      // Don't show alert if no data exists yet
      if (error.code !== 'PGRST116') {
        alert('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const StatCard = ({ icon, label, value, color = COLORS.primary, subtitle }: {
    icon: any;
    label: string;
    value: number | string;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de vos statistiques...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>📊 Tableau de bord</Text>
            <Text style={styles.headerSubtitle}>Vue d'ensemble de vos statistiques</Text>
          </View>
          <TouchableOpacity onPress={() => alert('Rapport de revenus bientôt disponible')}>
            <Ionicons name="document-text-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'daily' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('daily')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'daily' && styles.periodButtonTextActive,
              ]}
            >
              Jour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'weekly' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('weekly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'weekly' && styles.periodButtonTextActive,
              ]}
            >
              Semaine
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'monthly' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'monthly' && styles.periodButtonTextActive,
              ]}
            >
              Mois
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'yearly' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('yearly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'yearly' && styles.periodButtonTextActive,
              ]}
            >
              Année
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {!analytics ? (
          <View style={styles.noDataCard}>
            <Ionicons name="bar-chart-outline" size={64} color={COLORS.border} />
            <Text style={styles.noDataTitle}>Pas de statistiques encore</Text>
            <Text style={styles.noDataText}>
              Les statistiques apparaîtront ici dès que vous commencerez à recevoir des réservations. Les données sont mises à jour quotidiennement.
            </Text>
          </View>
        ) : (
          <>
            {/* Revenue Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Revenus</Text>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueAmount}>{formatCurrency(analytics.total_revenue)}</Text>
                <Text style={styles.revenueLabel}>Revenus totaux</Text>
                <View style={styles.revenueDetails}>
                  <View style={styles.revenueDetailItem}>
                    <Text style={styles.revenueDetailLabel}>Réservation moyenne</Text>
                    <Text style={styles.revenueDetailValue}>
                      {formatCurrency(analytics.avg_booking_value)}
                    </Text>
                  </View>
                  <View style={styles.revenueDetailDivider} />
                  <View style={styles.revenueDetailItem}>
                    <Text style={styles.revenueDetailLabel}>Perte annulations</Text>
                    <Text style={[styles.revenueDetailValue, { color: COLORS.error }]}>
                      {formatCurrency(analytics.cancellation_revenue_loss)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Booking Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Réservations</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="calendar-outline"
                  label="Total"
                  value={analytics.total_bookings}
                  color={COLORS.primary}
                />
                <StatCard
                  icon="checkmark-circle-outline"
                  label="Confirmées"
                  value={analytics.confirmed_bookings}
                  color={COLORS.success}
                />
                <StatCard
                  icon="close-circle-outline"
                  label="Annulées"
                  value={analytics.cancelled_bookings}
                  color={COLORS.error}
                />
                <StatCard
                  icon="star-outline"
                  label="Complétées"
                  value={analytics.completed_bookings}
                  color={COLORS.warning}
                />
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Performance</Text>
              <View style={styles.metricsCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricInfo}>
                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.metricLabel}>Taux de réponse</Text>
                  </View>
                  <View style={styles.metricValueContainer}>
                    <Text style={styles.metricValue}>
                      {formatPercentage(analytics.response_rate_percentage)}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${analytics.response_rate_percentage || 0}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricInfo}>
                    <Ionicons name="checkmark-done-outline" size={20} color={COLORS.success} />
                    <Text style={styles.metricLabel}>Taux d'acceptation</Text>
                  </View>
                  <View style={styles.metricValueContainer}>
                    <Text style={styles.metricValue}>
                      {formatPercentage(analytics.acceptance_rate_percentage)}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${analytics.acceptance_rate_percentage || 0}%`, backgroundColor: COLORS.success },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricInfo}>
                    <Ionicons name="close-outline" size={20} color={COLORS.error} />
                    <Text style={styles.metricLabel}>Taux d'annulation</Text>
                  </View>
                  <View style={styles.metricValueContainer}>
                    <Text style={styles.metricValue}>
                      {formatPercentage(analytics.cancellation_rate_percentage)}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${analytics.cancellation_rate_percentage || 0}%`, backgroundColor: COLORS.error },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Client Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 Clients</Text>
              <View style={styles.statsRow}>
                <StatCard
                  icon="person-add-outline"
                  label="Nouveaux"
                  value={analytics.new_clients}
                  color={COLORS.success}
                />
                <StatCard
                  icon="repeat-outline"
                  label="Récurrents"
                  value={analytics.repeat_clients}
                  color={COLORS.primary}
                />
              </View>
            </View>

            {/* Reviews & Ratings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Avis clients</Text>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={48} color={COLORS.warning} />
                  <Text style={styles.reviewRatingValue}>{(analytics.avg_rating || 0).toFixed(1)}</Text>
                </View>
                <Text style={styles.reviewCount}>{analytics.total_reviews} avis</Text>
              </View>
            </View>

            {/* Top Services */}
            {earnings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🏆 Top services</Text>
                  <TouchableOpacity onPress={() => alert('Rapport complet de revenus bientôt disponible')}>
                    <Text style={styles.sectionLink}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                {earnings.map((item, index) => (
                  <View key={index} style={styles.serviceCard}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{item.annonces?.titre || 'Service inconnu'}</Text>
                      <Text style={styles.serviceStats}>
                        {item.bookings_count} réservations • Moyenne {formatCurrency(item.avg_price)}
                      </Text>
                    </View>
                    <Text style={styles.serviceEarnings}>{formatCurrency(item.total_earnings)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => alert('Détails des performances bientôt disponibles')}
                >
                  <Ionicons name="trending-up-outline" size={28} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Détails performance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => alert('Rapport de revenus bientôt disponible')}
                >
                  <Ionicons name="cash-outline" size={28} color={COLORS.success} />
                  <Text style={styles.actionButtonText}>Rapport revenus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    marginBottom: 20,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  noDataCard: {
    backgroundColor: COLORS.surface,
    padding: 60,
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  revenueCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  revenueAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  revenueDetails: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  revenueDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueDetailDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  revenueDetailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  revenueDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  metricValueContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  progressBar: {
    width: 100,
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  reviewRatingValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  serviceCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  serviceEarnings: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});
