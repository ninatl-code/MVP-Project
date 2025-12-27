import { supabase } from './supabaseClient';

/**
 * Create a review
 */
export const createReview = async ({
  reviewerId,
  revieweeId,
  reservationId,
  note,
  commentaire,
  subRatings = {},
}) => {
  try {
    const { data, error } = await supabase
      .from('avis')
      .insert({
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        reservation_id: reservationId,
        note,
        commentaire,
        ponctualite: subRatings.ponctualite,
        qualite: subRatings.qualite,
        communication: subRatings.communication,
        rapport_qualite_prix: subRatings.rapport_qualite_prix,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update photographer's average rating
    await updatePhotographerRating(revieweeId);

    return { data, error: null };
  } catch (error) {
    console.error('Error creating review:', error);
    return { data: null, error };
  }
};

/**
 * Get reviews for a photographer
 */
export const getPhotographerReviews = async (photographeId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('avis')
      .select(`
        *,
        reviewer:profiles!avis_reviewer_id_fkey(id, nom, avatar_url)
      `)
      .eq('reviewee_id', photographeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching photographer reviews:', error);
    return { data: null, error };
  }
};

/**
 * Get reviews given by a client
 */
export const getClientReviews = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('avis')
      .select(`
        *,
        reviewee:profiles!avis_reviewee_id_fkey(id, nom, avatar_url)
      `)
      .eq('reviewer_id', clientId)
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
      .from('avis')
      .select('id')
      .eq('reviewer_id', reviewerId)
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
 * Get review for a specific reservation
 */
export const getReservationReview = async (reservationId) => {
  try {
    const { data, error } = await supabase
      .from('avis')
      .select(`
        *,
        reviewer:profiles!avis_reviewer_id_fkey(id, nom, avatar_url),
        reviewee:profiles!avis_reviewee_id_fkey(id, nom, avatar_url)
      `)
      .eq('reservation_id', reservationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservation review:', error);
    return { data: null, error };
  }
};

/**
 * Update photographer's average rating
 */
export const updatePhotographerRating = async (photographeId) => {
  try {
    // Calculate average rating
    const { data: reviews, error: reviewError } = await supabase
      .from('avis')
      .select('note, ponctualite, qualite, communication, rapport_qualite_prix')
      .eq('reviewee_id', photographeId);

    if (reviewError) throw reviewError;

    if (!reviews || reviews.length === 0) return { success: true };

    const avgNote = reviews.reduce((sum, r) => sum + r.note, 0) / reviews.length;
    const avgPonctualite = reviews.filter(r => r.ponctualite).reduce((sum, r) => sum + r.ponctualite, 0) / reviews.filter(r => r.ponctualite).length || 0;
    const avgQualite = reviews.filter(r => r.qualite).reduce((sum, r) => sum + r.qualite, 0) / reviews.filter(r => r.qualite).length || 0;
    const avgCommunication = reviews.filter(r => r.communication).reduce((sum, r) => sum + r.communication, 0) / reviews.filter(r => r.communication).length || 0;
    const avgRapportQualitePrix = reviews.filter(r => r.rapport_qualite_prix).reduce((sum, r) => sum + r.rapport_qualite_prix, 0) / reviews.filter(r => r.rapport_qualite_prix).length || 0;

    // Update photographer profile
    const { error: updateError } = await supabase
      .from('profils_photographe')
      .update({
        note_moyenne: Math.round(avgNote * 10) / 10,
        nombre_avis: reviews.length,
        ponctualite_moyenne: Math.round(avgPonctualite * 10) / 10,
        qualite_moyenne: Math.round(avgQualite * 10) / 10,
        communication_moyenne: Math.round(avgCommunication * 10) / 10,
        rapport_qualite_prix_moyenne: Math.round(avgRapportQualitePrix * 10) / 10,
      })
      .eq('user_id', photographeId);

    if (updateError) {
      console.error('Error updating photographer rating:', updateError);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating photographer rating:', error);
    return { success: false, error };
  }
};

/**
 * Get rating statistics for a photographer
 */
export const getPhotographerRatingStats = async (photographeId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('avis')
      .select('note')
      .eq('reviewee_id', photographeId);

    if (error) throw error;

    const stats = {
      total: reviews?.length || 0,
      average: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };

    if (reviews && reviews.length > 0) {
      stats.average = Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / reviews.length) * 10) / 10;
      reviews.forEach(r => {
        const rating = Math.round(r.note);
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
 * Reply to a review (photographer)
 */
export const replyToReview = async (reviewId, photographeId, reply) => {
  try {
    const { data, error } = await supabase
      .from('avis')
      .update({
        reply,
        reply_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('reviewee_id', photographeId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error replying to review:', error);
    return { data: null, error };
  }
};

/**
 * Get pending reviews (completed reservations without reviews)
 */
export const getPendingReviews = async (clientId) => {
  try {
    // Get completed reservations
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        date_prestation,
        prestataire_id,
        profiles!reservations_prestataire_id_fkey(nom, avatar_url)
      `)
      .eq('particulier_id', clientId)
      .eq('status', 'completed');

    if (resError) throw resError;

    // Get existing reviews
    const { data: existingReviews } = await supabase
      .from('avis')
      .select('reservation_id')
      .eq('reviewer_id', clientId);

    const reviewedIds = new Set(existingReviews?.map(r => r.reservation_id) || []);
    
    // Filter out already reviewed reservations
    const pendingReviews = reservations?.filter(r => !reviewedIds.has(r.id)) || [];

    return { data: pendingReviews, error: null };
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return { data: null, error };
  }
};

/**
 * Report a review
 */
export const reportReview = async (reviewId, reporterId, reason) => {
  try {
    const { data, error } = await supabase
      .from('review_reports')
      .insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
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

export default {
  createReview,
  getPhotographerReviews,
  getClientReviews,
  hasReviewed,
  getReservationReview,
  updatePhotographerRating,
  getPhotographerRatingStats,
  replyToReview,
  getPendingReviews,
  reportReview,
  formatStarRating,
};
