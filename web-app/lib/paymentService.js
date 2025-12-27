import { supabase } from './supabaseClient';

const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;

/**
 * Create a Stripe checkout session for a reservation
 */
export const createCheckoutSession = async (reservationId, amount, customerEmail) => {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId,
        amount,
        customerEmail,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return { sessionId: data.sessionId, url: data.url, error: null };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { sessionId: null, url: null, error };
  }
};

/**
 * Confirm payment and update reservation status
 */
export const confirmPayment = async (reservationId, stripeSessionId) => {
  try {
    // Update reservation status
    const { data, error } = await supabase
      .from('reservations')
      .update({
        status: 'acompte_paye',
        stripe_session_id: stripeSessionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;

    // Create payment record
    const { error: paymentError } = await supabase
      .from('paiements')
      .insert({
        reservation_id: reservationId,
        montant: data.montant_acompte || data.montant * 0.3,
        status: 'completed',
        stripe_session_id: stripeSessionId,
        type: 'acompte',
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return { data: null, error };
  }
};

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (userId, role = 'particulier') => {
  try {
    const column = role === 'particulier' ? 'particulier_id' : 'prestataire_id';
    
    const { data, error } = await supabase
      .from('paiements')
      .select(`
        *,
        reservations!inner(
          id,
          date_prestation,
          montant,
          status,
          particulier_id,
          prestataire_id
        )
      `)
      .eq(`reservations.${column}`, userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return { data: null, error };
  }
};

/**
 * Get payment details for a specific reservation
 */
export const getReservationPayments = async (reservationId) => {
  try {
    const { data, error } = await supabase
      .from('paiements')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservation payments:', error);
    return { data: null, error };
  }
};

/**
 * Calculate payment amounts
 */
export const calculatePaymentAmounts = (totalAmount) => {
  const acompte = Math.round(totalAmount * 0.3 * 100) / 100; // 30% deposit
  const solde = Math.round((totalAmount - acompte) * 100) / 100; // 70% balance
  const platformFee = Math.round(totalAmount * 0.15 * 100) / 100; // 15% platform fee
  
  return {
    total: totalAmount,
    acompte,
    solde,
    platformFee,
    photographerPayout: totalAmount - platformFee,
  };
};

export default {
  createCheckoutSession,
  confirmPayment,
  getPaymentHistory,
  getReservationPayments,
  calculatePaymentAmounts,
};
