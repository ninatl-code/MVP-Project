import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDevisForDemande, acceptDevis } from '@/lib/devisService';
import { Ionicons } from '@expo/vector-icons';

export default function DevisComparaisonScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = params.demande as string;

  const [devis, setDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevisId, setSelectedDevisId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'prix' | 'note'>('prix');

  const loadDevis = async () => {
    try {
      setLoading(true);
      const data = await getDevisForDemande(demandeId);
      
      // Filtrer uniquement les devis envoyés ou lus (pas accepté/refusé)
      const availableDevis = data.filter(
        (d: any) => d.statut === 'envoye' || d.statut === 'lu'
      );
      
      setDevis(availableDevis);
    } catch (error: any) {
      console.error('❌ Erreur chargement devis:', error);
      Alert.alert('Erreur', 'Impossible de charger les devis');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demandeId) {
      loadDevis();
    }
  }, [demandeId]);

  const handleAcceptDevis = async (devisId: string) => {
    Alert.alert(
      'Accepter ce devis',
      'En acceptant ce devis, les autres devis seront automatiquement refusés. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          style: 'default',
          onPress: async () => {
            try {
              await acceptDevis(devisId, user?.id || '');
              Alert.alert(
                'Devis accepté !',
                'Une réservation a été créée.',
                [
                  {
                    text: 'Voir la réservation',
                    onPress: () => router.push('/client/reservations/mes-reservations' as any),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'accepter le devis');
            }
          },
        },
      ]
    );
  };

  const sortedDevis = [...devis].sort((a, b) => {
    switch (sortBy) {
      case 'prix':
        return a.montant_total - b.montant_total;
      case 'note':
        return (b.photographe_note || 0) - (a.photographe_note || 0);
      default:
        return 0;
    }
  });

  const lowestPrice = Math.min(...devis.map((d) => d.montant_total));
  const highestNote = Math.max(...devis.map((d) => d.photographe_note || 0));

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (devis.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Aucun devis disponible</Text>
        <Text style={styles.emptyText}>
          Vous n'avez pas encore reçu de devis pour cette demande
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Comparer les devis ({devis.length})</Text>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Trier par :</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'prix' && styles.sortButtonActive]}
            onPress={() => setSortBy('prix')}
          >
            <Ionicons
              name="cash-outline"
              size={18}
              color={sortBy === 'prix' ? '#fff' : '#666'}
            />
            <Text
              style={[styles.sortButtonText, sortBy === 'prix' && styles.sortButtonTextActive]}
            >
              Prix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'note' && styles.sortButtonActive]}
            onPress={() => setSortBy('note')}
          >
            <Ionicons name="star-outline" size={18} color={sortBy === 'note' ? '#fff' : '#666'} />
            <Text
              style={[styles.sortButtonText, sortBy === 'note' && styles.sortButtonTextActive]}
            >
              Note
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sortedDevis.map((item, index) => {
          const isLowestPrice = item.montant_total === lowestPrice;
          const isHighestNote = item.photographe_note === highestNote && highestNote > 0;
          const isSelected = selectedDevisId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedDevisId(isSelected ? null : item.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.photographeNom}>{item.photographe_nom}</Text>
                  {item.photographe_verifie && (
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  )}
                </View>
                <View style={styles.badges}>
                  {isLowestPrice && (
                    <View style={styles.bestPriceBadge}>
                      <Text style={styles.badgeText}>Meilleur prix</Text>
                    </View>
                  )}
                  {isHighestNote && (
                    <View style={styles.bestNoteBadge}>
                      <Text style={styles.badgeText}>Meilleure note</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.devisTitre} numberOfLines={2}>
                {item.titre}
              </Text>

              <View style={styles.statsRow}>
                {item.photographe_note > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={16} color="#FFB300" />
                    <Text style={styles.statText}>{item.photographe_note.toFixed(1)}</Text>
                  </View>
                )}

                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.statText}>
                    {new Date(item.envoye_le).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>

              {isSelected && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.description} numberOfLines={3}>
                    {item.description}
                  </Text>

                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Tarif de base</Text>
                    <Text style={styles.pricingValue}>{item.tarif_base}€</Text>
                  </View>

                  {item.frais_deplacement > 0 && (
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>Frais déplacement</Text>
                      <Text style={styles.pricingValue}>{item.frais_deplacement}€</Text>
                    </View>
                  )}

                  {item.options_supplementaires && item.options_supplementaires.length > 0 && (
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>Options</Text>
                      <Text style={styles.pricingValue}>
                        {item.options_supplementaires.reduce(
                          (sum: number, opt: any) => sum + opt.prix,
                          0
                        )}
                        €
                      </Text>
                    </View>
                  )}

                  {item.remise > 0 && (
                    <View style={styles.pricingRow}>
                      <Text style={[styles.pricingLabel, { color: '#4CAF50' }]}>Remise</Text>
                      <Text style={[styles.pricingValue, { color: '#4CAF50' }]}>
                        -{item.remise}€
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`/client/devis/devis-detail?id=${item.id}` as any)}
                  >
                    <Text style={styles.viewDetailsButtonText}>Voir les détails</Text>
                    <Ionicons name="arrow-forward" size={16} color="#5C6BC0" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Total</Text>
                  <Text style={styles.priceValue}>{item.montant_total}€</Text>
                </View>

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptDevis(item.id)}
                >
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  sortButtonActive: {
    backgroundColor: '#5C6BC0',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#5C6BC0',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photographeNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bestPriceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestNoteBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  devisTitre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 10,
    gap: 6,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  backButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
});
