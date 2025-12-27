import { supabase } from './supabaseClient';

/**
 * Create a new reservation
 */
export const createReservation = async ({
  particulierId,
  prestataire_id,
  annonceId,
  devisId,
  datePrestation,
  heureDebut,
  heureFin,
  montant,
  lieu,
  notes,
}) => {
  try {
    // Generate reservation number
    const numeroReservation = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const montantAcompte = Math.round(montant * 0.3 * 100) / 100;

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        numero_reservation: numeroReservation,
        particulier_id: particulierId,
        prestataire_id,
        annonce_id: annonceId,
        devis_id: devisId,
        date_prestation: datePrestation,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        montant,
        montant_acompte: montantAcompte,
        lieu,
        notes,
        status: 'en_attente_paiement',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { data: null, error };
  }
};

/**
 * Get reservations for a client
 */
export const getClientReservations = async (particulierId, status = null) => {
  try {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_prestataire_id_fkey(id, nom, email, telephone, avatar_url),
        annonces(titre, photos, conditions_annulation),
        devis(options, message)
      `)
      .eq('particulier_id', particulierId)
      .order('date_prestation', { ascending: true });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching client reservations:', error);
    return { data: null, error };
  }
};

/**
 * Get reservations for a photographer
 */
export const getPhotographerReservations = async (photographeId, status = null) => {
  try {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_particulier_id_fkey(id, nom, email, telephone, avatar_url),
        annonces(titre, photos, conditions_annulation),
        devis(options, message)
      `)
      .eq('prestataire_id', photographeId)
      .order('date_prestation', { ascending: true });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer reservations:', error);
    return { data: null, error };
  }
};

/**
 * Get single reservation details
 */
export const getReservationById = async (reservationId) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_particulier_id_fkey(id, nom, email, telephone, avatar_url),
        profiles!reservations_prestataire_id_fkey(id, nom, email, telephone, avatar_url),
        annonces(*),
        devis(*),
        paiements(*)
      `)
      .eq('id', reservationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return { data: null, error };
  }
};

/**
 * Update reservation status
 */
export const updateReservationStatus = async (reservationId, status, additionalData = {}) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return { data: null, error };
  }
};

/**
 * Confirm reservation (photographer accepts)
 */
export const confirmReservation = async (reservationId) => {
  return updateReservationStatus(reservationId, 'confirmed', {
    confirmed_at: new Date().toISOString(),
  });
};

/**
 * Complete reservation (after service is done)
 */
export const completeReservation = async (reservationId) => {
  return updateReservationStatus(reservationId, 'completed', {
    completed_at: new Date().toISOString(),
  });
};

/**
 * Cancel reservation
 */
export const cancelReservation = async (reservationId, reason, cancelledBy) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return { data: null, error };
  }
};

/**
 * Get upcoming reservations (next 7 days)
 */
export const getUpcomingReservations = async (userId, role = 'particulier') => {
  try {
    const column = role === 'particulier' ? 'particulier_id' : 'prestataire_id';
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_${role === 'particulier' ? 'prestataire' : 'particulier'}_id_fkey(nom, avatar_url)
      `)
      .eq(column, userId)
      .gte('date_prestation', today)
      .lte('date_prestation', nextWeek)
      .in('status', ['confirmed', 'acompte_paye'])
      .order('date_prestation', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching upcoming reservations:', error);
    return { data: null, error };
  }
};

/**
 * Get reservation statistics
 */
export const getReservationStats = async (userId, role = 'particulier') => {
  try {
    const column = role === 'particulier' ? 'particulier_id' : 'prestataire_id';

    const { data, error } = await supabase
      .from('reservations')
      .select('status, montant, date_prestation')
      .eq(column, userId);

    if (error) throw error;

    const now = new Date();
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.status === 'en_attente_paiement').length || 0,
      confirmed: data?.filter(r => ['confirmed', 'acompte_paye'].includes(r.status)).length || 0,
      completed: data?.filter(r => r.status === 'completed').length || 0,
      cancelled: data?.filter(r => r.status === 'cancelled').length || 0,
      upcoming: data?.filter(r => 
        new Date(r.date_prestation) > now && 
        ['confirmed', 'acompte_paye'].includes(r.status)
      ).length || 0,
      totalRevenue: data?.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.montant, 0) || 0,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching reservation stats:', error);
    return { stats: null, error };
  }
};

/**
 * Reservation status labels and colors
 */
export const RESERVATION_STATUS = {
  en_attente_paiement: { label: 'En attente de paiement', color: 'yellow', icon: 'Clock' },
  acompte_paye: { label: 'Acompte payé', color: 'blue', icon: 'CreditCard' },
  confirmed: { label: 'Confirmée', color: 'green', icon: 'CheckCircle' },
  completed: { label: 'Terminée', color: 'gray', icon: 'Check' },
  cancelled: { label: 'Annulée', color: 'red', icon: 'X' },
  refunded: { label: 'Remboursée', color: 'purple', icon: 'RefreshCw' },
};

/**
 * Get calendar events for photographer
 */
export const getCalendarEvents = async (photographeId, startDate, endDate) => {
  try {
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        date_prestation,
        heure_debut,
        heure_fin,
        status,
        montant,
        profiles!reservations_particulier_id_fkey(nom)
      `)
      .eq('prestataire_id', photographeId)
      .gte('date_prestation', startDate)
      .lte('date_prestation', endDate)
      .not('status', 'eq', 'cancelled');

    if (resError) throw resError;

    const { data: blockedSlots, error: blockedError } = await supabase
      .from('indisponibilites')
      .select('*')
      .eq('photographe_id', photographeId)
      .gte('date_fin', startDate)
      .lte('date_debut', endDate);

    if (blockedError) throw blockedError;

    // Format as calendar events
    const events = [
      ...(reservations || []).map(r => ({
        id: r.id,
        type: 'reservation',
        title: `📷 ${r.profiles?.nom || 'Client'}`,
        date: r.date_prestation,
        start: r.heure_debut,
        end: r.heure_fin,
        status: r.status,
        color: RESERVATION_STATUS[r.status]?.color || 'gray',
      })),
      ...(blockedSlots || []).map(b => ({
        id: b.id,
        type: 'blocked',
        title: b.motif || 'Indisponible',
        date: b.date_debut,
        start: b.date_debut,
        end: b.date_fin,
        color: 'red',
      })),
    ];

    return { events, error: null };
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return { events: [], error };
  }
};

export default {
  createReservation,
  getClientReservations,
  getPhotographerReservations,
  getReservationById,
  updateReservationStatus,
  confirmReservation,
  completeReservation,
  cancelReservation,
  getUpcomingReservations,
  getReservationStats,
  getCalendarEvents,
  RESERVATION_STATUS,
};
