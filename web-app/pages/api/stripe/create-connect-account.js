import Stripe from "stripe";
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { prestataire_id, email, first_name, last_name, business_type = 'individual' } = req.body;

    if (!prestataire_id || !email) {
      return res.status(400).json({ error: "prestataire_id et email requis" });
    }

    // Check if account already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", prestataire_id)
      .single();

    if (existingProfile?.stripe_account_id) {
      // Account exists, create new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: existingProfile.stripe_account_id,
        refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/photographe/profil/integrations`,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/photographe/profil/integrations?stripe_setup=success`,
        type: "account_onboarding",
      });

      return res.status(200).json({ 
        url: accountLink.url,
        accountId: existingProfile.stripe_account_id,
        isExisting: true,
      });
    }

    // Create new Stripe Express account
    const accountParams = {
      type: "express",
      country: "FR",
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: business_type,
      metadata: {
        prestataire_id: prestataire_id,
      },
    };

    // Add individual info if provided
    if (business_type === 'individual' && (first_name || last_name)) {
      accountParams.individual = {
        email: email,
        first_name: first_name || '',
        last_name: last_name || '',
      };
    }

    const account = await stripe.accounts.create(accountParams);

    // Save Stripe account ID to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prestataire_id);

    if (updateError) {
      console.error("Erreur mise à jour profil:", updateError);
      // Don't fail - the Stripe account was created successfully
    }

    // Also save to integrations table for tracking
    await supabase
      .from("integrations")
      .upsert({
        user_id: prestataire_id,
        provider: 'stripe',
        stripe_account_id: account.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/photographe/profil/integrations`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/photographe/profil/integrations?stripe_setup=success`,
      type: "account_onboarding",
    });

    res.status(200).json({ 
      url: accountLink.url,
      accountId: account.id,
      isExisting: false,
    });

  } catch (err) {
    console.error("❌ Erreur création compte Stripe Connect:", err);
    res.status(500).json({ error: err.message });
  }
}
