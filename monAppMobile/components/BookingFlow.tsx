import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabaseClient';
import { COLORS, TYPOGRAPHY, SPACING } from '../lib/constants';
import Card from './ui/Card';
import Button from './ui/Button';
import PaymentSheet from './ui/PaymentSheet';

interface BookingFlowProps {
  annonceId: string;
  prestataireName: string;
  serviceTitle: string;
  basePrice: number;
  acomptePercent?: number;
  onBookingComplete: (booking: any) => void;
  onCancel: () => void;
  userEmail?: string;
  userId?: string;
}

export default function BookingFlow({
  annonceId,
  prestataireName,
  serviceTitle,
  basePrice,
  acomptePercent = 30,
  onBookingComplete,
  onCancel,
  userEmail,
  userId,
}: BookingFlowProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');

  const acompteAmount = (basePrice * acomptePercent) / 100;
  const remainingAmount = basePrice - acompteAmount;

  useEffect(() => {
    // Récupérer la clé publique Stripe depuis les variables d'environnement
    // ou depuis votre API/Supabase
    const loadStripeKey = async () => {
      try {
        // Option 1: Depuis les variables d'environnement
        const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (key) {
          setStripePublishableKey(key);
          return;
        }

        // Option 2: Depuis une API ou Supabase
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_publishable_key')
          .single();

        if (data?.value) {
          setStripePublishableKey(data.value);
        } else {
          console.error('Clé Stripe non trouvée');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la clé Stripe:', error);
      }
    };

    loadStripeKey();
  }, []);

  const handleBookingConfirmation = async () => {
    try {
      // 1. Créer la réservation dans Supabase
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          annonce_id: annonceId,
          user_id: userId,
          montant_total: basePrice,
          montant_acompte: acompteAmount,
          montant_restant: remainingAmount,
          statut: 'en_attente_paiement',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (reservationError) {
        throw new Error('Erreur lors de la création de la réservation');
      }

      setBookingData(reservation);
      setShowPayment(true);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la création de votre réservation.'
      );
    }
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    try {
      // Mettre à jour la réservation avec les infos de paiement
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          statut: 'acompte_paye',
          stripe_payment_intent_id: paymentResult.id,
          date_paiement_acompte: new Date().toISOString(),
        })
        .eq('id', bookingData.id);

      if (updateError) {
        throw new Error('Erreur lors de la mise à jour de la réservation');
      }

      onBookingComplete({
        ...bookingData,
        statut: 'acompte_paye',
        payment_intent: paymentResult,
      });
    } catch (error) {
      console.error('Erreur post-paiement:', error);
      Alert.alert(
        'Attention',
        'Le paiement a été traité mais une erreur est survenue. Veuillez contacter le support.'
      );
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Erreur de paiement:', error);
    // Optionnel: Mettre à jour le statut de la réservation
    if (bookingData) {
      supabase
        .from('reservations')
        .update({ statut: 'paiement_echoue' })
        .eq('id', bookingData.id);
    }
  };

  if (showPayment && stripePublishableKey) {
    return (
      <StripeProvider publishableKey={stripePublishableKey}>
        <ScrollView style={styles.container}>
          <PaymentSheet
            amount={acompteAmount}
            currency="EUR"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onCancel={() => setShowPayment(false)}
            customerEmail={userEmail}
            description={`Acompte pour "${serviceTitle}" avec ${prestataireName}`}
            metadata={{
              annonce_id: annonceId,
              reservation_id: bookingData?.id || '',
              type: 'acompte',
            }}
          />
        </ScrollView>
      </StripeProvider>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.bookingCard}>
        <View style={styles.header}>
          <Text style={styles.title}>📅 Confirmer la réservation</Text>
          <Text style={styles.serviceTitle}>{serviceTitle}</Text>
          <Text style={styles.prestataire}>avec {prestataireName}</Text>
        </View>

        <View style={styles.priceBreakdown}>
          <Text style={styles.sectionTitle}>Détail des prix</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix total du service</Text>
            <Text style={styles.priceValue}>{basePrice.toFixed(2)}€</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Acompte à payer maintenant ({acomptePercent}%)</Text>
            <Text style={styles.acompteValue}>{acompteAmount.toFixed(2)}€</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Solde à payer au prestataire</Text>
            <Text style={styles.priceValue}>{remainingAmount.toFixed(2)}€</Text>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>Conditions</Text>
          <Text style={styles.termsText}>
            • L'acompte de {acomptePercent}% sera prélevé immédiatement{'\n'}
            • Le solde sera à régler directement au prestataire{'\n'}
            • L'acompte garantit votre réservation{'\n'}
            • Politique d'annulation selon les conditions du prestataire
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={`Payer l'acompte ${acompteAmount.toFixed(2)}€`}
            onPress={handleBookingConfirmation}
            style={styles.confirmButton}
          />
          
          <Button
            title="Annuler"
            variant="outline"
            onPress={onCancel}
            style={styles.cancelButton}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

interface Styles {
  container: ViewStyle;
  bookingCard: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  serviceTitle: TextStyle;
  prestataire: TextStyle;
  priceBreakdown: ViewStyle;
  sectionTitle: TextStyle;
  priceRow: ViewStyle;
  priceLabel: TextStyle;
  priceValue: TextStyle;
  acompteValue: TextStyle;
  termsContainer: ViewStyle;
  termsTitle: TextStyle;
  termsText: TextStyle;
  buttonContainer: ViewStyle;
  confirmButton: ViewStyle;
  cancelButton: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bookingCard: {
    margin: SPACING.md,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  serviceTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  prestataire: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },
  priceBreakdown: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  priceLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginRight: SPACING.md,
  },
  priceValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  acompteValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '700' as any,
    color: COLORS.accent,
  },
  termsContainer: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
  },
  termsTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  termsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButton: {
    borderColor: COLORS.gray[300],
  },
});