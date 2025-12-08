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
    const { reservation_id, stripe_account_id } = req.body;

    if (!reservation_id || !stripe_account_id) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    // Récupérer la réservation
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select("balance_amount, status, payment_status, total_amount, montant, deposit_amount, montant_acompte")
      .eq("id", reservation_id)
      .single();

    if (resError || !reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    // Vérifier que la prestation est terminée
    if (reservation.status !== "finished") {
      return res.status(400).json({
        error: "La prestation n'est pas encore terminée",
        status: reservation.status,
      });
    }

    // Calculer le solde (total - acompte)
    const totalAmount = reservation.total_amount || reservation.montant;
    const depositAmount = reservation.deposit_amount || reservation.montant_acompte;
    const balanceAmount = reservation.balance_amount || (totalAmount - depositAmount);

    if (!balanceAmount || balanceAmount <= 0) {
      return res.status(400).json({ error: "Pas de solde à transférer" });
    }

    // Transférer le solde au prestataire
    const transfer = await stripe.transfers.create({
      amount: Math.round(balanceAmount * 100), // en centimes
      currency: "eur",
      destination: stripe_account_id,
      transfer_group: reservation_id,
      metadata: {
        reservation_id,
        type: "balance",
      },
    });

    console.log("✅ Solde transféré:", transfer.id);

    // Mettre à jour la réservation
    await supabase
      .from("reservations")
      .update({
        payment_status: "fully_paid",
        balance_paid_at: new Date().toISOString(),
        stripe_transfer_balance_id: transfer.id,
      })
      .eq("id", reservation_id);

    // Enregistrer dans transactions
    await supabase.from("transactions").insert({
      reservation_id,
      type: "balance_transfer",
      amount: balanceAmount,
      stripe_id: transfer.id,
      status: "succeeded",
      metadata: { transfer_group: reservation_id },
    });

    return res.status(200).json({
      success: true,
      transferId: transfer.id,
      amount: balanceAmount,
    });
  } catch (err) {
    console.error("❌ Erreur transfer balance:", err);
    return res.status(500).json({
      error: "Erreur lors du transfert du solde",
      details: err.message,
    });
  }
}
