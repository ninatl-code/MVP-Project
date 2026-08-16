/**
 * Page de création de devis - version JavaScript pour éviter les erreurs TypeScript
 * Alignée sur le schéma Supabase réel (pas de champs photo)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDemandeById } from '@/lib/demandeService';
import { createDevis } from '@/lib/devisService';
import { Ionicons } from '@expo/vector-icons';

export default function DevisCreateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = Array.isArray(params?.demandeId)
    ? params.demandeId[0]
    : params?.demandeId || '';

  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Champs obligatoires
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [messagePersonnalise, setMessagePersonnalise] = useState('');
  const [tarifBase, setTarifBase] = useState('');
  const [dureePrestation, setDureePrestation] = useState('');
  const [acomptePercent, setAcomptePercent] = useState('30');
  const [validiteJours, setValiditeJours] = useState('15');

  // Champs optionnels courants
  const [fraisDeplacement, setFraisDeplacement] = useState('');
  const [remiseMontant, setRemiseMontant] = useState('');
  const [datesDisponibles, setDatesDisponibles] = useState('');
  const [conditionsAnnulation, setConditionsAnnulation] = useState('');

  // Options avancées
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modalitesPaiement, setModalitesPaiement] = useState('');
  const [droitCommercial, setDroitCommercial] = useState(false);
  const [assuranceIncluse, setAssuranceIncluse] = useState(false);

  useEffect(() => {
    if (demandeId) {
      loadDemande();
    } else {
      setLoading(false);
    }
  }, [demandeId]);

  const loadDemande = async () => {
    try {
      setLoading(true);
      const data = await getDemandeById(demandeId);
      setDemande(data);

      // Pré-remplir avec les infos de la demande
      if (data && data.titre) {
        setTitre('Devis pour ' + data.titre);
      }
      if (data && data.description) {
        setDescription(data.description);
      }
    } catch (error) {
      console.error('Erreur chargement demande:', error);
      Alert.alert('Erreur', 'Impossible de charger la demande');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculateMontantTotal = () => {
    const base = parseFloat(tarifBase) || 0;
    const deplacement = parseFloat(fraisDeplacement) || 0;
    const remise = parseFloat(remiseMontant) || 0;
    return base + deplacement - remise;
  };

  // Convertit "15/06/2024" -> "2024-06-15" (format attendu par Postgres pour une colonne date)
  const parseDateFr = (dateStr) => {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!day || !month || !year) return null;
    if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) {
      return null;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Transforme la chaîne "15/06/2024, 22/06/2024" en tableau de dates ISO pour la colonne date[]
  const parseDatesDisponibles = (input) => {
    if (!input || !input.trim()) return null;
    const dates = input
      .split(',')
      .map((d) => parseDateFr(d))
      .filter((d) => d !== null);
    return dates.length > 0 ? dates : null;
  };

  // Transforme une chaîne "30% à la commande, 70% à la livraison" en tableau de strings pour la colonne text[]
  const parseModalitesPaiement = (input) => {
    if (!input || !input.trim()) return null;
    const items = input
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    return items.length > 0 ? items : null;
  };

  const handleSubmit = async () => {
    // Validation des champs obligatoires
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour le devis');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une description');
      return;
    }
    if (!tarifBase || parseFloat(tarifBase) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un tarif de base valide');
      return;
    }
    if (!dureePrestation || parseFloat(dureePrestation) <= 0) {
      Alert.alert('Erreur', 'Veuillez indiquer la durée de la prestation');
      return;
    }

    // Validation du format des dates disponibles si renseignées
    let datesDisponiblesParsed = null;
    if (datesDisponibles.trim()) {
      datesDisponiblesParsed = parseDatesDisponibles(datesDisponibles);
      if (!datesDisponiblesParsed) {
        Alert.alert(
          'Erreur',
          'Format de dates invalide. Utilisez le format JJ/MM/AAAA séparé par des virgules, ex: 15/06/2024, 22/06/2024'
        );
        return;
      }
    }

    const montantTotal = calculateMontantTotal();
    if (montantTotal <= 0) {
      Alert.alert('Erreur', 'Le montant total doit être positif');
      return;
    }

    try {
      setSubmitting(true);
      await createDevis(user.id, {
        demande_id: demandeId,
        client_id: demande && demande.client_id ? demande.client_id : '',
        titre: titre.trim(),
        description: description.trim(),
        message_personnalise: messagePersonnalise.trim() || undefined,

        tarif_base: parseFloat(tarifBase),
        montant_total: montantTotal,
        duree_prestation_heures: parseFloat(dureePrestation),

        frais_deplacement: parseFloat(fraisDeplacement) || 0,
        remise_montant: parseFloat(remiseMontant) || 0,
        acompte_percent: parseFloat(acomptePercent) || 30,
        conditions_annulation: conditionsAnnulation.trim() || null,
        dates_disponibles: datesDisponiblesParsed,
        modalites_paiement: parseModalitesPaiement(modalitesPaiement),
      });

      Alert.alert(
        'Devis envoyé',
        'Votre devis a été envoyé avec succès au client.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur envoi devis:', error);
      Alert.alert('Erreur', error.message || "Impossible d'envoyer le devis");
    } finally {
      setSubmitting(false);
    }
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

  const montantTotal = calculateMontantTotal();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un devis</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Récapitulatif de la demande */}
          <View style={styles.demandeCard}>
            <Text style={styles.demandeTitle}>{demande.titre}</Text>
            <View style={styles.demandeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{demande.categorie}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{demande.date_souhaitee || ''}</Text>
              </View>
            </View>
          </View>

          {/* Informations du devis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations du devis</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Titre du devis</Text>
              <TextInput
                style={styles.input}
                value={titre}
                onChangeText={setTitre}
                placeholder="Titre du devis"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Description du devis"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message personnalisé (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={messagePersonnalise}
                onChangeText={setMessagePersonnalise}
                placeholder="Message personnalisé pour le client"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tarif de base (DH)</Text>
              <TextInput
                style={styles.input}
                value={tarifBase}
                onChangeText={setTarifBase}
                keyboardType="numeric"
                placeholder="Ex: 500"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Durée de la prestation (heures)</Text>
              <TextInput
                style={styles.input}
                value={dureePrestation}
                onChangeText={setDureePrestation}
                keyboardType="numeric"
                placeholder="Ex: 2"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Montant total (DH)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={montantTotal.toString()}
                keyboardType="numeric"
                placeholder="Calculé automatiquement"
                editable={false}
              />
            </View>

            {/* Toggle options avancées */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced((prev) => !prev)}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#3B82F6"
              />
            </TouchableOpacity>

            {/* Options optionnelles */}
            {showAdvanced && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Frais de déplacement (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={fraisDeplacement}
                    onChangeText={setFraisDeplacement}
                    keyboardType="numeric"
                    placeholder="Ex: 50"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Remise (DH, optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={remiseMontant}
                    onChangeText={setRemiseMontant}
                    keyboardType="numeric"
                    placeholder="Ex: 0"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Pourcentage d'acompte (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={acomptePercent}
                    onChangeText={setAcomptePercent}
                    keyboardType="numeric"
                    placeholder="Ex: 30"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Validité du devis (jours)</Text>
                  <TextInput
                    style={styles.input}
                    value={validiteJours}
                    onChangeText={setValiditeJours}
                    keyboardType="numeric"
                    placeholder="Ex: 15"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Conditions d'annulation (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={conditionsAnnulation}
                    onChangeText={setConditionsAnnulation}
                    placeholder="Ex: Annulation gratuite jusqu'à 48h avant"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Modalités de paiement (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={modalitesPaiement}
                    onChangeText={setModalitesPaiement}
                    placeholder="Ex: 30% à la commande, 70% à la livraison"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Dates de disponibilité (optionnel, format: JJ/MM/AAAA, JJ/MM/AAAA)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={datesDisponibles}
                    onChangeText={setDatesDisponibles}
                    placeholder="Ex: 15/06/2024, 22/06/2024"
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Droit commercial inclus</Text>
                  <Switch value={droitCommercial} onValueChange={setDroitCommercial} />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Assurance incluse</Text>
                  <Switch value={assuranceIncluse} onValueChange={setAssuranceIncluse} />
                </View>
              </>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.submitButton}
                disabled={submitting}
                onPress={handleSubmit}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Envoyer le devis</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  demandeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  demandeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  demandeMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 8,
  },
  advancedToggleText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
  },
});