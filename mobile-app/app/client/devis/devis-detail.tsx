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
import { getDevisById, acceptDevis, refuseDevis, markDevisAsRead } from '@/lib/devisService';
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

export default function DevisDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const devisId = params.id as string;

  const [devis, setDevis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDevis = async () => {
    try {
      setLoading(true);
      const data = await getDevisById(devisId);
      setDevis(data);

      // Marquer comme lu si ce n'est pas déjà fait
      if (data.statut === 'envoye') {
        await markDevisAsRead(devisId);
        // Recharger pour mettre à jour le statut
        const updatedData = await getDevisById(devisId);
        setDevis(updatedData);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement devis:', error);
      Alert.alert('Erreur', 'Impossible de charger le devis');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (devisId) {
      loadDevis();
    }
  }, [devisId]);

  const handleAcceptDevis = async () => {
    Alert.alert(
      'Accepter le devis',
      'En acceptant ce devis, une réservation sera créée et les autres devis pour cette demande seront automatiquement refusés. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await acceptDevis(devisId, user?.id || '');
              Alert.alert(
                'Devis accepté !',
                'Une réservation a été créée. Vous pouvez maintenant procéder au paiement.',
                [
                  {
                    text: 'Voir la réservation',
                    onPress: () => router.push('/client/reservations/mes-reservations'),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'accepter le devis');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefuseDevis = async () => {
    Alert.alert('Refuser le devis', 'Êtes-vous sûr de vouloir refuser ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await refuseDevis(devisId);
            Alert.alert('Devis refusé', '', [{ text: 'OK', onPress: () => router.back() }]);
          } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de refuser le devis');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (!devis) {
    return null;
  }

  const canAcceptOrRefuse = devis.statut === 'envoye' || devis.statut === 'lu';
  const isExpireSoon =
    canAcceptOrRefuse &&
    devis.expire_le &&
    new Date(devis.expire_le).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

  const daysRemaining = devis.expire_le
    ? Math.max(0, Math.ceil((new Date(devis.expire_le).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View
            style={[
              styles.statutBadge,
              { backgroundColor: STATUT_COLORS[devis.statut as keyof typeof STATUT_COLORS] },
            ]}
          >
            <Text style={styles.statutText}>
              {STATUT_LABELS[devis.statut as keyof typeof STATUT_LABELS]}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{devis.titre}</Text>
          <TouchableOpacity
            onPress={() =>
              router.push(`/client/particuliers/photographe-profile?id=${devis.photographe_user_id}` as any)
            }
          >
            <Text style={styles.photographeLink}>
              par {devis.photographe_nom || 'Photographe'}
            </Text>
          </TouchableOpacity>
        </View>

        {isExpireSoon && (
          <View style={styles.warningCard}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
            <Text style={styles.warningText}>
              Ce devis expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{devis.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tarification</Text>

          <View style={styles.tarificationRow}>
            <Text style={styles.tarificationLabel}>Tarif de base</Text>
            <Text style={styles.tarificationValue}>{devis.tarif_base}€</Text>
          </View>

          {devis.frais_deplacement > 0 && (
            <View style={styles.tarificationRow}>
              <Text style={styles.tarificationLabel}>Frais de déplacement</Text>
              <Text style={styles.tarificationValue}>{devis.frais_deplacement}€</Text>
            </View>
          )}

          {devis.options_supplementaires && devis.options_supplementaires.length > 0 && (
            <View style={styles.optionsContainer}>
              <Text style={styles.tarificationLabel}>Options supplémentaires :</Text>
              {devis.options_supplementaires.map((option: any, index: number) => (
                <View key={index} style={styles.optionRow}>
                  <Text style={styles.optionNom}>{option.nom}</Text>
                  <Text style={styles.optionPrix}>{option.prix}€</Text>
                </View>
              ))}
            </View>
          )}

          {devis.remise > 0 && (
            <View style={styles.tarificationRow}>
              <Text style={[styles.tarificationLabel, styles.remiseLabel]}>Remise</Text>
              <Text style={[styles.tarificationValue, styles.remiseValue]}>-{devis.remise}€</Text>
            </View>
          )}

          <View style={[styles.tarificationRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{devis.montant_total}€</Text>
          </View>
        </View>

        {devis.conditions_particulieres && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Conditions particulières</Text>
            <Text style={styles.description}>{devis.conditions_particulieres}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Envoyé le</Text>
              <Text style={styles.infoValue}>
                {new Date(devis.envoye_le).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {devis.lu_le && (
            <View style={styles.infoRow}>
              <Ionicons name="eye-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lu le</Text>
                <Text style={styles.infoValue}>
                  {new Date(devis.lu_le).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          )}

          {devis.delai_validite_jours > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="hourglass-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Validité</Text>
                <Text style={styles.infoValue}>{devis.delai_validite_jours} jours</Text>
              </View>
            </View>
          )}

          {devis.expire_le && (
            <View style={styles.infoRow}>
              <Ionicons name="alarm-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Expire le</Text>
                <Text style={styles.infoValue}>
                  {new Date(devis.expire_le).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {devis.statut === 'accepte' && devis.reservation_id && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.successText}>Ce devis a été accepté !</Text>
          </View>
        )}

        {devis.statut === 'refuse' && (
          <View style={styles.refuseCard}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.refuseText}>Ce devis a été refusé</Text>
          </View>
        )}
      </ScrollView>

      {canAcceptOrRefuse && !actionLoading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.refuseButton}
            onPress={handleRefuseDevis}
            disabled={actionLoading}
          >
            <Ionicons name="close-outline" size={20} color="#F44336" />
            <Text style={styles.refuseButtonText}>Refuser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAcceptDevis}
            disabled={actionLoading}
          >
            <Ionicons name="checkmark-outline" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}

      {actionLoading && (
        <View style={styles.footer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
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
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  statutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  photographeLink: {
    fontSize: 16,
    color: '#5C6BC0',
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tarificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tarificationLabel: {
    fontSize: 15,
    color: '#666',
  },
  tarificationValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  optionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingLeft: 12,
  },
  optionNom: {
    fontSize: 14,
    color: '#666',
  },
  optionPrix: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  remiseLabel: {
    color: '#4CAF50',
  },
  remiseValue: {
    color: '#4CAF50',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#333',
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  successCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  successText: {
    flex: 1,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 12,
  },
  refuseCard: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  refuseText: {
    flex: 1,
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  refuseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  refuseButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5C6BC0',
    padding: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});
