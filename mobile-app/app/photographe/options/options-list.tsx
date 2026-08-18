/**
 * Liste des options photographe - table `options_photographe`
 * Champs : nom, description, prix, monnaie, actif
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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

export default function OptionsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const { data, error } = await supabase
        .from('options_photographe')
        .select('*')
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOptions(data || []);
    } catch (error) {
      console.error('Erreur chargement options:', error);
      setError('Impossible de charger vos options');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOption = async (id) => {
    Alert.alert(
      'Supprimer cette option?',
      'Cette action est irréversible',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('options_photographe')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setOptions(options.filter(o => o.id !== id));
              Alert.alert('Succès', 'Option supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'option');
            }
          },
        },
      ]
    );
  };

  const toggleOptionActive = async (option) => {
    try {
      const { error } = await supabase
        .from('options_photographe')
        .update({ actif: !option.actif })
        .eq('id', option.id);

      if (error) throw error;

      setOptions(options.map(o => o.id === option.id ? { ...o, actif: !o.actif } : o));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'option');
    }
  };

  if (loading) {
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
        <Text style={styles.headerTitle}>Mes Options</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Les options permettent à vos clients de personnaliser leur prestation (ex: album, séance supplémentaire...)
          </Text>
        </View>

        {error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadOptions}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : options.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="options-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Aucune option créée</Text>
            <Text style={styles.emptyText}>
              Créez votre première option pour enrichir vos formules
            </Text>
          </View>
        ) : (
          <View style={styles.optionsList}>
            {options.map(option => (
              <View key={option.id} style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <View style={styles.optionTitle}>
                    <Text style={styles.optionName}>{option.nom}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: option.actif ? '#D1FAE5' : '#FEE2E2' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: option.actif ? COLORS.success : COLORS.error }]}>
                        {option.actif ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionPrice}>{option.prix} {option.monnaie || 'DH'}</Text>
                </View>

                {option.description && (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                )}

                <View style={styles.optionActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => router.push({ pathname: '/photographe/options/option-edit' as any, params: { id: option.id } })}
                  >
                    <Ionicons name="pencil" size={18} color="white" />
                    <Text style={styles.actionBtnText}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.toggleBtn]}
                    onPress={() => toggleOptionActive(option)}
                  >
                    <Ionicons name={option.actif ? 'eye-off' : 'eye'} size={18} color="white" />
                    <Text style={styles.actionBtnText}>{option.actif ? 'Désactiver' : 'Activer'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteOption(option.id)}
                  >
                    <Ionicons name="trash" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/photographe/options/option-edit' as any)}
        >
          <Ionicons name="add" size={28} color="white" />
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
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
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
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  optionTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  optionActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: COLORS.primary,
  },
  toggleBtn: {
    backgroundColor: COLORS.warning,
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});