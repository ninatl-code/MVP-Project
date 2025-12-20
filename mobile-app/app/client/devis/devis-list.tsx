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
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

const STATUT_COLORS = {
  envoye: '#2196F3',
  lu: '#FF9800',
  accepte: '#4CAF50',
  refuse: '#F44336',
  expire: '#9E9E9E',
};

const STATUT_LABELS = {
  envoye: 'Envoyé',
  lu: 'Lu',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

export default function DevisListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [devis, setDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatut, setSelectedStatut] = useState('');

  const loadDevis = async () => {
    try {
      // Récupérer toutes les demandes du client avec leurs devis
      const { data: demandesData, error: demandesError } = await supabase
        .from('demandes_client')
        .select('id, titre')
        .eq('client_id', user!.id);

      if (demandesError) throw demandesError;

      if (!demandesData || demandesData.length === 0) {
        setDevis([]);
        return;
      }

      const demandeIds = demandesData.map((d) => d.id);

      // Récupérer tous les devis pour ces demandes
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select(`
          id,
          demande_id,
          photographe_id,
          titre,
          description,
          montant_total,
          statut,
          envoye_le,
          lu_le,
          expire_le,
          profils_photographe!devis_photographe_id_fkey (
            user_id,
            photo_profil,
            note_moyenne,
            statut_verification,
            profiles!profils_photographe_user_id_fkey (nom)
          )
        `)
        .in('demande_id', demandeIds)
        .order('envoye_le', { ascending: false });

      if (devisError) throw devisError;

      // Formater les données
      const formattedDevis = (devisData || []).map((d: any) => {
        const demande = demandesData.find((dm) => dm.id === d.demande_id);
        return {
          ...d,
          demande_titre: demande?.titre || 'Demande supprimée',
          photographe_nom: d.profils_photographe?.profiles?.nom || 'Photographe',
          photographe_photo: d.profils_photographe?.photo_profil,
          photographe_note: d.profils_photographe?.note_moyenne || 0,
          photographe_verifie: d.profils_photographe?.statut_verification === 'verifie',
        };
      });

      setDevis(formattedDevis);
    } catch (error: any) {
      console.error('❌ Erreur chargement devis:', error);
      Alert.alert('Erreur', 'Impossible de charger les devis');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDevis();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDevis();
  }, []);

  const filteredDevis = devis.filter((d) => {
    if (selectedStatut && d.statut !== selectedStatut) return false;
    return true;
  });

  const renderDevisCard = ({ item }: { item: any }) => {
    const isExpireSoon =
      item.statut === 'envoye' &&
      item.expire_le &&
      new Date(item.expire_le).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/client/devis/devis-detail?id=${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.photographeNom}>{item.photographe_nom}</Text>
            {item.photographe_verifie && (
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            )}
          </View>
          <View
            style={[
              styles.statutBadge,
              { backgroundColor: STATUT_COLORS[item.statut as keyof typeof STATUT_COLORS] },
            ]}
          >
            <Text style={styles.statutText}>
              {STATUT_LABELS[item.statut as keyof typeof STATUT_LABELS]}
            </Text>
          </View>
        </View>

        <Text style={styles.devisTitre} numberOfLines={2}>
          {item.titre}
        </Text>

        <Text style={styles.demandeTitre} numberOfLines={1}>
          Pour: {item.demande_titre}
        </Text>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Envoyé le {new Date(item.envoye_le).toLocaleDateString('fr-FR')}
            </Text>
          </View>

          {item.photographe_note > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="star" size={16} color="#FFB300" />
              <Text style={styles.infoText}>{item.photographe_note.toFixed(1)}</Text>
            </View>
          )}

          {isExpireSoon && (
            <View style={[styles.infoRow, styles.warningRow]}>
              <Ionicons name="time-outline" size={16} color="#FF9800" />
              <Text style={styles.warningText}>Expire bientôt</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.montant}>{item.montant_total}€</Text>
          {item.statut === 'accepte' && (
            <TouchableOpacity
              style={styles.reservationButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/client/reservations/mes-reservations` as any);
              }}
            >
              <Text style={styles.reservationButtonText}>Voir la réservation</Text>
              <Ionicons name="arrow-forward" size={16} color="#5C6BC0" />
            </TouchableOpacity>
          )}
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
        <Text style={styles.title}>Mes devis</Text>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Statut :</Text>
        <View style={styles.filterChips}>
          {['', 'envoye', 'lu', 'accepte', 'refuse', 'expire'].map((statut) => (
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
                {statut === ''
                  ? 'Tous'
                  : STATUT_LABELS[statut as keyof typeof STATUT_LABELS]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredDevis.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucun devis</Text>
          <Text style={styles.emptyText}>
            {devis.length === 0
              ? 'Vous n\'avez pas encore reçu de devis. Créez une demande pour en recevoir !'
              : 'Aucun devis ne correspond à vos filtres'}
          </Text>
          {devis.length === 0 && (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/client/demandes/nouvelle-demande')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Créer une demande</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredDevis}
          renderItem={renderDevisCard}
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
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  photographeNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  devisTitre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  demandeTitre: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  warningRow: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 6,
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
  montant: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  reservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reservationButtonText: {
    fontSize: 13,
    color: '#5C6BC0',
    fontWeight: '600',
    marginRight: 4,
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
});
