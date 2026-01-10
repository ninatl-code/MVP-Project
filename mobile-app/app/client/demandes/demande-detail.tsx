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
import { getDemandeById, annulerDemande } from '@/lib/demandeService';
import { getDemandeDevis } from '@/lib/devisService';
import { Ionicons } from '@expo/vector-icons';

const STATUT_COLORS = {
  ouverte: '#4CAF50',
  en_cours: '#2196F3',
  pourvue: '#5C6BC0',
  annulee: '#FF9800',
  expiree: '#9E9E9E',
};

const STATUT_LABELS = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  pourvue: 'Pourvue',
  annulee: 'Annulée',
  expiree: 'Expirée',
};

export default function DemandeDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = params.id as string;

  const [demande, setDemande] = useState<any>(null);
  const [devis, setDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [demandeData, devisData] = await Promise.all([
        getDemandeById(demandeId),
        getDemandeDevis(demandeId),
      ]);

      setDemande(demandeData);
      setDevis(devisData);
    } catch (error: any) {
      console.error('❌ Erreur chargement demande:', error);
      Alert.alert('Erreur', 'Impossible de charger la demande');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demandeId) {
      loadData();
    }
  }, [demandeId]);

  const handleCancelDemande = () => {
    Alert.alert(
      'Annuler la demande',
      `Êtes-vous sûr de vouloir annuler cette demande ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              await annulerDemande(demandeId);
              Alert.alert('Succès', 'Demande annulée', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'annuler la demande');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (!demande) {
    return null;
  }

  const isOuverte = demande.statut === 'ouverte';
  const isPourvue = demande.statut === 'pourvue';
  const daysRemaining = demande.expire_le
    ? Math.max(0, Math.ceil((new Date(demande.expire_le).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statutBadge,
                { backgroundColor: STATUT_COLORS[demande.statut as keyof typeof STATUT_COLORS] },
              ]}
            >
              <Text style={styles.statutBadgeText}>
                {STATUT_LABELS[demande.statut as keyof typeof STATUT_LABELS]}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{demande.titre}</Text>
          <View style={styles.categorieBadge}>
            <Text style={styles.categorieBadgeText}>{demande.categorie}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{demande.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Détails de la prestation</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#5C6BC0" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date souhaitée</Text>
              <Text style={styles.detailValue}>
                {new Date(demande.date_souhaitee).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {demande.heure_souhaitee && ` à ${demande.heure_souhaitee}`}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#5C6BC0" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Lieu</Text>
              <Text style={styles.detailValue}>
                {demande.lieu_adresse && `${demande.lieu_adresse}, `}
                {demande.lieu_ville} ({demande.lieu_code_postal})
              </Text>
            </View>
          </View>

          {demande.duree_estimee_heures && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#5C6BC0" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Durée estimée</Text>
                <Text style={styles.detailValue}>{demande.duree_estimee_heures} heures</Text>
              </View>
            </View>
          )}

          {(demande.budget_min || demande.budget_max) && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color="#5C6BC0" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Budget</Text>
                <Text style={styles.detailValue}>
                  {demande.budget_min && demande.budget_max
                    ? `${demande.budget_min}€ - ${demande.budget_max}€`
                    : demande.budget_min
                    ? `À partir de ${demande.budget_min}€`
                    : `Jusqu'à ${demande.budget_max}€`}
                </Text>
              </View>
            </View>
          )}

          {isOuverte && daysRemaining > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="hourglass-outline" size={20} color="#FF9800" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Expire dans</Text>
                <Text style={styles.detailValue}>{daysRemaining} jours</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Statistiques</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="people-outline" size={32} color="#5C6BC0" />
              <Text style={styles.statValue}>{demande.photographes_notifies?.length || 0}</Text>
              <Text style={styles.statLabel}>Photographes notifiés</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="document-text-outline" size={32} color="#5C6BC0" />
              <Text style={styles.statValue}>{demande.nombre_devis_recus || 0}</Text>
              <Text style={styles.statLabel}>Devis reçus</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="heart-outline" size={32} color="#5C6BC0" />
              <Text style={styles.statValue}>{demande.photographes_interesses?.length || 0}</Text>
              <Text style={styles.statLabel}>Photographes intéressés</Text>
            </View>
          </View>
        </View>

        {devis.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Devis reçus ({devis.length})</Text>
              {devis.length > 1 && (
                <TouchableOpacity onPress={() => router.push(`/client/devis/devis-comparaison?demande=${demandeId}` as any)}>
                  <Text style={styles.compareLink}>Comparer</Text>
                </TouchableOpacity>
              )}
            </View>

            {devis.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.devisCard}
                onPress={() => router.push(`/client/devis/devis-detail?id=${d.id}`)}
              >
                <View style={styles.devisHeader}>
                  <View>
                    <Text style={styles.devisPhotographe}>{d.photographe_nom || 'Photographe'}</Text>
                    <Text style={styles.devisTitre}>{d.titre}</Text>
                  </View>
                  <View style={styles.devisPrix}>
                    <Text style={styles.devisMontant}>{d.montant_total}€</Text>
                    {d.statut === 'accepte' && (
                      <View style={styles.accepteBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.accepteText}>Accepté</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.devisFooter}>
                  <Text style={styles.devisDate}>
                    Envoyé le {new Date(d.envoye_le).toLocaleDateString('fr-FR')}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isOuverte && devis.length === 0 && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#5C6BC0" />
            <Text style={styles.infoText}>
              Votre demande a été envoyée à {demande.photographes_notifies?.length || 0}{' '}
              photographe(s). Vous recevrez une notification dès qu'un photographe vous enverra un
              devis.
            </Text>
          </View>
        )}
      </ScrollView>

      {isOuverte && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDemande}>
            <Ionicons name="close-circle-outline" size={20} color="#F44336" />
            <Text style={styles.cancelButtonText}>Annuler la demande</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statutBadgeText: {
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
    marginBottom: 12,
  },
  categorieBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
  },
  categorieBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compareLink: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
  },
  devisCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  devisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  devisPhotographe: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  devisTitre: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  devisPrix: {
    alignItems: 'flex-end',
  },
  devisMontant: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  accepteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  accepteText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  devisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  devisDate: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
