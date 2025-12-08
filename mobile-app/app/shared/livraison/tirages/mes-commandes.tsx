import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

interface CommandeTirage {
  id: string;
  date: string;
  statut: 'en_attente' | 'en_production' | 'expedie' | 'livre' | 'annule';
  format: string;
  finition: string;
  papier: string;
  quantite: number;
  photosCount: number;
  total: number;
  numeroSuivi?: string;
}

const STATUT_COLORS = {
  en_attente: '#FF9800',
  en_production: '#2196F3',
  expedie: '#9C27B0',
  livre: '#4CAF50',
  annule: '#F44336',
};

const STATUT_LABELS = {
  en_attente: 'En attente',
  en_production: 'En production',
  expedie: 'Expédié',
  livre: 'Livré',
  annule: 'Annulé',
};

const STATUT_ICONS = {
  en_attente: 'time-outline',
  en_production: 'construct-outline',
  expedie: 'airplane-outline',
  livre: 'checkmark-circle-outline',
  annule: 'close-circle-outline',
};

export default function MesCommandesTiragesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [commandes, setCommandes] = useState<CommandeTirage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommandes();
  }, []);

  const loadCommandes = async () => {
    try {
      setLoading(true);
      // TODO: Implémenter la récupération depuis Supabase
      // const { data, error } = await supabase
      //   .from('commandes_tirages')
      //   .select('*')
      //   .eq('user_id', user?.id)
      //   .order('created_at', { ascending: false });

      // Données de démo
      const demoData: CommandeTirage[] = [
        {
          id: '1',
          date: '2024-01-15',
          statut: 'livre',
          format: '10x15 cm',
          finition: 'Mat',
          papier: 'Standard',
          quantite: 20,
          photosCount: 10,
          total: 15.0,
          numeroSuivi: 'FR123456789',
        },
        {
          id: '2',
          date: '2024-01-20',
          statut: 'expedie',
          format: '13x18 cm',
          finition: 'Brillant',
          papier: 'Premium',
          quantite: 15,
          photosCount: 5,
          total: 22.5,
          numeroSuivi: 'FR987654321',
        },
        {
          id: '3',
          date: '2024-01-25',
          statut: 'en_production',
          format: '20x30 cm',
          finition: 'Satin',
          papier: 'Professionnel',
          quantite: 10,
          photosCount: 10,
          total: 45.0,
        },
      ];

      setCommandes(demoData);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommandes();
    setRefreshing(false);
  }, []);

  const renderCommandeItem = ({ item }: { item: CommandeTirage }) => (
    <TouchableOpacity
      style={styles.commandeCard}
      onPress={() => {
        // TODO: Naviguer vers les détails
      }}
    >
      <View style={styles.commandeHeader}>
        <View style={styles.commandeIdContainer}>
          <Ionicons name="receipt-outline" size={20} color="#666" />
          <Text style={styles.commandeId}>#{item.id}</Text>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: STATUT_COLORS[item.statut] }]}>
          <Ionicons
            name={STATUT_ICONS[item.statut] as any}
            size={14}
            color="#FFF"
          />
          <Text style={styles.statutText}>{STATUT_LABELS[item.statut]}</Text>
        </View>
      </View>

      <View style={styles.commandeBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.date).toLocaleDateString('fr-FR')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="resize-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.format}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="image-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.photosCount} photo(s) • {item.quantite} tirage(s)
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="color-palette-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.finition} • {item.papier}
          </Text>
        </View>

        {item.numeroSuivi && (
          <View style={styles.suiviContainer}>
            <Ionicons name="location-outline" size={16} color="#5C6BC0" />
            <Text style={styles.suiviText}>Suivi: {item.numeroSuivi}</Text>
          </View>
        )}
      </View>

      <View style={styles.commandeFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{item.total.toFixed(2)}€</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes commandes de tirages</Text>
        <View style={{ width: 40 }} />
      </View>

      {commandes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore passé de commande de tirages
          </Text>
          <TouchableOpacity
            style={styles.newOrderButton}
            onPress={() => router.push('/shared/livraison/tirages' as any)}
          >
            <Text style={styles.createButtonText}>Commander des tirages</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={commandes}
          renderItem={renderCommandeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  commandeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commandeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commandeIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commandeId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  commandeBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  suiviContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  suiviText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  commandeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  newOrderButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
});
