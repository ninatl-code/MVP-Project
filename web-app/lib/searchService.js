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
        photos,
        profils_photographe(
          bio,
          specialisations,
          tarif_horaire,
          rayon_deplacement_km,
          localisation,
          note_moyenne,
          nombre_avis,
          portfolio_photos,
          is_verified
        )
      `)
      .eq('role', 'photographe')
      .eq('is_active', true);

    const { data, error } = await query;

    if (error) throw error;

    // Apply client-side filters (more flexible)
    let filteredData = data?.filter(p => p.profils_photographe) || [];

    // Filter by specialization
    if (filters.specialisation) {
      filteredData = filteredData.filter(p => 
        p.profils_photographe.specialisations?.includes(filters.specialisation)
      );
    }

    // Filter by price range
    if (filters.prix_min) {
      filteredData = filteredData.filter(p => 
        p.profils_photographe.tarif_horaire >= filters.prix_min
      );
    }
    if (filters.prix_max) {
      filteredData = filteredData.filter(p => 
        p.profils_photographe.tarif_horaire <= filters.prix_max
      );
    }

    // Filter by minimum rating
    if (filters.note_min) {
      filteredData = filteredData.filter(p => 
        p.profils_photographe.note_moyenne >= filters.note_min
      );
    }

    // Filter verified only
    if (filters.verified_only) {
      filteredData = filteredData.filter(p => 
        p.profils_photographe.is_verified
      );
    }

    // Sort results
    if (filters.sort_by) {
      switch (filters.sort_by) {
        case 'price_asc':
          filteredData.sort((a, b) => 
            (a.profils_photographe.tarif_horaire || 0) - (b.profils_photographe.tarif_horaire || 0)
          );
          break;
        case 'price_desc':
          filteredData.sort((a, b) => 
            (b.profils_photographe.tarif_horaire || 0) - (a.profils_photographe.tarif_horaire || 0)
          );
          break;
        case 'rating':
          filteredData.sort((a, b) => 
            (b.profils_photographe.note_moyenne || 0) - (a.profils_photographe.note_moyenne || 0)
          );
          break;
        case 'reviews':
          filteredData.sort((a, b) => 
            (b.profils_photographe.nombre_avis || 0) - (a.profils_photographe.nombre_avis || 0)
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
        photos,
        created_at,
        profils_photographe(
          bio,
          specialisations,
          tarif_horaire,
          rayon_deplacement_km,
          localisation,
          note_moyenne,
          nombre_avis,
          portfolio_photos,
          is_verified,
          ponctualite_moyenne,
          qualite_moyenne,
          communication_moyenne,
          rapport_qualite_prix_moyenne
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
      .from('packages')
      .select('*')
      .eq('photographe_id', photographeId)
      .eq('is_active', true)
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
        profils_photographe(
          bio,
          specialisations,
          tarif_horaire,
          note_moyenne,
          nombre_avis,
          portfolio_photos,
          is_verified
        )
      `)
      .eq('role', 'photographe')
      .eq('is_active', true)
      .not('profils_photographe', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter

    if (error) throw error;

    // Filter and sort by rating
    const filtered = data
      ?.filter(p => p.profils_photographe && p.profils_photographe.portfolio_photos?.length > 0)
      .sort((a, b) => (b.profils_photographe.note_moyenne || 0) - (a.profils_photographe.note_moyenne || 0))
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
        profils_photographe(
          specialisations,
          tarif_horaire,
          note_moyenne,
          nombre_avis,
          portfolio_photos
        )
      `)
      .eq('role', 'photographe')
      .eq('is_active', true);

    if (error) throw error;

    const filtered = data
      ?.filter(p => p.profils_photographe?.specialisations?.includes(category))
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
  try {
    const { error } = await supabase
      .from('profile_views')
      .insert({
        photographe_id: photographeId,
        viewer_id: viewerId,
        viewed_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('Error tracking profile view:', error);
    }
    return { success: true };
  } catch (error) {
    console.warn('Error tracking profile view:', error);
    return { success: false };
  }
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
  { id: 'budget', label: 'Économique', min: 0, max: 100, description: '< 100€/h' },
  { id: 'mid', label: 'Intermédiaire', min: 100, max: 200, description: '100€ - 200€/h' },
  { id: 'premium', label: 'Premium', min: 200, max: 500, description: '200€ - 500€/h' },
  { id: 'luxury', label: 'Luxe', min: 500, max: null, description: '> 500€/h' },
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
