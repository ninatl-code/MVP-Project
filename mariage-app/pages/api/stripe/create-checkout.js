import { stripe } from "./init";

export default async function handler(req, res) {
  const { clientId, prestataireId, annonceId, prix, type } = req.body;

  // Récupère l'account_id du prestataire depuis ta DB
  // const { data } = await supabase.from("prestataires").select("stripe_account_id").eq("id", prestataireId).single();
  const stripeAccountId = "acct_123456"; // <-- mock

  // Calcule ta commission
  const feeAmount = Math.round(prix * 0.1 * 100); // 10%

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "mad",
          product_data: { name: `Commande pour annonce ${annonceId}` },
          unit_amount: prix * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `https://ton-site.com/annonces/${annonceId}/${type}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://ton-site.com/annonces/${annonceId}/${type}/cancel`,
    payment_intent_data: {
      application_fee_amount: feeAmount,
      transfer_data: { destination: stripeAccountId },
    },
  });

  // Tu peux aussi insérer un enregistrement temporaire en DB pour suivre la commande en attente

  res.json({ url: session.url });
}
