import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import FooterPresta from '../../components/FooterPresta';

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
  { value: 'seasonal', label: 'Seasonal Pricing', icon: 'sunny-outline' as any },
  { value: 'demand_based', label: 'Demand-Based', icon: 'trending-up-outline' as any },
  { value: 'duration_based', label: 'Duration Discount', icon: 'time-outline' as any },
  { value: 'day_of_week', label: 'Day of Week', icon: 'calendar-outline' as any },
  { value: 'early_bird', label: 'Early Bird Discount', icon: 'alarm-outline' as any },
  { value: 'last_minute', label: 'Last Minute Deal', icon: 'flash-outline' as any },
];

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  rule_config: any;
  base_price: number | null;
  adjusted_price: number | null;
  is_active: boolean;
  priority: number;
  annonce_id: string | null;
  created_at: string;
}

export default function PricingRulesScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndRules();
  }, []);

  const loadUserAndRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setProviderId(user.id);
      await loadRules(user.id);
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const loadRules = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('provider_id', userId)
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading pricing rules:', error);
      Alert.alert('Error', 'Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev =>
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
      'Delete Rule',
      'Are you sure you want to delete this pricing rule?',
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

              setRules(prev => prev.filter(rule => rule.id !== ruleId));
              Alert.alert('Success', 'Pricing rule deleted');
            } catch (error) {
              console.error('Error deleting rule:', error);
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const getRuleIcon = (ruleType: string) => {
    const rule = RULE_TYPES.find(r => r.value === ruleType);
    return rule?.icon || 'pricetag-outline';
  };

  const getRuleLabel = (ruleType: string) => {
    const rule = RULE_TYPES.find(r => r.value === ruleType);
    return rule?.label || ruleType;
  };

  const formatRuleConfig = (rule: PricingRule) => {
    switch (rule.rule_type) {
      case 'seasonal':
        return `${rule.rule_config.season || 'Season'}: ${rule.rule_config.start_date} to ${rule.rule_config.end_date} (${rule.rule_config.price_multiplier}x)`;
      case 'demand_based':
        return `${rule.rule_config.threshold_bookings} bookings in ${rule.rule_config.period_days} days = ${rule.rule_config.price_multiplier}x`;
      case 'duration_based':
        return `${rule.rule_config.min_duration_hours}+ hours = ${rule.rule_config.discount_percentage}% off`;
      case 'day_of_week':
        return `${rule.rule_config.days?.join(', ')} = ${rule.rule_config.price_multiplier}x`;
      case 'early_bird':
        return `Book ${rule.rule_config.days_in_advance}+ days ahead = ${rule.rule_config.discount_percentage}% off`;
      case 'last_minute':
        return `Book within ${rule.rule_config.hours_before} hours = ${rule.rule_config.discount_percentage}% off`;
      default:
        return 'Custom configuration';
    }
  };

  const renderRuleCard = (rule: PricingRule) => (
    <View key={rule.id} style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <View style={styles.ruleIconContainer}>
          <Ionicons name={getRuleIcon(rule.rule_type)} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.ruleInfo}>
          <Text style={styles.ruleName}>{rule.rule_name}</Text>
          <Text style={styles.ruleType}>{getRuleLabel(rule.rule_type)}</Text>
        </View>
        <Switch
          value={rule.is_active}
          onValueChange={() => toggleRuleStatus(rule.id, rule.is_active)}
          trackColor={{ false: COLORS.border, true: COLORS.success }}
        />
      </View>

      <View style={styles.ruleDetails}>
        <Text style={styles.ruleConfig}>{formatRuleConfig(rule)}</Text>
        
        {rule.adjusted_price && (
          <View style={styles.pricePreview}>
            <Text style={styles.priceLabel}>Adjusted Price:</Text>
            <Text style={styles.priceValue}>${rule.adjusted_price.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.ruleFooter}>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>Priority: {rule.priority}</Text>
        </View>
        <View style={styles.ruleActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/prestataires/edit-pricing-rule?id=${rule.id}` as any)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteRule(rule.id)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading pricing rules...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dynamic Pricing</Text>
        <TouchableOpacity onPress={() => router.push('/prestataires/price-simulator' as any)}>
          <Ionicons name="calculator-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={24} color={COLORS.warning} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Maximize Your Earnings</Text>
            <Text style={styles.infoText}>
              Set up automatic pricing rules based on demand, seasonality, and booking patterns.
            </Text>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rules.length}</Text>
            <Text style={styles.statLabel}>Total Rules</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {rules.filter(r => r.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
              {rules.filter(r => !r.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/prestataires/add-pricing-rule' as any)}
          >
            <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Add New Rule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/prestataires/seasonal-pricing' as any)}
          >
            <Ionicons name="sunny-outline" size={28} color={COLORS.warning} />
            <Text style={styles.quickActionText}>Seasonal Rules</Text>
          </TouchableOpacity>
        </View>

        {/* Rules List */}
        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Your Pricing Rules</Text>
          {rules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>No Pricing Rules Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first pricing rule to start optimizing your earnings automatically.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/prestataires/add-pricing-rule' as any)}
              >
                <Text style={styles.emptyStateButtonText}>Create First Rule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rules.map(renderRuleCard)
          )}
        </View>

        {/* Best Practices */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Pricing Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Set higher priorities for more specific rules</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Use seasonal pricing for peak demand periods</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Offer early bird discounts to increase bookings</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Test different rules and track performance</Text>
          </View>
        </View>
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 20,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  rulesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  ruleType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ruleDetails: {
    marginBottom: 12,
  },
  ruleConfig: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  pricePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  priceValue: {
    fontSize: 18,
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
  priorityBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
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
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
