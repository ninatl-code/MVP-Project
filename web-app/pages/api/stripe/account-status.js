import Stripe from "stripe";
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { prestataire_id } = req.query;

    if (!prestataire_id) {
      return res.status(400).json({ error: "prestataire_id requis" });
    }

    // Get Stripe account ID from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", prestataire_id)
      .single();

    if (profileError || !profile?.stripe_account_id) {
      return res.status(404).json({ 
        error: "Compte Stripe non trouvé",
        hasStripeAccount: false,
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // Get balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: profile.stripe_account_id,
    });

    // Calculate available and pending balances
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    // Update integration status
    const isComplete = account.charges_enabled && account.payouts_enabled;
    await supabase
      .from("integrations")
      .update({
        status: isComplete ? 'active' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", prestataire_id)
      .eq("provider", "stripe");

    res.status(200).json({
      hasStripeAccount: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      isComplete: isComplete,
      email: account.email,
      country: account.country,
      defaultCurrency: account.default_currency,
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        currency: balance.available[0]?.currency || 'eur',
      },
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
      },
    });

  } catch (err) {
    console.error("❌ Erreur récupération statut Stripe:", err);
    
    if (err.code === 'account_invalid') {
      return res.status(404).json({ 
        error: "Compte Stripe invalide ou supprimé",
        hasStripeAccount: false,
      });
    }
    
    res.status(500).json({ error: err.message });
  }
}
