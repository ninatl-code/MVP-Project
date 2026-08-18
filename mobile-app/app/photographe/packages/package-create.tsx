/**
 * Page de création de package - alignée sur le schéma Supabase réel
 * Champs : titre, description, prix_fixe, prix_barre, duree_minutes,
 *          services_inclus, options_disponibles, conditions, categorie, specialite
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  success: '#22c55e',
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
    prix_barre: '',
    duree_minutes: '',
    services_inclus: '',
    options_disponibles: '',
    conditions: '',
    categorie: '',
    specialite: '',
  });

  const handleInputChange = (field, value) => {
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
            prestataire_id: user.id,
            titre: form.titre,
            description: form.description || null,
            prix_fixe: parseFloat(form.prix_fixe),
            prix_barre: form.prix_barre ? parseFloat(form.prix_barre) : null,
            duree_minutes: parseInt(form.duree_minutes),
            services_inclus: form.services_inclus || null,
            options_disponibles: form.options_disponibles
              ? form.options_disponibles.split(',').map(o => o.trim()).filter(o => o)
              : [],
            conditions: form.conditions || null,
            categorie: form.categorie || null,
            specialite: form.specialite || null,
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
              placeholder="Ex: Forfait Essentiel"
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
              <Text style={styles.label}>Prix (MAD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={form.prix_fixe}
                onChangeText={value => handleInputChange('prix_fixe', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Prix barré (MAD)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={form.prix_barre}
                onChangeText={value => handleInputChange('prix_barre', value)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.twoColumn}>
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

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Services inclus</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 3 rapports, 5 livrables"
                value={form.services_inclus}
                onChangeText={value => handleInputChange('services_inclus', value)}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Options disponibles (séparées par des virgules)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Retouche, Livraison express, USB"
              value={form.options_disponibles}
              onChangeText={value => handleInputChange('options_disponibles', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Conditions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Conditions particulières du package"
              value={form.conditions}
              onChangeText={value => handleInputChange('conditions', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Catégorie</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Photographie, Développement..."
              value={form.categorie}
              onChangeText={value => handleInputChange('categorie', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Spécialité</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Portrait, Web..."
              value={form.specialite}
              onChangeText={value => handleInputChange('specialite', value)}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Créer le package</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});