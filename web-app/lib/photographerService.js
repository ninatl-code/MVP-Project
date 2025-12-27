import { supabase } from './supabaseClient';

/**
 * Get photographer's profile
 */
export const getPhotographerProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profils_photographe')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer profile:', error);
    return { data: null, error };
  }
};

/**
 * Create or update photographer profile
 */
export const upsertPhotographerProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profils_photographe')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error upserting photographer profile:', error);
    return { data: null, error };
  }
};

/**
 * Update specializations
 */
export const updateSpecializations = async (userId, specialisations) => {
  return upsertPhotographerProfile(userId, { specialisations });
};

/**
 * Update service radius
 */
export const updateServiceRadius = async (userId, rayonKm, localisation = null) => {
  const updates = { rayon_deplacement_km: rayonKm };
  if (localisation) {
    updates.localisation = localisation;
  }
  return upsertPhotographerProfile(userId, updates);
};

/**
 * Update hourly rate
 */
export const updateHourlyRate = async (userId, tarifHoraire) => {
  return upsertPhotographerProfile(userId, { tarif_horaire: tarifHoraire });
};

/**
 * Update bio
 */
export const updateBio = async (userId, bio) => {
  return upsertPhotographerProfile(userId, { bio });
};

/**
 * Add portfolio photo
 */
export const addPortfolioPhoto = async (userId, photoUrl) => {
  try {
    const { data: profile } = await getPhotographerProfile(userId);
    const currentPhotos = profile?.portfolio_photos || [];
    
    return upsertPhotographerProfile(userId, {
      portfolio_photos: [...currentPhotos, photoUrl],
    });
  } catch (error) {
    console.error('Error adding portfolio photo:', error);
    return { data: null, error };
  }
};

/**
 * Remove portfolio photo
 */
export const removePortfolioPhoto = async (userId, photoUrl) => {
  try {
    const { data: profile } = await getPhotographerProfile(userId);
    const currentPhotos = profile?.portfolio_photos || [];
    
    return upsertPhotographerProfile(userId, {
      portfolio_photos: currentPhotos.filter(p => p !== photoUrl),
    });
  } catch (error) {
    console.error('Error removing portfolio photo:', error);
    return { data: null, error };
  }
};

/**
 * Upload portfolio photo to storage
 */
export const uploadPortfolioPhoto = async (userId, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/portfolio/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('portfolio')
      .getPublicUrl(fileName);

    // Add to portfolio_photos array
    await addPortfolioPhoto(userId, urlData.publicUrl);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading portfolio photo:', error);
    return { url: null, error };
  }
};

/**
 * Get profile completion percentage
 */
export const getProfileCompletion = async (userId) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nom, email, telephone, avatar_url')
      .eq('id', userId)
      .single();

    const { data: photographeProfile } = await getPhotographerProfile(userId);

    const fields = [
      { name: 'Nom', value: profile?.nom, weight: 10 },
      { name: 'Email', value: profile?.email, weight: 10 },
      { name: 'Téléphone', value: profile?.telephone, weight: 10 },
      { name: 'Photo de profil', value: profile?.avatar_url, weight: 10 },
      { name: 'Bio', value: photographeProfile?.bio, weight: 15 },
      { name: 'Spécialisations', value: photographeProfile?.specialisations?.length > 0, weight: 15 },
      { name: 'Tarif horaire', value: photographeProfile?.tarif_horaire, weight: 10 },
      { name: 'Zone de déplacement', value: photographeProfile?.rayon_deplacement_km, weight: 10 },
      { name: 'Portfolio', value: photographeProfile?.portfolio_photos?.length > 0, weight: 10 },
    ];

    let completedWeight = 0;
    const missingFields = [];

    fields.forEach(field => {
      if (field.value) {
        completedWeight += field.weight;
      } else {
        missingFields.push(field.name);
      }
    });

    return {
      percentage: completedWeight,
      missingFields,
      isComplete: completedWeight >= 80,
      error: null,
    };
  } catch (error) {
    console.error('Error calculating profile completion:', error);
    return { percentage: 0, missingFields: [], isComplete: false, error };
  }
};

/**
 * Get blocked dates/slots
 */
export const getBlockedSlots = async (photographeId, startDate, endDate) => {
  try {
    let query = supabase
      .from('indisponibilites')
      .select('*')
      .eq('photographe_id', photographeId);

    if (startDate) {
      query = query.gte('date_fin', startDate);
    }
    if (endDate) {
      query = query.lte('date_debut', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching blocked slots:', error);
    return { data: null, error };
  }
};

/**
 * Add blocked slot
 */
export const addBlockedSlot = async (photographeId, dateDebut, dateFin, motif = '') => {
  try {
    const { data, error } = await supabase
      .from('indisponibilites')
      .insert({
        photographe_id: photographeId,
        date_debut: dateDebut,
        date_fin: dateFin,
        motif,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding blocked slot:', error);
    return { data: null, error };
  }
};

/**
 * Remove blocked slot
 */
export const removeBlockedSlot = async (slotId) => {
  try {
    const { error } = await supabase
      .from('indisponibilites')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing blocked slot:', error);
    return { success: false, error };
  }
};

/**
 * Get availability settings
 */
export const getAvailabilitySettings = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', photographeId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching availability settings:', error);
    return { data: null, error };
  }
};

/**
 * Update availability settings
 */
export const updateAvailabilitySettings = async (photographeId, dayOfWeek, settings) => {
  try {
    const { data, error } = await supabase
      .from('provider_availability')
      .upsert({
        provider_id: photographeId,
        day_of_week: dayOfWeek,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'provider_id,day_of_week',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating availability settings:', error);
    return { data: null, error };
  }
};

/**
 * Photographer specializations list
 */
export const SPECIALIZATIONS = [
  'Mariage',
  'Portrait',
  'Événementiel',
  'Corporate',
  'Produit',
  'Immobilier',
  'Famille',
  'Grossesse',
  'Nouveau-né',
  'Animalier',
  'Culinaire',
  'Mode',
  'Sport',
  'Concert',
  'Architecture',
  'Nature',
  'Voyage',
];

export default {
  getPhotographerProfile,
  upsertPhotographerProfile,
  updateSpecializations,
  updateServiceRadius,
  updateHourlyRate,
  updateBio,
  addPortfolioPhoto,
  removePortfolioPhoto,
  uploadPortfolioPhoto,
  getProfileCompletion,
  getBlockedSlots,
  addBlockedSlot,
  removeBlockedSlot,
  getAvailabilitySettings,
  updateAvailabilitySettings,
  SPECIALIZATIONS,
};
