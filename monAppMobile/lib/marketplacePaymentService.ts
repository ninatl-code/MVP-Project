import { supabase } from './supabaseClient';
import { logger } from './loggerService';

interface BookingPaymentParams {
  reservationId: string;
  prestataireId: string;
  totalAmount: number;
  depositPercentage: number; // ex: 30 pour 30%
  customerEmail: string;
}

interface TransferParams {
  reservationId: string;
  amount: number;
  type: 'deposit' | 'balance';
}

export const marketplacePaymentService = {
  /**
   * 1. Créer Payment Intent et capturer 100% immédiatement
   */
  async createBookingPayment(params: BookingPaymentParams) {
    try {
      const { reservationId, prestataireId, totalAmount, depositPercentage, customerEmail } = params;

      // Calculer acompte et solde
      const depositAmount = (totalAmount * depositPercentage) / 100;
      const balanceAmount = totalAmount - depositAmount;

      // Appeler l'API Stripe pour créer le Payment Intent
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/create-booking-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          prestataire_id: prestataireId,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          balance_amount: balanceAmount,
          customer_email: customerEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du paiement');
      }

      const data = await response.json();

      // Mettre à jour la réservation
      await supabase
        .from('reservations')
        .update({
          payment_status: 'pending',
          stripe_payment_intent_id: data.paymentIntentId,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          balance_amount: balanceAmount,
        })
        .eq('id', reservationId);

      // Logger
      await logger.logPayment('initiate', totalAmount, {
        reservation_id: reservationId,
        payment_intent_id: data.paymentIntentId,
        deposit_amount: depositAmount,
      });

      return data;
    } catch (error: any) {
      await logger.error('create_booking_payment_failed', error, 'payments', {
        reservation_id: params.reservationId,
        amount: params.totalAmount,
      });
      throw error;
    }
  },

  /**
   * 2. Confirmer le paiement après saisie carte
   */
  async confirmPayment(paymentIntentId: string, reservationId: string) {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      });

      if (!response.ok) {
        throw new Error('Échec de la confirmation du paiement');
      }

      const data = await response.json();

      if (data.status === 'succeeded') {
        // Mettre à jour la réservation
        await supabase
          .from('reservations')
          .update({ payment_status: 'fully_paid' })
          .eq('id', reservationId);

        // Logger
        await logger.logPayment('success', data.amount, {
          reservation_id: reservationId,
          payment_intent_id: paymentIntentId,
        });

        // Déclencher le versement de l'acompte
        await this.transferDeposit(reservationId);
      }

      return data;
    } catch (error: any) {
      await logger.error('confirm_payment_failed', error, 'payments', {
        reservation_id: reservationId,
        payment_intent_id: paymentIntentId,
      });
      throw error;
    }
  },

  /**
   * 3. Transférer l'acompte au prestataire (immédiatement après paiement)
   */
  async transferDeposit(reservationId: string) {
    try {
      // Récupérer les infos de la réservation
      const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`
          *,
          prestataire:profiles!reservations_prestataire_id_fkey(
            stripe_account_id,
            deposit_percentage
          )
        `)
        .eq('id', reservationId)
        .single();

      if (error || !reservation) {
        throw new Error('Réservation introuvable');
      }

      const { prestataire, deposit_amount, stripe_payment_intent_id } = reservation;

      if (!prestataire.stripe_account_id) {
        throw new Error('Prestataire sans compte Stripe Connect');
      }

      // Appeler API pour transférer l'acompte
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/transfer-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          stripe_account_id: prestataire.stripe_account_id,
          amount: deposit_amount,
          payment_intent_id: stripe_payment_intent_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Échec du transfert de l\'acompte');
      }

      const data = await response.json();

      // Mettre à jour la réservation
      await supabase
        .from('reservations')
        .update({
          payment_status: 'deposit_paid',
          deposit_paid_at: new Date().toISOString(),
          stripe_transfer_deposit_id: data.transferId,
        })
        .eq('id', reservationId);

      // Enregistrer la transaction
      await supabase.from('transactions').insert({
        reservation_id: reservationId,
        type: 'deposit_transfer',
        amount: deposit_amount,
        stripe_id: data.transferId,
        status: 'succeeded',
        recipient_id: reservation.prestataire_id,
      });

      await logger.info('deposit_transferred', 'payments', {
        reservation_id: reservationId,
        amount: deposit_amount,
        transfer_id: data.transferId,
      });

      return data;
    } catch (error: any) {
      await logger.error('transfer_deposit_failed', error, 'payments', {
        reservation_id: reservationId,
      });
      throw error;
    }
  },

  /**
   * 4. Transférer le solde après prestation (appelé manuellement ou automatiquement)
   */
  async transferBalance(reservationId: string) {
    try {
      const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`
          *,
          prestataire:profiles!reservations_prestataire_id_fkey(stripe_account_id)
        `)
        .eq('id', reservationId)
        .single();

      if (error || !reservation) {
        throw new Error('Réservation introuvable');
      }

      // Vérifier que la prestation est terminée
      if (reservation.status !== 'finished') {
        throw new Error('La prestation n\'est pas encore terminée');
      }

      const { prestataire, balance_amount, stripe_payment_intent_id } = reservation;

      // Appeler API pour transférer le solde
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/transfer-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          stripe_account_id: prestataire.stripe_account_id,
          amount: balance_amount,
          payment_intent_id: stripe_payment_intent_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Échec du transfert du solde');
      }

      const data = await response.json();

      // Mettre à jour la réservation
      await supabase
        .from('reservations')
        .update({
          payment_status: 'fully_paid',
          balance_paid_at: new Date().toISOString(),
          stripe_transfer_balance_id: data.transferId,
        })
        .eq('id', reservationId);

      // Enregistrer la transaction
      await supabase.from('transactions').insert({
        reservation_id: reservationId,
        type: 'balance_transfer',
        amount: balance_amount,
        stripe_id: data.transferId,
        status: 'succeeded',
        recipient_id: reservation.prestataire_id,
      });

      await logger.info('balance_transferred', 'payments', {
        reservation_id: reservationId,
        amount: balance_amount,
        transfer_id: data.transferId,
      });

      return data;
    } catch (error: any) {
      await logger.error('transfer_balance_failed', error, 'payments', {
        reservation_id: reservationId,
      });
      throw error;
    }
  },

  /**
   * 5. Gérer les annulations et remboursements
   */
  async handleCancellation(reservationId: string, cancelledBy: 'client' | 'prestataire', refundPolicy: 'full' | 'partial' | 'none') {
    try {
      const { data: reservation } = await supabase
        .from('reservations')
        .select('*, prestataire:profiles!reservations_prestataire_id_fkey(*)')
        .eq('id', reservationId)
        .single();

      if (!reservation) {
        throw new Error('Réservation introuvable');
      }

      let refundAmount = 0;

      // Logique de remboursement
      if (cancelledBy === 'prestataire') {
        // Annulation prestataire = remboursement total client
        refundAmount = reservation.total_amount;
      } else {
        // Annulation client = selon politique
        if (refundPolicy === 'full') {
          refundAmount = reservation.total_amount;
        } else if (refundPolicy === 'partial') {
          // Exemple : remboursement total - acompte déjà versé
          refundAmount = reservation.balance_amount;
        }
        // Si 'none', refundAmount reste 0
      }

      if (refundAmount > 0) {
        // Appeler API pour rembourser
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/stripe/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: reservation.stripe_payment_intent_id,
            amount: refundAmount,
            reason: cancelledBy === 'prestataire' ? 'requested_by_customer' : 'fraudulent',
          }),
        });

        if (!response.ok) {
          throw new Error('Échec du remboursement');
        }

        const data = await response.json();

        // Mettre à jour la réservation
        await supabase
          .from('reservations')
          .update({
            status: 'cancelled',
            payment_status: 'refunded',
          })
          .eq('id', reservationId);

        // Enregistrer la transaction
        await supabase.from('transactions').insert({
          reservation_id: reservationId,
          type: 'refund',
          amount: refundAmount,
          stripe_id: data.refundId,
          status: 'succeeded',
          metadata: { cancelled_by: cancelledBy, refund_policy: refundPolicy },
        });

        await logger.info('refund_processed', 'payments', {
          reservation_id: reservationId,
          amount: refundAmount,
          cancelled_by: cancelledBy,
        });
      }

      return { refundAmount, message: 'Annulation traitée avec succès' };
    } catch (error: any) {
      await logger.error('cancellation_failed', error, 'payments', {
        reservation_id: reservationId,
        cancelled_by: cancelledBy,
      });
      throw error;
    }
  },
};
