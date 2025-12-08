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
import { getRecommendedDemandesForPhotographe } from '@/lib/matchingService';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { label: 'Toutes', value: '' },
  { label: 'Mariage', value: 'Mariage' },
  { label: 'Portrait', value: 'Portrait' },
  { label: 'Événementiel', value: 'Événementiel' },
  { label: 'Corporate', value: 'Corporate' },
  { label: 'Produit', value: 'Produit' },
  { label: 'Architecture', value: 'Architecture' },
];

const SORT_OPTIONS = [
  { label: 'Score', value: 'score' },
  { label: 'Date', value: 'date' },
  { label: 'Budget', value: 'budget' },
];

export default function DemandesListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [sortBy, setSortBy] = useState('score');

  const loadDemandes = async () => {
    try {
      const data = await getRecommendedDemandesForPhotographe(user!.id);
      setDemandes(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
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

  const filteredAndSortedDemandes = demandes
    .filter((item) => {
      if (selectedCategorie && item.demande.categorie !== selectedCategorie) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'date':
          return new Date(b.demande.date_souhaitee).getTime() - new Date(a.demande.date_souhaitee).getTime();
        case 'budget':
          return (b.demande.budget_max || 0) - (a.demande.budget_max || 0);
        default:
          return 0;
      }
    });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#9E9E9E';
  };

  const renderDemandeCard = ({ item }: { item: any }) => {
    const { demande, score, reasons } = item;
    const daysUntil = Math.ceil((new Date(demande.date_souhaitee).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/photographe/demandes/demande-detail?id=${demande.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {demande.titre}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.categorieBadge}>
                <Text style={styles.categorieBadgeText}>{demande.categorie}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(demande.date_souhaitee).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              {daysUntil > 0 && ` (dans ${daysUntil} jours)`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {demande.lieu_ville} ({demande.lieu_code_postal})
            </Text>
          </View>

          {(demande.budget_min || demande.budget_max) && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {demande.budget_min && demande.budget_max
                  ? `${demande.budget_min}€ - ${demande.budget_max}€`
                  : demande.budget_min
                  ? `À partir de ${demande.budget_min}€`
                  : `Jusqu'à ${demande.budget_max}€`}
              </Text>
            </View>
          )}

          {demande.duree_estimee_heures && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{demande.duree_estimee_heures}h</Text>
            </View>
          )}

          <View style={styles.reasonsContainer}>
            {reasons.slice(0, 2).map((reason: string, index: number) => (
              <View key={index} style={styles.reasonChip}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={16} color="#999" />
              <Text style={styles.statText}>{demande.nombre_devis_recus || 0} devis</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.devisButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/photographe/devis/create-devis?demande=${demande.id}` as any);
            }}
          >
            <Text style={styles.devisButtonText}>Envoyer un devis</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Demandes disponibles</Text>
      </View>

      <View style={styles.filtersContainer}>
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

        <Text style={styles.filterLabel}>Trier par :</Text>
        <View style={styles.filterChips}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, sortBy === option.value && styles.filterChipSelected]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === option.value && styles.filterChipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredAndSortedDemandes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucune demande disponible</Text>
          <Text style={styles.emptyText}>
            {demandes.length === 0
              ? 'Il n\'y a actuellement aucune demande correspondant à votre profil'
              : 'Essayez de modifier vos filtres'}
          </Text>
          {demandes.length === 0 && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color="#5C6BC0" />
              <Text style={styles.infoText}>
                Assurez-vous d'avoir complété votre profil (spécialisations, rayon de déplacement, etc.)
                pour recevoir des demandes adaptées.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedDemandes}
          renderItem={renderDemandeCard}
          keyExtractor={(item) => item.demande.id}
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
    marginRight: 12,
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
  categorieBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  categorieBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
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
  reasonsContainer: {
    marginTop: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  reasonText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  devisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  devisButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'flex-start',
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
});
