import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';

export default function DemandeDevisForm() {
  const { id: annonceId } = useLocalSearchParams();
  const navigation = useNavigation();

  const [form, setForm] = useState({
    titre: '',
    description: '',
    date: '',
    heure: '',
    duree: '',
    lieu: '',
    ville: '',
    participants: ''
  });

  const [loading, setLoading] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<string | null>(null);
  const [prestataireId, setPrestataireId] = useState<string | null>(null);
  const [annonceData, setAnnonceData] = useState<any>(null);

  useEffect(() => {
    const fetchAnnonceData = async () => {
      if (annonceId) {
        const { data: annonce } = await supabase
          .from('annonces')
          .select('prestataire, unit_tarif, nb_heure')
          .eq('id', annonceId)
          .single();
        
        if (annonce) {
          setPrestataireId(annonce.prestataire);
          setAnnonceData(annonce);
          
          if (annonce.unit_tarif) {
            const unit = annonce.unit_tarif;
            if (unit === 'seance' || unit === 'forfait') {
              setForm(prev => ({ ...prev, duree: annonce.nb_heure?.toString() || '1' }));
            } else if (unit === 'demi_journee') {
              setForm(prev => ({ ...prev, duree: '4' }));
            } else if (unit === 'jour') {
              setForm(prev => ({ ...prev, duree: '8' }));
            }
          }
        }
      }
    };
    fetchAnnonceData();
  }, [annonceId]);

  const checkAvailability = async (date: string, heure: string, duree: string) => {
    if (!date || !heure || !prestataireId || !duree) return;

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

  const handleSubmit = async () => {
    if (!form.titre || !form.description || !form.date || !form.heure) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nom, prenom, email')
        .eq('id', userId)
        .single();

      const devisData = {
        annonce_id: annonceId,
        particulier_id: userId,
        client_nom: [profile?.nom, profile?.prenom].filter(Boolean).join(' ') || '',
        client_email: profile?.email || '',
        titre: form.titre,
        description: form.description,
        date_souhaitee: `${form.date}T${form.heure}:00`,
        duree: parseInt(form.duree) || null,
        lieu: form.lieu || null,
        ville: form.ville || null,
        participants: parseInt(form.participants) || null,
        statut: 'en_attente',
        prestataire_id: prestataireId
      };

      const { error } = await supabase
        .from('devis')
        .insert([devisData]);

      if (error) {
        console.error('Erreur insertion devis:', error);
        Alert.alert('Erreur', 'Erreur lors de l\'envoi de la demande');
      } else {
        Alert.alert('Succès', 'Votre demande de devis a été envoyée !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Demande de devis</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre de votre demande *</Text>
              <TextInput
                style={styles.input}
                value={form.titre}
                onChangeText={(text) => setForm({ ...form, titre: text })}
                placeholder="Ex: Séance photo de mariage"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description détaillée *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder="Décrivez votre projet en détail..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Date souhaitée *</Text>
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

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Durée (heures)</Text>
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

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Participants</Text>
                <TextInput
                  style={styles.input}
                  value={form.participants}
                  onChangeText={(text) => setForm({ ...form, participants: text })}
                  placeholder="Ex: 5"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Lieu</Text>
              <TextInput
                style={styles.input}
                value={form.lieu}
                onChangeText={(text) => setForm({ ...form, lieu: text })}
                placeholder="Adresse de la prestation"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={form.ville}
                onChangeText={(text) => setForm({ ...form, ville: text })}
                placeholder="Ville"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Envoyer la demande</Text>
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
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
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
