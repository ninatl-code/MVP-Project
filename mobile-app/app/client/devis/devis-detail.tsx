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
import { getDemandeDevis, accepterDevis, refuserDevis, getDevisById } from '@/lib/devisService';
import { getDemandeById } from '@/lib/demandeService';
import { Ionicons } from '@expo/vector-icons';

export default function ClientDevisDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = params.demandeId as string;

  const [demande, setDemande] = useState<any>(null);
  const [devisList, setDevisList] = useState<any[]>([]);
  const [selectedDevis, setSelectedDevis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [demandeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger la demande
      const demandeData = await getDemandeById(demandeId);
      setDemande(demandeData);

      // Charger tous les devis
      const devisData = await getDemandeDevis(demandeId);
      setDevisList(devisData);

      // Sélectionner le premier devis par défaut
      if (devisData.length > 0) {
        setSelectedDevis(devisData[0]);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les devis');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedDevis) return;

    Alert.alert(
      'Accepter ce devis',
      `Vous êtes sur le point d'accepter le devis de ${selectedDevis.photographe?.nom || 'ce photographe'}.\n\nCela refusera automatiquement tous les autres devis et marquera votre demande comme pourvue.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await accepterDevis(selectedDevis.id, demandeId);
              
              Alert.alert(
                'Devis accepté',
                'Le devis a été accepté avec succès. Le photographe va être notifié.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.push('/client/reservations/reservations'),
                  },
                ]
              );
            } catch (error: any) {
              console.error('❌ Erreur acceptation:', error);
              Alert.alert('Erreur', error.message || 'Impossible d\'accepter le devis');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefuse = async () => {
    if (!selectedDevis) return;

    Alert.alert(
      'Refuser ce devis',
      `Êtes-vous sûr de vouloir refuser le devis de ${selectedDevis.photographe?.nom || 'ce photographe'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await refuserDevis(selectedDevis.id);
              
              // Recharger les données
              await loadData();
              
              Alert.alert('Devis refusé', 'Le devis a été refusé.');
            } catch (error: any) {
              console.error('❌ Erreur refus:', error);
              Alert.alert('Erreur', error.message || 'Impossible de refuser le devis');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'accepte':
        return { text: 'Accepté', color: '#4CAF50', icon: 'checkmark-circle' as const };
      case 'refuse':
        return { text: 'Refusé', color: '#f44336', icon: 'close-circle' as const };
      case 'lu':
        return { text: 'Lu', color: '#2196F3', icon: 'eye' as const };
      case 'envoye':
        return { text: 'Nouveau', color: '#FF9800', icon: 'mail-unread' as const };
      case 'expire':
        return { text: 'Expiré', color: '#9E9E9E', icon: 'time' as const };
      default:
        return { text: statut, color: '#9E9E9E', icon: 'help-circle' as const };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (!demande || devisList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Aucun devis</Text>
        <Text style={styles.emptyText}>
          Cette demande n'a pas encore reçu de devis.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = selectedDevis ? getStatutBadge(selectedDevis.statut) : null;

  return (
    <View style={styles.container}>
      {/* Header avec demande */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {demande.titre}
          </Text>
          <Text style={styles.headerSubtitle}>
            {devisList.length} devis reçu{devisList.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Liste des photographes */}
      {devisList.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photographerList}
          contentContainerStyle={styles.photographerListContent}
        >
          {devisList.map((devis) => {
            const isSelected = selectedDevis?.id === devis.id;
            const devisBadge = getStatutBadge(devis.statut);
            
            return (
              <TouchableOpacity
                key={devis.id}
                style={[
                  styles.photographerCard,
                  isSelected && styles.photographerCardSelected,
                ]}
                onPress={() => setSelectedDevis(devis)}
              >
                <View
                  style={[
                    styles.photographerAvatar,
                    { backgroundColor: devisBadge.color + '20' },
                  ]}
                >
                  <Text style={[styles.photographerInitial, { color: devisBadge.color }]}>
                    {devis.photographe?.nom?.charAt(0) || '?'}
                  </Text>
                </View>
                <Text style={styles.photographerName} numberOfLines={1}>
                  {devis.photographe?.nom || 'Photographe'}
                </Text>
                <Text style={styles.photographerPrice}>{devis.montant_total}€</Text>
                <View style={[styles.miniStatusBadge, { backgroundColor: devisBadge.color }]}>
                  <Ionicons name={devisBadge.icon} size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Détails du devis sélectionné */}
      {selectedDevis && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* En-tête du devis */}
          <View style={styles.devisHeader}>
            <View style={styles.photographerInfo}>
              <View
                style={[
                  styles.photographerAvatarLarge,
                  { backgroundColor: badge!.color + '20' },
                ]}
              >
                <Text style={[styles.photographerInitialLarge, { color: badge!.color }]}>
                  {selectedDevis.photographe?.nom?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.photographerDetails}>
                <Text style={styles.photographerNameLarge}>
                  {selectedDevis.photographe?.nom || 'Photographe'}
                </Text>
                {selectedDevis.photographe?.ville && (
                  <View style={styles.photographerLocation}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.photographerLocationText}>
                      {selectedDevis.photographe.ville}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: badge!.color + '20' }]}>
              <Ionicons name={badge!.icon} size={16} color={badge!.color} />
              <Text style={[styles.statusText, { color: badge!.color }]}>
                {badge!.text}
              </Text>
            </View>
          </View>

          {/* Titre et description */}
          <View style={styles.section}>
            <Text style={styles.devisTitle}>{selectedDevis.titre}</Text>
            {selectedDevis.description && (
              <Text style={styles.devisDescription}>{selectedDevis.description}</Text>
            )}
          </View>

          {/* Message personnalisé */}
          {selectedDevis.message_personnalise && (
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Ionicons name="chatbubble-outline" size={20} color="#5C6BC0" />
                <Text style={styles.messageTitle}>Message du photographe</Text>
              </View>
              <Text style={styles.messageText}>{selectedDevis.message_personnalise}</Text>
            </View>
          )}

          {/* Tarification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarification</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tarif de base</Text>
              <Text style={styles.priceValue}>{selectedDevis.tarif_base}€</Text>
            </View>
            {selectedDevis.frais_deplacement > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Frais de déplacement</Text>
                <Text style={styles.priceValue}>+{selectedDevis.frais_deplacement}€</Text>
              </View>
            )}
            {selectedDevis.remise_montant > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Remise</Text>
                <Text style={[styles.priceValue, { color: '#4CAF50' }]}>
                  -{selectedDevis.remise_montant}€
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Montant total</Text>
              <Text style={styles.totalValue}>{selectedDevis.montant_total}€</Text>
            </View>
          </View>

          {/* Prestation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails de la prestation</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color="#5C6BC0" />
                <Text style={styles.detailLabel}>Durée</Text>
                <Text style={styles.detailValue}>
                  {selectedDevis.duree_prestation_heures}h
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="camera-outline" size={20} color="#5C6BC0" />
                <Text style={styles.detailLabel}>Photos</Text>
                <Text style={styles.detailValue}>{selectedDevis.nb_photos_livrees}</Text>
              </View>
              {selectedDevis.nb_videos_livrees > 0 && (
                <View style={styles.detailItem}>
                  <Ionicons name="videocam-outline" size={20} color="#5C6BC0" />
                  <Text style={styles.detailLabel}>Vidéos</Text>
                  <Text style={styles.detailValue}>{selectedDevis.nb_videos_livrees}</Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color="#5C6BC0" />
                <Text style={styles.detailLabel}>Livraison</Text>
                <Text style={styles.detailValue}>
                  {selectedDevis.delai_livraison_jours}j
                </Text>
              </View>
            </View>
          </View>

          {/* Retouches */}
          {(selectedDevis.retouches_incluses || selectedDevis.niveau_retouche) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Retouches</Text>
              <View style={styles.infoRow}>
                <Ionicons name="brush-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  {selectedDevis.retouches_incluses && (
                    <Text style={styles.infoText}>
                      {selectedDevis.retouches_incluses} retouches incluses
                    </Text>
                  )}
                  {selectedDevis.niveau_retouche && (
                    <Text style={styles.infoTextSecondary}>
                      Niveau : {selectedDevis.niveau_retouche}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Paiement */}
          {selectedDevis.acompte_requis_percent > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conditions de paiement</Text>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  Acompte de {selectedDevis.acompte_requis_percent}% requis (
                  {((selectedDevis.montant_total * selectedDevis.acompte_requis_percent) / 100).toFixed(2)}€)
                </Text>
              </View>
            </View>
          )}

          {/* Validité */}
          {selectedDevis.expire_le && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  Valide jusqu'au{' '}
                  {new Date(selectedDevis.expire_le).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          )}

          {/* Dates */}
          <View style={styles.datesSection}>
            <Text style={styles.dateText}>
              Envoyé le {new Date(selectedDevis.envoye_le).toLocaleDateString('fr-FR')}
            </Text>
            {selectedDevis.lu_le && (
              <Text style={styles.dateText}>
                Lu le {new Date(selectedDevis.lu_le).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* Actions */}
      {selectedDevis && selectedDevis.statut !== 'accepte' && selectedDevis.statut !== 'refuse' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.refuseButton, actionLoading && styles.buttonDisabled]}
            onPress={handleRefuse}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#f44336" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#f44336" />
                <Text style={styles.refuseButtonText}>Refuser</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, actionLoading && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  photographerList: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  photographerListContent: {
    padding: 16,
    gap: 12,
  },
  photographerCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    minWidth: 100,
    position: 'relative',
  },
  photographerCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#E8EAF6',
  },
  photographerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photographerInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  photographerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  photographerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  miniStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  devisHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  photographerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  photographerAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photographerInitialLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  photographerDetails: {
    flex: 1,
  },
  photographerNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  photographerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photographerLocationText: {
    fontSize: 14,
    color: '#666',
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  devisTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  devisDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  messageCard: {
    backgroundColor: '#E8EAF6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  infoTextSecondary: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  datesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  refuseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  refuseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  },
  backButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
