import { supabase } from './supabaseClient';
import * as notificationService from  '../lib/notificationService';


/**
 * Create anew reservation
 */
export const createReservation = async ({
  clientId,
  photographe_id,
  devisId,
  datePrestation,
  heureDebut,
  duree_heures,
  montant,
  lieu,
  ville,
  categorie = "null",
  titre = 'Réservation',
  description = '',
  notes_client,
  notes_prestataire,
  demande_id,
  monnaie = "MAD",
  source = "devis"
}) => {
  try {
    const montantAcompte = Math.round(montant * 0.3 * 100) / 100;

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        client_id: clientId,
        prestataire_id: photographe_id,
        devis_id: devisId,
        titre,
        categorie: categorie,
        date: datePrestation,
        heure_debut: heureDebut,
        duree_heures: duree_heures,
        description,
        montant_total: montant,
        acompte_montant: montantAcompte,
        solde_montant: montant - montantAcompte,
        lieu: lieu || 'À définir',
        ville,
        notes_client,
        notes_prestataire,
        demande_id,
        statut: 'pending',  
        monnaie,
        source,
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
export const getClientReservations = async (clientId, status = null,limit=100) => {
  try {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_prestatairep_id_fkey(id, nom, email, telephone, avatar_url)
      `)
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .limit(limit); // Limit to 100 reservations for performance

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('statut', status);
      } else {
        query = query.eq('statut', status);
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
 * Get reservations for a service provider
 */
export const getPhotographerReservations = async (photographeId, status = null,limit=100) => {
  try {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_client_id_fkey(id, nom, email, telephone, avatar_url),
        devis(message_personnalise)
      `)
      .eq('prestataire_id', photographeId)
      .order('date', { ascending: true })
      .limit(limit); // Limit to 100 reservations for performance

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('statut', status);
      } else {
        query = query.eq('statut', status);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching service provider reservations:', error);
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
      .select('*')
      .eq('id', reservationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return { data: null, error };
  }
};

export const getReservationByStatus = async (status, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('statut', status)
      .limit(limit);


    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return { data: null, error };
  }
};

export const getReservationByDemande = async (demandeId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('demande_id', demandeId)
      .limit(limit);


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
        statut: status,
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
 * Confirm reservation (service provider accepts)
 */
export const confirmReservation = async (reservationId) => {
  return updateReservationStatus(reservationId, 'confirmed', {
    date_confirmation: new Date().toISOString(),
  });
};

/**
 * Complete reservation (after service is done)
 */
export const completeReservation = async (
  reservationId,
  clientId,
  datePrestation,
  prestataireId
) => {
  try {
    // 1. Mise à jour du statut
    const result = await updateReservationStatus(
      reservationId,
      'completed',
      {}
    );

    if (!result) {
      throw new Error('Échec mise à jour réservation');
    }

    // 2. Notification APRES succès
    await notificationService.notifyReservationConfirmed(
      reservationId,
      clientId,
      datePrestation,
      prestataireId
    );

    return { success: true };
  } catch (error) {
    console.error('completeReservation error:', error);
    return { success: false, error };
  }
};

/**
 * Cancel reservation
 */
export const cancelReservation = async (
  reservationId,
  reason,
  cancelledBy
) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        statut: 'cancelled',
        motif_annulation: reason,
        annule_par: cancelledBy,
        date_annulation: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select('id, prestataire_id, client_id, demande_id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Réservation introuvable');

    // Notification APRÈS validation
    await notificationService.notifyReservationCancelled({
      userId: data.prestataire_id,
      role: 'prestataire',
      reservationId: reservationId,
      cancelledBy,
      demandeId: data.demande_id,
    });

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
    const column = role === 'client' ? 'client_id' : 'prestataire_id';
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles!reservations_${role === 'client' ? 'prestatairep' : 'client'}_id_fkey(nom, avatar_url)
      `)
      .eq(column, userId)
      .gte('date', today)
      .lte('date', nextWeek)
      .in('statut', ['confirmed', 'pending'])
      .order('date', { ascending: true });

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
    const column = role === 'client' ? 'client_id' : 'prestataire_id';

    const { data, error } = await supabase
      .from('reservations')
      .select('statut, montant_total, date')
      .eq(column, userId);

    if (error) throw error;

    const now = new Date();
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.statut === 'pending').length || 0,
      confirmed: data?.filter(r => r.statut === 'confirmed').length || 0,
      completed: data?.filter(r => r.statut === 'completed').length || 0,
      cancelled: data?.filter(r => r.statut === 'cancelled').length || 0,
      upcoming: data?.filter(r =>
        r.statut === 'confirmed' && new Date(r.date) > now
      ).length || 0,
      totalRevenue: data?.filter(r => r.statut === 'completed').reduce((sum, r) => sum + (r.montant_total || 0), 0) || 0,
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
  pending: { label: 'En attente', color: 'yellow', icon: 'Clock' },
  confirmed: { label: 'Confirmé', color: 'green', icon: 'CheckCircle' },
  completed: { label: 'Terminé', color: 'gray', icon: 'Check' },
  cancelled: { label: 'Annulé', color: 'red', icon: 'X' },
};

/**
 * Get calendar events for service provider
 */
export const getCalendarEvents = async (photographeId, startDate, endDate) => {
  try {
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        date,
        heure_debut,
        heure_fin,
        statut,
        montant_total,
        profiles!reservations_client_id_fkey(nom)
      `)
      .eq('prestataire_id', photographeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('statut', 'eq', 'cancelled');

    if (resError) throw resError;

    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('prestataire_id', photographeId)
      .gte('end_datetime', startDate)
      .lte('start_datetime', endDate);

    if (blockedError) throw blockedError;

    const events = [
      ...(reservations || []).map(r => ({
        id: r.id,
        type: 'reservation',
        title: `📷 ${r.profiles?.nom || 'Client'}`,
        date: r.date,
        start: r.heure_debut,
        end: r.heure_fin,
        statut: r.statut,
        color: RESERVATION_STATUS[r.statut]?.color || 'gray',
      })),
      ...(blockedSlots || []).map(b => ({
        id: b.id,
        type: 'blocked',
        title: b.reason || 'Indisponible',
        date: b.start_datetime,
        start: b.start_datetime,
        end: b.end_datetime,
        color: 'red',
      })),
    ];

    return { events, error: null };
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return { events: [], error };
  }
};

export const upsertReservation = async (reservationId, reservationData) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .upsert({
        id: reservationId,
        ...reservationData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error upserting reservation:', error);
    return { data: null, error };
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
