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
import { getDemandeById } from '@/lib/demandeService';
import { calculateMatchScore } from '@/lib/matchingService';
import { countDemandeDevis, hasAlreadySentDevis } from '@/lib/devisService';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';

export default function PhotographeDemandeDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = params.id as string;

  const [demande, setDemande] = useState<any>(null);
  const [photographe, setPhotographe] = useState<any>(null);
  const [matchScore, setMatchScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nombreDevis, setNombreDevis] = useState(0);
  const [dejaEnvoye, setDejaEnvoye] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger la demande
      const demandeData = await getDemandeById(demandeId);
      setDemande(demandeData);

      // Charger le profil photographe
      // Note: profils_photographe.id est lié à profiles.id via la clé primaire
      const { data: photoData, error: photoError } = await supabase
        .from('profils_photographe')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (photoError) throw photoError;
      setPhotographe(photoData);

      // Calculer le score de matching
      if (demandeData && photoData) {
        const score = calculateMatchScore(demandeData, photoData);
        setMatchScore(score);
      }

      // Charger le nombre de devis pour cette demande
      const count = await countDemandeDevis(demandeId);
      setNombreDevis(count);

      // Vérifier si ce photographe a déjà envoyé un devis
      const alreadySent = await hasAlreadySentDevis(user!.id, demandeId);
      setDejaEnvoye(alreadySent);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (!demande || !photographe || !matchScore) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#9E9E9E';
  };

  const daysUntil = Math.ceil((new Date(demande.date_souhaitee).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(matchScore.totalScore) }]}>
            <Text style={styles.scoreValue}>{matchScore.totalScore}</Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{demande.titre}</Text>
          <View style={styles.categorieBadge}>
            <Text style={styles.categorieBadgeText}>{demande.categorie}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pourquoi cette demande vous correspond</Text>
          <View style={styles.reasonsContainer}>
            {matchScore.reasons.map((reason: string, index: number) => (
              <View key={index} style={styles.reasonItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>

          <View style={styles.scoreBreakdown}>
            <Text style={styles.breakdownTitle}>Détail du score :</Text>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Spécialisation</Text>
              <Text style={styles.breakdownValue}>{matchScore.specialisationPoints}/40</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Proximité</Text>
              <Text style={styles.breakdownValue}>{matchScore.locationPoints}/30</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Budget compatible</Text>
              <Text style={styles.breakdownValue}>{matchScore.budgetPoints}/20</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Vérification</Text>
              <Text style={styles.breakdownValue}>{matchScore.verificationPoints}/10</Text>
            </View>
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
              {daysUntil > 0 && (
                <Text style={styles.detailHint}>Dans {daysUntil} jours</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#5C6BC0" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Lieu</Text>
              <Text style={styles.detailValue}>
                {demande.lieu_ville} ({demande.lieu_code_postal})
              </Text>
              {matchScore.distance && (
                <Text style={styles.detailHint}>
                  {matchScore.distance < 1 
                    ? `${Math.round(matchScore.distance * 1000)} m de vous`
                    : `${Math.round(matchScore.distance)} km de vous`}
                </Text>
              )}
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
                {photographe.budget_min_prestation && (
                  <Text style={styles.detailHint}>
                    Votre tarif minimum : {photographe.budget_min_prestation}€
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Compétition</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="document-text-outline" size={24} color="#999" />
              <Text style={styles.statValue}>{nombreDevis}</Text>
              <Text style={styles.statLabel}>Devis envoyés</Text>
            </View>
            {dejaEnvoye && (
              <View style={styles.statBox}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={[styles.statLabel, { color: '#4CAF50', fontWeight: '600' }]}>Vous avez déjà envoyé un devis</Text>
              </View>
            )}
          </View>
        </View>

        {demande.statut !== 'ouverte' && (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF9800" />
            <Text style={styles.alertText}>
              Cette demande n'est plus disponible (statut : {demande.statut})
            </Text>
          </View>
        )}
      </ScrollView>

      {demande.statut === 'ouverte' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => router.push(`/shared/messages/messages-list?recipientId=${demande.client_id}` as any)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#5C6BC0" />
            <Text style={styles.secondaryButtonText}>Contacter le client</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.devisButton, dejaEnvoye && styles.disabledButton]} 
            onPress={() => !dejaEnvoye && router.push(`/photographe/devis/devis-create?demandeId=${demandeId}` as any)}
            disabled={dejaEnvoye}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.devisButtonText}>
              {dejaEnvoye ? 'Devis déjà envoyé' : 'Envoyer un devis'}
            </Text>
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
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 2,
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
  reasonsContainer: {
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  scoreBreakdown: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6BC0',
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
  detailHint: {
    fontSize: 13,
    color: '#5C6BC0',
    marginTop: 2,
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
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 12,
    fontWeight: '500',
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
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5C6BC0',
  },
  secondaryButtonText: {
    color: '#5C6BC0',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  devisButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5C6BC0',
    padding: 16,
    borderRadius: 12,
  },
  devisButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
});
