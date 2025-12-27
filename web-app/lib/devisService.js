import { supabase } from './supabaseClient';

/**
 * Create a new devis (quote) from photographer
 */
export const createDevis = async ({
  photographeId,
  particulierId,
  demandeId,
  annonceId,
  tarif_base,
  options = [],
  frais_deplacement = 0,
  message,
  date_validite,
  duree_prestation,
}) => {
  try {
    // Calculate total: base + options + travel fees
    const optionsTotal = options.reduce((sum, opt) => sum + (opt.prix || 0), 0);
    const montant_total = tarif_base + optionsTotal + frais_deplacement;

    const { data, error } = await supabase
      .from('devis')
      .insert({
        photographe_id: photographeId,
        particulier_id: particulierId,
        demande_id: demandeId,
        annonce_id: annonceId,
        tarif_base,
        options,
        frais_deplacement,
        montant_total,
        message,
        date_validite,
        duree_prestation,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating devis:', error);
    return { data: null, error };
  }
};

/**
 * Get all devis sent by a photographer
 */
export const getPhotographeDevis = async (photographeId, status = null) => {
  try {
    let query = supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_particulier_id_fkey(nom, email, avatar_url),
        demandes_client(titre, categorie, lieu, date_souhaitee),
        annonces(titre)
      `)
      .eq('photographe_id', photographeId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer devis:', error);
    return { data: null, error };
  }
};

/**
 * Get all devis received by a client
 */
export const getClientDevis = async (particulierId, status = null) => {
  try {
    let query = supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_photographe_id_fkey(id, nom, email, avatar_url, photos),
        demandes_client(titre, categorie),
        annonces(titre)
      `)
      .eq('particulier_id', particulierId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching client devis:', error);
    return { data: null, error };
  }
};

/**
 * Get devis for a specific demande
 */
export const getDevisForDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_photographe_id_fkey(
          id, 
          nom, 
          email, 
          avatar_url,
          profils_photographe(
            note_moyenne,
            nombre_avis,
            specialisations,
            portfolio_photos
          )
        )
      `)
      .eq('demande_id', demandeId)
      .order('montant_total', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching devis for demande:', error);
    return { data: null, error };
  }
};

/**
 * Get single devis details
 */
export const getDevisById = async (devisId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_photographe_id_fkey(id, nom, email, telephone, avatar_url),
        profiles!devis_particulier_id_fkey(id, nom, email, telephone, avatar_url),
        demandes_client(*),
        annonces(*)
      `)
      .eq('id', devisId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching devis:', error);
    return { data: null, error };
  }
};

/**
 * Accept a devis (client action)
 */
export const acceptDevis = async (devisId) => {
  try {
    // Get devis details first
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .single();

    if (devisError) throw devisError;

    // Update devis status
    const { data, error } = await supabase
      .from('devis')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (error) throw error;

    // Create reservation from accepted devis
    const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        numero_reservation: reservationNumber,
        particulier_id: devis.particulier_id,
        prestataire_id: devis.photographe_id,
        annonce_id: devis.annonce_id,
        devis_id: devisId,
        date_prestation: devis.date_prestation || new Date().toISOString(),
        montant: devis.montant_total,
        montant_acompte: devis.montant_total * 0.3,
        status: 'en_attente_paiement',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (resError) {
      console.error('Error creating reservation:', resError);
    }

    // Mark demande as fulfilled if exists
    if (devis.demande_id) {
      await supabase
        .from('demandes_client')
        .update({ status: 'fulfilled' })
        .eq('id', devis.demande_id);
    }

    return { data, reservation, error: null };
  } catch (error) {
    console.error('Error accepting devis:', error);
    return { data: null, reservation: null, error };
  }
};

/**
 * Reject a devis (client action)
 */
export const rejectDevis = async (devisId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .update({
        status: 'rejected',
        reject_reason: reason,
        rejected_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting devis:', error);
    return { data: null, error };
  }
};

/**
 * Cancel a devis (photographer action)
 */
export const cancelDevis = async (devisId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error cancelling devis:', error);
    return { data: null, error };
  }
};

/**
 * Update devis (only if still pending)
 */
export const updateDevis = async (devisId, updates) => {
  try {
    // Recalculate total if pricing changed
    let montant_total = updates.tarif_base || 0;
    if (updates.options) {
      montant_total += updates.options.reduce((sum, opt) => sum + (opt.prix || 0), 0);
    }
    if (updates.frais_deplacement) {
      montant_total += updates.frais_deplacement;
    }

    const { data, error } = await supabase
      .from('devis')
      .update({
        ...updates,
        montant_total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .eq('status', 'pending') // Only update pending devis
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating devis:', error);
    return { data: null, error };
  }
};

/**
 * Get devis statistics for photographer
 */
export const getDevisStats = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('status, montant_total')
      .eq('photographe_id', photographeId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(d => d.status === 'pending').length || 0,
      accepted: data?.filter(d => d.status === 'accepted').length || 0,
      rejected: data?.filter(d => d.status === 'rejected').length || 0,
      cancelled: data?.filter(d => d.status === 'cancelled').length || 0,
      totalRevenue: data?.filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.montant_total, 0) || 0,
      conversionRate: data?.length > 0 
        ? ((data.filter(d => d.status === 'accepted').length / data.length) * 100).toFixed(1) 
        : 0,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching devis stats:', error);
    return { stats: null, error };
  }
};

/**
 * Devis status labels and colors
 */
export const DEVIS_STATUS = {
  pending: { label: 'En attente', color: 'yellow' },
  accepted: { label: 'Accepté', color: 'green' },
  rejected: { label: 'Refusé', color: 'red' },
  cancelled: { label: 'Annulé', color: 'gray' },
  expired: { label: 'Expiré', color: 'gray' },
};

export default {
  createDevis,
  getPhotographeDevis,
  getClientDevis,
  getDevisForDemande,
  getDevisById,
  acceptDevis,
  rejectDevis,
  cancelDevis,
  updateDevis,
  getDevisStats,
  DEVIS_STATUS,
};
