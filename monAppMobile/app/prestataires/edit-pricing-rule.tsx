import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

const RULE_TYPES = [
  { id: 'seasonal', label: 'Seasonal', icon: 'sunny-outline', description: 'Adjust prices for specific seasons' },
  { id: 'demand_based', label: 'Demand-Based', icon: 'trending-up-outline', description: 'Dynamic pricing based on booking demand' },
  { id: 'duration_based', label: 'Duration-Based', icon: 'time-outline', description: 'Discounts for longer bookings' },
  { id: 'day_of_week', label: 'Day of Week', icon: 'calendar-outline', description: 'Different prices for weekdays/weekends' },
  { id: 'early_bird', label: 'Early Bird', icon: 'alarm-outline', description: 'Discounts for advance bookings' },
  { id: 'last_minute', label: 'Last Minute', icon: 'flash-outline', description: 'Discounts for last-minute bookings' },
];

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  service_id: string;
  priority: number;
  is_active: boolean;
  configuration: any;
}

export default function EditPricingRuleScreen() {
  const params = useLocalSearchParams();
  const ruleId = params.id as string;

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rule, setRule] = useState<PricingRule | null>(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('seasonal');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [priority, setPriority] = useState('5');
  const [isActive, setIsActive] = useState(true);
  
  // Rule configuration based on type
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState('1.2');
  const [minDuration, setMinDuration] = useState('2');
  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [daysInAdvance, setDaysInAdvance] = useState('7');
  const [hoursBeforeBooking, setHoursBeforeBooking] = useState('24');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const daysOfWeek = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' },
  ];

  useEffect(() => {
    loadData();
  }, [ruleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('annonces')
        .select('id, titre, prix_base')
        .eq('prestataire_id', user.id)
        .eq('statut', 'active');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Load rule
      const { data: ruleData, error: ruleError } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (ruleError) throw ruleError;
      setRule(ruleData);

      // Populate form with existing data
      setRuleName(ruleData.rule_name);
      setRuleType(ruleData.rule_type);
      setSelectedServiceId(ruleData.service_id);
      setPriority(ruleData.priority.toString());
      setIsActive(ruleData.is_active);

      // Populate configuration based on rule type
      const config = ruleData.configuration;
      if (config) {
        if (config.start_date) setStartDate(config.start_date);
        if (config.end_date) setEndDate(config.end_date);
        if (config.multiplier) setMultiplier(config.multiplier.toString());
        if (config.min_duration) setMinDuration(config.min_duration.toString());
        if (config.discount_percentage) setDiscountPercentage(config.discount_percentage.toString());
        if (config.days_in_advance) setDaysInAdvance(config.days_in_advance.toString());
        if (config.hours_before) setHoursBeforeBooking(config.hours_before.toString());
        if (config.days) setSelectedDays(config.days);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load pricing rule');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const buildConfiguration = () => {
    const config: any = {};

    switch (ruleType) {
      case 'seasonal':
        config.start_date = startDate;
        config.end_date = endDate;
        config.multiplier = parseFloat(multiplier);
        break;
      case 'demand_based':
        config.threshold_bookings = 5;
        config.multiplier = parseFloat(multiplier);
        break;
      case 'duration_based':
        config.min_duration = parseInt(minDuration);
        config.discount_percentage = parseFloat(discountPercentage);
        break;
      case 'day_of_week':
        config.days = selectedDays;
        config.multiplier = parseFloat(multiplier);
        break;
      case 'early_bird':
        config.days_in_advance = parseInt(daysInAdvance);
        config.discount_percentage = parseFloat(discountPercentage);
        break;
      case 'last_minute':
        config.hours_before = parseInt(hoursBeforeBooking);
        config.discount_percentage = parseFloat(discountPercentage);
        break;
    }

    return config;
  };

  const validateForm = () => {
    if (!ruleName.trim()) {
      Alert.alert('Validation Error', 'Please enter a rule name');
      return false;
    }

    if (!selectedServiceId) {
      Alert.alert('Validation Error', 'Please select a service');
      return false;
    }

    const priorityNum = parseInt(priority);
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 10) {
      Alert.alert('Validation Error', 'Priority must be between 1 and 10');
      return false;
    }

    // Type-specific validation
    switch (ruleType) {
      case 'seasonal':
        if (!startDate || !endDate) {
          Alert.alert('Validation Error', 'Please enter start and end dates');
          return false;
        }
        if (parseFloat(multiplier) <= 0) {
          Alert.alert('Validation Error', 'Multiplier must be greater than 0');
          return false;
        }
        break;
      case 'duration_based':
        if (parseInt(minDuration) <= 0) {
          Alert.alert('Validation Error', 'Minimum duration must be greater than 0');
          return false;
        }
        if (parseFloat(discountPercentage) <= 0 || parseFloat(discountPercentage) > 100) {
          Alert.alert('Validation Error', 'Discount must be between 0 and 100%');
          return false;
        }
        break;
      case 'day_of_week':
        if (selectedDays.length === 0) {
          Alert.alert('Validation Error', 'Please select at least one day');
          return false;
        }
        break;
      case 'early_bird':
        if (parseInt(daysInAdvance) <= 0) {
          Alert.alert('Validation Error', 'Days in advance must be greater than 0');
          return false;
        }
        break;
      case 'last_minute':
        if (parseInt(hoursBeforeBooking) <= 0) {
          Alert.alert('Validation Error', 'Hours before booking must be greater than 0');
          return false;
        }
        break;
    }

    return true;
  };

  const submitRule = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const configuration = buildConfiguration();

      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update({
          rule_name: ruleName.trim(),
          rule_type: ruleType,
          service_id: selectedServiceId,
          configuration,
          priority: parseInt(priority),
          is_active: isActive,
        })
        .eq('id', ruleId);

      if (error) throw error;

      Alert.alert('Success', 'Pricing rule updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating rule:', error);
      Alert.alert('Error', 'Failed to update pricing rule');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRuleTypeSelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Rule Type</Text>
      <View style={styles.ruleTypeGrid}>
        {RULE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.ruleTypeCard,
              ruleType === type.id && styles.ruleTypeCardActive,
            ]}
            onPress={() => setRuleType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={32}
              color={ruleType === type.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.ruleTypeLabel,
                ruleType === type.id && styles.ruleTypeLabelActive,
              ]}
            >
              {type.label}
            </Text>
            <Text style={styles.ruleTypeDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRuleConfiguration = () => {
    switch (ruleType) {
      case 'seasonal':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024-06-01"
                placeholderTextColor={COLORS.textSecondary}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024-08-31"
                placeholderTextColor={COLORS.textSecondary}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price Multiplier (e.g., 1.2 for 20% increase)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1.2"
                placeholderTextColor={COLORS.textSecondary}
                value={multiplier}
                onChangeText={setMultiplier}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      case 'demand_based':
        return (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Price Multiplier (when demand is high)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="1.3"
              placeholderTextColor={COLORS.textSecondary}
              value={multiplier}
              onChangeText={setMultiplier}
              keyboardType="decimal-pad"
            />
            <Text style={styles.formHint}>
              Prices will increase automatically when booking demand exceeds threshold
            </Text>
          </View>
        );

      case 'duration_based':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Minimum Duration (hours)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2"
                placeholderTextColor={COLORS.textSecondary}
                value={minDuration}
                onChangeText={setMinDuration}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Discount Percentage (%)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10"
                placeholderTextColor={COLORS.textSecondary}
                value={discountPercentage}
                onChangeText={setDiscountPercentage}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      case 'day_of_week':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Select Days</Text>
              <View style={styles.daysGrid}>
                {daysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day.id) && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDays.includes(day.id) && styles.dayButtonTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price Multiplier</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1.1"
                placeholderTextColor={COLORS.textSecondary}
                value={multiplier}
                onChangeText={setMultiplier}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      case 'early_bird':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Days in Advance</Text>
              <TextInput
                style={styles.formInput}
                placeholder="7"
                placeholderTextColor={COLORS.textSecondary}
                value={daysInAdvance}
                onChangeText={setDaysInAdvance}
                keyboardType="number-pad"
              />
              <Text style={styles.formHint}>
                Clients booking this many days ahead get a discount
              </Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Discount Percentage (%)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="15"
                placeholderTextColor={COLORS.textSecondary}
                value={discountPercentage}
                onChangeText={setDiscountPercentage}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      case 'last_minute':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hours Before Booking</Text>
              <TextInput
                style={styles.formInput}
                placeholder="24"
                placeholderTextColor={COLORS.textSecondary}
                value={hoursBeforeBooking}
                onChangeText={setHoursBeforeBooking}
                keyboardType="number-pad"
              />
              <Text style={styles.formHint}>
                Bookings within this timeframe get a discount
              </Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Discount Percentage (%)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="20"
                placeholderTextColor={COLORS.textSecondary}
                value={discountPercentage}
                onChangeText={setDiscountPercentage}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!rule) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Pricing rule not found</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
          <Text style={styles.emptyButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Edit Pricing Rule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Rule Name</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g., Summer Premium Pricing"
            placeholderTextColor={COLORS.textSecondary}
            value={ruleName}
            onChangeText={setRuleName}
            maxLength={100}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Service</Text>
          <View style={styles.serviceSelector}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceOption,
                  selectedServiceId === service.id && styles.serviceOptionActive,
                ]}
                onPress={() => setSelectedServiceId(service.id)}
              >
                <View style={styles.radioButton}>
                  {selectedServiceId === service.id && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.titre}</Text>
                  <Text style={styles.servicePrice}>Base price: ${service.prix_base}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderRuleTypeSelector()}
        {renderRuleConfiguration()}

        {/* Priority */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Priority (1-10)</Text>
          <TextInput
            style={styles.formInput}
            placeholder="5"
            placeholderTextColor={COLORS.textSecondary}
            value={priority}
            onChangeText={setPriority}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.formHint}>
            Higher priority rules are applied first
          </Text>
        </View>

        {/* Active Toggle */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.formLabel}>Activate Rule</Text>
              <Text style={styles.formHint}>Rule will take effect immediately</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submitRule}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.surface} />
              <Text style={styles.submitButtonText}>Update Pricing Rule</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
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
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  serviceSelector: {
    gap: 12,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  serviceOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ruleTypeGrid: {
    gap: 12,
  },
  ruleTypeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  ruleTypeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  ruleTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  ruleTypeLabelActive: {
    color: COLORS.primary,
  },
  ruleTypeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayButtonTextActive: {
    color: COLORS.surface,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
