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
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';

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

const POLICY_TEMPLATES = [
  {
    name: 'Flexible',
    type: 'flexible',
    description: 'Full refund if cancelled 24+ hours before, 50% refund within 24 hours',
    refund_rules: [
      { hours_before: 24, refund_percentage: 100 },
      { hours_before: 0, refund_percentage: 50 },
    ],
    cancellation_fee_percentage: 0,
    icon: '😊' as const,
    color: '#34C759',
  },
  {
    name: 'Moderate',
    type: 'moderate',
    description: 'Full refund if cancelled 48+ hours before, 50% within 48 hours, no refund within 24 hours',
    refund_rules: [
      { hours_before: 48, refund_percentage: 100 },
      { hours_before: 24, refund_percentage: 50 },
      { hours_before: 0, refund_percentage: 0 },
    ],
    cancellation_fee_percentage: 0,
    icon: '😐' as const,
    color: '#FF9500',
  },
  {
    name: 'Strict',
    type: 'strict',
    description: 'Full refund if cancelled 7+ days before, 50% within 7 days, no refund within 48 hours',
    refund_rules: [
      { hours_before: 168, refund_percentage: 100 }, // 7 days
      { hours_before: 48, refund_percentage: 50 },
      { hours_before: 0, refund_percentage: 0 },
    ],
    cancellation_fee_percentage: 10,
    icon: '😤' as const,
    color: '#FF3B30',
  },
];

interface CancellationPolicy {
  id: string;
  policy_name: string;
  policy_type: string;
  refund_rules: Array<{ hours_before: number; refund_percentage: number }>;
  cancellation_fee_percentage: number;
  cancellation_fee_fixed: number;
  description: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export default function CancellationPoliciesScreen() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [policyName, setPolicyName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof POLICY_TEMPLATES[0] | null>(null);
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setProviderId(user.id);

      const { data, error } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('provider_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error loading policies:', error);
      Alert.alert('Error', 'Failed to load cancellation policies');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setPolicyName(template.name);
    setDescription(template.description);
    setShowForm(true);
  };

  const savePolicy = async () => {
    if (!policyName || !selectedTemplate || !providerId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('cancellation_policies')
          .update({ is_default: false })
          .eq('provider_id', providerId);
      }

      const { data, error } = await supabase
        .from('cancellation_policies')
        .insert({
          provider_id: providerId,
          policy_name: policyName,
          policy_type: selectedTemplate.type,
          refund_rules: selectedTemplate.refund_rules,
          cancellation_fee_percentage: selectedTemplate.cancellation_fee_percentage,
          cancellation_fee_fixed: 0,
          description: description || selectedTemplate.description,
          is_default: isDefault,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPolicies(prev => [data, ...prev]);
      resetForm();
      Alert.alert('Success', 'Cancellation policy created!');
    } catch (error) {
      console.error('Error saving policy:', error);
      Alert.alert('Error', 'Failed to create policy');
    } finally {
      setSaving(false);
    }
  };

  const togglePolicyStatus = async (policyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('cancellation_policies')
        .update({ is_active: !currentStatus })
        .eq('id', policyId);

      if (error) throw error;

      setPolicies(prev =>
        prev.map(policy =>
          policy.id === policyId ? { ...policy, is_active: !currentStatus } : policy
        )
      );
    } catch (error) {
      console.error('Error toggling policy:', error);
      Alert.alert('Error', 'Failed to update policy status');
    }
  };

  const setDefaultPolicy = async (policyId: string) => {
    if (!providerId) return;

    try {
      // Unset all defaults
      await supabase
        .from('cancellation_policies')
        .update({ is_default: false })
        .eq('provider_id', providerId);

      // Set new default
      const { error } = await supabase
        .from('cancellation_policies')
        .update({ is_default: true })
        .eq('id', policyId);

      if (error) throw error;

      setPolicies(prev =>
        prev.map(policy => ({
          ...policy,
          is_default: policy.id === policyId,
        }))
      );

      Alert.alert('Success', 'Default policy updated');
    } catch (error) {
      console.error('Error setting default policy:', error);
      Alert.alert('Error', 'Failed to update default policy');
    }
  };

  const deletePolicy = async (policyId: string) => {
    Alert.alert(
      'Delete Policy',
      'Are you sure you want to delete this cancellation policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cancellation_policies')
                .delete()
                .eq('id', policyId);

              if (error) throw error;

              setPolicies(prev => prev.filter(policy => policy.id !== policyId));
              Alert.alert('Success', 'Policy deleted');
            } catch (error) {
              console.error('Error deleting policy:', error);
              Alert.alert('Error', 'Failed to delete policy');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setPolicyName('');
    setSelectedTemplate(null);
    setDescription('');
    setIsDefault(false);
    setShowForm(false);
  };

  const formatRefundRules = (rules: Array<{ hours_before: number; refund_percentage: number }>) => {
    return rules.map(rule => {
      const hours = rule.hours_before;
      const days = Math.floor(hours / 24);
      const timeStr = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${timeStr} before: ${rule.refund_percentage}% refund`;
    }).join('\n');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading policies...</Text>
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
        <Text style={styles.headerTitle}>Cancellation Policies</Text>
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
          <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Protect Your Business</Text>
            <Text style={styles.infoText}>
              Set clear cancellation policies to manage refunds fairly while protecting your time.
            </Text>
          </View>
        </View>

        {/* Templates */}
        {!showForm && (
          <View style={styles.templatesSection}>
            <Text style={styles.sectionTitle}>Choose a Template</Text>
            <View style={styles.templatesGrid}>
              {POLICY_TEMPLATES.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.templateCard, { borderColor: template.color }]}
                  onPress={() => applyTemplate(template)}
                >
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <View style={[styles.templateBadge, { backgroundColor: `${template.color}20` }]}>
                    <Text style={[styles.templateBadgeText, { color: template.color }]}>
                      {template.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Form */}
        {showForm && selectedTemplate && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Create Policy</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Policy Name *</Text>
              <TextInput
                style={styles.input}
                value={policyName}
                onChangeText={setPolicyName}
                placeholder="e.g., Standard Cancellation Policy"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={selectedTemplate.description}
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Set as default policy</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: COLORS.border, true: COLORS.success }}
              />
            </View>

            <View style={styles.policyPreview}>
              <Text style={styles.previewTitle}>Refund Schedule:</Text>
              <Text style={styles.previewText}>
                {formatRefundRules(selectedTemplate.refund_rules)}
              </Text>
              {selectedTemplate.cancellation_fee_percentage > 0 && (
                <Text style={styles.previewFee}>
                  + {selectedTemplate.cancellation_fee_percentage}% cancellation fee
                </Text>
              )}
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
                onPress={savePolicy}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Policy</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Policies */}
        <View style={styles.policiesSection}>
          <Text style={styles.sectionTitle}>Your Policies ({policies.length})</Text>
          {policies.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>No Policies Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first cancellation policy to protect your bookings.
              </Text>
            </View>
          ) : (
            policies.map(policy => (
              <View key={policy.id} style={styles.policyCard}>
                <View style={styles.policyHeader}>
                  <View style={styles.policyInfo}>
                    <Text style={styles.policyName}>{policy.policy_name}</Text>
                    {policy.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={policy.is_active}
                    onValueChange={() => togglePolicyStatus(policy.id, policy.is_active)}
                    trackColor={{ false: COLORS.border, true: COLORS.success }}
                  />
                </View>

                <Text style={styles.policyDescription}>{policy.description}</Text>

                <View style={styles.policyRules}>
                  <Text style={styles.policyRulesTitle}>Refund Schedule:</Text>
                  <Text style={styles.policyRulesText}>
                    {formatRefundRules(policy.refund_rules)}
                  </Text>
                </View>

                <View style={styles.policyFooter}>
                  {!policy.is_default && (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => setDefaultPolicy(policy.id)}
                    >
                      <Text style={styles.setDefaultButtonText}>Set as Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deletePolicy(policy.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Policy Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Flexible policies can increase booking rates
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Stricter policies work better for high-demand periods
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Clearly communicate your policy to avoid disputes
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Review and adjust policies based on your experience
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
  templatesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  templatesGrid: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  templateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  templateBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  templateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  policyPreview: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  previewFee: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 8,
    fontWeight: '600',
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
  policiesSection: {
    marginBottom: 20,
  },
  policyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  policyName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  policyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  policyRules: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  policyRulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  policyRulesText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  policyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  setDefaultButton: {
    flex: 1,
    paddingVertical: 8,
  },
  setDefaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
