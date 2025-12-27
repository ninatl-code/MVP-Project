import { supabase } from './supabaseClient';

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee
const DEPOSIT_PERCENT = 0.30; // 30% deposit

/**
 * Create a payment with deposit split for marketplace
 */
export const createMarketplacePayment = async ({
  reservationId,
  totalAmount,
  photographeId,
  particulierId,
  customerEmail,
}) => {
  try {
    // Get photographer's Stripe Connect account
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('stripe_account_id')
      .eq('user_id', photographeId)
      .eq('provider', 'stripe')
      .single();

    if (integrationError || !integration?.stripe_account_id) {
      throw new Error('Photographer has not set up Stripe Connect');
    }

    const depositAmount = Math.round(totalAmount * DEPOSIT_PERCENT * 100) / 100;
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT * 100) / 100;

    const response = await fetch('/api/stripe/create-marketplace-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId,
        amount: depositAmount,
        totalAmount,
        photographeStripeAccountId: integration.stripe_account_id,
        platformFee: platformFee * DEPOSIT_PERCENT,
        customerEmail,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create marketplace checkout');
    }

    return { sessionId: data.sessionId, url: data.url, error: null };
  } catch (error) {
    console.error('Error creating marketplace payment:', error);
    return { sessionId: null, url: null, error };
  }
};

/**
 * Process deposit transfer to photographer
 */
export const processDepositTransfer = async (reservationId) => {
  try {
    // Get reservation details
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_prestataire_id_fkey(id)
      `)
      .eq('id', reservationId)
      .single();

    if (resError) throw resError;

    // Get photographer's Stripe account
    const { data: integration } = await supabase
      .from('integrations')
      .select('stripe_account_id')
      .eq('user_id', reservation.prestataire_id)
      .eq('provider', 'stripe')
      .single();

    if (!integration?.stripe_account_id) {
      throw new Error('Photographer Stripe account not found');
    }

    const depositAmount = reservation.montant_acompte || reservation.montant * DEPOSIT_PERCENT;
    const platformFee = depositAmount * PLATFORM_FEE_PERCENT;
    const transferAmount = depositAmount - platformFee;

    // Create transfer record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        reservation_id: reservationId,
        type: 'deposit_transfer',
        amount: transferAmount,
        platform_fee: platformFee,
        stripe_account_id: integration.stripe_account_id,
        status: 'completed',
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
    }

    return { success: true, transferAmount, error: null };
  } catch (error) {
    console.error('Error processing deposit transfer:', error);
    return { success: false, transferAmount: 0, error };
  }
};

/**
 * Process final balance payment after service completion
 */
export const processBalancePayment = async (reservationId) => {
  try {
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (resError) throw resError;

    const balanceAmount = reservation.montant - (reservation.montant_acompte || reservation.montant * DEPOSIT_PERCENT);
    const platformFee = balanceAmount * PLATFORM_FEE_PERCENT;
    const transferAmount = balanceAmount - platformFee;

    // Update reservation status
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'completed',
        solde_paye: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (updateError) throw updateError;

    // Record balance transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        reservation_id: reservationId,
        type: 'balance_transfer',
        amount: transferAmount,
        platform_fee: platformFee,
        status: 'completed',
      });

    if (transactionError) {
      console.error('Error recording balance transaction:', transactionError);
    }

    return { success: true, transferAmount, error: null };
  } catch (error) {
    console.error('Error processing balance payment:', error);
    return { success: false, transferAmount: 0, error };
  }
};

/**
 * Process refund based on cancellation policy
 */
export const processRefund = async (reservationId, reason) => {
  try {
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        annonces!reservations_annonce_id_fkey(conditions_annulation)
      `)
      .eq('id', reservationId)
      .single();

    if (resError) throw resError;

    const cancellationPolicy = reservation.annonces?.conditions_annulation || 'flexible';
    const daysBefore = Math.ceil((new Date(reservation.date_prestation) - new Date()) / (1000 * 60 * 60 * 24));
    
    let refundPercent = 0;
    
    // Calculate refund based on policy
    switch (cancellationPolicy) {
      case 'flexible':
        refundPercent = daysBefore >= 1 ? 1.0 : 0.5;
        break;
      case 'moderate':
        refundPercent = daysBefore >= 5 ? 1.0 : daysBefore >= 1 ? 0.5 : 0;
        break;
      case 'strict':
        refundPercent = daysBefore >= 7 ? 0.5 : 0;
        break;
      default:
        refundPercent = 0.5;
    }

    const paidAmount = reservation.montant_acompte || reservation.montant * DEPOSIT_PERCENT;
    const refundAmount = paidAmount * refundPercent;

    // Call refund API
    const response = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId,
        amount: refundAmount,
        reason,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process refund');
    }

    // Update reservation status
    await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        refund_amount: refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    return { 
      success: true, 
      refundAmount, 
      refundPercent: refundPercent * 100,
      error: null 
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { success: false, refundAmount: 0, error };
  }
};

/**
 * Get photographer earnings summary
 */
export const getPhotographerEarnings = async (photographeId, period = 'month') => {
  try {
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case 'day':
        dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString();
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
        break;
      default:
        dateFilter = new Date(0).toISOString();
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, platform_fee, created_at')
      .eq('stripe_account_id', photographeId)
      .gte('created_at', dateFilter)
      .eq('status', 'completed');

    if (error) throw error;

    const totalEarnings = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalFees = transactions?.reduce((sum, t) => sum + t.platform_fee, 0) || 0;

    return {
      totalEarnings,
      totalFees,
      transactionCount: transactions?.length || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching photographer earnings:', error);
    return { totalEarnings: 0, totalFees: 0, transactionCount: 0, error };
  }
};

export default {
  createMarketplacePayment,
  processDepositTransfer,
  processBalancePayment,
  processRefund,
  getPhotographerEarnings,
  PLATFORM_FEE_PERCENT,
  DEPOSIT_PERCENT,
};
