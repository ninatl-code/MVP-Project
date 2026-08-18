/**
 * Formulaire de création/édition d'une option photographe - table `options_photographe`
 * Champs : nom, description, prix, monnaie, actif
 * Valorise le photographe connecté via `photographe_id`.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function OptionEditScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams();

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [monnaie, setMonnaie] = useState('DH');
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadOption(id);
    }
  }, [id]);

  const loadOption = async (optionId) => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('options_photographe')
        .select('*')
        .eq('id', optionId)
        .single();

      if (error) throw error;

      if (data) {
        setNom(data.nom || '');
        setDescription(data.description || '');
        setPrix(data.prix != null ? String(data.prix) : '');
        setMonnaie(data.monnaie || 'DH');
        setActif(data.actif ?? true);
      }
    } catch (error) {
      console.error('Erreur chargement option:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'option');
    } finally {
      setLoadingData(false);
    }
  };

  const validate = () => {
    if (!nom.trim()) {
      Alert.alert('Validation', 'Le nom est obligatoire');
      return false;
    }

    const prixValue = parseFloat(prix);
    if (isNaN(prixValue) || prixValue < 0) {
      Alert.alert('Validation', 'Le prix doit être un nombre supérieur ou égal à 0');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nom: nom.trim(),
        description: description.trim() || null,
        prix: parseFloat(prix),
        monnaie: monnaie.trim() || 'DH',
        actif,
      };

      let error;
      if (id) {
        ({ error } = await supabase
          .from('options_photographe')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id));
      } else {
        ({ error } = await supabase
          .from('options_photographe')
          .insert({ ...payload, photographe_id: user.id }));
      }

      if (error) throw error;

      Alert.alert('Succès', id ? 'Option mise à jour' : 'Option créée', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde option:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'option');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>{id ? 'Modifier l\'option' : 'Nouvelle option'}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Ex: Album photo premium"
            placeholderTextColor={COLORS.border}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez l'option..."
            placeholderTextColor={COLORS.border}
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Prix *</Text>
              <TextInput
                style={styles.input}
                value={prix}
                onChangeText={setPrix}
                placeholder="0"
                placeholderTextColor={COLORS.border}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Monnaie</Text>
              <TextInput
                style={styles.input}
                value={monnaie}
                onChangeText={setMonnaie}
                placeholder="DH"
                placeholderTextColor={COLORS.border}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Option active</Text>
            <Switch
              value={actif}
              onValueChange={setActif}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveBtnText}>{id ? 'Mettre à jour' : 'Créer l\'option'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});