import { supabase } from '../../../lib/supabaseClient';

/**
 * Cron job to auto-complete reservations after service date
 * Should be called by a scheduler (Vercel Cron, etc.)
 * 
 * GET /api/cron/auto-complete-reservations?secret=YOUR_CRON_SECRET
 */
export default async function handler(req, res) {
  // Verify cron secret
  const { secret } = req.query;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('🔄 Running auto-complete reservations cron...');
    console.log('📅 Checking reservations before:', oneDayAgo.toISOString());

    // Find reservations that:
    // 1. Are in 'acompte_paye' or 'confirmed' status
    // 2. Have a service date more than 24 hours ago
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, date, prestataire_id, client_id')
      .in('statut', ['confirme', 'pending'])
      .lt('date', oneDayAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📋 Found ${reservations?.length || 0} reservations to auto-complete`);

    const results = {
      processed: 0,
      completed: 0,
      errors: [],
    };

    for (const reservation of (reservations || [])) {
      results.processed++;

      try {
        // Update reservation status to completed
        const { error: updateError } = await supabase
          .from('reservations')
          .update({
            statut: 'termine',
            updated_at: now.toISOString(),
          })
          .eq('id', reservation.id);

        if (updateError) {
          results.errors.push({
            reservationId: reservation.id,
            error: updateError.message,
          });
          continue;
        }

        // Create notification for client to leave review
        await supabase
          .from('notifications')
          .insert({
            user_id: reservation.client_id,
            type: 'avis',
            titre: 'Donnez votre avis',
            contenu: 'Votre seance photo est terminee. Partagez votre experience !',
            reservation_id: reservation.id,
            lu: false,
          });

        // Notify photographer
        await supabase
          .from('notifications')
          .insert({
            user_id: reservation.prestataire_id,
            type: 'reservation',
            titre: 'Reservation terminee',
            contenu: 'La reservation a ete marquee comme terminee.',
            reservation_id: reservation.id,
            lu: false,
          });

        results.completed++;
        console.log(`Completed reservation: ${reservation.id}`);

      } catch (err) {
        results.errors.push({
          reservationId: reservation.id,
          error: err.message,
        });
      }
    }

    console.log('🏁 Cron completed:', results);

    res.status(200).json({
      success: true,
      message: `Auto-completed ${results.completed} reservations`,
      results,
    });

  } catch (err) {
    console.error('❌ Cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
