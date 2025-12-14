import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, Platform } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
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
};

export default function DevisCreate() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const demandeId = params.demandeId as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    montant: '',
    duree_validite: '30',
    prestations: '',
    conditions: '',
  });
  const [clientData, setClientData] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateEcheance, setDateEcheance] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (demandeId) {
      loadDemandeData();
    }
  }, [demandeId]);

  const loadDemandeData = async () => {
    try {
      const { data, error } = await supabase
        .from('demandes_client')
        .select(`
          *,
          client:profiles!client_id(*)
        `)
        .eq('id', demandeId)
        .single();

      if (!error && data) {
        setClientData(data.client);
        setFormData(prev => ({
          ...prev,
          titre: data.titre || '',
          description: data.description || '',
        }));
      }
    } catch (err) {
      console.error('Error loading demande:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.titre || !formData.montant) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    const montant = parseFloat(formData.montant);
    if (isNaN(montant) || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const devisData = {
        photographe_id: user.id,
        client_id: clientData?.id || null,
        demande_id: demandeId || null,
        titre: formData.titre,
        description: formData.description,
        montant: montant,
        statut: 'envoye',
        date_envoi: new Date().toISOString(),
        date_echeance: dateEcheance.toISOString(),
        prestations: formData.prestations,
        conditions: formData.conditions,
      };

      const { error } = await supabase
        .from('devis')
        .insert([devisData]);

      if (error) throw error;

      Alert.alert('Succès', 'Devis créé avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Error creating devis:', err);
      Alert.alert('Erreur', 'Impossible de créer le devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un Devis</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {clientData && (
          <View style={styles.clientCard}>
            <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientData.nom}</Text>
              <Text style={styles.clientEmail}>{clientData.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Titre du devis *</Text>
            <TextInput
              style={styles.input}
              value={formData.titre}
              onChangeText={(text) => setFormData({ ...formData, titre: text })}
              placeholder="Ex: Shooting mariage"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Détails de la prestation..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Prestations incluses</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.prestations}
              onChangeText={(text) => setFormData({ ...formData, prestations: text })}
              placeholder="- 4h de shooting&#10;- 50 photos retouchées&#10;- Livraison sous 2 semaines"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={5}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarification</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Montant (€) *</Text>
            <TextInput
              style={styles.input}
              value={formData.montant}
              onChangeText={(text) => setFormData({ ...formData, montant: text.replace(/[^0-9.]/g, '') })}
              placeholder="500"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date d'échéance</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateText}>
                {dateEcheance.toLocaleDateString('fr-FR')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateEcheance}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDateEcheance(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Conditions générales</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.conditions}
              onChangeText={(text) => setFormData({ ...formData, conditions: text })}
              placeholder="- Acompte de 30% à la réservation&#10;- Solde le jour J&#10;- Annulation 48h avant"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitText}>Création...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Envoyer le devis</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  clientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 10,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
