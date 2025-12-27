import Stripe from "stripe";
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { 
      reservation_id,
      amount,
      total_amount,
      photographe_stripe_account_id,
      platform_fee,
      customer_email,
      description,
    } = req.body;

    // Validation
    if (!reservation_id || !amount || !photographe_stripe_account_id || !customer_email) {
      return res.status(400).json({ 
        error: "Paramètres manquants",
        required: ["reservation_id", "amount", "photographe_stripe_account_id", "customer_email"]
      });
    }

    // Get reservation details
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select(`
        *,
        profiles!reservations_prestataire_id_fkey(nom, stripe_account_id),
        annonces(titre)
      `)
      .eq("id", reservation_id)
      .single();

    if (resError || !reservation) {
      return res.status(404).json({ error: "Réservation introuvable", details: resError });
    }

    // Use provided Stripe account or get from profile
    const stripeAccountId = photographe_stripe_account_id || reservation.profiles?.stripe_account_id;
    
    if (!stripeAccountId) {
      return res.status(400).json({ 
        error: "Le photographe n'a pas configuré son compte Stripe Connect" 
      });
    }

    // Calculate fees
    const amountInCents = Math.round(Number(amount) * 100);
    const calculatedPlatformFee = platform_fee 
      ? Math.round(Number(platform_fee) * 100)
      : Math.round(amountInCents * PLATFORM_FEE_PERCENT);

    // Create Stripe checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: customer_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: description || `Acompte - ${reservation.annonces?.titre || 'Réservation photographe'}`,
              description: `Photographe: ${reservation.profiles?.nom || 'N/A'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/shared/paiement/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/shared/paiement/cancel`,
      payment_intent_data: {
        application_fee_amount: calculatedPlatformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      metadata: {
        reservation_id: String(reservation_id),
        photographe_id: String(reservation.prestataire_id),
        particulier_id: String(reservation.particulier_id),
        amount: String(amount),
        total_amount: String(total_amount || amount),
        platform_fee: String(calculatedPlatformFee / 100),
        payment_type: "marketplace_deposit",
      }
    });

    // Update reservation with session ID
    await supabase
      .from("reservations")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation_id);

    res.status(200).json({ 
      sessionId: session.id, 
      url: session.url,
      amount: amount,
      platformFee: calculatedPlatformFee / 100,
    });

  } catch (err) {
    console.error("❌ Erreur Marketplace Checkout:", err);
    res.status(500).json({ error: err.message });
  }
}
