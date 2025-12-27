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
      .select('id, numero_reservation, date_prestation, prestataire_id, particulier_id')
      .in('status', ['acompte_paye', 'confirmed'])
      .lt('date_prestation', oneDayAgo.toISOString());

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
            status: 'completed',
            completed_at: now.toISOString(),
            auto_completed: true,
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
            user_id: reservation.particulier_id,
            type: 'avis',
            title: 'Donnez votre avis',
            message: 'Votre séance photo est terminée. Partagez votre expérience !',
            data: { reservationId: reservation.id },
            action_url: `/shared/avis/create?reservationId=${reservation.id}`,
            is_read: false,
            created_at: now.toISOString(),
          });

        // Notify photographer
        await supabase
          .from('notifications')
          .insert({
            user_id: reservation.prestataire_id,
            type: 'reservation',
            title: 'Réservation terminée',
            message: `La réservation ${reservation.numero_reservation} a été marquée comme terminée.`,
            data: { reservationId: reservation.id },
            is_read: false,
            created_at: now.toISOString(),
          });

        results.completed++;
        console.log(`✅ Completed reservation: ${reservation.numero_reservation}`);

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
