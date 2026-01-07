import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { getPhotographeDevis, Devis } from '@/lib/devisService';
import { Ionicons } from '@expo/vector-icons';

export default function PhotographeDevisListScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'tous' | 'envoye' | 'accepte' | 'refuse'>('tous');

  useEffect(() => {
    loadDevis();
  }, []);

  const loadDevis = async () => {
    try {
      setLoading(true);
      const data = await getPhotographeDevis(user!.id);
      setDevis(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement devis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevis();
  };

  const getFilteredDevis = () => {
    if (filter === 'tous') return devis;
    return devis.filter((d) => d.statut === filter);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'accepte':
        return '#4CAF50';
      case 'refuse':
        return '#f44336';
      case 'lu':
        return '#2196F3';
      case 'expire':
        return '#9E9E9E';
      default:
        return '#FF9800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'accepte':
        return 'Accepté';
      case 'refuse':
        return 'Refusé';
      case 'lu':
        return 'Lu';
      case 'expire':
        return 'Expiré';
      default:
        return 'Envoyé';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'accepte':
        return 'checkmark-circle';
      case 'refuse':
        return 'close-circle';
      case 'lu':
        return 'eye';
      case 'expire':
        return 'time';
      default:
        return 'paper-plane';
    }
  };

  const renderDevisItem = ({ item }: { item: Devis }) => (
    <TouchableOpacity
      style={styles.devisCard}
      onPress={() => router.push(`/photographe/demandes/demande-detail?id=${item.demande_id}` as any)}
    >
      <View style={styles.devisHeader}>
        <View style={styles.devisInfo}>
          <Text style={styles.devisTitle} numberOfLines={1}>
            {item.titre}
          </Text>
          <View style={styles.devisMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{item.client?.nom || 'Client'}</Text>
            </View>
            {item.demande?.ville && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.demande.ville}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: getStatutColor(item.statut) }]}>
          <Ionicons name={getStatutIcon(item.statut) as any} size={16} color="#fff" />
          <Text style={styles.statutText}>{getStatutLabel(item.statut)}</Text>
        </View>
      </View>

      <View style={styles.devisDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={18} color="#5C6BC0" />
          <Text style={styles.detailValue}>{item.montant_total}€</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="images-outline" size={18} color="#5C6BC0" />
          <Text style={styles.detailValue}>{item.nb_photos_livrees} photos</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={18} color="#5C6BC0" />
          <Text style={styles.detailValue}>{item.delai_livraison_jours}j</Text>
        </View>
      </View>

      {item.message_personnalise && (
        <Text style={styles.devisMessage} numberOfLines={2}>
          {item.message_personnalise}
        </Text>
      )}

      <View style={styles.devisFooter}>
        <Text style={styles.dateText}>
          Envoyé le {new Date(item.envoye_le).toLocaleDateString('fr-FR')}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Aucun devis</Text>
      <Text style={styles.emptyText}>
        {filter === 'tous'
          ? 'Vous n\'avez pas encore envoyé de devis'
          : `Aucun devis ${getStatutLabel(filter).toLowerCase()}`}
      </Text>
    </View>
  );

  const filteredDevis = getFilteredDevis();

  const stats = {
    total: devis.length,
    envoyes: devis.filter((d) => d.statut === 'envoye' || d.statut === 'lu').length,
    acceptes: devis.filter((d) => d.statut === 'accepte').length,
    refuses: devis.filter((d) => d.statut === 'refuse').length,
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.envoyes}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.acceptes}</Text>
          <Text style={styles.statLabel}>Acceptés</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.refuses}</Text>
          <Text style={styles.statLabel}>Refusés</Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'tous' && styles.filterButtonActive]}
          onPress={() => setFilter('tous')}
        >
          <Text style={[styles.filterText, filter === 'tous' && styles.filterTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'envoye' && styles.filterButtonActive]}
          onPress={() => setFilter('envoye')}
        >
          <Text style={[styles.filterText, filter === 'envoye' && styles.filterTextActive]}>
            En attente
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'accepte' && styles.filterButtonActive]}
          onPress={() => setFilter('accepte')}
        >
          <Text style={[styles.filterText, filter === 'accepte' && styles.filterTextActive]}>
            Acceptés
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'refuse' && styles.filterButtonActive]}
          onPress={() => setFilter('refuse')}
        >
          <Text style={[styles.filterText, filter === 'refuse' && styles.filterTextActive]}>
            Refusés
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={filteredDevis}
        renderItem={renderDevisItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#5C6BC0']} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#5C6BC0',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  devisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  devisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  devisInfo: {
    flex: 1,
    marginRight: 12,
  },
  devisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  devisMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  devisDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  devisMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  devisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
