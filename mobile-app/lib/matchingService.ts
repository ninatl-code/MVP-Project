import { supabase } from './supabaseClient';
import { sendPushNotification } from './notificationService';
import { DemandeClient } from './demandeService';
import { isPhotographerAvailable } from './availabilityService';

/**
 * Photographer Matching Service (matchingService.ts)
 * --------------------------------------------------
 * Scores photographers against client photo requests.
 *
 * Scoring components stored on `matchings`:
 * - score_style          (photographer styles match the requested style_photo_id)
 * - score_budget         (client budget covers the photographer's prix_minimum)
 * - score_distance       (Haversine distance between photographer and event)
 * - score_disponibilite  (availability_rules + blocked_slots + confirmed reservations)
 * - match_score          (weighted total, descending)
 *
 * Professional profiles are read from `photographe` (never `profils_prestataire`).
 */

export interface PhotographeMatching {
  id: string;
  nom_entreprise?: string;
  prix_minimum?: number;
  rayon_deplacement_km?: number;
  statut_validation?: string;
  styleIds: string[];
  // Depuis profiles (jointe par id)
  ville?: string;
  latitude?: number;
  longitude?: number;
}

export interface MatchResult {
  photographe: any;
  match_score: number;
  score_style: number;
  score_budget: number;
  score_distance: number;
  score_disponibilite: number;
  distance_km: number;
  disponible_date: string | null;
  reasons: string[];
}

/**
 * Calculer la distance entre deux points géographiques (formule de Haversine)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculer le score de correspondance entre une demande et un photographe.
 * Décompose le score en composantes (style, budget, distance, disponibilité).
 */
export function calculateMatchScore(
  demande: DemandeClient,
  photographe: PhotographeMatching
): {
  match_score: number;
  score_style: number;
  score_budget: number;
  score_distance: number;
  score_disponibilite: number;
  distance_km: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score_style = 0;
  let score_budget = 0;
  let score_distance = 0;
  let score_disponibilite = 0;
  let distance_km = 0;

  // 1. Style (30 points) — correspondance sur style_photo_id
  if (demande.style_photo_id) {
    if (photographe.styleIds.includes(demande.style_photo_id)) {
      score_style = 30;
      reasons.push('Style photo compatible');
    } else {
      reasons.push('Style photo non compatible');
    }
  } else {
    score_style = 15; // Pas de style demandé → neutre
    reasons.push('Style non spécifié');
  }

  // 2. Budget (25 points) — budget_max couvre prix_minimum
  if (demande.budget_max && photographe.prix_minimum != null) {
    if (demande.budget_max >= photographe.prix_minimum) {
      const budgetRatio = demande.budget_max / Math.max(photographe.prix_minimum, 1);
      score_budget = Math.min(25, Math.round(budgetRatio * 12));
      reasons.push('Budget compatible');
    } else {
      score_budget = 0;
      reasons.push('Budget insuffisant');
    }
  } else if (photographe.prix_minimum == null) {
    score_budget = 15;
    reasons.push('Tarif non spécifié (flexible)');
  }

  // 3. Distance (25 points) — calcul Haversine entre photographe et événement
  if (
    photographe.latitude != null &&
    photographe.longitude != null &&
    demande.latitude_evenement != null &&
    demande.longitude_evenement != null
  ) {
    distance_km = calculateDistance(
      photographe.latitude,
      photographe.longitude,
      demande.latitude_evenement,
      demande.longitude_evenement
    );
    const rayon = photographe.rayon_deplacement_km || 50;
    if (distance_km <= rayon) {
      score_distance = Math.max(10, 25 - Math.floor(distance_km / 5));
      reasons.push(`Distance ${Math.round(distance_km)} km`);
    } else {
      score_distance = 0;
      reasons.push('Hors zone de déplacement');
    }
  } else {
    score_distance = 15;
    reasons.push('Distance à confirmer');
  }

  // 4. Statut de vérification (20 points restants pour match_score global)
  let verification = 0;
  if (photographe.statut_validation === 'valide') {
    verification = 20;
    reasons.push('Profil vérifié');
  } else if (photographe.statut_validation === 'en_attente') {
    verification = 10;
    reasons.push('Vérification en cours');
  }

  const match_score = Math.min(100, score_style + score_budget + score_distance + verification);

  return {
    match_score,
    score_style,
    score_budget,
    score_distance,
    score_disponibilite,
    distance_km: Math.round(distance_km * 10) / 10,
    reasons,
  };
}

/**
 * Récupère les photographes actifs (profil `photographe` + styles + données publiques `profiles`).
 */
async function fetchPhotographesCompatibles(): Promise<PhotographeMatching[]> {
  const { data: photographes, error } = await supabase
    .from('photographe')
    .select('*, profiles!inner(ville, latitude, longitude)');

  if (error) throw error;

  if (!photographes || photographes.length === 0) {
    return [];
  }

  // Charger les styles de chaque photographe (table de liaison photographe_styles)
  const photographeIds = photographes.map((p: any) => p.id);
  const { data: stylesLinks, error: stylesError } = await supabase
    .from('photographe_styles')
    .select('photographe_id, style_id')
    .in('photographe_id', photographeIds);

  if (stylesError) throw stylesError;

  const stylesByPhotographe: Record<string, string[]> = {};
  (stylesLinks || []).forEach((link: any) => {
    if (!stylesByPhotographe[link.photographe_id]) {
      stylesByPhotographe[link.photographe_id] = [];
    }
    stylesByPhotographe[link.photographe_id].push(link.style_id);
  });

  return photographes.map((p: any) => ({
    id: p.id,
    nom_entreprise: p.entreprise,
    prix_minimum: p.prix_minimum,
    rayon_deplacement_km: p.rayon_deplacement_km,
    statut_validation: p.statut_validation,
    styleIds: stylesByPhotographe[p.id] || [],
    ville: p.profiles?.ville,
    latitude: p.profiles?.latitude,
    longitude: p.profiles?.longitude,
  }));
}

/**
 * Trouver les photographes correspondant à une demande.
 * Retourne uniquement les photographes compatibles, classés par match_score décroissant.
 */
export async function findMatchingPhotographes(
  demande: DemandeClient,
  minScore: number = 40
): Promise<MatchResult[]> {
  try {
    const photographes = await fetchPhotographesCompatibles();

    if (photographes.length === 0) {
      console.log('⚠️ Aucun photographe disponible');
      return [];
    }

    // Filtrer les styles incompatibles si un style est requis
    let candidats = photographes;
    if (demande.style_photo_id) {
      candidats = photographes.filter((p) => p.styleIds.includes(demande.style_photo_id!));
    }

    // Calculer le score pour chaque photographe compatible
    const matches: MatchResult[] = [];

    for (const photographe of candidats) {
      const scores = calculateMatchScore(demande, photographe);

      if (scores.match_score < minScore) continue;

      // Vérifier la disponibilité pour la date souhaitée
      let disponible_date: string | null = null;
      let score_disponibilite = scores.score_disponibilite;

      if (demande.date_souhaitee) {
        const start = new Date(`${demande.date_souhaitee}T09:00:00`);
        const end = new Date(start.getTime() + (demande.duree_estimee_heures || 4) * 60 * 60 * 1000);

        try {
          const available = await isPhotographerAvailable(
            photographe.id,
            start.toISOString(),
            end.toISOString()
          );
          if (available) {
            score_disponibilite = 20;
            disponible_date = demande.date_souhaitee;
          } else {
            score_disponibilite = 0;
          }
        } catch (error) {
          score_disponibilite = 10; // indéterminé → neutre
        }
      }

      const finalScore = Math.min(100, scores.match_score + score_disponibilite);

      matches.push({
        photographe,
        match_score: finalScore,
        score_style: scores.score_style,
        score_budget: scores.score_budget,
        score_distance: scores.score_distance,
        score_disponibilite: score_disponibilite === 20 ? 20 : 0,
        distance_km: scores.distance_km,
        disponible_date,
        reasons: scores.reasons,
      });
    }

    // Classer par match_score décroissant
    matches.sort((a, b) => b.match_score - a.match_score);

    console.log(`✅ ${matches.length} photographes trouvés pour la demande ${demande.id}`);
    return matches;
  } catch (error: any) {
    console.error('❌ Erreur recherche photographes:', error);
    throw new Error(error.message || 'Erreur lors de la recherche des photographes');
  }
}

/**
 * Notifier les photographes correspondants d'une nouvelle demande
 */
export async function notifyMatchingPhotographes(
  demande: DemandeClient,
  maxPhotographes: number = 10
): Promise<number> {
  try {
    const matches = await findMatchingPhotographes(demande);

    if (matches.length === 0) {
      console.log('⚠️ Aucun photographe à notifier');
      return 0;
    }

    const photographesToNotify = matches.slice(0, maxPhotographes);
    let notifiedCount = 0;

    // Enregistrer les matchings en base
    const matchingRows = matches.map((m) => ({
      demande_id: demande.id,
      prestataire_id: m.photographe.id,
      match_score: m.match_score,
      score_style: m.score_style,
      score_budget: m.score_budget,
      score_distance: m.score_distance,
      score_disponibilite: m.score_disponibilite,
      distance_km: m.distance_km,
      disponible_date: m.disponible_date,
      statut: 'propose',
    }));

    const { error: insertError } = await supabase.from('matchings').insert(matchingRows);
    if (insertError) {
      console.error('❌ Erreur insertion matchings:', insertError);
    }

    for (const match of photographesToNotify) {
      try {
        await sendPushNotification(match.photographe.id, {
          title: '📸 Nouvelle demande correspondant à votre profil',
          body: `Nouvelle demande photo (Score: ${Math.round(match.match_score)}%)`,
          data: {
            type: 'new_demande',
            demandeId: demande.id,
            score: match.match_score,
          },
        });

        await supabase.from('notifications').insert({
          user_id: match.photographe.id,
          type: 'new_demande',
          titre: 'Nouvelle demande',
          contenu: `Nouvelle demande de photographie - ${demande.ville || demande.lieu || ''}`,
          demande_id: demande.id,
          prestataire_id: match.photographe.id,
        });

        notifiedCount++;
      } catch (notifError) {
        console.error(`❌ Erreur notification photographe ${match.photographe.id}:`, notifError);
      }
    }

    console.log(`✅ ${notifiedCount} photographes notifiés`);
    return notifiedCount;
  } catch (error: any) {
    console.error('❌ Erreur notification photographes:', error);
    throw new Error(error.message || 'Erreur lors de la notification des photographes');
  }
}

/**
 * Obtenir les demandes recommandées pour un photographe
 */
export async function getRecommendedDemandesForPhotographe(
  photographeId: string
): Promise<MatchResult[]> {
  try {
    // Récupérer le profil du photographe
    const { data: photographeRaw, error: photographeError } = await supabase
      .from('photographe')
      .select('*, profiles!inner(ville, latitude, longitude)')
      .eq('id', photographeId)
      .single();

    if (photographeError) throw photographeError;
    if (!photographeRaw) throw new Error('Profil photographe non trouvé');

    // Récupérer les styles du photographe
    const { data: stylesLinks, error: stylesError } = await supabase
      .from('photographe_styles')
      .select('style_id')
      .eq('photographe_id', photographeId);

    if (stylesError) throw stylesError;

    const photographe: PhotographeMatching = {
      id: photographeRaw.id,
      nom_entreprise: photographeRaw.entreprise,
      prix_minimum: photographeRaw.prix_minimum,
      rayon_deplacement_km: photographeRaw.rayon_deplacement_km,
      statut_validation: photographeRaw.statut_validation,
      styleIds: (stylesLinks || []).map((link: any) => link.style_id),
      ville: photographeRaw.profiles?.ville,
      latitude: photographeRaw.profiles?.latitude,
      longitude: photographeRaw.profiles?.longitude,
    };

    // Récupérer les demandes ouvertes non expirées
    const { data: demandes, error: demandesError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte')
      .gt('date_expiration', new Date().toISOString().split('T')[0]);

    if (demandesError) throw demandesError;

    if (!demandes || demandes.length === 0) {
      return [];
    }

    // Filtrer les demandes où le photographe a déjà envoyé un devis
    const { data: devisExistants } = await supabase
      .from('devis')
      .select('demande_id')
      .eq('prestataire_id', photographeId);

    const demandesAvecDevis = new Set((devisExistants || []).map((d: any) => d.demande_id));
    const demandesSansDevis = demandes.filter((demande) => !demandesAvecDevis.has(demande.id));

    const matches: MatchResult[] = [];

    for (const demande of demandesSansDevis) {
      if (demande.style_photo_id && !photographe.styleIds.includes(demande.style_photo_id)) {
        continue; // Style incompatible → exclu
      }

      const scores = calculateMatchScore(demande, photographe);

      if (scores.match_score < 40) continue;

      let disponible_date: string | null = null;
      if (demande.date_souhaitee) {
        const start = new Date(`${demande.date_souhaitee}T09:00:00`);
        const end = new Date(start.getTime() + (demande.duree_estimee_heures || 4) * 60 * 60 * 1000);

        try {
          const available = await isPhotographerAvailable(photographeId, start.toISOString(), end.toISOString());
          if (available) {
            disponible_date = demande.date_souhaitee;
          }
        } catch (error) {
          // disponibilité indéterminée → la demande reste proposée
        }
      }

      matches.push({
        photographe,
        match_score: scores.match_score + (disponible_date ? 20 : 0),
        score_style: scores.score_style,
        score_budget: scores.score_budget,
        score_distance: scores.score_distance,
        score_disponibilite: disponible_date ? 20 : 0,
        distance_km: scores.distance_km,
        disponible_date,
        reasons: scores.reasons,
      });
    }

    matches.sort((a, b) => b.match_score - a.match_score);
    return matches;
  } catch (error: any) {
    console.error('❌ Erreur récupération demandes recommandées:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des demandes recommandées');
  }
}

/**
 * Vérifier la disponibilité d'un photographe pour une date donnée.
 * Utilise availability_rules + blocked_slots + réservations confirmées.
 */
export async function checkPhotographeAvailability(
  photographeId: string,
  date: string,
  heureDebut?: string,
  dureeHeures?: number
): Promise<boolean> {
  try {
    const start = new Date(`${date}T${heureDebut || '09:00'}:00`);
    const hours = dureeHeures || 4;
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    return await isPhotographerAvailable(photographeId, start.toISOString(), end.toISOString());
  } catch (error: any) {
    console.error('❌ Erreur vérification disponibilité:', error);
    return false;
  }
}