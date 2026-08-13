import { supabase } from './supabaseClient';
import { sendPushNotification } from './notificationService';
import { DemandeClient } from './demandeService';

/**
 * Service de matching entre demandes clients et photographes
 * Algorithme de scoring 0-100% avec critères knockout
 */

interface ProfilPhotographe {
  id: string;
  nom_entreprise?: string;
  specialisations: string[];
  rayon_deplacement_km: number;
  tarif_horaire_min?: number;
  statut_validation: string;
  disponibilite: { weekdays: boolean; weekends: boolean; evenings: boolean };
  // Ces champs viennent de profiles (jointe via id), pas de profils_prestataire
  ville?: string;
  code_postal?: string;
  latitude?: number;
  longitude?: number;
}

interface MatchResult {
  photographe: ProfilPhotographe;
  score: number;
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
 * Vérifier si deux codes postaux sont dans le même département ou départements limitrophes
 */
function isInProximity(cp1: string, cp2: string): boolean {
  const dept1 = cp1.substring(0, 2);
  const dept2 = cp2.substring(0, 2);

  // Même département
  if (dept1 === dept2) return true;

  // Départements limitrophes (simplification - à améliorer avec vraie logique)
  const dept1Num = parseInt(dept1, 10);
  const dept2Num = parseInt(dept2, 10);
  return Math.abs(dept1Num - dept2Num) <= 1;
}

/**
 * Calculer un score de correspondance entre une demande et un photographe
 */
export function calculateMatchScore(
  demande: DemandeClient,
  photographe: ProfilPhotographe
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Spécialisation (40 points)
  if (photographe.specialisations.includes(demande.categorie)) {
    score += 40;
    reasons.push(`Spécialisé en ${demande.categorie}`);
  }

  // 2. Localisation (30 points)
  if (demande.lieu_latitude && demande.lieu_longitude && photographe.latitude && photographe.longitude) {
    const distance = calculateDistance(
      photographe.latitude,
      photographe.longitude,
      demande.lieu_latitude,
      demande.lieu_longitude
    );

    if (distance <= photographe.rayon_deplacement_km) {
      const proximityScore = Math.max(0, 30 - (distance / photographe.rayon_deplacement_km) * 30);
      score += proximityScore;
      reasons.push(`À ${Math.round(distance)} km (rayon: ${photographe.rayon_deplacement_km} km)`);
    }
  } else if (isInProximity(photographe.code_postal, demande.lieu_code_postal)) {
    score += 20;
    reasons.push('Zone géographique proche');
  }

  // 3. Budget (20 points)
  if (demande.budget_max && photographe.tarif_horaire_min) {
    if (demande.budget_max >= photographe.tarif_horaire_min) {
      const budgetRatio = demande.budget_max / photographe.tarif_horaire_min;
      const budgetScore = Math.min(20, budgetRatio * 10);
      score += budgetScore;
      reasons.push('Budget compatible');
    } else {
      reasons.push('Budget insuffisant');
    }
  } else if (!photographe.tarif_horaire_min) {
    score += 15;
    reasons.push('Budget non spécifié (flexible)');
  }

  // 4. Statut de vérification (10 points)
  if (photographe.statut_validation === 'valide') {
    score += 10;
    reasons.push('Profil vérifié');
  } else if (photographe.statut_validation === 'en_attente') {
    score += 5;
    reasons.push('Vérification en cours');
  }

  return { score, reasons };
}

/**
 * Trouver les photographes correspondant à une demande
 */
export async function findMatchingPhotographes(
  demande: DemandeClient,
  minScore: number = 40
): Promise<MatchResult[]> {
  try {
    // Récupérer tous les photographes actifs et disponibles (ville/code_postal/latitude/
    // longitude vivent sur profiles, le reste sur profils_prestataire)
    const { data: photographes, error } = await supabase
      .from('profils_prestataire')
      .select('*, profiles!inner(ville, code_postal, latitude, longitude)')
      .in('statut_validation', ['valide', 'en_attente']);

    if (error) throw error;

    if (!photographes || photographes.length === 0) {
      console.log('⚠️ Aucun photographe disponible');
      return [];
    }

    const photographesFlat = photographes.map((p: any) => ({
      ...p,
      ville: p.profiles?.ville,
      code_postal: p.profiles?.code_postal,
      latitude: p.profiles?.latitude,
      longitude: p.profiles?.longitude,
    }));

    // Calculer le score de correspondance pour chaque photographe
    const matches: MatchResult[] = photographesFlat
      .map((photographe) => {
        const { score, reasons } = calculateMatchScore(demande, photographe);
        return {
          photographe,
          score,
          reasons,
        };
      })
      .filter((match) => match.score >= minScore)
      .sort((a, b) => b.score - a.score);

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
    // Trouver les photographes correspondants
    const matches = await findMatchingPhotographes(demande);

    if (matches.length === 0) {
      console.log('⚠️ Aucun photographe à notifier');
      return 0;
    }

    // Limiter le nombre de photographes notifiés
    const photographesToNotify = matches.slice(0, maxPhotographes);
    let notifiedCount = 0;

    // Envoyer une notification à chaque photographe
    for (const match of photographesToNotify) {
      try {
        // Envoyer une notification push
        await sendPushNotification(match.photographe.id, {
          title: '📸 Nouvelle demande correspondant à votre profil',
          body: `${demande.titre} - ${demande.lieu_ville} (Score: ${Math.round(match.score)}%)`,
          data: {
            type: 'new_demande',
            demandeId: demande.id,
            score: match.score,
          },
        });

        // Créer une notification dans la base de données
        await supabase.from('notifications').insert({
          user_id: match.photographe.id,
          type: 'new_demande',
          titre: 'Nouvelle demande',
          contenu: `${demande.titre} - ${demande.lieu_ville}`,
          lien: `/photographe/demandes/${demande.id}`,
          metadata: {
            demande_id: demande.id,
            score: match.score,
            reasons: match.reasons,
          },
        });

        // Ajouter le photographe à la liste des notifiés
        const currentNotifies = demande.photographes_notifies || [];
        if (!currentNotifies.includes(match.photographe.id)) {
          await supabase
            .from('demandes_client')
            .update({
              photographes_notifies: [...currentNotifies, match.photographe.id],
            })
            .eq('id', demande.id);
        }

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
    // Récupérer le profil du photographe (ville/code_postal/lat/long viennent de profiles)
    const { data: photographeRaw, error: photographeError } = await supabase
      .from('profils_prestataire')
      .select('*, profiles!inner(ville, code_postal, latitude, longitude)')
      .eq('id', photographeId)
      .single();

    if (photographeError) throw photographeError;
    if (!photographeRaw) throw new Error('Profil photographe non trouvé');

    const photographe: ProfilPhotographe = {
      ...photographeRaw,
      ville: photographeRaw.profiles?.ville,
      code_postal: photographeRaw.profiles?.code_postal,
      latitude: photographeRaw.profiles?.latitude,
      longitude: photographeRaw.profiles?.longitude,
    };

    // Récupérer les demandes ouvertes non expirées
    const { data: demandes, error: demandesError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte')
      .gt('date_expiration', new Date().toISOString());

    if (demandesError) throw demandesError;

    if (!demandes || demandes.length === 0) {
      return [];
    }

    // Filtrer les demandes où le photographe a déjà envoyé un devis
    const demandesSansDevis = demandes.filter(
      (demande) => !demande.photographes_interesses?.includes(photographeId)
    );

    // Calculer le score pour chaque demande
    const matches: MatchResult[] = demandesSansDevis
      .map((demande) => {
        const { score, reasons } = calculateMatchScore(demande, photographe);
        return {
          photographe,
          score,
          reasons,
        };
      })
      .filter((match) => match.score >= 40)
      .sort((a, b) => b.score - a.score);

    return matches;
  } catch (error: any) {
    console.error('❌ Erreur récupération demandes recommandées:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des demandes recommandées');
  }
}

/**
 * Vérifier la disponibilité d'un photographe pour une date donnée
 */
export async function checkPhotographeAvailability(
  photographeId: string,
  date: string,
  heureDebut?: string,
  dureeHeures?: number
): Promise<boolean> {
  try {
    // Récupérer le profil photographe (disponibilité générale)
    const { data: profil, error: profilError } = await supabase
      .from('profils_prestataire')
      .select('disponibilite')
      .eq('id', photographeId)
      .single();

    if (profilError) throw profilError;

    // Vérifier la disponibilité générale (semaine/weekend/soirée)
    if (profil.disponibilite && profil.disponibilite.weekdays === false && profil.disponibilite.weekends === false) {
      return false;
    }

    // Vérifier les créneaux bloqués (table dédiée blocked_slots)
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('start_datetime, end_datetime')
      .eq('prestataire_id', photographeId);

    if (blockedError) throw blockedError;

    if (blockedSlots && blockedSlots.length > 0) {
      const requestDate = new Date(date);
      const isBlocked = blockedSlots.some((slot) => {
        const slotStart = new Date(slot.start_datetime);
        const slotEnd = new Date(slot.end_datetime);
        return requestDate >= slotStart && requestDate <= slotEnd;
      });

      if (isBlocked) {
        return false;
      }
    }

    // Vérifier les réservations existantes
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('date, heure_debut, duree_heures')
      .eq('prestataire_id', photographeId)
      .eq('date', date)
      .in('statut', ['confirmed', 'pending']);

    if (reservationsError) throw reservationsError;

    if (reservations && reservations.length > 0 && heureDebut) {
      // Vérifier les conflits horaires
      // TODO: Implémenter logique de vérification des chevauchements d'horaires
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('❌ Erreur vérification disponibilité:', error);
    return false;
  }
}
