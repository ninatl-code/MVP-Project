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
    const { reservation_id, stripe_account_id, payment_intent_id } = req.body;

    if (!reservation_id || !stripe_account_id) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    // Récupérer la réservation
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select("deposit_amount, montant_acompte, total_amount, montant")
      .eq("id", reservation_id)
      .single();

    if (resError || !reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    // Utiliser deposit_amount OU montant_acompte (selon ce qui existe)
    const depositAmount = reservation.deposit_amount || reservation.montant_acompte;

    if (!depositAmount) {
      return res.status(400).json({ error: "Montant d'acompte non défini" });
    }

    // Transférer l'acompte au prestataire
    const transfer = await stripe.transfers.create({
      amount: Math.round(depositAmount * 100), // en centimes
      currency: "eur",
      destination: stripe_account_id,
      transfer_group: reservation_id,
      metadata: {
        reservation_id,
        type: "deposit",
        payment_intent_id: payment_intent_id || "",
      },
    });

    console.log("✅ Acompte transféré:", transfer.id);

    // Mettre à jour la réservation
    await supabase
      .from("reservations")
      .update({
        payment_status: "deposit_paid",
        deposit_paid_at: new Date().toISOString(),
        stripe_transfer_deposit_id: transfer.id,
      })
      .eq("id", reservation_id);

    // Enregistrer dans transactions
    await supabase.from("transactions").insert({
      reservation_id,
      type: "deposit_transfer",
      amount: depositAmount,
      stripe_id: transfer.id,
      status: "succeeded",
      metadata: { transfer_group: reservation_id },
    });

    return res.status(200).json({
      success: true,
      transferId: transfer.id,
      amount: depositAmount,
    });
  } catch (err) {
    console.error("❌ Erreur transfer deposit:", err);
    return res.status(500).json({
      error: "Erreur lors du transfert de l'acompte",
      details: err.message,
    });
  }
}
