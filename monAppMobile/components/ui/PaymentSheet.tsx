import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../../lib/constants';
import Button from './Button';
import Card from './Card';

interface PaymentSheetProps {
  amount: number;
  currency?: string;
  onPaymentSuccess: (paymentResult: any) => void;
  onPaymentError: (error: any) => void;
  onCancel: () => void;
  customerEmail?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export default function PaymentSheet({
  amount,
  currency = 'EUR',
  onPaymentSuccess,
  onPaymentError,
  onCancel,
  customerEmail,
  metadata = {},
  description = 'Paiement',
}: PaymentSheetProps) {
  const stripe = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!stripe) {
      Alert.alert('Erreur', 'Stripe n\'est pas encore initialisé');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Créer une session de paiement via notre API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/create-mobile-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: currency.toLowerCase(),
          customer_email: customerEmail,
          metadata,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la session de paiement');
      }

      const { client_secret } = await response.json();

      // 2. Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await stripe.confirmPayment(client_secret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Erreur de paiement:', error);
        onPaymentError(error);
        Alert.alert(
          'Erreur de paiement',
          error.message || 'Une erreur est survenue lors du paiement'
        );
      } else if (paymentIntent) {
        console.log('Paiement réussi:', paymentIntent);
        onPaymentSuccess(paymentIntent);
        Alert.alert(
          'Paiement réussi !',
          'Votre paiement a été traité avec succès.'
        );
      }
    } catch (error) {
      console.error('Erreur:', error);
      onPaymentError(error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du traitement de votre paiement.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💳 Paiement sécurisé</Text>
        <Text style={styles.subtitle}>Propulsé par Stripe</Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Montant à payer</Text>
        <Text style={styles.amount}>
          {amount.toFixed(2)} {currency.toUpperCase()}
        </Text>
      </View>

      {description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={isProcessing ? 'Traitement...' : `Payer ${amount.toFixed(2)}€`}
          onPress={handlePayment}
          disabled={isProcessing}
          style={styles.payButton}
          icon={isProcessing ? 
            <ActivityIndicator size="small" color={COLORS.white} /> : 
            undefined
          }
        />
        
        <Button
          title="Annuler"
          variant="outline"
          onPress={onCancel}
          disabled={isProcessing}
          style={styles.cancelButton}
        />
      </View>

      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>
          🔒 Paiement 100% sécurisé. Vos informations de carte de crédit ne sont jamais stockées sur nos serveurs.
        </Text>
      </View>
    </Card>
  );
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  amountContainer: ViewStyle;
  amountLabel: TextStyle;
  amount: TextStyle;
  descriptionContainer: ViewStyle;
  description: TextStyle;
  buttonContainer: ViewStyle;
  payButton: ViewStyle;
  cancelButton: ViewStyle;
  securityInfo: ViewStyle;
  securityText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    padding: SPACING.lg,
    margin: SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  amountContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  amount: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: '700' as any,
    color: COLORS.accent,
  },
  descriptionContainer: {
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  payButton: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.md,
  },
  cancelButton: {
    borderColor: COLORS.gray[300],
  },
  securityInfo: {
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  securityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});