import { stripe } from "./init";
import { buffer } from "micro";
import { supabase } from "../../../lib/supabaseClient";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Récupère les métadonnées utiles
    const sessionId = session.id;
    const paymentIntent = session.payment_intent;
    const amount = session.amount_total ? session.amount_total / 100 : null;
    const email = session.customer_email;
    const annonceId = session.metadata?.annonce_id || null;
    const commandeId = session.metadata?.commande_id || null;
    const userId = session.metadata?.user_id || null;
    const reservationId = session.metadata?.reservation_id || null;
    const prestataireId = session.metadata?.prestataire_id || null;

    // 1. Insère le paiement dans la table paiements
    const { error: paiementError } = await supabase.from("paiements").insert({
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntent,
      montant: amount,
      statut: "payé",
      email: email,
      commande_id: commandeId,
      reservation_id: reservationId,
      particulier_id: userId,
      prestataire_id: prestataireId,
      stripe_response: session // pour debug, tu peux retirer plus tard
    });
    if (paiementError) {
      console.error("Erreur insertion paiement:", paiementError);
    }

    // 2. Met à jour la commande (si applicable)
    if (commandeId) {
      const { error: commandeError } = await supabase
        .from("commandes")
        .update({ status: "payée", paiement_id: sessionId })
        .eq("id", commandeId);
      if (commandeError) {
        console.error("Erreur update commande:", commandeError);
      }
    }

    // 3. Met à jour la réservation (si applicable)
    if (reservationId) {
      const { error: resaError } = await supabase
        .from("reservations")
        .update({ status: "confirmée", paiement_id: sessionId })
        .eq("id", reservationId);
      if (resaError) {
        console.error("Erreur update réservation:", resaError);
      }
    }

    console.log("✅ Paiement confirmé et tables mises à jour:", sessionId);
  }

  res.json({ received: true });
}
