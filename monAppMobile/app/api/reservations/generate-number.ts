import { supabase } from '../../../lib/supabaseClient';

export async function generateReservationNumber(): Promise<{ num_reservation: number; date_prefix: string; increment: number }> {
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
    throw new Error('Erreur lors de la génération du numéro de réservation');
  }

  let nextNumber = 1;
  if (existingReservations && existingReservations.length > 0) {
    const lastNumReservation = existingReservations[0].num_reservation;
    const lastNumber = lastNumReservation - parseInt(datePrefix + '0');
    nextNumber = lastNumber + 1;
  }

  // Générer le nouveau numéro de réservation
  const numReservation = parseInt(datePrefix + nextNumber.toString());

  return {
    num_reservation: numReservation,
    date_prefix: datePrefix,
    increment: nextNumber
  };
}
