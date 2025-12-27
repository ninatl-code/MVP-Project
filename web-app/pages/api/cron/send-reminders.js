import { supabase } from '../../../lib/supabaseClient';

/**
 * Send reminder notifications for upcoming reservations
 * Should be called daily by a scheduler
 * 
 * GET /api/cron/send-reminders?secret=YOUR_CRON_SECRET
 */
export default async function handler(req, res) {
  // Verify cron secret
  const { secret } = req.query;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    
    // Get reservations happening tomorrow (24h from now)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    console.log('🔔 Running send-reminders cron...');
    console.log('📅 Checking reservations for:', tomorrowStart.toISOString().split('T')[0]);

    // Find confirmed reservations for tomorrow
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        id,
        numero_reservation,
        date_prestation,
        heure_debut,
        lieu,
        prestataire_id,
        particulier_id,
        profiles!reservations_prestataire_id_fkey(nom),
        profiles!reservations_particulier_id_fkey(nom)
      `)
      .in('status', ['confirmed', 'acompte_paye'])
      .gte('date_prestation', tomorrowStart.toISOString())
      .lte('date_prestation', tomorrowEnd.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📋 Found ${reservations?.length || 0} reservations for tomorrow`);

    const results = {
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    for (const reservation of (reservations || [])) {
      results.processed++;

      const dateFormatted = new Date(reservation.date_prestation).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      try {
        // Notify client
        await supabase
          .from('notifications')
          .insert({
            user_id: reservation.particulier_id,
            type: 'reminder',
            title: 'Rappel: Séance photo demain',
            message: `Votre séance avec ${reservation.profiles?.nom || 'le photographe'} est prévue ${dateFormatted}${reservation.heure_debut ? ` à ${reservation.heure_debut}` : ''}.`,
            data: { 
              reservationId: reservation.id,
              lieu: reservation.lieu,
            },
            action_url: `/client/reservations/${reservation.id}`,
            is_read: false,
            created_at: now.toISOString(),
          });

        results.notificationsSent++;

        // Notify photographer
        await supabase
          .from('notifications')
          .insert({
            user_id: reservation.prestataire_id,
            type: 'reminder',
            title: 'Rappel: Séance photo demain',
            message: `Vous avez une séance avec ${reservation.profiles?.nom || 'un client'} ${dateFormatted}${reservation.heure_debut ? ` à ${reservation.heure_debut}` : ''}.`,
            data: { 
              reservationId: reservation.id,
              lieu: reservation.lieu,
            },
            action_url: `/photographe/reservations/${reservation.id}`,
            is_read: false,
            created_at: now.toISOString(),
          });

        results.notificationsSent++;
        console.log(`✅ Reminders sent for: ${reservation.numero_reservation}`);

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
      message: `Sent ${results.notificationsSent} reminder notifications`,
      results,
    });

  } catch (err) {
    console.error('❌ Cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
