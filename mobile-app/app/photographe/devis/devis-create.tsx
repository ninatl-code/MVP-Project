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
  const demandeId = params.demandeId as string;

  const [demande, setDemande] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Champs obligatoires
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [messagePersonnalise, setMessagePersonnalise] = useState('');
  const [tarifBase, setTarifBase] = useState('');
  const [nbPhotos, setNbPhotos] = useState('');
  const [dureePrestation, setDureePrestation] = useState('');
  const [delaiLivraison, setDelaiLivraison] = useState('');

  // Champs optionnels courants
  const [fraisDeplacement, setFraisDeplacement] = useState('');
  const [remiseMontant, setRemiseMontant] = useState('');
  const [nbVideos, setNbVideos] = useState('0');
  const [retouchesIncluses, setRetouchesIncluses] = useState('');
  const [niveauRetouche, setNiveauRetouche] = useState('standard');
  const [acomptePercent, setAcomptePercent] = useState('30');
  const [validiteJours, setValiditeJours] = useState('30');

  // Options avancées
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tiragesInclus, setTiragesInclus] = useState(false);
  const [nbTirages, setNbTirages] = useState('0');
  const [droitCommercial, setDroitCommercial] = useState(false);
  const [assuranceIncluse, setAssuranceIncluse] = useState(false);

  useEffect(() => {
    loadDemande();
  }, [demandeId]);

  const loadDemande = async () => {
    try {
      setLoading(true);
      const data = await getDemandeById(demandeId);
      setDemande(data);
      
      // Pré-remplir avec les infos de la demande
      setTitre(`Devis pour ${data.titre}`);
      setDescription(data.description || '');
    } catch (error: any) {
      console.error('❌ Erreur chargement demande:', error);
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
    if (!nbPhotos || parseInt(nbPhotos) <= 0) {
      Alert.alert('Erreur', 'Veuillez indiquer le nombre de photos');
      return;
    }
    if (!dureePrestation || parseFloat(dureePrestation) <= 0) {
      Alert.alert('Erreur', 'Veuillez indiquer la durée de la prestation');
      return;
    }
    if (!delaiLivraison || parseInt(delaiLivraison) <= 0) {
      Alert.alert('Erreur', 'Veuillez indiquer le délai de livraison');
      return;
    }

    const montantTotal = calculateMontantTotal();
    if (montantTotal <= 0) {
      Alert.alert('Erreur', 'Le montant total doit être positif');
      return;
    }

    try {
      setSubmitting(true);

      await createDevis(user!.id, {
        demande_id: demandeId,
        client_id: demande.client_id,
        titre: titre.trim(),
        description: description.trim(),
        message_personnalise: messagePersonnalise.trim() || undefined,
        
        tarif_base: parseFloat(tarifBase),
        montant_total: montantTotal,
        frais_deplacement: parseFloat(fraisDeplacement) || 0,
        remise_montant: parseFloat(remiseMontant) || 0,
        
        duree_prestation_heures: parseFloat(dureePrestation),
        nb_photos_livrees: parseInt(nbPhotos),
        nb_videos_livrees: parseInt(nbVideos) || 0,
        delai_livraison_jours: parseInt(delaiLivraison),
        
        retouches_incluses: retouchesIncluses ? parseInt(retouchesIncluses) : undefined,
        niveau_retouche: niveauRetouche,
        
        modes_livraison_inclus: ['telechargement'],
        formats_fichiers_livres: ['JPEG', 'PNG'],
        
        acompte_requis_percent: parseFloat(acomptePercent) || 30,
        validite_jours: parseInt(validiteJours) || 30,
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
    } catch (error: any) {
      console.error('❌ Erreur envoi devis:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le devis');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un devis</Text>
        <View style={{ width: 24 }} />
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
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{demande.ville}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.metaText}>
                {new Date(demande.date_souhaitee).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
          {(demande.budget_min || demande.budget_max) && (
            <View style={styles.budgetHint}>
              <Text style={styles.budgetHintText}>
                Budget client : {demande.budget_min && demande.budget_max
                  ? `${demande.budget_min}€ - ${demande.budget_max}€`
                  : demande.budget_min
                  ? `À partir de ${demande.budget_min}€`
                  : `Jusqu'à ${demande.budget_max}€`}
              </Text>
            </View>
          )}
        </View>

        {/* Informations générales */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Titre du devis <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Devis shooting mariage"
              value={titre}
              onChangeText={setTitre}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description détaillée <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez en détail les prestations incluses..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message personnalisé au client</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ajoutez un message personnalisé pour le client..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={messagePersonnalise}
              onChangeText={setMessagePersonnalise}
            />
          </View>
        </View>

        {/* Tarification */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tarification</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tarif de base <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="500"
                keyboardType="decimal-pad"
                value={tarifBase}
                onChangeText={setTarifBase}
              />
              <Text style={styles.inputIcon}>€</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frais de déplacement</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="decimal-pad"
                value={fraisDeplacement}
                onChangeText={setFraisDeplacement}
              />
              <Text style={styles.inputIcon}>€</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remise</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="decimal-pad"
                value={remiseMontant}
                onChangeText={setRemiseMontant}
              />
              <Text style={styles.inputIcon}>€</Text>
            </View>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Montant total</Text>
            <Text style={styles.totalValue}>{montantTotal.toFixed(2)}€</Text>
          </View>
        </View>

        {/* Prestation */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Détails de la prestation</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                Durée (heures) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="4"
                keyboardType="decimal-pad"
                value={dureePrestation}
                onChangeText={setDureePrestation}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>
                Délai livraison (jours) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                keyboardType="number-pad"
                value={delaiLivraison}
                onChangeText={setDelaiLivraison}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                Nombre de photos <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                keyboardType="number-pad"
                value={nbPhotos}
                onChangeText={setNbPhotos}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Nombre de vidéos</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="number-pad"
                value={nbVideos}
                onChangeText={setNbVideos}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Retouches incluses</Text>
              <TextInput
                style={styles.input}
                placeholder="Toutes"
                keyboardType="number-pad"
                value={retouchesIncluses}
                onChangeText={setRetouchesIncluses}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Niveau retouche</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert('Niveau de retouche', 'Choisissez le niveau', [
                      { text: 'Basique', onPress: () => setNiveauRetouche('basique') },
                      { text: 'Standard', onPress: () => setNiveauRetouche('standard') },
                      { text: 'Premium', onPress: () => setNiveauRetouche('premium') },
                    ]);
                  }}
                >
                  <Text style={styles.pickerText}>{niveauRetouche}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Conditions</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Acompte requis (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="number-pad"
                value={acomptePercent}
                onChangeText={setAcomptePercent}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Validité (jours)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="number-pad"
                value={validiteJours}
                onChangeText={setValiditeJours}
              />
            </View>
          </View>
        </View>

        {/* Options avancées */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>Options avancées</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#5C6BC0"
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Options supplémentaires</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Tirages inclus</Text>
              <Switch
                value={tiragesInclus}
                onValueChange={setTiragesInclus}
                trackColor={{ false: '#ccc', true: '#5C6BC0' }}
              />
            </View>

            {tiragesInclus && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de tirages</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  keyboardType="number-pad"
                  value={nbTirages}
                  onChangeText={setNbTirages}
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Droit d'usage commercial</Text>
              <Switch
                value={droitCommercial}
                onValueChange={setDroitCommercial}
                trackColor={{ false: '#ccc', true: '#5C6BC0' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Assurance incluse</Text>
              <Switch
                value={assuranceIncluse}
                onValueChange={setAssuranceIncluse}
                trackColor={{ false: '#ccc', true: '#5C6BC0' }}
              />
            </View>
          </View>
        )}

        {/* Conseils */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#FF9800" />
            <Text style={styles.tipsTitle}>Conseils pour un bon devis</Text>
          </View>
          <Text style={styles.tipItem}>• Soyez transparent sur ce qui est inclus</Text>
          <Text style={styles.tipItem}>• Mentionnez les conditions d'annulation</Text>
          <Text style={styles.tipItem}>• Proposez un tarif compétitif mais juste</Text>
          <Text style={styles.tipItem}>• Précisez le mode de livraison des fichiers</Text>
        </View>
      </ScrollView>

      {/* Footer avec bouton d'envoi */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Envoyer le devis</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  demandeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5C6BC0',
  },
  demandeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  demandeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  budgetHint: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  budgetHintText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  formCard: {
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
    textTransform: 'capitalize',
  },
  totalCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  advancedToggle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  tipsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
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
  submitButton: {
    backgroundColor: '#5C6BC0',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
