import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
};

export default function IntegrationSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const provider = params.provider as string;

  const [loading, setLoading] = useState(false);

  const getProviderConfig = (provider: string) => {
    const configs: { [key: string]: any } = {
      stripe: {
        name: 'Stripe',
        description: 'Configuration du compte Stripe Connect',
        authUrl: `https://connect.stripe.com/oauth/authorize?client_id=${process.env.EXPO_PUBLIC_STRIPE_OAUTH_CLIENT_ID}&type=standard&redirect_uri=${encodeURIComponent(process.env.EXPO_PUBLIC_STRIPE_OAUTH_REDIRECT_URI || '')}`,
        instructions: [
          'Vous serez redirigé vers Stripe Connect',
          'Connectez-vous avec votre compte Stripe',
          'Autorisez l\'accès à votre compte',
          'Vous serez redirigé automatiquement',
        ],
      },
      google_calendar: {
        name: 'Google Calendar',
        description: 'Synchronisez votre calendrier Google',
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID}&scope=calendar&response_type=code&redirect_uri=${encodeURIComponent(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI || '')}`,
        instructions: [
          'Vous serez redirigé vers Google',
          'Connectez-vous avec votre compte Google',
          'Autorisez l\'accès à votre calendrier',
          'Vous serez redirigé automatiquement',
        ],
      },
    };
    return configs[provider] || configs.stripe;
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const config = getProviderConfig(provider);
      
      // Check if OAuth URL is properly configured
      if (!config.authUrl || config.authUrl.includes('undefined')) {
        Alert.alert(
          'Configuration incomplète',
          `La configuration OAuth pour ${config.name} n'est pas complète. Veuillez contacter l'administrateur.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      
      // Open the OAuth URL
      const canOpen = await Linking.canOpenURL(config.authUrl);
      if (canOpen) {
        await Linking.openURL(config.authUrl);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien d\'authentification');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      Alert.alert('Erreur', 'Impossible de se connecter');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Passer la configuration?',
      'Vous pourrez configurer ceci plus tard depuis le menu Intégrations.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Passer',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  const config = getProviderConfig(provider);

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
        <Text style={styles.headerTitle}>Configuration</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#E8F5E9', '#C8E6C9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons
              name={provider === 'stripe' ? 'card' : 'calendar'}
              size={48}
              color={COLORS.primary}
            />
          </LinearGradient>
        </View>

        <Text style={styles.title}>{config.name}</Text>
        <Text style={styles.description}>{config.description}</Text>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Étapes:</Text>
          {config.instructions.map((instruction, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{instruction}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Votre connexion est sécurisée. Nous ne stockons jamais vos mots de passe.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Passer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.connectButton]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="open" size={18} color="white" />
              <Text style={styles.connectButtonText}>Se connecter</Text>
            </>
          )}
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
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  stepsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  skipButton: {
    backgroundColor: COLORS.border,
  },
  skipButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: COLORS.success,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
