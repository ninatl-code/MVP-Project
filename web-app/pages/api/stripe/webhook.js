import { stripe } from "./init";
import { buffer } from "micro";
import { supabase } from "../../../lib/supabaseClient";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log("🔔 Webhook reçu:", req.method, new Date().toISOString());
  
  const sig = req.headers["stripe-signature"];
  const buf = await buffer(req);

  // Vérification de la variable d'environnement
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("❌ STRIPE_WEBHOOK_SECRET non définie");
    return res.status(500).send("Configuration manquante");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("✅ Signature webhook validée, type:", event.type);
  } catch (err) {
    console.error("❌ Échec vérification signature webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log("💳 Traitement paiement checkout.session.completed");
    const session = event.data.object;

    // Log des métadonnées pour diagnostic
    console.log("📊 Métadonnées reçues:", JSON.stringify(session.metadata, null, 2));

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

    console.log("🔍 IDs extraits:", { annonceId, commandeId, reservationId, userId, prestataireId });

    // 1. Insère le paiement dans la table paiements
    console.log("💾 Insertion paiement en base:", { sessionId, amount, email });
    
    // Validation des UUIDs (pour éviter les erreurs de format)
    const isValidUUID = (uuid) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuid && uuidRegex.test(uuid);
    };
    
    const { data: paiementData, error: paiementError } = await supabase.from("paiements").insert({
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntent,
      montant: amount,
      statut: "succeeded", // Valeur autorisée par la contrainte
      email: email,
      commande_id: commandeId,
      reservation_id: reservationId,
      particulier_id: isValidUUID(userId) ? userId : null, // Null si UUID invalide
      prestataire_id: isValidUUID(prestataireId) ? prestataireId : null, // Null si UUID invalide
      stripe_response: session // pour debug, tu peux retirer plus tard
    }).select();
    
    if (paiementError) {
      console.error("❌ Erreur insertion paiement:", paiementError);
      return res.status(500).json({ error: "Erreur insertion paiement", details: paiementError });
    } else {
      console.log("✅ Paiement inséré avec succès:", paiementData);
    }

    // 2. Met à jour la commande (si applicable)
    if (commandeId) {
      console.log("📝 Mise à jour commande:", commandeId);
      const { error: commandeError } = await supabase
        .from("commandes")
        .update({ status: "paid" }) // ✅ Corrigé : on retire paiement_id pour éviter l'erreur UUID
        .eq("id", commandeId);
      if (commandeError) {
        console.error("❌ Erreur update commande:", commandeError);
      } else {
        console.log("✅ Commande mise à jour avec succès");
        
        // 2.1 Crée une nouvelle ligne dans la table livraisons
        console.log("📦 Création livraison pour commande:", commandeId);
        const { error: livraisonError } = await supabase
          .from("livraisons")
          .insert({
            commande_id: commandeId,
            status: "paid",
            update_date: new Date().toISOString() // ✅ Ajout de la date et heure actuelle
          });
        if (livraisonError) {
          console.error("❌ Erreur création livraison:", livraisonError);
        } else {
          console.log("✅ Livraison créée avec succès avec date:", new Date().toISOString());
        }
      }
    }

    // 3. Met à jour la réservation (si applicable)
    if (reservationId) {
      console.log("📅 Mise à jour réservation:", reservationId);
      const { error: resaError } = await supabase
        .from("reservations")
        .update({ 
          status: "paid",
          payment_status: "fully_paid" // Client a payé 100%
        })
        .eq("id", reservationId);
      if (resaError) {
        console.error("❌ Erreur update réservation:", resaError);
      } else {
        console.log("✅ Réservation mise à jour avec succès");
        
        // 3.1 NOUVEAU : Déclencher le transfert de l'acompte au prestataire
        if (prestataireId && isValidUUID(prestataireId)) {
          console.log("💸 Déclenchement transfert acompte...");
          
          // Récupérer stripe_account_id du prestataire
          const { data: prestaData } = await supabase
            .from("profiles")
            .select("stripe_account_id")
            .eq("id", prestataireId)
            .single();
          
          if (prestaData?.stripe_account_id) {
            try {
              // Appeler l'API de transfert d'acompte
              const transferResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/transfer-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reservation_id: reservationId,
                  stripe_account_id: prestaData.stripe_account_id,
                  payment_intent_id: paymentIntent,
                }),
              });
              
              if (transferResponse.ok) {
                console.log("✅ Acompte transféré automatiquement");
              } else {
                console.error("❌ Échec transfert acompte:", await transferResponse.text());
              }
            } catch (transferError) {
              console.error("❌ Erreur lors du transfert acompte:", transferError);
            }
          } else {
            console.warn("⚠️ Prestataire sans compte Stripe Connect");
          }
        }
      }
    }

    console.log("🎉 Paiement confirmé et tables mises à jour:", sessionId);
  } else {
    console.log("ℹ️ Événement webhook ignoré:", event.type);
  }

  res.json({ received: true, timestamp: new Date().toISOString() });
}
