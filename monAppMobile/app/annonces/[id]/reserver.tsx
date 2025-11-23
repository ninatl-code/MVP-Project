import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert, TextInput, Platform } from 'react-native';
import { supabase } from '../../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6'
};

export default function Reserver() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [annonce, setAnnonce] = useState<any>(null);
  
  // Form fields
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [heure, setHeure] = useState('');
  const [lieu, setLieu] = useState('');
  const [message, setMessage] = useState('');
  const [montant, setMontant] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchAnnonce();
  }, [id]);

  const fetchAnnonce = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('annonces')
      .select(`
        id,
        titre,
        description,
        tarif_min,
        tarif_max,
        prestataire,
        profiles!annonces_prestataire_fkey (nom, ville_id)
      `)
      .eq('id', id)
      .single();

    if (!error && data) {
      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      
      // Récupérer la ville
      let villeNom = '';
      if (profile?.ville_id) {
        const { data: villeData } = await supabase
          .from('villes')
          .select('ville')
          .eq('id', profile.ville_id)
          .single();
        villeNom = villeData?.ville || '';
      }

      setAnnonce({
        ...data,
        prestataire_nom: profile?.nom || 'Prestataire',
        prestataire_ville: villeNom
      });

      // Pré-remplir le montant avec le tarif min
      setMontant(data.tarif_min?.toString() || '');
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!heure.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer l\'heure souhaitée');
      return;
    }

    if (!lieu.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer le lieu');
      return;
    }

    const montantNumber = parseFloat(montant);
    if (!montant || isNaN(montantNumber) || montantNumber <= 0) {
      Alert.alert('Erreur', 'Veuillez indiquer un montant valide');
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    // Créer la réservation
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        client_id: user.id,
        prestataire_id: annonce.prestataire,
        annonce_id: id,
        date: date.toISOString().split('T')[0],
        heure: heure,
        lieu: lieu,
        montant: montantNumber,
        status: 'pending',
        notes: message || null
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      Alert.alert('Erreur', 'Impossible de créer la réservation. Veuillez réessayer.');
      return;
    }

    Alert.alert(
      'Réservation envoyée !',
      'Votre demande de réservation a été envoyée au prestataire. Vous recevrez une confirmation prochainement.',
      [
        { text: 'OK', onPress: () => router.push('/particuliers/reservations') }
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!annonce) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Annonce non trouvée</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réserver</Text>
          <Text style={styles.headerSubtitle}>{annonce.titre}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Info prestataire */}
          <View style={styles.infoCard}>
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>{annonce.prestataire_nom}</Text>
              <Text style={styles.infoCardSubtitle}>{annonce.prestataire_ville}</Text>
            </View>
          </View>

          {/* Formulaire */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Détails de la réservation</Text>

            {/* Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
                <Text style={styles.dateButtonText}>
                  {date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            {/* Heure */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Heure <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 14:00"
                  value={heure}
                  onChangeText={setHeure}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
              <Text style={styles.helperText}>Format: HH:MM (ex: 14:00)</Text>
            </View>

            {/* Lieu */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Lieu <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse complète"
                  value={lieu}
                  onChangeText={setLieu}
                  placeholderTextColor={COLORS.textLight}
                  multiline
                />
              </View>
            </View>

            {/* Montant */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Budget <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder={`Tarif indicatif: ${annonce.tarif_min}€ - ${annonce.tarif_max}€`}
                  value={montant}
                  onChangeText={setMontant}
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textLight}
                />
                <Text style={styles.currency}>€</Text>
              </View>
              <Text style={styles.helperText}>
                Tarif indicatif: {annonce.tarif_min}€ - {annonce.tarif_max}€
              </Text>
            </View>

            {/* Message */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Message (optionnel)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Décrivez votre besoin, vos attentes..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Récapitulatif */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Récapitulatif</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{annonce.titre}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Prestataire</Text>
              <Text style={styles.summaryValue}>{annonce.prestataire_nom}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{date.toLocaleDateString('fr-FR')}</Text>
            </View>
            {heure && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Heure</Text>
                <Text style={styles.summaryValue}>{heure}</Text>
              </View>
            )}
            {montant && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Budget</Text>
                <Text style={[styles.summaryValue, styles.summaryPrice]}>{montant}€</Text>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bouton de confirmation fixe */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={submitting ? [COLORS.textLight, COLORS.textLight] : [COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.submitButtonText}>Envoi en cours...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Confirmer la réservation</Text>
                <Ionicons name="checkmark-circle" size={24} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 18, color: COLORS.text, marginBottom: 24 },
  backButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  
  scrollView: { flex: 1 },
  
  // Header
  header: { padding: 24, paddingTop: 20, paddingBottom: 32 },
  backIcon: { marginBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  // Content
  content: { padding: 20 },

  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoCardContent: { marginLeft: 12, flex: 1 },
  infoCardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  infoCardSubtitle: { fontSize: 14, color: COLORS.textLight },

  // Form
  formSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  required: { color: COLORS.error },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 14, marginLeft: 12 },
  currency: { fontSize: 16, fontWeight: '600', color: COLORS.textLight },
  
  textArea: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: 'top', minHeight: 100 },
  
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  dateButtonText: { fontSize: 16, color: COLORS.text, marginLeft: 12, flex: 1 },
  
  helperText: { fontSize: 13, color: COLORS.textLight, marginTop: 6 },

  // Summary
  summaryCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: COLORS.primary, marginBottom: 24 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 15, color: COLORS.textLight },
  summaryValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: 16 },
  summaryPrice: { fontSize: 20, color: COLORS.primary },

  // Action bar
  actionBar: { padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  submitButton: { borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  submitButtonText: { fontSize: 18, fontWeight: 'bold', color: 'white' }
});
