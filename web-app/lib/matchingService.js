import { supabase } from './supabaseClient';

// Mapping slug de catégorie (demandes) → label catégorie (profils_prestataire)
const CATEGORIE_SLUG_TO_LABEL = {
  'services-domicile': 'Services à domicile',
  'transport': 'Transport & logistique',
  'digital': 'Services digitaux',
  'education': 'Éducation & coaching',
  'beaute-bien-etre': 'Beauté & Bien-être',
  'evenementiel': 'Événementiel',
};

/**
 * Calculate match score between a demande and a service provider
 * Score is 0-100 based on:
 * - Same speciality (type_prestation vs specialisations) : +50
 * - Same category (categorie slug vs categories)         : +25
 * - Same city                                            : +30
 * - Future service date                                  : +20
 */
export const calculateMatchScore = (demande, photographe) => {
  let score = 0;
  const matchReasons = [];

  // Normalise arrays
  const demandeSpecialties = Array.isArray(demande.type_prestation)
    ? demande.type_prestation.filter(Boolean)
    : (demande.type_prestation ? [demande.type_prestation] : []);

  const prestaSpecialisations = Array.isArray(photographe.specialisations)
    ? photographe.specialisations.filter(Boolean)
    : (photographe.specialisations ? [photographe.specialisations] : []);

  const prestaCategories = Array.isArray(photographe.categories)
    ? photographe.categories.filter(Boolean)
    : (photographe.categories ? [photographe.categories] : []);

  const categorieLabel = CATEGORIE_SLUG_TO_LABEL[demande.categorie] || demande.categorie || '';

  // 1. Specialty exact match: type_prestation vs specialisations
  const matchedSpec = demandeSpecialties.find(s =>
    prestaSpecialisations.some(ps => ps.toLowerCase() === s.toLowerCase())
  );

  // 2. Category match: categorie label vs photographe.categories
  const hasCategoryMatch = categorieLabel && prestaCategories.some(c =>
    c.toLowerCase() === categorieLabel.toLowerCase() ||
    c.toLowerCase().includes(categorieLabel.toLowerCase()) ||
    categorieLabel.toLowerCase().includes(c.toLowerCase())
  );

  // 3. Fallback: specialty name contains/matches category label (e.g. 'Photographe' in 'Événementiel')
  const hasSpecCategoryFallback = !hasCategoryMatch && categorieLabel && prestaSpecialisations.some(ps =>
    ps.toLowerCase().includes(categorieLabel.toLowerCase()) ||
    categorieLabel.toLowerCase().includes(ps.toLowerCase())
  );

  if (matchedSpec) {
    score += 50;
    matchReasons.push(`Même spécialité : ${matchedSpec} (+50%)`);
  } else if (hasCategoryMatch || hasSpecCategoryFallback) {
    score += 25;
    matchReasons.push(`Même catégorie : ${categorieLabel} (+25%)`);
  }

  // 2. City match
  if (demande.ville && photographe.ville) {
    const villesDemande = demande.ville.toLowerCase().trim();
    const villesPresta = photographe.ville.toLowerCase().trim();

    if (villesDemande === villesPresta) {
      score += 30;
      matchReasons.push(`Même lieu : ${demande.ville} (+30%)`);
    } else if (
      villesPresta.includes(villesDemande) ||
      villesDemande.includes(villesPresta)
    ) {
      score += 15;
      matchReasons.push('Lieu proche (+15%)');
    }
  }

  // 3. Future service date
  if (demande.date_souhaitee) {
    const dateService = new Date(demande.date_souhaitee);
    if (dateService >= new Date()) {
      score += 20;
      matchReasons.push(
        `Date disponible : ${dateService.toLocaleDateString('fr-FR')} (+20%)`
      );
    }
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
    // Get service provider profile (profils_prestataire: specialisations, categories, ville absente ici)
    const [{ data: photographe, error: profError }, { data: profileBase }] = await Promise.all([
      supabase.from('profils_prestataire').select('*').eq('id', photographeId).single(),
      supabase.from('profiles').select('ville').eq('id', photographeId).single(),
    ]);

    if (profError) {
      console.warn('No service provider profile found');
    }

    // Merge ville from profiles into the photographe object
    const photographeWithVille = photographe
      ? { ...photographe, ville: profileBase?.ville || photographe.ville || null }
      : null;

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

    if (!photographeWithVille) {
      return { matches: [], photographe: null, error: null };
    }

    // Calculate scores — keep only non-expired demandes with score >= 55, sorted desc
    const now = new Date();
    const matchedDemandes = demandes
      .filter(d => !d.date_souhaitee || new Date(d.date_souhaitee) >= now)
      .map(demande => {
        const { score, matchReasons } = calculateMatchScore(demande, photographeWithVille);
        return { ...demande, matchScore: score, matchReasons };
      })
      .filter(d => d.matchScore >= 55)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { matches: matchedDemandes, photographe: photographeWithVille, error: null };
  } catch (error) {
    console.error('Error finding matching demandes:', error);
    return { matches: [], photographe: null, error };
  }
};

/**
 * Compute scores for all prestataires against a given demande and persist to matchings table.
 * Called when a demande is created or updated by a client.
 */
export const computeAndSaveMatchesForDemande = async (demandeId, demandeData) => {
  try {
    // Fetch all prestataire profiles
    const { data: prestataires, error: prestError } = await supabase
      .from('profils_prestataire')
      .select('id, specialisations, categories, ville');
    if (prestError) throw prestError;
    if (!prestataires || prestataires.length === 0) return { error: null };

    // Fetch villes from profiles table (ville is stored there)
    const prestaIds = prestataires.map(p => p.id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, ville')
      .in('id', prestaIds);
    const villeMap = {};
    (profilesData || []).forEach(p => { villeMap[p.id] = p.ville; });

    // Score each prestataire
    const scored = prestataires.map(p => {
      const prestaWithVille = { ...p, ville: villeMap[p.id] || p.ville || null };
      const { score, matchReasons } = calculateMatchScore(demandeData, prestaWithVille);
      return { prestataire_id: p.id, score, matchReasons };
    }).filter(m => m.score >= 55);

    if (scored.length === 0) return { error: null };

    // Upsert into matchings
    const { error: upsertError } = await supabase
      .from('matchings')
      .upsert(
        scored.map(m => ({
          demande_id: demandeId,
          prestataire_id: m.prestataire_id,
          match_score: m.score,
          match_reasons: m.matchReasons,
          status: 'pending',
        })),
        { onConflict: 'demande_id,prestataire_id' }
      );
    if (upsertError) throw upsertError;

    // Send notifications for score >= 80 (avoid duplicates)
    const topMatches = scored.filter(m => m.score >= 80);
    if (topMatches.length > 0) {
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('demande_id', demandeId)
        .eq('type', 'mission_suggeree')
        .in('user_id', topMatches.map(m => m.prestataire_id));
      const alreadyNotified = new Set((existingNotifs || []).map(n => n.user_id));
      const newNotifs = topMatches.filter(m => !alreadyNotified.has(m.prestataire_id));
      if (newNotifs.length > 0) {
        await supabase.from('notifications').insert(
          newNotifs.map(m => ({
            user_id: m.prestataire_id,
            type: 'mission_suggeree',
            titre: 'Nouvelle mission suggérée',
            contenu: `Une demande correspond à votre profil : "${demandeData.titre || demandeData.categorie || 'Prestation'}"`,
            demande_id: demandeId,
            lu: false,
          }))
        );
      }
    }

    return { error: null };
  } catch (error) {
    console.error('Error computing matches for demande:', error);
    return { error };
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
