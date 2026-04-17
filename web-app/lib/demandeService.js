import { supabase } from './supabaseClient';

/**
 * Create a new service request (demande)
 */
export const createDemande = async ({
  clientId,
  titre,
  description,
  categorie,
  date_souhaitee,
  lieu,
  ville,
  budget_max,
  duree_estimee_heures,
  type_prestation = [],
  services_souhaites = {},
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
        lieu,
        ville: ville || lieu,
        budget_max,
        duree_estimee_heures,
        type_prestation,
        services_souhaites,
        statut: 'ouverte',
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
export const getClientDemandes = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select(`
        *,
        devis(count)
      `)
      .eq('client_id', clientId)
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
        profiles!demandes_client_client_id_fkey(nom, email, telephone, avatar_url),
        devis(
          id,
          montant_total,
          statut,
          message_personnalise,
          created_at,
          profiles!devis_prestataire_id_fkey(id, nom, avatar_url)
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
export const cancelDemande = async (demandeId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        statut: 'fermee',
        fermee_at: new Date().toISOString(),
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

/**
 * Categories for service requests (Morocco marketplace)
 */
export const DEMANDE_CATEGORIES = [
  // Événements & Célébrations
  { id: 'mariage', label: 'Mariage', icon: '💒' },
  { id: 'evenement', label: 'Événement professionnel', icon: '🎉' },
  { id: 'fete-privee', label: 'Fête privée', icon: '🎊' },
  { id: 'traiteur', label: 'Traiteur', icon: '🍽️' },
  { id: 'dj-musique', label: 'DJ & Musique', icon: '🎵' },
  { id: 'decoration-evenement', label: 'Décoration événement', icon: '🎀' },
  
  // Photographie & Vidéo
  { id: 'photographie', label: 'Photographie', icon: '📷' },
  { id: 'videographie', label: 'Vidéographie', icon: '🎥' },
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'produit', label: 'Photo produit', icon: '📦' },
  { id: 'immobilier', label: 'Photo immobilier', icon: '🏠' },
  
  // Services à domicile
  { id: 'menage', label: 'Ménage', icon: '🧹' },
  { id: 'plomberie', label: 'Plomberie', icon: '🔧' },
  { id: 'electricite', label: 'Électricité', icon: '💡' },
  { id: 'climatisation', label: 'Climatisation', icon: '❄️' },
  { id: 'jardinage', label: 'Jardinage', icon: '🌱' },
  { id: 'peinture', label: 'Peinture', icon: '🎨' },
  { id: 'reparations', label: 'Réparations diverses', icon: '🔨' },
  
  // Construction & Rénovation
  { id: 'maconnerie', label: 'Maçonnerie', icon: '🧱' },
  { id: 'carrelage', label: 'Carrelage', icon: '⬜' },
  { id: 'menuiserie', label: 'Menuiserie', icon: '🪚' },
  { id: 'renovation', label: 'Rénovation', icon: '🏗️' },
  
  // Beauté & Bien-être
  { id: 'coiffure', label: 'Coiffure', icon: '💇' },
  { id: 'maquillage', label: 'Maquillage', icon: '💄' },
  { id: 'massage', label: 'Massage', icon: '💆' },
  { id: 'esthetique', label: 'Esthétique', icon: '✨' },
  
  // Services professionnels
  { id: 'corporate', label: 'Services corporate', icon: '🏢' },
  { id: 'developpement-web', label: 'Développement web', icon: '💻' },
  { id: 'design-graphique', label: 'Design graphique', icon: '🎨' },
  { id: 'marketing-digital', label: 'Marketing digital', icon: '📱' },
  { id: 'redaction', label: 'Rédaction', icon: '✍️' },
  { id: 'traduction', label: 'Traduction', icon: '🌐' },
  { id: 'comptabilite', label: 'Comptabilité', icon: '📊' },
  
  // Transport & Logistique
  { id: 'demenagement', label: 'Déménagement', icon: '📦' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'livraison', label: 'Livraison', icon: '🚚' },
  
  // Éducation & Formation
  { id: 'cours-particuliers', label: 'Cours particuliers', icon: '📚' },
  { id: 'formation', label: 'Formation professionnelle', icon: '🎓' },
  { id: 'coaching', label: 'Coaching', icon: '🎯' },
  
  // Autres services
  { id: 'securite', label: 'Sécurité', icon: '🛡️' },
  { id: 'nettoyage-auto', label: 'Nettoyage auto', icon: '🚙' },
  { id: 'garde-enfants', label: 'Garde d\'enfants', icon: '👶' },
  { id: 'autre', label: 'Autre', icon: '⚙️' },
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
