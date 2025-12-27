import { supabase } from './supabaseClient';

/**
 * Create a new photo request (demande)
 */
export const createDemande = async ({
  particulierId,
  titre,
  description,
  categorie,
  date_souhaitee,
  lieu,
  budget_min,
  budget_max,
  duree_estimee,
  nombre_photos,
  options = [],
}) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .insert({
        particulier_id: particulierId,
        titre,
        description,
        categorie,
        date_souhaitee,
        lieu,
        budget_min,
        budget_max,
        duree_estimee,
        nombre_photos,
        options,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
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
export const getClientDemandes = async (particulierId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select(`
        *,
        devis(count)
      `)
      .eq('particulier_id', particulierId)
      .order('created_at', { ascending: false });

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
        profiles!demandes_client_particulier_id_fkey(nom, email, telephone, avatar_url),
        devis(
          id,
          montant_total,
          status,
          message,
          created_at,
          profiles!devis_photographe_id_fkey(id, nom, avatar_url)
        )
      `)
      .eq('id', demandeId)
      .single();

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
        status: 'fulfilled',
        updated_at: new Date().toISOString(),
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
export const cancelDemande = async (demandeId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error cancelling demande:', error);
    return { data: null, error };
  }
};

/**
 * Get active demandes for photographers (matching)
 */
export const getActiveDemandesForPhotographer = async (photographeId, filters = {}) => {
  try {
    // First get photographer's profile for matching
    const { data: photographe, error: profError } = await supabase
      .from('profils_photographe')
      .select('specialisations, rayon_deplacement_km, tarif_horaire, localisation')
      .eq('user_id', photographeId)
      .single();

    if (profError) {
      console.warn('No photographer profile found, fetching all active demandes');
    }

    let query = supabase
      .from('demandes_client')
      .select(`
        *,
        profiles!demandes_client_particulier_id_fkey(nom, avatar_url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.categorie) {
      query = query.eq('categorie', filters.categorie);
    }
    if (filters.budget_max) {
      query = query.lte('budget_min', filters.budget_max);
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

/**
 * Get demande statistics for a client
 */
export const getDemandeStats = async (particulierId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('status')
      .eq('particulier_id', particulierId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: data?.filter(d => d.status === 'active').length || 0,
      fulfilled: data?.filter(d => d.status === 'fulfilled').length || 0,
      cancelled: data?.filter(d => d.status === 'cancelled').length || 0,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching demande stats:', error);
    return { stats: null, error };
  }
};

/**
 * Categories for photo requests
 */
export const DEMANDE_CATEGORIES = [
  { id: 'mariage', label: 'Mariage', icon: '💒' },
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'evenement', label: 'Événement', icon: '🎉' },
  { id: 'corporate', label: 'Corporate', icon: '🏢' },
  { id: 'produit', label: 'Produit', icon: '📦' },
  { id: 'immobilier', label: 'Immobilier', icon: '🏠' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
  { id: 'grossesse', label: 'Grossesse', icon: '🤰' },
  { id: 'nouveau-ne', label: 'Nouveau-né', icon: '👶' },
  { id: 'animalier', label: 'Animalier', icon: '🐕' },
  { id: 'culinaire', label: 'Culinaire', icon: '🍽️' },
  { id: 'autre', label: 'Autre', icon: '📷' },
];

export default {
  createDemande,
  getClientDemandes,
  getDemandeById,
  updateDemande,
  fulfillDemande,
  cancelDemande,
  getActiveDemandesForPhotographer,
  getDemandeStats,
  DEMANDE_CATEGORIES,
};
