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

const SEASON_PRESETS = [
  {
    name: 'Summer Peak',
    season: 'summer',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    multiplier: 1.3,
    color: '#FF9500',
    icon: 'sunny' as any,
  },
  {
    name: 'Winter Holidays',
    season: 'winter',
    startDate: '2025-12-15',
    endDate: '2026-01-05',
    multiplier: 1.5,
    color: '#5AC8FA',
    icon: 'snow' as any,
  },
  {
    name: 'Spring Break',
    season: 'spring',
    startDate: '2025-03-10',
    endDate: '2025-03-24',
    multiplier: 1.2,
    color: '#34C759',
    icon: 'flower' as any,
  },
  {
    name: 'Fall Events',
    season: 'fall',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    multiplier: 1.15,
    color: '#FF6B35',
    icon: 'leaf' as any,
  },
];

interface SeasonalRule {
  id: string;
  rule_name: string;
  rule_config: {
    season: string;
    start_date: string;
    end_date: string;
    price_multiplier: number;
  };
  is_active: boolean;
  created_at: string;
}

export default function SeasonalPricingScreen() {
  const [seasonalRules, setSeasonalRules] = useState<SeasonalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState('1.2');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSeasonalRules();
  }, []);

  const loadSeasonalRules = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setProviderId(user.id);

      const { data, error } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('provider_id', user.id)
        .eq('rule_type', 'seasonal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSeasonalRules(data || []);
    } catch (error) {
      console.error('Error loading seasonal rules:', error);
      Alert.alert('Error', 'Failed to load seasonal pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: typeof SEASON_PRESETS[0]) => {
    setRuleName(preset.name);
    setSelectedSeason(preset.season);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setMultiplier(preset.multiplier.toString());
    setShowForm(true);
  };

  const saveSeasonalRule = async () => {
    if (!ruleName || !startDate || !endDate || !multiplier || !providerId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const multiplierNum = parseFloat(multiplier);
    if (isNaN(multiplierNum) || multiplierNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price multiplier');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      setSaving(true);

      const ruleConfig = {
        season: selectedSeason || 'custom',
        start_date: startDate,
        end_date: endDate,
        price_multiplier: multiplierNum,
      };

      const { data, error } = await supabase
        .from('dynamic_pricing_rules')
        .insert({
          provider_id: providerId,
          rule_name: ruleName,
          rule_type: 'seasonal',
          rule_config: ruleConfig,
          is_active: true,
          priority: 2, // Medium priority for seasonal rules
        })
        .select()
        .single();

      if (error) throw error;

      setSeasonalRules(prev => [data, ...prev]);
      resetForm();
      Alert.alert('Success', 'Seasonal pricing rule created!');
    } catch (error) {
      console.error('Error saving seasonal rule:', error);
      Alert.alert('Error', 'Failed to create seasonal rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setSeasonalRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, is_active: !currentStatus } : rule
        )
      );
    } catch (error) {
      console.error('Error toggling rule:', error);
      Alert.alert('Error', 'Failed to update rule status');
    }
  };

  const deleteRule = async (ruleId: string) => {
    Alert.alert(
      'Delete Seasonal Rule',
      'Are you sure you want to delete this seasonal pricing rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('dynamic_pricing_rules')
                .delete()
                .eq('id', ruleId);

              if (error) throw error;

              setSeasonalRules(prev => prev.filter(rule => rule.id !== ruleId));
              Alert.alert('Success', 'Seasonal rule deleted');
            } catch (error) {
              console.error('Error deleting rule:', error);
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setRuleName('');
    setSelectedSeason('');
    setStartDate('');
    setEndDate('');
    setMultiplier('1.2');
    setShowForm(false);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const calculatePriceChange = (multiplier: number) => {
    const percentChange = ((multiplier - 1) * 100).toFixed(0);
    return multiplier > 1 ? `+${percentChange}%` : `${percentChange}%`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading seasonal rules...</Text>
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
        <Text style={styles.headerTitle}>Seasonal Pricing</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons
            name={showForm ? 'close-circle-outline' : 'add-circle-outline'}
            size={28}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="sunny-outline" size={24} color={COLORS.warning} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Optimize for Peak Seasons</Text>
            <Text style={styles.infoText}>
              Automatically adjust your prices during high-demand periods like holidays, summer, or local events.
            </Text>
          </View>
        </View>

        {/* Presets */}
        {!showForm && (
          <View style={styles.presetsSection}>
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            <View style={styles.presetsGrid}>
              {SEASON_PRESETS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.presetCard, { borderColor: preset.color }]}
                  onPress={() => applyPreset(preset)}
                >
                  <View style={[styles.presetIcon, { backgroundColor: `${preset.color}20` }]}>
                    <Ionicons name={preset.icon} size={28} color={preset.color} />
                  </View>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetMultiplier}>
                    {calculatePriceChange(preset.multiplier)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Form */}
        {showForm && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Create Seasonal Rule</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rule Name *</Text>
              <TextInput
                style={styles.input}
                value={ruleName}
                onChangeText={setRuleName}
                placeholder="e.g., Summer 2025 Peak Pricing"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date *</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date *</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price Multiplier *</Text>
              <TextInput
                style={styles.input}
                value={multiplier}
                onChangeText={setMultiplier}
                placeholder="1.2"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.inputHint}>
                Examples: 1.2 = +20%, 1.5 = +50%, 0.8 = -20%
              </Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveSeasonalRule}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Rule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Rules */}
        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Your Seasonal Rules ({seasonalRules.length})</Text>
          {seasonalRules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>No Seasonal Rules</Text>
              <Text style={styles.emptyStateText}>
                Create your first seasonal rule or use a preset to get started.
              </Text>
            </View>
          ) : (
            seasonalRules.map(rule => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleName}>{rule.rule_name}</Text>
                    <Text style={styles.ruleDateRange}>
                      {formatDateRange(rule.rule_config.start_date, rule.rule_config.end_date)}
                    </Text>
                  </View>
                  <View style={styles.ruleMultiplierBadge}>
                    <Text style={styles.ruleMultiplierText}>
                      {calculatePriceChange(rule.rule_config.price_multiplier)}
                    </Text>
                  </View>
                </View>

                <View style={styles.ruleFooter}>
                  <View style={styles.ruleStatus}>
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: rule.is_active ? COLORS.success : COLORS.textSecondary },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={styles.ruleActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleRuleStatus(rule.id, rule.is_active)}
                    >
                      <Ionicons
                        name={rule.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={24}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteActionButton]}
                      onPress={() => deleteRule(rule.id)}
                    >
                      <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Seasonal Pricing Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Analyze past year data to identify your busiest periods
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Start with moderate multipliers (1.2-1.3) and adjust based on demand
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Consider local events and holidays specific to your area
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Set rules well in advance so clients can plan accordingly
            </Text>
          </View>
        </View>
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
    backgroundColor: '#FFF9E6',
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
  presetsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  presetCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  presetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  presetMultiplier: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  formSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rulesSection: {
    marginBottom: 20,
  },
  ruleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  ruleDateRange: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ruleMultiplierBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ruleMultiplierText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  ruleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ruleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionButton: {},
  emptyState: {
    backgroundColor: COLORS.surface,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
