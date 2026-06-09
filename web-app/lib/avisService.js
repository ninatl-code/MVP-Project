import { supabase } from './supabaseClient';

/**
 * Create a review
 * reviews_presta: id, prestataire_id, client_id, matching_id, rating, comment
 */
export const createReview = async ({
  reviewerId,
  revieweeId,
  reservationId = null,
  note,
  commentaire,
  demandeId = null
}) => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .insert({
        client_id: reviewerId,
        prestataire_id: revieweeId,
        reservation_id: reservationId,
        rating: note,
        comment: commentaire,
        demande_id: demandeId
      })
      .select()
      .single();

    if (error) throw error;

    // Update service provider's average rating
    await updatePhotographerRating(revieweeId);

    return { data, error: null };
  } catch (error) {
    console.error('Error creating review:', error);
    return { data: null, error };
  }
};

/**
 * Get reviews for a service provider
 */
export const getPhotographerReviews = async (photographeId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .select(`
        *,
        client:profiles!reviews_presta_client_id_fkey(id,nom, avatar_url)
      `)
      .eq('prestataire_id', photographeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching service provider reviews:', error);
    return { data: null, error };
  }
};

export const getReservationReviews = async (reservationId,prestataireId,single=false) => {
  try {
    let query = supabase
      .from('reviews_presta')
      .select('id, rating, comment, created_at')
      .eq('reservation_id', reservationId)
      .eq('prestataire_id', prestataireId)
      .order('created_at', { ascending: false });

    if (single) {
      query = query.maybeSingle();
    }
    const {data, error} = await query ;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
/**
 * Get reviews given by a client
 */
export const getClientReviews = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .select(`
        *,
        prestataire:profiles!reviews_presta_prestataire_id_fkey(id, nom, avatar_url)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching client reviews:', error);
    return { data: null, error };
  }
};

/**
 * Check if user has already reviewed a reservation
 */
export const hasReviewed = async (reviewerId, reservationId) => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .select('id')
      .eq('client_id', reviewerId)
      .eq('reservation_id', reservationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { hasReviewed: !!data, error: null };
  } catch (error) {
    console.error('Error checking review:', error);
    return { hasReviewed: false, error };
  }
};

/**
 * Update service provider's average rating in profils_prestataire
 */
export const updatePhotographerRating = async (photographeId) => {
  try {
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews_presta')
      .select('rating')
      .eq('prestataire_id', photographeId);

    if (reviewError) throw reviewError;

    if (!reviews || reviews.length === 0) return { success: true };

    const avgNote = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const { error: updateError } = await supabase
      .from('profils_prestataire')
      .update({
        note_moyenne: Math.round(avgNote * 10) / 10,
        nb_avis: reviews.length,
      })
      .eq('id', photographeId);

    if (updateError) {
      console.error('Error updating service provider rating:', updateError);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating service provider rating:', error);
    return { success: false, error };
  }
};

/**
 * Get rating statistics for a service provider
 */
export const getPhotographerRatingStats = async (photographeId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews_presta')
      .select('rating')
      .eq('prestataire_id', photographeId);

    if (error) throw error;

    const stats = {
      total: reviews?.length || 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (reviews && reviews.length > 0) {
      stats.average = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
      reviews.forEach(r => {
        const rating = Math.round(r.rating);
        if (rating >= 1 && rating <= 5) {
          stats.distribution[rating]++;
        }
      });
    }

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching rating stats:', error);
    return { stats: null, error };
  }
};

/**
 * Get review statistics from the statistiques_avis view
 */
export const getStatistiquesAvis = async (prestataire_id) => {
  try {
    const { data, error } = await supabase
      .from('statistiques_avis')
      .select('*')
      .eq('prestataire_id', prestataire_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching statistiques_avis:', error);
    return { data: null, error };
  }
};

/**
 * Get pending reviews (completed reservations without reviews for this client/prestataire pair)
 */
export const getPendingReviews = async (clientId) => {
  try {
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        date,
        prestataire_id,
        profiles!reservations_prestataire_id_fkey(nom, avatar_url)
      `)
      .eq('client_id', clientId)
      .eq('statut', 'completed');

    if (resError) throw resError;

    const { data: existingReviews } = await supabase
      .from('reviews_presta')
      .select('prestataire_id')
      .eq('client_id', clientId);

    const reviewedPrestataires = new Set(existingReviews?.map(r => r.prestataire_id) || []);
    const pendingReviews = reservations?.filter(r => !reviewedPrestataires.has(r.prestataire_id)) || [];

    return { data: pendingReviews, error: null };
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return { data: null, error };
  }
};

/**
 * Format star rating display
 */
export const formatStarRating = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return {
    full: fullStars,
    half: hasHalfStar,
    empty: emptyStars,
  };
};

/**
 * Report a review as inappropriate
 */
export const reportReview = async (reviewId, reporterId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .update({ reported: true, report_reason: reason, reported_by: reporterId, reported_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error reporting review:', error);
    return { data: null, error };
  }
};

/**
 * Reply to a review (prestataire response)
 */
export const replyToReview = async (reviewId, reply) => {
  try {
    const { data, error } = await supabase
      .from('reviews_presta')
      .update({ reponse_prestataire: reply, date_reponse: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error replying to review:', error);
    return { data: null, error };
  }
};

export default {
  createReview,
  getPhotographerReviews,
  getClientReviews,
  hasReviewed,
  updatePhotographerRating,
  getPhotographerRatingStats,
  replyToReview,
  getPendingReviews,
  reportReview,
  formatStarRating,
};
