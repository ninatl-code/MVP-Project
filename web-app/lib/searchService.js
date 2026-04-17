import { supabase } from './supabaseClient';

/**
 * Search photographers with filters
 */
export const searchPhotographers = async (filters = {}) => {
  try {
    let query = supabase
      .from('profiles')
      .select(`
        id,
        nom,
        email,
        avatar_url,
        profils_prestataire(
          bio,
          specialisations,
          tarif_horaire_min,
          rayon_deplacement_km,
          note_moyenne,
          nb_avis,
          portfolio_photos,
          identite_verifiee
        )
      `)
      .eq('role', 'photographe');

    const { data, error } = await query;

    if (error) throw error;

    // Apply client-side filters (more flexible)
    let filteredData = data?.filter(p => p.profils_prestataire) || [];

    // Filter by specialization
    if (filters.specialisation) {
      filteredData = filteredData.filter(p => 
        p.profils_prestataire.specialisations?.includes(filters.specialisation)
      );
    }

    // Filter by price range
    if (filters.prix_min) {
      filteredData = filteredData.filter(p => 
        p.profils_prestataire.tarif_horaire_min >= filters.prix_min
      );
    }
    if (filters.prix_max) {
      filteredData = filteredData.filter(p => 
        p.profils_prestataire.tarif_horaire_min <= filters.prix_max
      );
    }

    // Filter by minimum rating
    if (filters.note_min) {
      filteredData = filteredData.filter(p => 
        p.profils_prestataire.note_moyenne >= filters.note_min
      );
    }

    // Filter verified only
    if (filters.verified_only) {
      filteredData = filteredData.filter(p => 
        p.profils_prestataire.identite_verifiee
      );
    }

    // Sort results
    if (filters.sort_by) {
      switch (filters.sort_by) {
        case 'price_asc':
          filteredData.sort((a, b) => 
            (a.profils_prestataire.tarif_horaire_min || 0) - (b.profils_prestataire.tarif_horaire_min || 0)
          );
          break;
        case 'price_desc':
          filteredData.sort((a, b) => 
            (b.profils_prestataire.tarif_horaire_min || 0) - (a.profils_prestataire.tarif_horaire_min || 0)
          );
          break;
        case 'rating':
          filteredData.sort((a, b) => 
            (b.profils_prestataire.note_moyenne || 0) - (a.profils_prestataire.note_moyenne || 0)
          );
          break;
        case 'reviews':
          filteredData.sort((a, b) => 
            (b.profils_prestataire.nb_avis || 0) - (a.profils_prestataire.nb_avis || 0)
          );
          break;
      }
    }

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('Error searching photographers:', error);
    return { data: null, error };
  }
};

/**
 * Get photographer details for public view
 */
export const getPhotographerPublicProfile = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        nom,
        avatar_url,
        created_at,
        profils_prestataire(
          bio,
          specialisations,
          tarif_horaire_min,
          rayon_deplacement_km,
          note_moyenne,
          nb_avis,
          portfolio_photos,
          identite_verifiee
        )
      `)
      .eq('id', photographeId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer public profile:', error);
    return { data: null, error };
  }
};

/**
 * Get photographer's packages for public view
 */
export const getPhotographerPublicPackages = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('packages_types')
      .select('*')
      .eq('prestataire_id', photographeId)
      .eq('actif', true)
      .order('prix_fixe', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer packages:', error);
    return { data: null, error };
  }
};

/**
 * Get featured photographers
 */
export const getFeaturedPhotographers = async (limit = 6) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        nom,
        avatar_url,
        profils_prestataire(
          bio,
          specialisations,
          tarif_horaire_min,
          note_moyenne,
          nb_avis,
          portfolio_photos,
          identite_verifiee
        )
      `)
      .eq('role', 'photographe')
      .not('profils_prestataire', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter

    if (error) throw error;

    // Filter and sort by rating
    const filtered = data
      ?.filter(p => p.profils_prestataire && p.profils_prestataire.portfolio_photos?.length > 0)
      .sort((a, b) => (b.profils_prestataire.note_moyenne || 0) - (a.profils_prestataire.note_moyenne || 0))
      .slice(0, limit);

    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error fetching featured photographers:', error);
    return { data: null, error };
  }
};

/**
 * Get photographers by category
 */
export const getPhotographersByCategory = async (category, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        nom,
        avatar_url,
        profils_prestataire(
          specialisations,
          tarif_horaire_min,
          note_moyenne,
          nb_avis,
          portfolio_photos
        )
      `)
      .eq('role', 'photographe');

    if (error) throw error;

    const filtered = data
      ?.filter(p => p.profils_prestataire?.specialisations?.includes(category))
      .slice(0, limit);

    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error fetching photographers by category:', error);
    return { data: null, error };
  }
};

/**
 * Track profile view
 */
export const trackProfileView = async (photographeId, viewerId = null) => {
  // profile_views table no longer exists — no-op
  return { success: true };
};

/**
 * Search categories
 */
export const SEARCH_CATEGORIES = [
  { id: 'mariage', label: 'Mariage', icon: '💒', description: 'Photos de mariage et cérémonies' },
  { id: 'portrait', label: 'Portrait', icon: '👤', description: 'Portraits professionnels et artistiques' },
  { id: 'evenement', label: 'Événement', icon: '🎉', description: 'Fêtes, anniversaires, soirées' },
  { id: 'corporate', label: 'Corporate', icon: '🏢', description: 'Photos d\'entreprise et professionnelles' },
  { id: 'produit', label: 'Produit', icon: '📦', description: 'Photos de produits e-commerce' },
  { id: 'immobilier', label: 'Immobilier', icon: '🏠', description: 'Photos immobilières et architecture' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦', description: 'Séances photo en famille' },
  { id: 'grossesse', label: 'Grossesse', icon: '🤰', description: 'Photos de maternité' },
  { id: 'nouveau-ne', label: 'Nouveau-né', icon: '👶', description: 'Photos de naissance' },
  { id: 'animalier', label: 'Animalier', icon: '🐕', description: 'Photos d\'animaux de compagnie' },
  { id: 'culinaire', label: 'Culinaire', icon: '🍽️', description: 'Photos gastronomiques' },
];

/**
 * Price ranges for filtering
 */
export const PRICE_RANGES = [
  { id: 'budget', label: 'Économique', min: 0, max: 100, description: '< 100 DH/h' },
  { id: 'mid', label: 'Intermédiaire', min: 100, max: 200, description: '100 DH - 200 DH/h' },
  { id: 'premium', label: 'Premium', min: 200, max: 500, description: '200 DH - 500 DH/h' },
  { id: 'luxury', label: 'Luxe', min: 500, max: null, description: '> 500 DH/h' },
];

export default {
  searchPhotographers,
  getPhotographerPublicProfile,
  getPhotographerPublicPackages,
  getFeaturedPhotographers,
  getPhotographersByCategory,
  trackProfileView,
  SEARCH_CATEGORIES,
  PRICE_RANGES,
};
