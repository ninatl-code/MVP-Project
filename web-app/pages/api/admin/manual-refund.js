import { stripe } from "../stripe/init";
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { remboursementId, forceRefund } = req.body;

    // Vérification d'autorisation admin (tu peux adapter selon ta logique)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    // Récupérer le remboursement
    const { data: remboursement, error: rembError } = await supabase
      .from('remboursements')
      .select('*')
      .eq('id', remboursementId)
      .single();

    if (rembError || !remboursement) {
      return res.status(404).json({ error: 'Remboursement non trouvé' });
    }

    // Si c'est déjà traité, on ne fait rien
    if (remboursement.statut_remboursement === 'processed') {
      return res.status(400).json({ error: 'Remboursement déjà traité' });
    }

    // Traitement pour force majeure (conditions strictes)
    if (forceRefund && remboursement.condition_annulation === 'Strict') {
      console.log("🔧 Traitement remboursement manuel force majeure");

      // Créer remboursement Stripe pour 100% (décision admin)
      const stripeRefund = await stripe.refunds.create({
        payment_intent: remboursement.paiement_id,
        amount: remboursement.montant_original * 100, // Stripe utilise les centimes
        reason: 'requested_by_customer',
        metadata: {
          admin_approval: 'true',
          force_majeure: 'true',
          approved_by: user.id,
          original_reservation: remboursement.reservation_id
        }
      });

      // Mettre à jour le remboursement
      const { error: updateError } = await supabase
        .from('remboursements')
        .update({
          stripe_refund_id: stripeRefund.id,
          montant_rembourse: remboursement.montant_original,
          pourcentage_remboursement: 100,
          statut_remboursement: 'processed',
          date_traitement_admin: new Date().toISOString(),
          admin_id: user.id,
          notes_admin: 'Approuvé manuellement - Force majeure'
        })
        .eq('id', remboursementId);

      if (updateError) {
        console.error("Erreur mise à jour remboursement:", updateError);
        return res.status(500).json({ error: 'Erreur mise à jour' });
      }

      // Envoyer notification au client
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: remboursement.particulier_id,
          type: 'remboursement',
          contenu: 'Votre demande de remboursement pour force majeure a été approuvée. Le remboursement intégral sera traité sous 5-10 jours ouvrés.'
        }]);

      if (notifError) {
        console.error("Erreur notification:", notifError);
      }

      return res.json({
        success: true,
        stripeRefundId: stripeRefund.id,
        refundAmount: remboursement.montant_original,
        message: 'Remboursement force majeure approuvé'
      });
    }

    return res.status(400).json({ error: 'Type de remboursement non supporté' });

  } catch (error) {
    console.error("❌ Erreur remboursement manuel:", error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message 
    });
  }
}