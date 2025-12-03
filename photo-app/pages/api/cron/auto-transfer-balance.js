import Stripe from "stripe";
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Cron job pour transférer automatiquement le solde aux prestataires
 * après que la prestation soit terminée
 * 
 * À configurer dans Vercel Cron Jobs ou autre service cron
 * Recommandé : exécution quotidienne à 2h du matin
 */
export default async function handler(req, res) {
  // Vérifier que c'est bien un appel cron (sécurité)
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Début du cron auto-transfer-balance:', new Date().toISOString());

  try {
    // Récupérer toutes les réservations terminées avec acompte payé mais pas le solde
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        id,
        date,
        status,
        payment_status,
        balance_amount,
        total_amount,
        montant,
        deposit_amount,
        montant_acompte,
        prestataire_id,
        profiles!reservations_prestataire_id_fkey(stripe_account_id)
      `)
      .eq('status', 'finished')
      .eq('payment_status', 'deposit_paid')
      .lt('date', new Date().toISOString()); // Date de prestation passée

    if (fetchError) {
      console.error('❌ Erreur fetch reservations:', fetchError);
      return res.status(500).json({ error: 'Erreur fetch reservations' });
    }

    console.log(`📊 ${reservations?.length || 0} réservations trouvées`);

    if (!reservations || reservations.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucune réservation à traiter',
        processed: 0,
      });
    }

    const results = {
      success: [],
      errors: [],
    };

    // Traiter chaque réservation
    for (const reservation of reservations) {
      try {
        console.log(`\n💸 Traitement réservation ${reservation.id}`);

        // Vérifier que le prestataire a un compte Stripe
        if (!reservation.profiles?.stripe_account_id) {
          console.warn(`⚠️ Prestataire ${reservation.prestataire_id} sans compte Stripe`);
          results.errors.push({
            reservation_id: reservation.id,
            error: 'Prestataire sans compte Stripe',
          });
          continue;
        }

        // Calculer le solde
        const totalAmount = reservation.total_amount || reservation.montant;
        const depositAmount = reservation.deposit_amount || reservation.montant_acompte;
        const balanceAmount = reservation.balance_amount || (totalAmount - depositAmount);

        if (!balanceAmount || balanceAmount <= 0) {
          console.warn(`⚠️ Pas de solde à transférer pour ${reservation.id}`);
          results.errors.push({
            reservation_id: reservation.id,
            error: 'Pas de solde à transférer',
          });
          continue;
        }

        console.log(`💰 Transfert de ${balanceAmount}€ vers ${reservation.profiles.stripe_account_id}`);

        // Transférer le solde
        const transfer = await stripe.transfers.create({
          amount: Math.round(balanceAmount * 100), // en centimes
          currency: 'eur',
          destination: reservation.profiles.stripe_account_id,
          transfer_group: reservation.id,
          metadata: {
            reservation_id: reservation.id,
            type: 'balance_auto',
            triggered_by: 'cron',
          },
        });

        console.log(`✅ Transfer créé: ${transfer.id}`);

        // Mettre à jour la réservation
        const { error: updateError } = await supabase
          .from('reservations')
          .update({
            payment_status: 'fully_paid',
            balance_paid_at: new Date().toISOString(),
            stripe_transfer_balance_id: transfer.id,
          })
          .eq('id', reservation.id);

        if (updateError) {
          console.error(`❌ Erreur update reservation ${reservation.id}:`, updateError);
          results.errors.push({
            reservation_id: reservation.id,
            error: 'Erreur update DB',
          });
          continue;
        }

        // Enregistrer dans transactions
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            reservation_id: reservation.id,
            type: 'balance_transfer',
            amount: balanceAmount,
            stripe_id: transfer.id,
            status: 'succeeded',
            recipient_id: reservation.prestataire_id,
            metadata: {
              transfer_group: reservation.id,
              triggered_by: 'cron',
              executed_at: new Date().toISOString(),
            },
          });

        if (transactionError) {
          console.error(`❌ Erreur transaction log ${reservation.id}:`, transactionError);
        }

        results.success.push({
          reservation_id: reservation.id,
          transfer_id: transfer.id,
          amount: balanceAmount,
        });

        console.log(`✅ Réservation ${reservation.id} traitée avec succès`);
      } catch (transferError) {
        console.error(`❌ Erreur transfert ${reservation.id}:`, transferError);
        results.errors.push({
          reservation_id: reservation.id,
          error: transferError.message,
        });
      }
    }

    console.log('\n📈 Résumé du cron:');
    console.log(`✅ Succès: ${results.success.length}`);
    console.log(`❌ Erreurs: ${results.errors.length}`);

    return res.status(200).json({
      success: true,
      processed: results.success.length + results.errors.length,
      succeeded: results.success.length,
      failed: results.errors.length,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erreur globale cron:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'exécution du cron',
      details: error.message,
    });
  }
}
