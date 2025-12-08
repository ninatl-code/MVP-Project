import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtenir la date du jour au format YYMMDD
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2); // YY
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = today.getDate().toString().padStart(2, '0'); // DD
    const datePrefix = `9${year}${month}${day}`; // 9 + YYMMDD

    // Compter le nombre de réservations créées aujourd'hui pour obtenir le prochain numéro
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: existingReservations, error: countError } = await supabase
      .from('reservations')
      .select('num_reservation')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .not('num_reservation', 'is', null)
      .order('num_reservation', { ascending: false })
      .limit(1);

    if (countError) {
      console.error('Erreur lors du comptage des réservations:', countError);
      throw new Error('Erreur lors de la génération du numéro de réservation');
    }

    let nextNumber = 1;

    if (existingReservations && existingReservations.length > 0) {
      const lastNumReservation = existingReservations[0].num_reservation;
      // Extraire le numéro incrémental (derniers chiffres après le préfixe 9YYMMDD)
      const lastNumber = lastNumReservation - parseInt(datePrefix + '0');
      nextNumber = lastNumber + 1;
    }

    // Générer le nouveau numéro de réservation
    const numReservation = parseInt(datePrefix + nextNumber.toString());

    res.status(200).json({
      success: true,
      num_reservation: numReservation,
      date_prefix: datePrefix,
      increment: nextNumber
    });

  } catch (error) {
    console.error('Erreur génération numéro réservation:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du numéro de réservation',
      message: error.message
    });
  }
}