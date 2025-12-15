import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '@/components/photographe/FooterPresta';

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
};

export default function PackageCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    titre: '',
    description: '',
    prix_fixe: '',
    duree_minutes: '',
    nb_photos_incluses: '',
    delai_livraison_jours: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.titre.trim()) {
      Alert.alert('Erreur', 'Le titre du package est requis');
      return false;
    }
    if (!form.prix_fixe || isNaN(parseFloat(form.prix_fixe))) {
      Alert.alert('Erreur', 'Le prix est requis et doit être un nombre');
      return false;
    }
    if (!form.duree_minutes || isNaN(parseInt(form.duree_minutes))) {
      Alert.alert('Erreur', 'La durée est requise et doit être un nombre');
      return false;
    }
    if (!form.nb_photos_incluses || isNaN(parseInt(form.nb_photos_incluses))) {
      Alert.alert('Erreur', 'Le nombre de photos est requis');
      return false;
    }
    if (!form.delai_livraison_jours || isNaN(parseInt(form.delai_livraison_jours))) {
      Alert.alert('Erreur', 'Le délai de livraison est requis');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (!user?.id) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const { error } = await supabase
        .from('packages_types')
        .insert([
          {
            photographe_id: user.id,
            titre: form.titre,
            description: form.description || null,
            prix_fixe: parseFloat(form.prix_fixe),
            duree_minutes: parseInt(form.duree_minutes),
            nb_photos_incluses: parseInt(form.nb_photos_incluses),
            delai_livraison_jours: parseInt(form.delai_livraison_jours),
            actif: true,
            visible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      Alert.alert('Succès', 'Package créé avec succès!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de créer le package');
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un Package</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Titre du package *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Séance portrait 1h"
              value={form.titre}
              onChangeText={value => handleInputChange('titre', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Décrivez ce qui est inclus dans ce package"
              value={form.description}
              onChangeText={value => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions</Text>

          <View style={styles.twoColumn}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Prix (€) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={form.prix_fixe}
                onChangeText={value => handleInputChange('prix_fixe', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Durée (min) *</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={form.duree_minutes}
                onChangeText={value => handleInputChange('duree_minutes', value)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.twoColumn}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Photos incluses *</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={form.nb_photos_incluses}
                onChangeText={value => handleInputChange('nb_photos_incluses', value)}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Délai livraison (j) *</Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                value={form.delai_livraison_jours}
                onChangeText={value => handleInputChange('delai_livraison_jours', value)}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.saveButtonText}>Créer le package</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FooterPresta />
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
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
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.success,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
