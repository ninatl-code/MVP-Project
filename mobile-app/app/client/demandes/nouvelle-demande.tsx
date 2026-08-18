/**
 * Nouvelle demande photo - Formulaire 8 groupes de données
 * ---------------------------------------------------------
 * 1. Type d'événement (types_evenements_photo)
 * 2. Date / heure
 * 3. Lieu
 * 4. Nombre de personnes
 * 5. Heures de présence
 * 6. Budget
 * 7. Style photo (styles_photo)
 * 8. Commentaire
 *
 * À la soumission : payload `demandes_client` cible + déclenchement du matching
 * puis navigation vers les résultats de cette demande.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getEventTypes, getPhotoStyles, PhotoEventType, PhotoStyle } from '@/lib/photoTaxonomyService';
import { createDemande, DemandeClient } from '@/lib/demandeService';
import { notifyMatchingPhotographes } from '@/lib/matchingService';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#22c55e',
  error: '#EF4444',
};

export default function NouvelleDemandeClient() {
  const router = useRouter();
  const { user } = useAuth();

  // Groupes de données
  const [eventTypes, setEventTypes] = useState<PhotoEventType[]>([]);
  const [photoStyles, setPhotoStyles] = useState<PhotoStyle[]>([]);

  // Sélections
  const [typeEventId, setTypeEventId] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [lieu, setLieu] = useState('');
  const [ville, setVille] = useState('');
  const [nbPersonnes, setNbPersonnes] = useState('1');
  const [dureeHeures, setDureeHeures] = useState('2');
  const [budgetMax, setBudgetMax] = useState('');
  const [stylePhotoId, setStylePhotoId] = useState('');
  const [commentaire, setCommentaire] = useState('');

  // États UI
  const [loadingTaxo, setLoadingTaxo] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTaxonomy();
  }, []);

  const loadTaxonomy = async () => {
    try {
      setLoadingTaxo(true);
      setError(null);
      const [types, styles] = await Promise.all([getEventTypes(), getPhotoStyles()]);
      setEventTypes(types);
      setPhotoStyles(styles);
    } catch (error) {
      console.error('❌ Erreur chargement taxonomie:', error);
      setError('Impossible de charger les types d\'événements et styles photo');
    } finally {
      setLoadingTaxo(false);
    }
  };

  const validate = () => {
    if (!typeEventId) {
      Alert.alert('Validation', 'Veuillez choisir le type d\'événement');
      return false;
    }
    if (!lieu.trim()) {
      Alert.alert('Validation', 'Veuillez indiquer le lieu');
      return false;
    }
    if (!ville.trim()) {
      Alert.alert('Validation', 'Veuillez indiquer la ville');
      return false;
    }
    const personnes = parseInt(nbPersonnes, 10);
    if (isNaN(personnes) || personnes < 1) {
      Alert.alert('Validation', 'Nombre de personnes invalide');
      return false;
    }
    const duree = parseFloat(dureeHeures);
    if (isNaN(duree) || duree < 1) {
      Alert.alert('Validation', 'Durée invalide');
      return false;
    }
    if (budgetMax && parseFloat(budgetMax) < 0) {
      Alert.alert('Validation', 'Budget invalide');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        type_evenement_id: typeEventId,
        date_souhaitee: date.toISOString().split('T')[0],
        lieu: lieu.trim(),
        ville: ville.trim(),
        nb_personnes: parseInt(nbPersonnes, 10),
        duree_estimee_heures: parseFloat(dureeHeures),
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        style_photo_id: stylePhotoId || undefined,
        commentaire: commentaire.trim() || undefined,
      };

      const demande = await createDemande(user.id, payload);

      // Déclencher le matching puis naviguer vers les résultats
      try {
        await notifyMatchingPhotographes(demande);
      } catch (matchingError) {
        console.warn('⚠️ Erreur matching (la demande est créée) :', matchingError);
      }

      router.push({
        pathname: '/client/demandes/resultats',
        params: { demandeId: demande.id },
      });
    } catch (error) {
      console.error('❌ Erreur création demande:', error);
      Alert.alert('Erreur', 'Impossible de créer la demande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTaxo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle demande</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={24} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadTaxonomy}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 1. Type d'événement */}
            <Text style={styles.sectionTitle}>1. Type d'événement</Text>
            <View style={styles.chipsWrap}>
              {eventTypes.length === 0 ? (
                <Text style={styles.emptyText}>Aucun type d'événement disponible</Text>
              ) : (
                eventTypes.map((et) => (
                  <TouchableOpacity
                    key={et.id}
                    style={[styles.chip, typeEventId === et.id && styles.chipSelected]}
                    onPress={() => setTypeEventId(et.id)}
                  >
                    <Text style={[styles.chipText, typeEventId === et.id && styles.chipTextSelected]}>
                      {et.nom}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* 2. Date / heure */}
            <Text style={styles.sectionTitle}>2. Date / heure</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar" size={18} color={COLORS.primary} />
                <Text style={styles.dateBtnText}>{date.toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time" size={18} color={COLORS.primary} />
                <Text style={styles.dateBtnText}>
                  {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Lieu */}
            <Text style={styles.sectionTitle}>3. Lieu</Text>
            <TextInput
              style={styles.input}
              value={lieu}
              onChangeText={setLieu}
              placeholder="Adresse de l'événement"
              placeholderTextColor={COLORS.border}
            />
            <TextInput
              style={styles.input}
              value={ville}
              onChangeText={setVille}
              placeholder="Ville"
              placeholderTextColor={COLORS.border}
            />

            {/* 4. Nombre de personnes */}
            <Text style={styles.sectionTitle}>4. Nombre de personnes</Text>
            <TextInput
              style={styles.input}
              value={nbPersonnes}
              onChangeText={setNbPersonnes}
              keyboardType="numeric"
              placeholder="Ex: 30"
              placeholderTextColor={COLORS.border}
            />

            {/* 5. Heures de présence */}
            <Text style={styles.sectionTitle}>5. Heures de présence</Text>
            <TextInput
              style={styles.input}
              value={dureeHeures}
              onChangeText={setDureeHeures}
              keyboardType="numeric"
              placeholder="Ex: 4"
              placeholderTextColor={COLORS.border}
            />

            {/* 6. Budget */}
            <Text style={styles.sectionTitle}>6. Budget maximum</Text>
            <TextInput
              style={styles.input}
              value={budgetMax}
              onChangeText={setBudgetMax}
              keyboardType="numeric"
              placeholder="Ex: 3000"
              placeholderTextColor={COLORS.border}
            />

            {/* 7. Style photo */}
            <Text style={styles.sectionTitle}>7. Style photo</Text>
            <View style={styles.chipsWrap}>
              {photoStyles.length === 0 ? (
                <Text style={styles.emptyText}>Aucun style photo disponible</Text>
              ) : (
                photoStyles.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    style={[styles.chip, stylePhotoId === style.id && styles.chipSelected]}
                    onPress={() => setStylePhotoId(style.id)}
                  >
                    <Text style={[styles.chipText, stylePhotoId === style.id && styles.chipTextSelected]}>
                      {style.nom}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* 8. Commentaire */}
            <Text style={styles.sectionTitle}>8. Commentaire</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={commentaire}
              onChangeText={setCommentaire}
              placeholder="Décrivez votre événement, vos attentes..."
              placeholderTextColor={COLORS.border}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="white" />
                  <Text style={styles.submitBtnText}>Créer ma demande</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const updated = new Date(date);
              updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              setDate(updated);
            }
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              const updated = new Date(date);
              updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
              setDate(updated);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: 'white',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateBtnText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 40,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});