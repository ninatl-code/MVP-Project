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
    const { prestataire_id, email } = req.body;

    // Création du compte Stripe
    const account = await stripe.accounts.create({
      type: "express",
      email,
    });

    // Mise à jour du stripe_account_id dans la table profiles
    const { error: supabaseError } = await supabase
      .from("profiles")
      .update({ stripe_account_id: account.id })
      .eq("id", prestataire_id);

    if (supabaseError) {
      console.error("Erreur Supabase:", supabaseError);
      throw new Error(
        "Erreur lors de la mise à jour du compte Stripe dans Supabase" + supabaseError.message
      );
    }

    // Génération du lien onboarding Stripe
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "http://localhost:3000/prestataires/profil",
      return_url: "http://localhost:3000/prestataires/profil",
      type: "account_onboarding",
    });

    res.status(200).json({ url: accountLink.url });
  } catch (err) {
    console.error("❌ Erreur Stripe:", err);
    res.status(500).json({ error: err.message });
  }
}
