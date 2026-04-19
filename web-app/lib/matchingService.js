import { supabase } from './supabaseClient';

/**
 * Calculate match score between a demande and a service provider
 * Score is 0-100 based on:
 * - Specialization match (40 pts)
 * - City match (30 pts)
 * - Budget compatibility (20 pts)
 * - Verification status (10 pts)
 * - Bonus: high rating (+5 pts)
 */
export const calculateMatchScore = (demande, photographe) => {
  let score = 0;
  const matchReasons = [];

  // 1. Specialization match (40 points)
  if (photographe.specialisations && demande.categorie) {
    const specialisations = Array.isArray(photographe.specialisations)
      ? photographe.specialisations
      : [photographe.specialisations];

    if (specialisations.includes(demande.categorie)) {
      score += 40;
      matchReasons.push('Spécialité correspondante');
    } else if (specialisations.some(s => s.toLowerCase().includes(demande.categorie.toLowerCase()))) {
      score += 20;
      matchReasons.push('Spécialité similaire');
    }
  }

  // 2. City match (30 points) — based on demande.ville only
  if (demande.ville && photographe.ville) {
    const villesDemande = demande.ville.toLowerCase().trim();
    const villesPresta = photographe.ville.toLowerCase().trim();

    if (villesDemande === villesPresta) {
      score += 30;
      matchReasons.push(`Même ville (${demande.ville})`);
    } else if (
      villesPresta.includes(villesDemande) ||
      villesDemande.includes(villesPresta)
    ) {
      // Partial match (e.g. "Grand Casablanca" vs "Casablanca")
      score += 15;
      matchReasons.push('Ville proche');
    }
  } else if (!photographe.ville) {
    // Prestataire sans ville renseignée — score neutre
    score += 10;
  }

  // 3. Budget compatibility (20 points)
  if (photographe.tarif_horaire_min && demande.budget_max) {
    const estimatedCost = photographe.tarif_horaire_min * (demande.duree_estimee_heures || 2);

    if (estimatedCost <= demande.budget_max) {
      score += 20;
      matchReasons.push('Budget compatible');
    } else if (estimatedCost <= demande.budget_max * 1.2) {
      score += 10;
      matchReasons.push('Budget légèrement au-dessus');
    }
  } else if (!photographe.tarif_horaire_min) {
    score += 15;
    matchReasons.push('Tarif flexible');
  }

  // 4. Verification status (10 points)
  if (photographe.identite_verifiee) {
    score += 10;
    matchReasons.push('Prestataire vérifié');
  }

  // Bonus: High rating
  if (photographe.note_moyenne && photographe.note_moyenne >= 4.5) {
    score += 5;
    matchReasons.push('Excellentes notes');
  }

  return {
    score: Math.min(score, 100),
    matchReasons,
  };
};

/**
 * Find matching service providers for a demande
 */
export const findMatchingPhotographers = async (demandeId, limit = 10) => {
  try {
    // Get demande details
    const { data: demande, error: demandeError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', demandeId)
      .single();

    if (demandeError) throw demandeError;

    // Get all available service providers
    const { data: photographers, error: photoError } = await supabase
      .from('profiles')
      .select(`
        id,
        nom,
        email,
        avatar_url,
        profils_prestataire(
          specialisations,
          rayon_deplacement_km,
          tarif_horaire_min,
          identite_verifiee,
          note_moyenne,
          nb_avis,
          portfolio_photos
        )
      `)
      .eq('role', 'photographe');

    if (photoError) throw photoError;

    // Calculate scores and sort
    const matchedPhotographers = photographers
      .filter(p => p.profils_prestataire)
      .map(p => {
        const { score, matchReasons } = calculateMatchScore(
          demande,
          p.profils_prestataire
        );
        return {
          ...p,
          matchScore: score,
          matchReasons,
        };
      })
      .filter(p => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { matches: matchedPhotographers, demande, error: null };
  } catch (error) {
    console.error('Error finding matching service providers:', error);
    return { matches: [], demande: null, error };
  }
};

/**
 * Get matching demandes for a service provider
 */
export const findMatchingDemandes = async (photographeId, limit = 20) => {
  try {
    // Get service provider profile
    const { data: photographe, error: profError } = await supabase
      .from('profils_prestataire')
      .select('*')
      .eq('id', photographeId)
      .single();

    if (profError) {
      console.warn('No service provider profile found');
    }

    // Get active demandes
    const { data: demandes, error: demandeError } = await supabase
      .from('demandes_client')
      .select(`
        *,
        profiles!demandes_client_client_id_fkey(nom, avatar_url)
      `)
      .eq('statut', 'ouverte')
      .order('created_at', { ascending: false });

    if (demandeError) throw demandeError;

    if (!photographe) {
      // Return all active demandes without scoring
      return { matches: demandes || [], photographe: null, error: null };
    }

    // Calculate scores
    const matchedDemandes = demandes
      .map(demande => {
        const { score, matchReasons } = calculateMatchScore(demande, photographe);
        return {
          ...demande,
          matchScore: score,
          matchReasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { matches: matchedDemandes, photographe, error: null };
  } catch (error) {
    console.error('Error finding matching demandes:', error);
    return { matches: [], photographe: null, error };
  }
};

/**
 * Save a match record
 */
export const saveMatch = async ({
  demandeId,
  photographeId,
  matchScore,
  matchReasons,
}) => {
  try {
    const { data, error } = await supabase
      .from('matchings')
      .upsert({
        demande_id: demandeId,
        prestataire_id: photographeId,
        match_score: matchScore,
        match_reasons: matchReasons,
        status: 'pending',
      }, {
        onConflict: 'demande_id,prestataire_id',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving match:', error);
    return { data: null, error };
  }
};

/**
 * Get service provider's matches
 */
export const getPhotographerMatches = async (photographeId, status = null) => {
  try {
    let query = supabase
      .from('matchings')
      .select(`
        *,
        demandes_client(*)
      `)
      .eq('prestataire_id', photographeId)
      .order('match_score', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching service provider matches:', error);
    return { data: null, error };
  }
};

/**
 * Update match status
 */
export const updateMatchStatus = async (matchId, status) => {
  try {
    const { data, error } = await supabase
      .from('matchings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating match status:', error);
    return { data: null, error };
  }
};

/**
 * Check service provider availability for a date
 */
export const checkPhotographerAvailability = async (photographeId, date) => {
  try {
    // Check blocked slots
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('prestataire_id', photographeId)
      .lte('start_datetime', date)
      .gte('end_datetime', date);

    if (blockedError) throw blockedError;

    // Check existing reservations
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .eq('prestataire_id', photographeId)
      .eq('date', date)
      .in('statut', ['confirme', 'pending']);

    if (resError) throw resError;

    const isAvailable = (!blockedSlots || blockedSlots.length === 0) && 
                       (!reservations || reservations.length === 0);

    return { 
      isAvailable, 
      blockedSlots: blockedSlots || [],
      reservations: reservations || [],
      error: null 
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { isAvailable: false, blockedSlots: [], reservations: [], error };
  }
};

export default {
  calculateMatchScore,
  findMatchingPhotographers,
  findMatchingDemandes,
  saveMatch,
  getPhotographerMatches,
  updateMatchStatus,
  checkPhotographerAvailability,
};
