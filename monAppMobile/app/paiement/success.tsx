import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  success: '#10B981',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171'
};

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reservation_id, montant } = params;

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icône de succès animée */}
        <Animated.View style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={64} color={COLORS.success} />
          </View>
        </Animated.View>

        {/* Contenu animé */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>Paiement réussi !</Text>
          <Text style={styles.subtitle}>Votre réservation a été confirmée</Text>

          {/* Détails */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Réservation confirmée</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Montant payé : {montant}€</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.detailLabel}>Transaction sécurisée</Text>
            </View>
          </View>

          {/* Message informatif */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Un email de confirmation vous a été envoyé. Vous pouvez suivre l'état de votre réservation dans votre espace.
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/particuliers/reservations')}
          >
            <Text style={styles.primaryButtonText}>Voir mes réservations</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/particuliers/menu')}
          >
            <Text style={styles.secondaryButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
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
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
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
    marginBottom: 32,
    textAlign: 'center'
  },
  detailsCard: {
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  detailLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
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
    marginRight: 8
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%'
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center'
  }
});
