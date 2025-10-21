import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';

export default function ReservationPage() {
  const { id: annonceId, reservation_id: reservationId } = useLocalSearchParams();
  const navigation = useNavigation();
  
  const [form, setForm] = useState({
    date: '',
    heure: '',
    duree: '',
    lieu: '',
    ville: '',
    participants: '',
    commentaire: ''
  });
  
  const [annonce, setAnnonce] = useState<any>(null);
  const [tarifUnitaire, setTarifUnitaire] = useState(0);
  const [unitTarif, setUnitTarif] = useState('');
  const [prixFixe, setPrixFixe] = useState(true);
  const [acomptePercent, setAcomptePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [client, setClient] = useState({ nom: '', email: '' });
  const [prestataireId, setPrestataireId] = useState('');
  const [particulierId, setParticulierId] = useState('');
  const [reservationMontant, setReservationMontant] = useState<number | null>(null);
  const [reservationAcompte, setReservationAcompte] = useState<number | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<string | null>(null);

  // Charger la réservation existante si modification
  useEffect(() => {
    async function fetchReservation() {
      if (!reservationId) return;
      setLoading(true);
      
      const { data: reservationData } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();
      
      if (reservationData) {
        setForm({
          date: reservationData.date ? reservationData.date.split('T')[0] : '',
          heure: reservationData.date ? reservationData.date.split('T')[1]?.slice(0, 5) : '',
          duree: reservationData.duree || '',
          lieu: reservationData.endroit?.split(',')[0] || '',
          ville: reservationData.endroit?.split(',')[1] || '',
          participants: reservationData.participants || '',
          commentaire: reservationData.commentaire || ''
        });
        setTarifUnitaire(reservationData.tarif_unit || 0);
        setUnitTarif(reservationData.unit_tarif || '');
        setPrestataireId(reservationData.prestataire_id || '');
        setParticulierId(reservationData.particulier_id || '');
        setClient({
          nom: reservationData.client_nom || '',
          email: reservationData.client_email || ''
        });
        setReservationMontant(reservationData.montant || null);
        setReservationAcompte(reservationData.montant_acompte || null);
      }
      setLoading(false);
    }
    fetchReservation();
  }, [reservationId]);

  // Charger l'annonce
  useEffect(() => {
    async function fetchAnnonce() {
      if (!annonceId) return;
      setLoading(true);
      
      const { data: annonceData } = await supabase
        .from('annonces')
        .select('id, prix_fixe, tarif_unit, unit_tarif, acompte_percent, prestataire, nb_heure')
        .eq('id', annonceId)
        .single();
      
      setAnnonce(annonceData);
      setPrixFixe(!!annonceData?.prix_fixe);
      setTarifUnitaire(annonceData?.tarif_unit || tarifUnitaire);
      setUnitTarif(annonceData?.unit_tarif || unitTarif);
      setAcomptePercent(Number(annonceData?.acompte_percent || acomptePercent));
      const newPrestataireId = annonceData?.prestataire || prestataireId;
      setPrestataireId(newPrestataireId);
      
      // Initialiser durée selon l'unité tarifaire
      if (annonceData?.unit_tarif && !reservationId) {
        const unit = annonceData.unit_tarif;
        if (unit === 'seance' || unit === 'forfait') {
          setForm(prev => ({ ...prev, duree: annonceData.nb_heure?.toString() || '1' }));
        } else if (unit === 'demi_journee') {
          setForm(prev => ({ ...prev, duree: '4' }));
        } else if (unit === 'jour') {
          setForm(prev => ({ ...prev, duree: '8' }));
        }
      }
      
      setLoading(false);
      
      // Charger les infos client
      if (!client.nom || !client.email) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        setParticulierId(userId || particulierId);
        
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom, email')
            .eq('id', userId)
            .single();
          
          setClient({
            nom: [profile?.nom, profile?.prenom].filter(Boolean).join(' ') || '',
            email: profile?.email || ''
          });
        }
      }
    }
    fetchAnnonce();
  }, [annonceId]);

  const checkAvailability = async (date: string, heure: string, duree: string) => {
    if (!date || !heure || !duree || !prestataireId) return;

    setAvailabilityStatus('checking');

    try {
      const requestedDateTime = new Date(`${date}T${heure}:00`);
      const duration = parseInt(duree) || 2;
      const requestedEndTime = new Date(requestedDateTime.getTime() + duration * 60 * 60 * 1000);

      const { data: existingReservations } = await supabase
        .from('reservations')
        .select('date, duree')
        .eq('prestataire_id', prestataireId)
        .neq('status', 'cancelled')
        .gte('date', requestedDateTime.toISOString());

      let isAvailable = true;

      if (existingReservations) {
        for (const reservation of existingReservations) {
          const resStart = new Date(reservation.date);
          const resEnd = new Date(resStart.getTime() + (reservation.duree || 120) * 60 * 1000);
          
          if (requestedDateTime < resEnd && requestedEndTime > resStart) {
            isAvailable = false;
            break;
          }
        }
      }

      setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      setAvailabilityStatus(null);
    }
  };

  const calculerMontant = () => {
    if (!form.duree || !tarifUnitaire) return 0;
    const duree = parseInt(form.duree);
    return duree * tarifUnitaire;
  };

  const calculerAcompte = () => {
    const montant = calculerMontant();
    return Math.round(montant * (acomptePercent / 100));
  };

  const handleSubmit = async () => {
    if (!form.date || !form.heure || !form.duree || !form.lieu) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (availabilityStatus === 'unavailable') {
      Alert.alert('Erreur', 'Ce créneau n\'est pas disponible');
      return;
    }

    setSubmitting(true);

    try {
      const montant = calculerMontant();
      const acompte = calculerAcompte();
      const dateTime = `${form.date}T${form.heure}:00`;

      const reservationData = {
        annonce_id: annonceId,
        prestataire_id: prestataireId,
        particulier_id: particulierId,
        client_nom: client.nom,
        client_email: client.email,
        date: dateTime,
        duree: parseInt(form.duree),
        endroit: [form.lieu, form.ville].filter(Boolean).join(', '),
        participants: parseInt(form.participants) || null,
        commentaire: form.commentaire || null,
        tarif_unit: tarifUnitaire,
        unit_tarif: unitTarif,
        montant: montant,
        montant_acompte: acompte,
        status: 'pending'
      };

      if (reservationId) {
        // Mise à jour
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', reservationId);

        if (error) {
          console.error('Erreur update:', error);
          Alert.alert('Erreur', 'Erreur lors de la mise à jour');
        } else {
          Alert.alert('Succès', 'Réservation mise à jour !', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      } else {
        // Création
        const { data, error } = await supabase
          .from('reservations')
          .insert([reservationData])
          .select()
          .single();

        if (error) {
          console.error('Erreur insert:', error);
          Alert.alert('Erreur', 'Erreur lors de la création');
        } else {
          Alert.alert('Succès', 'Réservation créée ! Procédez au paiement.', [
            {
              text: 'Payer',
              onPress: () => {
                // Navigation vers paiement
                (navigation as any).navigate('paiement', { reservation_id: data.id });
              }
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const montantTotal = calculerMontant();
  const acompte = calculerAcompte();

  return (
    <>
      <Header />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {reservationId ? 'Modifier la réservation' : 'Nouvelle réservation'}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>📅 Date et heure</Text>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  value={form.date}
                  onChangeText={(text) => {
                    setForm({ ...form, date: text });
                    if (text && form.heure && form.duree) {
                      checkAvailability(text, form.heure, form.duree);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Heure *</Text>
                <TextInput
                  style={styles.input}
                  value={form.heure}
                  onChangeText={(text) => {
                    setForm({ ...form, heure: text });
                    if (form.date && text && form.duree) {
                      checkAvailability(form.date, text, form.duree);
                    }
                  }}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durée (heures) *</Text>
              <TextInput
                style={styles.input}
                value={form.duree}
                onChangeText={(text) => {
                  setForm({ ...form, duree: text });
                  if (form.date && form.heure && text) {
                    checkAvailability(form.date, form.heure, text);
                  }
                }}
                placeholder="Ex: 2"
                keyboardType="numeric"
              />
            </View>

            {availabilityStatus && (
              <View style={[
                styles.availabilityBox,
                availabilityStatus === 'available' ? styles.availableBox :
                availabilityStatus === 'unavailable' ? styles.unavailableBox :
                styles.checkingBox
              ]}>
                <Text style={styles.availabilityText}>
                  {availabilityStatus === 'available' && '✅ Créneau disponible'}
                  {availabilityStatus === 'unavailable' && '❌ Créneau non disponible'}
                  {availabilityStatus === 'checking' && '⏳ Vérification...'}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>📍 Lieu</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Adresse *</Text>
              <TextInput
                style={styles.input}
                value={form.lieu}
                onChangeText={(text) => setForm({ ...form, lieu: text })}
                placeholder="Adresse complète"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={styles.input}
                value={form.ville}
                onChangeText={(text) => setForm({ ...form, ville: text })}
                placeholder="Ville"
              />
            </View>

            <Text style={styles.sectionTitle}>👥 Informations complémentaires</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de participants</Text>
              <TextInput
                style={styles.input}
                value={form.participants}
                onChangeText={(text) => setForm({ ...form, participants: text })}
                placeholder="Ex: 5"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Commentaire</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.commentaire}
                onChangeText={(text) => setForm({ ...form, commentaire: text })}
                placeholder="Informations supplémentaires..."
                multiline
                numberOfLines={4}
              />
            </View>

            {prixFixe && montantTotal > 0 && (
              <View style={styles.pricingBox}>
                <Text style={styles.pricingTitle}>💰 Tarification</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Tarif unitaire :</Text>
                  <Text style={styles.pricingValue}>{tarifUnitaire} MAD/{unitTarif}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Durée :</Text>
                  <Text style={styles.pricingValue}>{form.duree} heures</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Montant total :</Text>
                  <Text style={styles.pricingTotal}>{montantTotal} MAD</Text>
                </View>
                {acomptePercent > 0 && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Acompte ({acomptePercent}%) :</Text>
                    <Text style={styles.pricingAcompte}>{acompte} MAD</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {reservationId ? 'Mettre à jour' : 'Confirmer et payer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  backIcon: {
    fontSize: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 16
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfWidth: {
    flex: 1
  },
  availabilityBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  availableBox: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981'
  },
  unavailableBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  checkingBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B'
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center'
  },
  pricingBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 24
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  pricingLabel: {
    color: '#374151',
    fontSize: 14
  },
  pricingValue: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 14
  },
  pricingTotal: {
    color: '#1E40AF',
    fontWeight: 'bold',
    fontSize: 18
  },
  pricingAcompte: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
