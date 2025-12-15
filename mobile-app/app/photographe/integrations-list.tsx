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
  SafeAreaView,
} from 'react-native';
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
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  stripe: '#635BFF',
};

interface Integration {
  id: string;
  provider: string;
  integration_type: string;
  is_active: boolean;
  status: string;
  created_at: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'stripe',
    type: 'payment',
    name: 'Stripe',
    description: 'Acceptez les paiements en ligne avec Stripe',
    icon: 'card',
    color: COLORS.stripe,
    features: ['Paiements sécurisés', 'Virements instantanés', 'Multi-devise'],
  },
  {
    provider: 'google_calendar',
    type: 'calendar',
    name: 'Google Calendar',
    description: 'Synchronisez vos réservations avec Google Calendar',
    icon: 'calendar',
    color: '#4285F4',
    features: ['Sync bidirectionnel', 'Auto-sync réservations', 'Blocage disponibilité'],
  },
];

export default function IntegrationsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace('/auth/login');
        return;
      }

      setUserId(authUser.id);

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('photographe_id', authUser.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
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
        const { error } = await supabase
          .from('integrations')
          .update({
            is_active: !currentlyActive,
            status: !currentlyActive ? 'active' : 'paused',
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const config = AVAILABLE_INTEGRATIONS.find((i) => i.provider === provider);
        if (!config) return;

        const { error } = await supabase.from('integrations').insert({
          photographe_id: userId,
          provider,
          is_active: true,
          metadata: { name: config.name },
        });

        if (error) throw error;

        Alert.alert(
          'Connecter ' + config.name,
          'Vous serez redirigé pour autoriser cette intégration.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Continuer',
              onPress: () => {
                router.push(`/photographe/integrations/setup?provider=${provider}` as any);
              },
            },
          ]
        );
      }

      await loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'intégration');
    }
  };

  const disconnectIntegration = async (integration: Integration) => {
    Alert.alert(
      'Déconnecter l\'intégration?',
      `Êtes-vous sûr de vouloir déconnecter ${AVAILABLE_INTEGRATIONS.find(i => i.provider === integration.provider)?.name}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('integrations')
                .delete()
                .eq('id', integration.id);

              if (error) throw error;
              await loadIntegrations();
              Alert.alert('Succès', 'Intégration déconnectée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de déconnecter l\'intégration');
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Intégrations & Paiements</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Connectez vos outils préférés pour améliorer votre workflow
          </Text>
        </View>

        {AVAILABLE_INTEGRATIONS.map(config => {
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

              <View style={styles.integrationActions}>
                {isConnected ? (
                  <>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.warning }]} />
                      <Text style={styles.statusText}>{isActive ? 'Actif' : 'Paused'}</Text>
                    </View>
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
                    <Text style={styles.connectButtonText}>Connecter</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 80 }} />
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  integrationCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  integrationIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  integrationDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  integrationFeatures: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  integrationActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectButton: {
    padding: 8,
  },
});
