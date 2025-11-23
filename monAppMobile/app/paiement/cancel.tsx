import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB'
};

export default function PaymentCancel() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reservation_id } = params;

  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animation d'apparition
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handleRetry = () => {
    if (reservation_id) {
      router.push(`/paiement/checkout?reservation_id=${reservation_id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icône d'annulation animée */}
        <Animated.View style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <View style={styles.iconCircle}>
            <Ionicons name="close" size={64} color={COLORS.error} />
          </View>
        </Animated.View>

        {/* Contenu animé */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>Paiement annulé</Text>
          <Text style={styles.subtitle}>
            Votre paiement n'a pas été effectué
          </Text>

          {/* Raisons possibles */}
          <View style={styles.reasonsCard}>
            <Text style={styles.reasonsTitle}>Pourquoi le paiement a échoué ?</Text>
            
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={8} color={COLORS.textLight} />
              <Text style={styles.reasonText}>Transaction annulée par l'utilisateur</Text>
            </View>
            
            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={8} color={COLORS.textLight} />
              <Text style={styles.reasonText}>Informations de carte invalides</Text>
            </View>

            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={8} color={COLORS.textLight} />
              <Text style={styles.reasonText}>Problème de connexion</Text>
            </View>

            <View style={styles.reasonRow}>
              <Ionicons name="ellipse" size={8} color={COLORS.textLight} />
              <Text style={styles.reasonText}>Fonds insuffisants</Text>
            </View>
          </View>

          {/* Message informatif */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.warning} />
            <Text style={styles.infoText}>
              Aucun montant n'a été débité de votre compte. Vous pouvez réessayer le paiement ou contacter le support si le problème persiste.
            </Text>
          </View>

          {/* Actions */}
          {reservation_id && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={20} color={COLORS.background} />
              <Text style={styles.primaryButtonText}>Réessayer le paiement</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/particuliers/reservations')}
          >
            <Text style={styles.secondaryButtonText}>Voir mes réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={() => router.push('/particuliers/menu')}
          >
            <Text style={styles.tertiaryButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>

          {/* Support */}
          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Besoin d'aide ?</Text>
            <TouchableOpacity style={styles.supportButton}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.supportButtonText}>Contacter le support</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  iconContainer: {
    marginBottom: 32
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center'
  },
  reasonsCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  reasonText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.textLight
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    width: '100%'
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
    marginLeft: 8
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center'
  },
  tertiaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 24
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center'
  },
  supportSection: {
    width: '100%',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center'
  },
  supportTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  supportButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  }
});
