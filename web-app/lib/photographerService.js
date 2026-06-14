import { supabase } from './supabaseClient';

/**
 * Get photographer's profile
 */
export const getPhotographerProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profils_prestataire')
      .select('*,profile:profiles!profils_prestataire_id_fkey(id, nom, avatar_url, ville, email, created_at)')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer profile:', error);
    return { data: null, error };
  }
};

export const getPhotographerPrice = async (userId) => {
  const { data, error } = await supabase
    .from('profils_prestataire')
    .select('tarif_horaire_min')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data?.tarif_horaire_min ?? null;
};

/**
 * Create or update photographer profile
 */
export const upsertPhotographerProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profils_prestataire')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
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
export const updateServiceRadius = async (userId, rayonKm) => {
  return upsertPhotographerProfile(userId, { rayon_deplacement_km: rayonKm });
};

/**
 * Update hourly rate
 */
export const updateHourlyRate = async (userId, tarifHoraire) => {
  return upsertPhotographerProfile(userId, { tarif_horaire_min: tarifHoraire });
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
      .upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

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
      { name: 'Tarif horaire', value: photographeProfile?.tarif_horaire_min, weight: 10 },
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
      .from('blocked_slots')
      .select('*')
      .eq('prestataire_id', photographeId);

    if (startDate) {
      query = query.gte('end_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('start_datetime', endDate);
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
      .from('blocked_slots')
      .insert({
        prestataire_id: photographeId,
        start_datetime: dateDebut,
        end_datetime: dateFin,
        reason: motif,
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
      .from('blocked_slots')
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
 * Get availability settings (stored in profils_prestataire)
 */
export const getAvailabilitySettings = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('profils_prestataire')
      .select('jours_travailles, horaires_preference, calendrier_disponibilite')
      .eq('id', photographeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching availability settings:', error);
    return { data: null, error };
  }
};

/**
 * Update availability settings (stored in profils_prestataire)
 */
export const updateAvailabilitySettings = async (photographeId, settings) => {
  return upsertPhotographerProfile(photographeId, settings);
};


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
};

