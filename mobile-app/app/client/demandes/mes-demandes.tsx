import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { getClientDemandes, annulerDemande } from '@/lib/demandeService';
import { Ionicons } from '@expo/vector-icons';

const STATUT_COLORS = {
  ouverte: '#4CAF50',
  pourvue: '#2196F3',
  annulee: '#FF9800',
  expiree: '#9E9E9E',
};

const STATUT_LABELS = {
  ouverte: 'Ouverte',
  pourvue: 'Pourvue',
  annulee: 'Annulée',
  expiree: 'Expirée',
};

const CATEGORIES = [
  { label: 'Toutes', value: '' },
  { label: 'Mariage', value: 'Mariage' },
  { label: 'Portrait', value: 'Portrait' },
  { label: 'Événementiel', value: 'Événementiel' },
  { label: 'Corporate', value: 'Corporate' },
  { label: 'Produit', value: 'Produit' },
  { label: 'Architecture', value: 'Architecture' },
];

export default function MesDemandesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');

  const loadDemandes = async () => {
    try {
      const data = await getClientDemandes(user!.id);
      setDemandes(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger vos demandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDemandes();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDemandes();
  }, []);

  const handleCancelDemande = async (demandeId: string, titre: string) => {
    Alert.alert(
      'Annuler la demande',
      `Êtes-vous sûr de vouloir annuler "${titre}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              await annulerDemande(demandeId);
              Alert.alert('Succès', 'Demande annulée');
              loadDemandes();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'annuler la demande');
            }
          },
        },
      ]
    );
  };

  const filteredDemandes = demandes.filter((demande) => {
    if (selectedStatut && demande.statut !== selectedStatut) return false;
    if (selectedCategorie && demande.categorie !== selectedCategorie) return false;
    return true;
  });

  const renderDemandeCard = ({ item }: { item: any }) => {
    const isOuverte = item.statut === 'ouverte';
    const daysRemaining = item.expire_le
      ? Math.max(0, Math.ceil((new Date(item.expire_le).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/client/demandes/demande-detail?id=${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.titre}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: STATUT_COLORS[item.statut as keyof typeof STATUT_COLORS] }]}>
                <Text style={styles.badgeText}>{STATUT_LABELS[item.statut as keyof typeof STATUT_LABELS]}</Text>
              </View>
              <View style={styles.categorieBadge}>
                <Text style={styles.categorieBadgeText}>{item.categorie}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(item.date_souhaitee).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {item.heure_souhaitee && ` à ${item.heure_souhaitee}`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.lieu_ville} ({item.lieu_code_postal})
            </Text>
          </View>

          {(item.budget_min || item.budget_max) && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {item.budget_min && item.budget_max
                  ? `${item.budget_min}€ - ${item.budget_max}€`
                  : item.budget_min
                  ? `À partir de ${item.budget_min}€`
                  : `Jusqu'à ${item.budget_max}€`}
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color="#5C6BC0" />
              <Text style={styles.statValue}>{item.photographes_notifies?.length || 0}</Text>
              <Text style={styles.statLabel}>notifiés</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={18} color="#5C6BC0" />
              <Text style={styles.statValue}>{item.nombre_devis_recus || 0}</Text>
              <Text style={styles.statLabel}>devis</Text>
            </View>

            {isOuverte && daysRemaining > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={18} color="#FF9800" />
                <Text style={styles.statValue}>{daysRemaining}</Text>
                <Text style={styles.statLabel}>jours restants</Text>
              </View>
            )}
          </View>
        </View>

        {isOuverte && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelDemande(item.id, item.titre);
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#F44336" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes demandes</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/client/demandes/nouvelle-demande' as any)}
        >
          <Ionicons name="add-circle" size={28} color="#5C6BC0" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Statut :</Text>
        <View style={styles.filterChips}>
          {['', 'ouverte', 'pourvue', 'annulee', 'expiree'].map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterChip,
                selectedStatut === statut && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedStatut(statut)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatut === statut && styles.filterChipTextSelected,
                ]}
              >
                {statut === '' ? 'Toutes' : STATUT_LABELS[statut as keyof typeof STATUT_LABELS]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Catégorie :</Text>
        <View style={styles.filterChips}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.filterChip,
                selectedCategorie === cat.value && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedCategorie(cat.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategorie === cat.value && styles.filterChipTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredDemandes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {demandes.length === 0 ? 'Aucune demande' : 'Aucune demande correspondante'}
          </Text>
          <Text style={styles.emptyText}>
            {demandes.length === 0
              ? 'Créez votre première demande pour trouver un photographe'
              : 'Essayez de modifier vos filtres'}
          </Text>
          {demandes.length === 0 && (
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => router.push('/client/demandes/nouvelle-demande' as any)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Créer une demande</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredDemandes}
          renderItem={renderDemandeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5C6BC0']} />
          }
        />
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  categorieBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    marginBottom: 4,
  },
  categorieBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  cardContent: {
    padding: 16,
    paddingTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  createButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#5C6BC0',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
});
