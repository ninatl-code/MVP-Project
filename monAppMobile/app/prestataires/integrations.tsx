import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
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
  purple: '#AF52DE',
  google: '#4285F4',
  stripe: '#635BFF',
  paypal: '#00457C',
  facebook: '#1877F2',
  instagram: '#E4405F',
};

interface Integration {
  id: string;
  provider: string;
  integration_type: string;
  is_active: boolean;
  status: string;
  last_sync_at: string | null;
  sync_status: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'google_calendar',
    type: 'calendar',
    name: 'Google Calendar',
    description: 'Sync your bookings with Google Calendar',
    icon: 'calendar',
    color: COLORS.google,
    features: ['Two-way sync', 'Auto-sync bookings', 'Availability blocking'],
  },
  {
    provider: 'outlook_calendar',
    type: 'calendar',
    name: 'Outlook Calendar',
    description: 'Sync with Microsoft Outlook',
    icon: 'calendar-outline',
    color: '#0078D4',
    features: ['Calendar sync', 'Meeting scheduling', 'Reminders'],
  },
  {
    provider: 'apple_calendar',
    type: 'calendar',
    name: 'Apple Calendar',
    description: 'Sync with iCloud Calendar',
    icon: 'logo-apple',
    color: '#000000',
    features: ['iCloud sync', 'Cross-device', 'Availability'],
  },
  {
    provider: 'stripe',
    type: 'payment',
    name: 'Stripe',
    description: 'Accept online payments with Stripe',
    icon: 'card',
    color: COLORS.stripe,
    features: ['Secure payments', 'Instant transfers', 'Multi-currency'],
  },
  {
    provider: 'paypal',
    type: 'payment',
    name: 'PayPal',
    description: 'Accept PayPal payments',
    icon: 'logo-paypal',
    color: COLORS.paypal,
    features: ['PayPal wallet', 'Buyer protection', 'Global reach'],
  },
  {
    provider: 'facebook',
    type: 'social',
    name: 'Facebook',
    description: 'Share services on Facebook',
    icon: 'logo-facebook',
    color: COLORS.facebook,
    features: ['Auto-post', 'Page integration', 'Messenger'],
  },
  {
    provider: 'instagram',
    type: 'social',
    name: 'Instagram',
    description: 'Showcase your portfolio on Instagram',
    icon: 'logo-instagram',
    color: COLORS.instagram,
    features: ['Story sharing', 'Portfolio sync', 'Business profile'],
  },
  {
    provider: 'twitter',
    type: 'social',
    name: 'Twitter (X)',
    description: 'Promote services on Twitter',
    icon: 'logo-twitter',
    color: '#1DA1F2',
    features: ['Auto-tweet', 'Engagement', 'Hashtags'],
  },
  {
    provider: 'quickbooks',
    type: 'accounting',
    name: 'QuickBooks',
    description: 'Sync invoices and expenses',
    icon: 'calculator',
    color: '#2CA01C',
    features: ['Invoice sync', 'Expense tracking', 'Reports'],
  },
  {
    provider: 'hubspot',
    type: 'crm',
    name: 'HubSpot',
    description: 'Manage customer relationships',
    icon: 'people',
    color: '#FF7A59',
    features: ['Contact sync', 'Deal tracking', 'Analytics'],
  },
  {
    provider: 'slack',
    type: 'messaging',
    name: 'Slack',
    description: 'Receive notifications in Slack',
    icon: 'chatbox',
    color: '#4A154B',
    features: ['Booking alerts', 'Team notifications', 'Status updates'],
  },
  {
    provider: 'zoom',
    type: 'video',
    name: 'Zoom',
    description: 'Schedule video meetings',
    icon: 'videocam',
    color: '#2D8CFF',
    features: ['Auto-create meetings', 'Calendar sync', 'Recording'],
  },
];

export default function IntegrationsScreen() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);

  const types = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'payment', label: 'Payment', icon: 'card' },
    { id: 'social', label: 'Social', icon: 'share-social' },
    { id: 'accounting', label: 'Accounting', icon: 'calculator' },
    { id: 'crm', label: 'CRM', icon: 'people' },
  ];

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      Alert.alert('Error', 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (provider: string) => {
    return integrations.find((i) => i.provider === provider);
  };

  const toggleIntegration = async (provider: string, currentlyActive: boolean) => {
    if (!userId) return;

    try {
      const existing = getIntegrationStatus(provider);

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('integrations')
          .update({
            is_active: !currentlyActive,
            status: !currentlyActive ? 'active' : 'paused',
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const integrationConfig = AVAILABLE_INTEGRATIONS.find((i) => i.provider === provider);
        if (!integrationConfig) return;

        const { error } = await supabase.from('integrations').insert({
          user_id: userId,
          provider,
          integration_type: integrationConfig.type,
          is_active: true,
          status: 'pending_auth',
          configuration: {},
          credentials: {},
          metadata: {
            name: integrationConfig.name,
          },
        });

        if (error) throw error;

        // Navigate to configuration screen
        Alert.alert(
          'Connect ' + integrationConfig.name,
          'You will be redirected to authorize this integration.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // In production, this would open OAuth flow
                router.push(
                  `/prestataires/integration-setup?provider=${provider}` as any
                );
              },
            },
          ]
        );
      }

      await loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      Alert.alert('Error', 'Failed to update integration');
    }
  };

  const disconnectIntegration = (integration: Integration) => {
    Alert.alert(
      'Disconnect Integration',
      `Are you sure you want to disconnect ${integration.metadata?.name || integration.provider}? This will stop all data syncing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('integrations')
                .delete()
                .eq('id', integration.id);

              if (error) throw error;
              await loadIntegrations();
              Alert.alert('Success', 'Integration disconnected');
            } catch (error) {
              console.error('Error disconnecting:', error);
              Alert.alert('Error', 'Failed to disconnect integration');
            }
          },
        },
      ]
    );
  };

  const getFilteredIntegrations = () => {
    if (selectedType === 'all') return AVAILABLE_INTEGRATIONS;
    return AVAILABLE_INTEGRATIONS.filter((i) => i.type === selectedType);
  };

  const renderIntegrationCard = (config: typeof AVAILABLE_INTEGRATIONS[0]) => {
    const status = getIntegrationStatus(config.provider);
    const isConnected = !!status;
    const isActive = status?.is_active || false;

    return (
      <View key={config.provider} style={styles.integrationCard}>
        <View style={styles.integrationHeader}>
          <View style={[styles.integrationIcon, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon as any} size={28} color={config.color} />
          </View>
          <View style={styles.integrationInfo}>
            <Text style={styles.integrationName}>{config.name}</Text>
            <Text style={styles.integrationDescription}>{config.description}</Text>
          </View>
        </View>

        <View style={styles.integrationFeatures}>
          {config.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isConnected && (
          <View style={styles.integrationStatus}>
            {status.error_message ? (
              <View style={styles.statusError}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.statusErrorText}>Connection error</Text>
              </View>
            ) : status.last_sync_at ? (
              <View style={styles.statusSuccess}>
                <Ionicons name="sync" size={14} color={COLORS.success} />
                <Text style={styles.statusSuccessText}>
                  Synced {new Date(status.last_sync_at).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.integrationActions}>
          {isConnected ? (
            <>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                  {isActive ? 'Active' : 'Paused'}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={() => toggleIntegration(config.provider, isActive)}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.surface}
                />
              </View>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() =>
                  router.push(
                    `/prestataires/integration-settings?id=${status.id}` as any
                  )
                }
              >
                <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => disconnectIntegration(status)}
              >
                <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => toggleIntegration(config.provider, false)}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const filteredIntegrations = getFilteredIntegrations();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Integrations</Text>
        <TouchableOpacity onPress={() => router.push('/prestataires/webhooks' as any)}>
          <Ionicons name="code-slash-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{integrations.length}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {integrations.filter((i) => i.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{AVAILABLE_INTEGRATIONS.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typesScroll}
        contentContainerStyle={styles.typesContent}
      >
        {types.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.typeChip, selectedType === type.id && styles.typeChipActive]}
            onPress={() => setSelectedType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={18}
              color={selectedType === type.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.typeChipText,
                selectedType === type.id && styles.typeChipTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Integrations List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {filteredIntegrations.map(renderIntegrationCard)}
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  typesScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  typesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  typeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  integrationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  integrationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  integrationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  integrationDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  integrationFeatures: {
    marginBottom: 12,
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  integrationStatus: {
    marginBottom: 12,
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusSuccessText: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: 6,
    fontWeight: '600',
  },
  statusError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusErrorText: {
    fontSize: 12,
    color: COLORS.error,
    marginLeft: 6,
    fontWeight: '600',
  },
  integrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
