import { supabase } from './supabaseClient';

/**
 * Create a service package
 */
export const createPackage = async ({
  photographeId,
  titre,
  description,
  categorie,
  prix_fixe,
  duree_minutes,
  nb_photos,
  options = [],
  inclus = [],
  conditions,
  is_active = true,
}) => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .insert({
        photographe_id: photographeId,
        titre,
        description,
        categorie,
        prix_fixe,
        duree_minutes,
        nb_photos,
        options,
        inclus,
        conditions,
        is_active,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating package:', error);
    return { data: null, error };
  }
};

/**
 * Get packages for a photographer
 */
export const getPhotographerPackages = async (photographeId, activeOnly = false) => {
  try {
    let query = supabase
      .from('packages')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('prix_fixe', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching packages:', error);
    return { data: null, error };
  }
};

/**
 * Get single package details
 */
export const getPackageById = async (packageId) => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        profiles!packages_photographe_id_fkey(id, nom, avatar_url)
      `)
      .eq('id', packageId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching package:', error);
    return { data: null, error };
  }
};

/**
 * Update a package
 */
export const updatePackage = async (packageId, updates) => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating package:', error);
    return { data: null, error };
  }
};

/**
 * Delete a package
 */
export const deletePackage = async (packageId) => {
  try {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', packageId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting package:', error);
    return { success: false, error };
  }
};

/**
 * Toggle package active status
 */
export const togglePackageStatus = async (packageId, isActive) => {
  return updatePackage(packageId, { is_active: isActive });
};

/**
 * Search packages by category
 */
export const searchPackages = async (filters = {}) => {
  try {
    let query = supabase
      .from('packages')
      .select(`
        *,
        profiles!packages_photographe_id_fkey(
          id, 
          nom, 
          avatar_url,
          profils_photographe(note_moyenne, nombre_avis, localisation)
        )
      `)
      .eq('is_active', true);

    if (filters.categorie) {
      query = query.eq('categorie', filters.categorie);
    }
    if (filters.prix_min) {
      query = query.gte('prix_fixe', filters.prix_min);
    }
    if (filters.prix_max) {
      query = query.lte('prix_fixe', filters.prix_max);
    }
    if (filters.duree_min) {
      query = query.gte('duree_minutes', filters.duree_min);
    }

    query = query.order('prix_fixe', { ascending: filters.sortByPrice !== 'desc' });

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching packages:', error);
    return { data: null, error };
  }
};

/**
 * Duplicate a package
 */
export const duplicatePackage = async (packageId, photographeId) => {
  try {
    const { data: original, error: fetchError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (fetchError) throw fetchError;

    const { id, created_at, updated_at, ...packageData } = original;
    
    const { data, error } = await supabase
      .from('packages')
      .insert({
        ...packageData,
        photographe_id: photographeId,
        titre: `${packageData.titre} (copie)`,
        is_active: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error duplicating package:', error);
    return { data: null, error };
  }
};

/**
 * Package categories
 */
export const PACKAGE_CATEGORIES = [
  { id: 'mariage', label: 'Mariage', icon: '💒' },
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'evenement', label: 'Événement', icon: '🎉' },
  { id: 'corporate', label: 'Corporate', icon: '🏢' },
  { id: 'produit', label: 'Produit', icon: '📦' },
  { id: 'immobilier', label: 'Immobilier', icon: '🏠' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
  { id: 'grossesse', label: 'Grossesse / Maternité', icon: '🤰' },
  { id: 'nouveau-ne', label: 'Nouveau-né', icon: '👶' },
  { id: 'animalier', label: 'Animalier', icon: '🐕' },
  { id: 'culinaire', label: 'Culinaire', icon: '🍽️' },
];

export default {
  createPackage,
  getPhotographerPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  togglePackageStatus,
  searchPackages,
  duplicatePackage,
  PACKAGE_CATEGORIES,
};
