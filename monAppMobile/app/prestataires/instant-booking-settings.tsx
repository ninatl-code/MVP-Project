import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '../../components/FooterPresta';
import { LinearGradient } from 'expo-linear-gradient';

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

interface InstantBookingSettings {
  enabled: boolean;
  buffer_minutes: number;
  advance_notice_hours: number;
  max_advance_days: number;
}

export default function InstantBookingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InstantBookingSettings>({
    enabled: false,
    buffer_minutes: 60,
    advance_notice_hours: 24,
    max_advance_days: 90,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('instant_booking_settings')
        .select('*')
        .eq('provider_id', user.id)
        .single();

      if (data) {
        setSettings({
          enabled: data.enabled,
          buffer_minutes: data.buffer_minutes,
          advance_notice_hours: data.advance_notice_hours,
          max_advance_days: data.max_advance_days,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if settings exist
      const { data: existing } = await supabase
        .from('instant_booking_settings')
        .select('id')
        .eq('provider_id', user.id)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('instant_booking_settings')
          .update({
            enabled: settings.enabled,
            buffer_minutes: settings.buffer_minutes,
            advance_notice_hours: settings.advance_notice_hours,
            max_advance_days: settings.max_advance_days,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_id', user.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('instant_booking_settings')
          .insert({
            provider_id: user.id,
            ...settings,
          });

        if (error) throw error;
      }

      Alert.alert('Succès', 'Paramètres de réservation instantanée mis à jour');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterPresta />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réservation Instantanée</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Main Toggle */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Activer la réservation instantanée</Text>
            </View>
            <Text style={styles.cardDescription}>
              Permettez aux clients de réserver directement sans attendre votre confirmation. Augmentez vos réservations de 40% en moyenne.
            </Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {settings.enabled ? 'Activé' : 'Désactivé'}
              </Text>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => setSettings({ ...settings, enabled: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.enabled ? COLORS.accent : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Settings */}
          {settings.enabled && (
            <>
              {/* Buffer Time */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Temps de battement</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Temps minimum entre deux réservations pour la préparation
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={settings.buffer_minutes.toString()}
                    onChangeText={(text) => setSettings({ ...settings, buffer_minutes: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                    placeholder="60"
                  />
                  <Text style={styles.inputUnit}>minutes</Text>
                </View>
                <View style={styles.presetButtons}>
                  {[30, 60, 90, 120].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.presetButton,
                        settings.buffer_minutes === minutes && styles.presetButtonActive
                      ]}
                      onPress={() => setSettings({ ...settings, buffer_minutes: minutes })}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        settings.buffer_minutes === minutes && styles.presetButtonTextActive
                      ]}>
                        {minutes} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Advance Notice */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Préavis minimum</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Les clients doivent réserver au moins ce délai à l'avance
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={settings.advance_notice_hours.toString()}
                    onChangeText={(text) => setSettings({ ...settings, advance_notice_hours: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                    placeholder="24"
                  />
                  <Text style={styles.inputUnit}>heures</Text>
                </View>
                <View style={styles.presetButtons}>
                  {[2, 12, 24, 48, 72].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      style={[
                        styles.presetButton,
                        settings.advance_notice_hours === hours && styles.presetButtonActive
                      ]}
                      onPress={() => setSettings({ ...settings, advance_notice_hours: hours })}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        settings.advance_notice_hours === hours && styles.presetButtonTextActive
                      ]}>
                        {hours}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Advance */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="hourglass-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Fenêtre de réservation</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Les clients peuvent réserver jusqu'à combien de jours à l'avance
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={settings.max_advance_days.toString()}
                    onChangeText={(text) => setSettings({ ...settings, max_advance_days: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                    placeholder="90"
                  />
                  <Text style={styles.inputUnit}>jours</Text>
                </View>
                <View style={styles.presetButtons}>
                  {[30, 60, 90, 180, 365].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.presetButton,
                        settings.max_advance_days === days && styles.presetButtonActive
                      ]}
                      onPress={() => setSettings({ ...settings, max_advance_days: days })}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        settings.max_advance_days === days && styles.presetButtonTextActive
                      ]}>
                        {days}j
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Benefits */}
              <View style={styles.benefitsCard}>
                <Text style={styles.benefitsTitle}>💡 Avantages de la réservation instantanée</Text>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Augmentation moyenne de 40% des réservations</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Badge "Réservation instantanée" sur votre profil</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Meilleur classement dans les résultats de recherche</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.benefitText}>Gain de temps : pas de validation manuelle</Text>
                </View>
              </View>
            </>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={styles.saveButtonText}>Enregistrer les paramètres</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, flex: 1 },
  cardDescription: { fontSize: 14, color: COLORS.textLight, marginBottom: 16, lineHeight: 20 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },

  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  inputUnit: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },

  presetButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
  },
  presetButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetButtonText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  presetButtonTextActive: { color: 'white' },

  benefitsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  benefitsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  benefitText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },

  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
