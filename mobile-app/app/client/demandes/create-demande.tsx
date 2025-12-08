import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { createDemande } from '@/lib/demandeService';
import { notifyMatchingPhotographes } from '@/lib/matchingService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES = [
  'Mariage',
  'Portrait',
  'Événementiel',
  'Corporate',
  'Produit',
  'Architecture',
  'Nature',
  'Sport',
  'Mode',
  'Culinaire',
];

export default function CreateDemandeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('');
  const [dateSouhaitee, setDateSouhaitee] = useState(new Date());
  const [heureSouhaitee, setHeureSouhaitee] = useState('');
  const [dureeEstimee, setDureeEstimee] = useState('');
  const [lieuVille, setLieuVille] = useState('');
  const [lieuCodePostal, setLieuCodePostal] = useState('');
  const [lieuAdresse, setLieuAdresse] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateSouhaitee(selectedDate);
    }
  };

  const validateForm = () => {
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire votre besoin');
      return false;
    }
    if (!categorie) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return false;
    }
    if (!lieuVille.trim() || !lieuCodePostal.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer le lieu de la prestation');
      return false;
    }
    if (!/^\d{5}$/.test(lieuCodePostal.trim())) {
      Alert.alert('Erreur', 'Le code postal doit contenir 5 chiffres');
      return false;
    }
    if (budgetMin && budgetMax) {
      const min = parseFloat(budgetMin);
      const max = parseFloat(budgetMax);
      if (min > max) {
        Alert.alert('Erreur', 'Le budget minimum ne peut pas être supérieur au budget maximum');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const demandeData = {
        titre: titre.trim(),
        description: description.trim(),
        categorie,
        date_souhaitee: dateSouhaitee.toISOString().split('T')[0],
        heure_souhaitee: heureSouhaitee.trim() || undefined,
        duree_estimee_heures: dureeEstimee ? parseFloat(dureeEstimee) : undefined,
        lieu_ville: lieuVille.trim(),
        lieu_code_postal: lieuCodePostal.trim(),
        lieu_adresse: lieuAdresse.trim() || undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
      };

      const demande = await createDemande(user!.id, demandeData);

      // Notifier les photographes correspondants
      try {
        const notifiedCount = await notifyMatchingPhotographes(demande, 10);
        console.log(`✅ ${notifiedCount} photographes notifiés`);
      } catch (notifError) {
        console.error('⚠️ Erreur notification photographes:', notifError);
        // Ne pas bloquer la création de la demande si la notification échoue
      }

      Alert.alert(
        'Demande créée !',
        'Votre demande a été publiée. Les photographes correspondants vont recevoir une notification.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/client/demandes/mes-demandes'),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Erreur création demande:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle demande</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex: Photographe pour mariage en juin"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre besoin en détail..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Catégorie *</Text>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, categorie === cat && styles.categoryChipSelected]}
                onPress={() => setCategorie(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categorie === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Date et durée</Text>

          <Text style={styles.label}>Date souhaitée *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#5C6BC0" />
            <Text style={styles.dateButtonText}>
              {dateSouhaitee.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateSouhaitee}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          <Text style={styles.label}>Heure souhaitée (optionnelle)</Text>
          <TextInput
            style={styles.input}
            value={heureSouhaitee}
            onChangeText={setHeureSouhaitee}
            placeholder="Ex: 14h00"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Durée estimée (heures, optionnelle)</Text>
          <TextInput
            style={styles.input}
            value={dureeEstimee}
            onChangeText={setDureeEstimee}
            placeholder="Ex: 8"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lieu</Text>

          <Text style={styles.label}>Ville *</Text>
          <TextInput
            style={styles.input}
            value={lieuVille}
            onChangeText={setLieuVille}
            placeholder="Ex: Paris"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Code postal *</Text>
          <TextInput
            style={styles.input}
            value={lieuCodePostal}
            onChangeText={setLieuCodePostal}
            placeholder="Ex: 75001"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={5}
          />

          <Text style={styles.label}>Adresse complète (optionnelle)</Text>
          <TextInput
            style={styles.input}
            value={lieuAdresse}
            onChangeText={setLieuAdresse}
            placeholder="Ex: 123 Rue de Rivoli"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Budget (optionnel)</Text>
          <Text style={styles.sectionDescription}>
            Indiquez votre budget pour recevoir des devis adaptés
          </Text>

          <View style={styles.budgetRow}>
            <View style={styles.budgetInput}>
              <Text style={styles.label}>Minimum (€)</Text>
              <TextInput
                style={styles.input}
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder="300"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.budgetInput}>
              <Text style={styles.label}>Maximum (€)</Text>
              <TextInput
                style={styles.input}
                value={budgetMax}
                onChangeText={setBudgetMax}
                placeholder="800"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#5C6BC0" />
          <Text style={styles.infoText}>
            Votre demande sera visible pendant 30 jours. Les photographes correspondants
            recevront une notification et pourront vous envoyer des devis personnalisés.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Publier la demande</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5C6BC0',
    padding: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
