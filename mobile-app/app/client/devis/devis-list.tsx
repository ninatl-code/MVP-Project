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
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface DemandeWithDevis {
  id: string;
  titre: string;
  categorie: string;
  ville: string;
  date_souhaitee: string;
  statut: string;
  devis_count: number;
  devis_accepte: number;
  devis_envoye: number;
  devis_lu: number;
  devis_refuse: number;
  created_at: string;
}

export default function ClientDevisListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<DemandeWithDevis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDemandes();
  }, [user]);

  const loadDemandes = async () => {
    try {
      if (!user?.id) return;

      // Récupérer toutes les demandes du client
      const { data: demandesData, error: demandesError } = await supabase
        .from('demandes_client')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (demandesError) throw demandesError;

      // Pour chaque demande, compter les devis et leurs statuts
      const demandesWithDevis = await Promise.all(
        demandesData.map(async (demande) => {
          const { data: devisData, error: devisError } = await supabase
            .from('devis')
            .select('statut')
            .eq('demande_id', demande.id);

          if (devisError) {
            console.error('Erreur récupération devis:', devisError);
            return {
              ...demande,
              devis_count: 0,
              devis_accepte: 0,
              devis_envoye: 0,
              devis_lu: 0,
              devis_refuse: 0,
            };
          }

          return {
            ...demande,
            devis_count: devisData.length,
            devis_accepte: devisData.filter((d) => d.statut === 'accepte').length,
            devis_envoye: devisData.filter((d) => d.statut === 'envoye').length,
            devis_lu: devisData.filter((d) => d.statut === 'lu').length,
            devis_refuse: devisData.filter((d) => d.statut === 'refuse').length,
          };
        })
      );

      // Filtrer uniquement les demandes qui ont au moins un devis
      const demandesAvecDevis = demandesWithDevis.filter((d) => d.devis_count > 0);
      setDemandes(demandesAvecDevis);
    } catch (error: any) {
      console.error('❌ Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDemandes();
  };

  const getStatusBadge = (demande: DemandeWithDevis) => {
    if (demande.devis_accepte > 0) {
      return {
        text: 'Devis accepté',
        color: '#4CAF50',
        icon: 'checkmark-circle' as const,
      };
    }
    if (demande.devis_envoye > 0 || demande.devis_lu > 0) {
      return {
        text: 'En attente',
        color: '#FF9800',
        icon: 'time-outline' as const,
      };
    }
    if (demande.devis_refuse > 0 && demande.devis_envoye === 0 && demande.devis_lu === 0) {
      return {
        text: 'Tous refusés',
        color: '#9E9E9E',
        icon: 'close-circle' as const,
      };
    }
    return {
      text: 'Nouveaux devis',
      color: '#2196F3',
      icon: 'mail-unread-outline' as const,
    };
  };

  const renderDemandeItem = ({ item }: { item: DemandeWithDevis }) => {
    const statusBadge = getStatusBadge(item);
    const hasNewDevis = item.devis_envoye > 0 || item.devis_lu === 0;

    return (
      <TouchableOpacity
        style={styles.demandeCard}
        onPress={() =>
          router.push({
            pathname: '/client/devis/devis-detail',
            params: { demandeId: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.titre}
            </Text>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.categorie}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.metaText}>{item.ville}</Text>
              </View>
            </View>
          </View>
          {hasNewDevis && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={20} color="#5C6BC0" />
            <Text style={styles.statValue}>{item.devis_count}</Text>
            <Text style={styles.statLabel}>devis reçus</Text>
          </View>

          {item.devis_accepte > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {item.devis_accepte}
              </Text>
              <Text style={styles.statLabel}>accepté</Text>
            </View>
          )}

          {(item.devis_envoye > 0 || item.devis_lu > 0) && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {item.devis_envoye + item.devis_lu}
              </Text>
              <Text style={styles.statLabel}>en attente</Text>
            </View>
          )}

          {item.devis_refuse > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={20} color="#9E9E9E" />
              <Text style={[styles.statValue, { color: '#9E9E9E' }]}>
                {item.devis_refuse}
              </Text>
              <Text style={styles.statLabel}>refusé</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
            <Ionicons name={statusBadge.icon} size={16} color={statusBadge.color} />
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (demandes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Aucun devis reçu</Text>
        <Text style={styles.emptyText}>
          Les devis envoyés par les photographes apparaîtront ici.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/client/demandes/nouvelle-demande')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.emptyButtonText}>Créer une demande</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes devis</Text>
        <Text style={styles.headerSubtitle}>
          {demandes.length} demande{demandes.length > 1 ? 's' : ''} avec devis
        </Text>
      </View>

      <FlatList
        data={demandes}
        renderItem={renderDemandeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5C6BC0']}
          />
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  demandeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  newBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
