import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import FooterParti from '../../components/FooterParti';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB'
};

interface Paiement {
  id: string;
  reservation_id: string;
  montant: number;
  status: string;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  created_at: string;
  reservations?: {
    annonces?: {
      titre: string;
      profiles?: {
        nom: string;
      };
    };
  };
}

export default function HistoriquePaiements() {
  const router = useRouter();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');

  useEffect(() => {
    fetchPaiements();
  }, []);

  const fetchPaiements = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('paiements')
        .select(`
          *,
          reservations (
            annonces (
              titre,
              profiles:prestataire_id (
                nom
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPaiements(data || []);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des paiements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchPaiements(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'failed':
      case 'canceled':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      case 'canceled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
      case 'canceled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const filteredPaiements = paiements.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalPaye = paiements
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.montant, 0);

  const renderPaiementCard = ({ item }: { item: Paiement }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            'Détails du paiement',
            `Montant: ${item.montant}€\nStatut: ${statusLabel}\nDate: ${new Date(item.created_at).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}\n${item.stripe_session_id ? `ID Session: ${item.stripe_session_id.substring(0, 20)}...` : ''}`,
            [{ text: 'Fermer' }]
          );
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={statusIcon as any} size={24} color={statusColor} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.reservations?.annonces?.titre || 'Réservation'}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.reservations?.annonces?.profiles?.nom || 'Prestataire'}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>{item.montant}€</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="wallet-outline" size={64} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Aucun paiement</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Vous n\'avez effectué aucun paiement pour le moment'
          : `Aucun paiement avec le statut "${getStatusLabel(filter)}"`}
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => router.push('/particuliers/search')}
      >
        <Text style={styles.exploreButtonText}>Explorer les prestations</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des paiements</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Statistiques */}
      <View style={styles.statsSection}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total payé</Text>
              <Text style={styles.statValue}>{totalPaye.toFixed(2)}€</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="receipt-outline" size={24} color={COLORS.accent} />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Transactions</Text>
              <Text style={styles.statValue}>{paiements.length}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtersSection}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            Tous ({paiements.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'succeeded' && styles.filterButtonActive]}
          onPress={() => setFilter('succeeded')}
        >
          <Text style={[styles.filterButtonText, filter === 'succeeded' && styles.filterButtonTextActive]}>
            Payés ({paiements.filter((p) => p.status === 'succeeded').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
            En attente ({paiements.filter((p) => p.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'failed' && styles.filterButtonActive]}
          onPress={() => setFilter('failed')}
        >
          <Text style={[styles.filterButtonText, filter === 'failed' && styles.filterButtonTextActive]}>
            Échoués ({paiements.filter((p) => p.status === 'failed').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des paiements */}
      <FlatList
        data={filteredPaiements}
        renderItem={renderPaiementCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredPaiements.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  statsSection: {
    padding: 20
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statInfo: {
    marginLeft: 12
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20
  },
  filtersSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text
  },
  filterButtonTextActive: {
    color: COLORS.background
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100
  },
  listContentEmpty: {
    flexGrow: 1
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight
  },
  cardRight: {
    alignItems: 'flex-end'
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  dateText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textLight
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textLight
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8
  },
  exploreButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600'
  }
});
