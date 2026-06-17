import { supabase } from './supabaseClient';
import * as photographerService from  './photographerService';
/**
 * Create a new service request (demande)
 */
export const createDemande = async ({
  clientId,
  titre,
  description,
  categorie,
  date_souhaitee,
  heure_debut,
  lieu,
  ville,
  budget_max,
  duree_estimee_heures,
  type_prestation = [],
  langues_souhaitees = [],
  nb_personnes = '1',
  monnaie = 'MAD',
  instructions_speciales,
  details = [],
}) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .insert({
        client_id: clientId,
        titre,
        description,
        categorie,
        date_souhaitee,
        heure_debut: heure_debut || null,
        lieu,
        ville: ville || lieu,
        budget_max,
        duree_estimee_heures,
        type_prestation,
        langues_souhaitees,
        statut: 'ouverte',
        nb_personnes,
        monnaie,
        instructions_speciales,
        details,
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
export const getClientDemandes = async (clientId,limit=20) => {
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
 * Get active demandes for service providers (matching)
 */
export const getActiveDemandesForPhotographer = async (photographeId, filters = {}) => {
  try {
    // First get service provider's profile for matching
    const { data: photographe, error: profError } = await supabase
      .from('profils_prestataire')
      .select('specialisations, rayon_deplacement_km, tarif_horaire_min')
      .eq('id', photographeId)
      .single();

    if (profError) {
      console.warn('No service provider profile found, fetching all active demandes');
    }

    let query = supabase
      .from('demandes_client')
      .select(`
        *,
        profiles!demandes_client_client_id_fkey(nom, avatar_url)
      `)
      .eq('statut', 'ouverte')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.categorie) {
      query = query.eq('categorie', filters.categorie);
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
      .single()
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
      cancelled: data?.filter(d => d.statut === 'fermee').length || 0,
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
  getStatusDemandes,
  getActiveDemandesForPhotographer,
  getDemandeStats,
};
