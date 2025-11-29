import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

interface Annonce {
  id: string;
  titre: string;
  price: number;
}

interface SimulationResult {
  basePrice: number;
  adjustedPrice: number;
  appliedRules: {
    ruleName: string;
    ruleType: string;
    adjustment: string;
  }[];
  totalAdjustment: number;
  percentageChange: number;
}

export default function PriceSimulatorScreen() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [selectedAnnonce, setSelectedAnnonce] = useState<Annonce | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00');
  const [duration, setDuration] = useState('2');
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadProviderAnnonces();
  }, []);

  const loadProviderAnnonces = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setProviderId(user.id);

      const { data, error } = await supabase
        .from('annonces')
        .select('id, titre, price')
        .eq('prestataireId', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setAnnonces(data || []);
      if (data && data.length > 0) {
        setSelectedAnnonce(data[0]);
      }
    } catch (error) {
      console.error('Error loading annonces:', error);
      Alert.alert('Error', 'Failed to load your services');
    } finally {
      setLoading(false);
    }
  };

  const simulatePrice = async () => {
    if (!selectedAnnonce || !providerId) {
      Alert.alert('Error', 'Please select a service');
      return;
    }

    try {
      setSimulating(true);
      setResult(null);

      // Get all active pricing rules for this provider
      const { data: rules, error: rulesError } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .or(`annonce_id.eq.${selectedAnnonce.id},annonce_id.is.null`)
        .order('priority', { ascending: false });

      if (rulesError) throw rulesError;

      // Simulate price calculation
      let basePrice = selectedAnnonce.price;
      let finalPrice = basePrice;
      const appliedRules: any[] = [];

      const durationHours = parseInt(duration);
      const bookingDateObj = new Date(bookingDate);
      const dayOfWeek = bookingDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const now = new Date();
      const hoursUntilBooking = (bookingDateObj.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysUntilBooking = hoursUntilBooking / 24;

      for (const rule of rules || []) {
        let adjustment = 0;
        let applied = false;

        switch (rule.rule_type) {
          case 'seasonal':
            const startDate = new Date(rule.rule_config.start_date);
            const endDate = new Date(rule.rule_config.end_date);
            if (bookingDateObj >= startDate && bookingDateObj <= endDate) {
              const multiplier = rule.rule_config.price_multiplier || 1;
              adjustment = finalPrice * (multiplier - 1);
              finalPrice *= multiplier;
              applied = true;
            }
            break;

          case 'duration_based':
            const minDuration = rule.rule_config.min_duration_hours || 0;
            if (durationHours >= minDuration) {
              const discount = rule.rule_config.discount_percentage || 0;
              adjustment = -(finalPrice * discount / 100);
              finalPrice *= (1 - discount / 100);
              applied = true;
            }
            break;

          case 'day_of_week':
            const days = rule.rule_config.days || [];
            if (days.includes(dayOfWeek)) {
              const multiplier = rule.rule_config.price_multiplier || 1;
              adjustment = finalPrice * (multiplier - 1);
              finalPrice *= multiplier;
              applied = true;
            }
            break;

          case 'early_bird':
            const daysInAdvance = rule.rule_config.days_in_advance || 0;
            if (daysUntilBooking >= daysInAdvance) {
              const discount = rule.rule_config.discount_percentage || 0;
              adjustment = -(finalPrice * discount / 100);
              finalPrice *= (1 - discount / 100);
              applied = true;
            }
            break;

          case 'last_minute':
            const hoursBefore = rule.rule_config.hours_before || 0;
            if (hoursUntilBooking >= 0 && hoursUntilBooking <= hoursBefore) {
              const discount = rule.rule_config.discount_percentage || 0;
              adjustment = -(finalPrice * discount / 100);
              finalPrice *= (1 - discount / 100);
              applied = true;
            }
            break;

          case 'demand_based':
            // Would require checking actual booking data
            // Skipped in simulation for simplicity
            break;
        }

        if (applied) {
          appliedRules.push({
            ruleName: rule.rule_name,
            ruleType: rule.rule_type,
            adjustment: adjustment >= 0 ? `+$${adjustment.toFixed(2)}` : `-$${Math.abs(adjustment).toFixed(2)}`,
          });
        }
      }

      const totalAdjustment = finalPrice - basePrice;
      const percentageChange = ((finalPrice - basePrice) / basePrice) * 100;

      setResult({
        basePrice,
        adjustedPrice: finalPrice,
        appliedRules,
        totalAdjustment,
        percentageChange,
      });
    } catch (error) {
      console.error('Error simulating price:', error);
      Alert.alert('Error', 'Failed to simulate price');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Simulator</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="calculator-outline" size={24} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Test Your Pricing Rules</Text>
            <Text style={styles.infoText}>
              See how your dynamic pricing rules will affect the final price for different scenarios.
            </Text>
          </View>
        </View>

        {/* Service Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Service</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.annoncesList}>
            {annonces.map(annonce => (
              <TouchableOpacity
                key={annonce.id}
                style={[
                  styles.annonceCard,
                  selectedAnnonce?.id === annonce.id && styles.annonceCardSelected,
                ]}
                onPress={() => setSelectedAnnonce(annonce)}
              >
                <Text style={styles.annonceTitle}>{annonce.titre}</Text>
                <Text style={styles.annoncePrice}>${annonce.price}/hr</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Booking Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={bookingDate}
              onChangeText={setBookingDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.input}
              value={bookingTime}
              onChangeText={setBookingTime}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Duration (hours)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="2"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Simulate Button */}
        <TouchableOpacity
          style={[styles.simulateButton, simulating && styles.simulateButtonDisabled]}
          onPress={simulatePrice}
          disabled={simulating}
        >
          {simulating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.simulateButtonText}>Run Simulation</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Simulation Results</Text>

            {/* Price Comparison */}
            <View style={styles.priceComparison}>
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>Base Price</Text>
                <Text style={styles.priceBoxValue}>${result.basePrice.toFixed(2)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={COLORS.textSecondary} />
              <View style={[styles.priceBox, styles.priceBoxAdjusted]}>
                <Text style={styles.priceBoxLabel}>Final Price</Text>
                <Text style={[styles.priceBoxValue, styles.priceBoxValueAdjusted]}>
                  ${result.adjustedPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Adjustment Summary */}
            <View style={styles.adjustmentSummary}>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Total Adjustment:</Text>
                <Text
                  style={[
                    styles.adjustmentValue,
                    { color: result.totalAdjustment >= 0 ? COLORS.success : COLORS.error },
                  ]}
                >
                  {result.totalAdjustment >= 0 ? '+' : ''}${result.totalAdjustment.toFixed(2)}
                </Text>
              </View>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Percentage Change:</Text>
                <Text
                  style={[
                    styles.adjustmentValue,
                    { color: result.percentageChange >= 0 ? COLORS.success : COLORS.error },
                  ]}
                >
                  {result.percentageChange >= 0 ? '+' : ''}{result.percentageChange.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Applied Rules */}
            <View style={styles.appliedRulesSection}>
              <Text style={styles.appliedRulesTitle}>Applied Rules ({result.appliedRules.length})</Text>
              {result.appliedRules.length === 0 ? (
                <View style={styles.noRulesCard}>
                  <Ionicons name="information-circle-outline" size={24} color={COLORS.textSecondary} />
                  <Text style={styles.noRulesText}>No pricing rules applied to this scenario</Text>
                </View>
              ) : (
                result.appliedRules.map((rule, index) => (
                  <View key={index} style={styles.appliedRuleCard}>
                    <View style={styles.appliedRuleInfo}>
                      <Text style={styles.appliedRuleName}>{rule.ruleName}</Text>
                      <Text style={styles.appliedRuleType}>{rule.ruleType.replace('_', ' ')}</Text>
                    </View>
                    <Text
                      style={[
                        styles.appliedRuleAdjustment,
                        { color: rule.adjustment.startsWith('+') ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {rule.adjustment}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Tips */}
            <View style={styles.tipsCard}>
              <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
              <Text style={styles.tipsText}>
                Try different dates and durations to see how your rules perform across various scenarios.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  annoncesList: {
    flexDirection: 'row',
  },
  annonceCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  annonceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E3F2FD',
  },
  annonceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  annoncePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  simulateButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  simulateButtonDisabled: {
    opacity: 0.6,
  },
  simulateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsSection: {
    marginBottom: 24,
  },
  priceComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceBoxAdjusted: {
    backgroundColor: '#E8F5E9',
  },
  priceBoxLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priceBoxValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceBoxValueAdjusted: {
    color: COLORS.success,
  },
  adjustmentSummary: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustmentLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  adjustmentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  appliedRulesSection: {
    marginBottom: 20,
  },
  appliedRulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  noRulesCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noRulesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  appliedRuleCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedRuleInfo: {
    flex: 1,
  },
  appliedRuleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  appliedRuleType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  appliedRuleAdjustment: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
