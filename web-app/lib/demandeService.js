import { supabase } from './supabaseClient';

/**
 * Client Request Service (demandeService.js)
 * -------------------------------------------
 * Handles CRUD operations for photo service requests (demandes_client table).
 *
 * Payload cible (photographe uniquement):
 * - type_evenement_id, date_souhaitee, lieu, ville,
 *   latitude_evenement, longitude_evenement, nb_personnes,
 *   duree_estimee_heures, budget_max, style_photo_id, commentaire
 *
 * Professional profiles are read from `photographe` (never `profils_prestataire`).
 * Event types come from `types_evenements_photo`, styles from `styles_photo`.
 */

/**
 * Créer une nouvelle demande photo.
 */
export const createDemande = async ({
  clientId,
  type_evenement_id,
  date_souhaitee,
  lieu,
  ville,
  latitude_evenement,
  longitude_evenement,
  nb_personnes,
  duree_estimee_heures,
  budget_max,
  style_photo_id,
  commentaire,
}) => {
  try {
    // Calculer la date d'expiration (30 jours par défaut)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);

    const { data, error } = await supabase
      .from('demandes_client')
      .insert({
        client_id: clientId,
        type_evenement_id,
        date_souhaitee,
        lieu,
        ville: ville || lieu,
        latitude_evenement: latitude_evenement || null,
        longitude_evenement: longitude_evenement || null,
        nb_personnes: nb_personnes || null,
        duree_estimee_heures: duree_estimee_heures || null,
        budget_max: budget_max || null,
        style_photo_id: style_photo_id || null,
        commentaire: commentaire || null,
        statut: 'ouverte',
        date_expiration: expireDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating demande:', error);
    return { data: null, error };
  }
};

/**
 * Get all demandes for a client
 */
export const getClientDemandes = async (clientId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select(`
        *,
        devis(count)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching client demandes:', error);
    return { data: null, error };
  }
};

/**
 * Get a single demande with details
 */
export const getDemandeById = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select(`
        *,
        profiles!demandes_client_client_id_fkey(nom, email, telephone, avatar_url),
        devis(
          id,
          montant_total,
          statut,
          message_personnalise,
          created_at,
          profiles!devis_prestatairep_id_fkey(id, nom, avatar_url)
        )
      `)
      .eq('id', demandeId)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching demande:', error);
    return { data: null, error };
  }
};

/**
 * Update a demande
 */
export const updateDemande = async (demandeId, updates) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating demande:', error);
    return { data: null, error };
  }
};

/**
 * Mark demande as fulfilled when quote is accepted
 */
export const fulfillDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        statut: 'pourvue',
        pourvue_at: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fulfilling demande:', error);
    return { data: null, error };
  }
};

/**
 * Cancel a demande
 */
export const cancelDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        statut: 'annulee',
        fermee_at: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .select('id', { count: 'exact' })
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error cancelling demande:', error);
    return { data: null, error };
  }
};

export const reactivateDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        statut: 'ouverte',
        fermee_at: null,
      })
      .eq('id', demandeId)
      .select('id', { count: 'exact' })
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error reactivating demande:', error);
    return { data: null, error };
  }
};

export const expireDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        statut: 'expire',
        date_expiration: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error expiring demande:', error);
    return { data: null, error };
  }
};

/**
 * Get active demandes for photographers (matching)
 * Professional profile read from `photographe`, filtering by compatible styles.
 */
export const getActiveDemandesForPhotographer = async (photographeId, filters = {}) => {
  try {
    // Récupérer le profil photographe (table `photographe`)
    const { data: photographe, error: profError } = await supabase
      .from('photographe')
      .select('id, prix_minimum, rayon_deplacement_km, statut_validation')
      .eq('id', photographeId)
      .single();

    if (profError) {
      console.warn('No photographer profile found, fetching all active demandes');
    }

    let query = supabase
      .from('demandes_client')
      .select(`
        *,
        profiles!demandes_client_client_id_fkey(nom, avatar_url)
      `)
      .eq('statut', 'ouverte')
      .order('created_at', { ascending: false });

    // Filtrer par type d'événement si fourni
    if (filters.type_evenement_id) {
      query = query.eq('type_evenement_id', filters.type_evenement_id);
    }
    if (filters.budget_max) {
      query = query.lte('budget_max', filters.budget_max);
    }
    if (filters.date_from) {
      query = query.gte('date_souhaitee', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date_souhaitee', filters.date_to);
    }
    if (filters.style_photo_id) {
      query = query.eq('style_photo_id', filters.style_photo_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, photographeProfile: photographe, error: null };
  } catch (error) {
    console.error('Error fetching active demandes:', error);
    return { data: null, photographeProfile: null, error };
  }
};

export const getStatusDemandes = async (status, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('*', { count: 'exact', head: true })
      .eq('statut', status)
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching demande:', error);
    return { data: null, error };
  }
};

/**
 * Get demande statistics for a client
 */
export const getDemandeStats = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('statut')
      .eq('client_id', clientId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: data?.filter(d => d.statut === 'ouverte').length || 0,
      fulfilled: data?.filter(d => d.statut === 'pourvue').length || 0,
      cancelled: data?.filter(d => d.statut === 'annulee').length || 0,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching demande stats:', error);
    return { stats: null, error };
  }
};

export default {
  createDemande,
  getClientDemandes,
  getDemandeById,
  updateDemande,
  fulfillDemande,
  cancelDemande,
  reactivateDemande,
  expireDemande,
  getStatusDemandes,
  getActiveDemandesForPhotographer,
  getDemandeStats,
};