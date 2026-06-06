import { supabase } from './supabaseClient';

/**
 * SCORE MATCHING RULES (max 100):
 * +55 → même spécialité (obligatoire, sans ça score = 0)
 * +35 → même ville
 * +10 → disponible à la date souhaitée
 *
 * Seuil insertion  : score >= 55
 * Seuil notif      : score >= 90 (sans doublon)
 */

// ─────────────────────────────────────────────────────────
// SCORE CALCULATION
// ─────────────────────────────────────────────────────────
export const calculateMatchScore = (demande, prestataire, isAvailable = true) => {
  let score = 0;
  const matchReasons = [];

  const rawSpecs = Array.isArray(demande.type_prestation)
    ? demande.type_prestation.filter(Boolean)
    : demande.type_prestation ? [demande.type_prestation] : [];
  // Fallback sur categorie si type_prestation est vide
  const demandeSpecs = rawSpecs.length > 0
    ? rawSpecs
    : demande.categorie ? [demande.categorie] : [];

  const prestaSpecs = Array.isArray(prestataire.specialisations)
    ? prestataire.specialisations.filter(Boolean)
    : prestataire.specialisations ? [prestataire.specialisations] : [];

  // 1. Même spécialité (+55) — obligatoire
  // Comparaison flexible : égalité exacte OU inclusion partielle (insensible à la casse)
  const matchedSpec = demandeSpecs.find(spec =>
    prestaSpecs.some(ps =>
      ps.toLowerCase() === spec.toLowerCase() ||
      ps.toLowerCase().includes(spec.toLowerCase()) ||
      spec.toLowerCase().includes(ps.toLowerCase())
    )
  );

  if (!matchedSpec) return { score: 0, matchReasons: [] };

  score += 55;
  matchReasons.push(`Même spécialité : ${matchedSpec} (+55)`);

  // 2. Même ville (+35)
  if (demande.ville && prestataire.ville) {
    if (demande.ville.toLowerCase().trim() === prestataire.ville.toLowerCase().trim()) {
      score += 35;
      matchReasons.push(`Même ville : ${demande.ville} (+35)`);
    }
  }

  // 3. Disponible à la date (+10)
  if (isAvailable && demande.date_souhaitee && new Date(demande.date_souhaitee) >= new Date()) {
    score += 10;
    matchReasons.push(`Disponible à la date souhaitée (+10)`);
  }

  return { score: Math.min(score, 100), matchReasons };
};

// ─────────────────────────────────────────────────────────
// COULEUR SCORE UI
// ─────────────────────────────────────────────────────────
export const getMatchScoreColor = (score) => {
  if (score >= 90) return 'green';
  if (score >= 65) return 'orange';
  return 'gray';
};

// ─────────────────────────────────────────────────────────
// AVAILABILITY CHECK
// ─────────────────────────────────────────────────────────
export const checkPhotographerAvailability = async (photographeId, date) => {
  if (!date) return { isAvailable: false };
  try {
    const [{ data: blockedSlots }, { data: reservations }] = await Promise.all([
      supabase
        .from('blocked_slots')
        .select('id')
        .eq('prestataire_id', photographeId)
        .lte('start_datetime', date)
        .gte('end_datetime', date),
      supabase
        .from('reservations')
        .select('id')
        .eq('prestataire_id', photographeId)
        .eq('date', date)
        .in('statut', ['confirmee', 'pending', 'en_attente']),
    ]);
    return { isAvailable: !blockedSlots?.length && !reservations?.length };
  } catch {
    return { isAvailable: false };
  }
};

// ─────────────────────────────────────────────────────────
// TRIGGER : NOUVELLE DEMANDE
// Filtre prestataires par spécialité → calcul score → insert si ≥ 55
// Notification si score ≥ 90
// ─────────────────────────────────────────────────────────
export const onNewDemande = async (demandeId, demandeData) => {
  try {
    // Récupère la demande complète depuis la BDD si les champs clés manquent
    let demande = demandeData;
    if (!demande.type_prestation && !demande.categorie) {
      const { data } = await supabase.from('demandes_client').select('*').eq('id', demandeId).single();
      if (data) demande = data;
    }

    // Fetch tous les prestataires actifs (ville est dans profiles, pas profils_prestataire)
    const { data: prestataires, error: prestError } = await supabase
      .from('profils_prestataire')
      .select('id, specialisations');

    if (prestError) { console.error('[onNewDemande] fetch prestataires:', prestError); throw prestError; }
    if (!prestataires?.length) return { error: null };

    // Récupère les villes depuis profiles
    const { data: profilesVille } = await supabase
      .from('profiles')
      .select('id, ville')
      .in('id', prestataires.map(p => p.id));
    const villeMap = Object.fromEntries((profilesVille || []).map(p => [p.id, p.ville]));

    // Calcul scores
    const scored = await Promise.all(
      prestataires.map(async (p) => {
        const { isAvailable } = await checkPhotographerAvailability(p.id, demande.date_souhaitee);
        const { score, matchReasons } = calculateMatchScore(
          demande,
          { ...p, ville: villeMap[p.id] || p.ville || null },
          isAvailable
        );
        return { prestataire_id: p.id, score, matchReasons };
      })
    );

    const toInsert = scored.filter(m => m.score >= 55);
    console.log(`[onNewDemande] ${prestataires.length} prestataires, ${toInsert.length} matches ≥55`);
    if (!toInsert.length) return { error: null };

    // Supprime les anciens matchings pour cette demande puis réinsère
    await supabase.from('matchings').delete().eq('demande_id', demandeId);

    const { error: insertError } = await supabase.from('matchings').insert(
      toInsert.map(m => ({
        demande_id: demandeId,
        prestataire_id: m.prestataire_id,
        match_score: m.score,
        match_reasons: m.matchReasons,
        status: 'pending',
      }))
    );
    if (insertError) { console.error('[onNewDemande] insert matchings:', insertError); throw insertError; }

    // Notification si score ≥ 90 (sans doublon)
    await Promise.all(
      toInsert
        .filter(m => m.score >= 90)
        .map(async (m) => {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', m.prestataire_id)
            .eq('type', 'mission_suggeree')
            .eq('demande_id', demandeId)
            .maybeSingle();
          if (existing) return;
          await supabase.from('notifications').insert({
            user_id: m.prestataire_id,
            type: 'mission_suggeree',
            titre: '🔥 Nouvelle demande qualifiée',
            contenu: 'Une nouvelle demande correspond à votre profil.',
            demande_id: demandeId,
            lu: false,
          });
        })
    );

    return { error: null };
  } catch (error) {
    console.error('[onNewDemande]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// TRIGGER : MODIFICATION DEMANDE
// Recalcul seulement si type / ville / date change
// Supprime anciens matchings → recalcul → réinsère si ≥ 55
// ─────────────────────────────────────────────────────────
export const onUpdateDemande = async (demandeId, oldData, newData) => {
  const changed =
    JSON.stringify(oldData.type_prestation) !== JSON.stringify(newData.type_prestation) ||
    oldData.ville !== newData.ville ||
    oldData.date_souhaitee !== newData.date_souhaitee;

  if (!changed) return { error: null };

  try {
    // Supprime anciens matchings
    await supabase.from('matchings').delete().eq('demande_id', demandeId);

    // Réinsère avec nouvelles données
    return await onNewDemande(demandeId, newData);
  } catch (error) {
    console.error('[onUpdateDemande]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// TRIGGER : NOUVEAU PRESTATAIRE
// Filtre demandes par spécialité → calcul score → insert si ≥ 55
// Notification si score ≥ 90
// ─────────────────────────────────────────────────────────
export const onNewPrestataire = async (prestataireId, prestataireData) => {
  try {
    const specs = Array.isArray(prestataireData.specialisations)
      ? prestataireData.specialisations.filter(Boolean)
      : prestataireData.specialisations ? [prestataireData.specialisations] : [];

    if (!specs.length) return { error: null };

    // Récupère la ville depuis profiles si pas fournie
    let ville = prestataireData.ville;
    if (!ville) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ville')
        .eq('id', prestataireId)
        .maybeSingle();
      ville = profile?.ville || null;
    }

    const prestaWithVille = { ...prestataireData, ville };

    // Filtre demandes ouvertes (le scoring JS gère le filtre par spécialité)
    const { data: demandes, error: demandeError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte');

    if (demandeError) throw demandeError;
    if (!demandes?.length) return { error: null };

    const now = new Date();
    const scored = await Promise.all(
      demandes
        .filter(d => !d.date_souhaitee || new Date(d.date_souhaitee) >= now)
        .map(async (d) => {
          const { isAvailable } = await checkPhotographerAvailability(prestataireId, d.date_souhaitee);
          const { score, matchReasons } = calculateMatchScore(d, prestaWithVille, isAvailable);
          return { demande_id: d.id, demande: d, score, matchReasons };
        })
    );

    const toInsert = scored.filter(m => m.score >= 55);
    if (!toInsert.length) return { error: null };

    // Supprime les anciens matchings pour ce prestataire puis réinsère
    await supabase.from('matchings').delete().eq('prestataire_id', prestataireId);

    const { error: insertError } = await supabase.from('matchings').insert(
      toInsert.map(m => ({
        demande_id: m.demande_id,
        prestataire_id: prestataireId,
        match_score: m.score,
        match_reasons: m.matchReasons,
        status: 'pending',
      }))
    );
    if (insertError) { console.error('[onNewPrestataire] insert matchings:', insertError); throw insertError; }

    // Notification si score ≥ 90 (sans doublon)
    const top = toInsert.filter(m => m.score >= 90);
    if (top.length) {
      const { data: alreadySent } = await supabase
        .from('notifications')
        .select('demande_id')
        .eq('user_id', prestataireId)
        .eq('type', 'mission_suggeree')
        .in('demande_id', top.map(m => m.demande_id));
      const notified = new Set((alreadySent || []).map(n => n.demande_id));
      await Promise.all(
        top
          .filter(m => !notified.has(m.demande_id))
          .map(m => supabase.from('notifications').insert({
            user_id: prestataireId,
            type: 'mission_suggeree',
            titre: '🔥 Nouvelle demande qualifiée',
            contenu: 'Une nouvelle demande correspond à votre profil.',
            demande_id: m.demande_id,
            lu: false,
          }))
      );
    }

    return { error: null };
  } catch (error) {
    console.error('[onNewPrestataire]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// TRIGGER : MODIFICATION PRESTATAIRE
// Recalcul seulement si spécialités ou ville changent
// Supprime anciens matchings → recalcul → réinsère si ≥ 55
// ─────────────────────────────────────────────────────────
export const onUpdatePrestataire = async (prestataireId, oldData, newData) => {
  const changed =
    JSON.stringify(oldData.specialisations) !== JSON.stringify(newData.specialisations) ||
    oldData.ville !== newData.ville;

  if (!changed) return { error: null };

  try {
    // Supprime anciens matchings
    await supabase.from('matchings').delete().eq('prestataire_id', prestataireId);

    // Réinsère avec nouvelles données
    return await onNewPrestataire(prestataireId, newData);
  } catch (error) {
    console.error('[onUpdatePrestataire]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// FIND MATCHES FOR CLIENT  (lecture seule, affichage)
// ─────────────────────────────────────────────────────────
export const findMatchingPhotographers = async (demandeId, limit = 10) => {
  try {
    const { data: demande, error: demandeError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', demandeId)
      .single();

    if (demandeError) throw demandeError;

    const specs = Array.isArray(demande.type_prestation)
      ? demande.type_prestation.filter(Boolean)
      : demande.type_prestation ? [demande.type_prestation] : [];

    if (!specs.length) return { matches: [], demande, error: null };

    const { data: photographers, error: photoError } = await supabase
      .from('profiles')
      .select(`
        id, nom, email, avatar_url, ville,
        profils_prestataire(
          specialisations, rayon_deplacement_km,
          tarif_horaire_min, identite_verifiee,
          note_moyenne, nb_avis, portfolio_photos
        )
      `)
      .eq('role', 'photographe')
      .not('profils_prestataire', 'is', null);

    if (photoError) throw photoError;

    const matched = await Promise.all(
      photographers
        .filter(p => p.profils_prestataire)
        .map(async (p) => {
          const { isAvailable } = await checkPhotographerAvailability(p.id, demande.date_souhaitee);
          const { score, matchReasons } = calculateMatchScore(
            demande,
            { ...p.profils_prestataire, ville: p.ville },
            isAvailable
          );
          return { ...p, matchScore: score, matchReasons };
        })
    );

    const result = matched
      .filter(p => p.matchScore >= 55)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { matches: result, demande, error: null };
  } catch (error) {
    console.error('[findMatchingPhotographers]', error);
    return { matches: [], demande: null, error };
  }
};

// ─────────────────────────────────────────────────────────
// FIND MATCHES FOR PRESTATAIRE  (lecture seule, affichage)
// ─────────────────────────────────────────────────────────
export const findMatchingDemandes = async (photographeId, limit = 20) => {
  try {
    const [{ data: photographe }, { data: profileBase }] = await Promise.all([
      supabase.from('profils_prestataire').select('*').eq('id', photographeId).single(),
      supabase.from('profiles').select('ville').eq('id', photographeId).single(),
    ]);

    if (!photographe) return { matches: [], photographe: null, error: null };

    const photographeWithVille = { ...photographe, ville: profileBase?.ville || photographe.ville || null };

    const specs = Array.isArray(photographe.specialisations)
      ? photographe.specialisations.filter(Boolean)
      : [];

    if (!specs.length) return { matches: [], photographe: photographeWithVille, error: null };

    const { data: demandes, error: demandeError } = await supabase
      .from('demandes_client')
      .select(`*, profiles!demandes_client_client_id_fkey(nom, avatar_url)`)
      .eq('statut', 'ouverte')
      .overlaps('type_prestation', specs)
      .order('created_at', { ascending: false });

    if (demandeError) throw demandeError;

    const now = new Date();
    const matched = await Promise.all(
      (demandes || [])
        .filter(d => !d.date_souhaitee || new Date(d.date_souhaitee) >= now)
        .map(async (d) => {
          const { isAvailable } = await checkPhotographerAvailability(photographeId, d.date_souhaitee);
          const { score, matchReasons } = calculateMatchScore(d, photographeWithVille, isAvailable);
          return { ...d, matchScore: score, matchReasons };
        })
    );

    const result = matched
      .filter(d => d.matchScore >= 55)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { matches: result, photographe: photographeWithVille, error: null };
  } catch (error) {
    console.error('[findMatchingDemandes]', error);
    return { matches: [], photographe: null, error };
  }
};

// ─────────────────────────────────────────────────────────
// COMPUTE + SAVE MATCHES FOR DEMANDE  (alias → onNewDemande)
// ─────────────────────────────────────────────────────────
export const computeAndSaveMatchesForDemande = (demandeId, demandeData) =>
  onNewDemande(demandeId, demandeData);

// ─────────────────────────────────────────────────────────
// SAVE SINGLE MATCH
// ─────────────────────────────────────────────────────────
export const saveMatch = async ({ demandeId, photographeId, matchScore, matchReasons }) => {
  try {
    const { data, error } = await supabase
      .from('matchings')
      .upsert(
        { demande_id: demandeId, prestataire_id: photographeId, match_score: matchScore, match_reasons: matchReasons, status: 'pending' },
        { onConflict: 'demande_id,prestataire_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[saveMatch]', error);
    return { data: null, error };
  }
};

// ─────────────────────────────────────────────────────────
// GET MATCHES FOR PRESTATAIRE
// ─────────────────────────────────────────────────────────
export const getPhotographerMatches = async (photographeId, status = null) => {
  try {
    let query = supabase
      .from('matchings')
      .select(`*, demandes_client(*)`)
      .eq('prestataire_id', photographeId)
      .order('match_score', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[getPhotographerMatches]', error);
    return { data: null, error };
  }
};

// ─────────────────────────────────────────────────────────
// UPDATE MATCH STATUS
// ─────────────────────────────────────────────────────────
export const updateMatchStatus = async (matchId, status) => {
  try {
    const { data, error } = await supabase
      .from('matchings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', matchId)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[updateMatchStatus]', error);
    return { data: null, error };
  }
};

export default {
  calculateMatchScore,
  findMatchingPhotographers,
  findMatchingDemandes,
  computeAndSaveMatchesForDemande,
  onNewDemande,
  onUpdateDemande,
  onNewPrestataire,
  onUpdatePrestataire,
  saveMatch,
  getPhotographerMatches,
  updateMatchStatus,
  checkPhotographerAvailability,
  getMatchScoreColor,
};