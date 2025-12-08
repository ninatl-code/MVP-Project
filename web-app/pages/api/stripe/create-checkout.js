import Stripe from "stripe";
import { supabase } from '../../../lib/supabaseClient';

// Initialise Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    // Récupère les infos du body
    const { annonce_id, montant_acompte, user_id, email, reservation_id } = req.body;

    if (!annonce_id || !montant_acompte || !user_id || !email) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    // Récupère l'annonce pour obtenir le prestataire
    const { data: annonce, error: annonceError } = await supabase
      .from("annonces")
      .select("id, prestataire")
      .eq("id", annonce_id)
      .single();

    if (annonceError || !annonce) {
      return res.status(404).json({ error: "Annonce introuvable", details: annonceError });
    }

    const prestataire_id = annonce.prestataire;

    // Récupère le compte Stripe du prestataire
    const { data: prestataire, error: prestaError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", prestataire_id)
      .single();

    if (prestaError || !prestataire?.stripe_account_id) {
      return res.status(404).json({ error: "Compte Stripe du prestataire introuvable", details: prestaError });
    }

    // Calcule la commission (exemple : 10%)
    const feeAmount = Math.round(Number(montant_acompte) * 0.1 * 100); // en centimes

    // NOUVEAU : Ne pas transférer immédiatement, juste capturer le paiement
    // Le transfert se fera en 2 temps : acompte maintenant, solde après prestation
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Paiement complet pour la réservation de l'annonce ${annonce_id}` },
            unit_amount: Math.round(Number(montant_acompte) * 100), // MONTANT TOTAL (pas juste acompte)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/annonces/${annonce_id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/annonces/${annonce_id}/cancel`,
      payment_intent_data: {
        // NE PAS mettre transfer_data ici - on va gérer manuellement
        capture_method: 'automatic', // Capture immédiate
        application_fee_amount: feeAmount,
      },
      metadata: {
        annonce_id: String(annonce_id),
        reservation_id: reservation_id ? String(reservation_id) : "",
        user_id: String(user_id),
        prestataire_id: String(prestataire_id),
        email: email,
        montant_total: String(montant_acompte), // Montant TOTAL
        type_paiement: "complet" // Changé de "acompte" à "complet"
      }
    });



    return res.status(200).json({ session, url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Checkout:", err);
    return res.status(500).json({ error: "Erreur lors de la création de la session Stripe", details: err.message, stack: err.stack });
  }
}
