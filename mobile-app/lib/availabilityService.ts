import { supabase } from './supabaseClient';

/**
 * Availability Service (availabilityService.ts)
 * ------------------------------------------------
 * Builds photographer availability from:
 * - availability_rules   (recurring weekly rules: jour_semaine, heure_debut, heure_fin, disponible)
 * - blocked_slots        (one-off unavailability blocks)
 * - reservations         (confirmed bookings -> considered unavailable)
 *
 * Never uses `provider_availability`.
 * For reservations, historical FKs are preserved and photo fields are exposed:
 * type_evenement_id, nombre_personnes, contract, prestation states, external delivery.
 */

export interface AvailabilityRule {
  id: string;
  photographe_id: string;
  jour_semaine: number; // 0 = dimanche ... 6 = samedi
  heure_debut: string;
  heure_fin: string;
  disponible: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BlockedSlot {
  id: string;
  photographe_id: string;
  start_datetime: string;
  end_datetime: string;
  motif?: string;
  created_at?: string;
}

/**
 * Récupère les règles de disponibilité hebdomadaires d'un photographe
 * (table `availability_rules`).
 */
export async function getAvailabilityRules(photographeId: string): Promise<AvailabilityRule[]> {
  try {
    const { data, error } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('jour_semaine', { ascending: true });

    if (error) throw error;
    return (data || []) as AvailabilityRule[];
  } catch (error: any) {
    console.error('❌ Erreur récupération règles de disponibilité:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des règles de disponibilité');
  }
}

/**
 * Sauvegarde les règles de disponibilité hebdomadaires d'un photographe.
 * Supprime puis réinsère dans une même séquence.
 */
export async function saveAvailabilityRules(
  photographeId: string,
  rules: Array<Omit<AvailabilityRule, 'id' | 'photographe_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  try {
    // 1. Supprimer les règles actuelles
    const { error: deleteError } = await supabase
      .from('availability_rules')
      .delete()
      .eq('photographe_id', photographeId);

    if (deleteError) throw deleteError;

    // 2. Insérer les nouvelles règles
    if (rules.length > 0) {
      const rows = rules.map((rule) => ({
        photographe_id: photographeId,
        jour_semaine: rule.jour_semaine,
        heure_debut: rule.heure_debut,
        heure_fin: rule.heure_fin,
        disponible: rule.disponible ?? true,
      }));

      const { error: insertError } = await supabase
        .from('availability_rules')
        .insert(rows);

      if (insertError) throw insertError;
    }
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde règles de disponibilité:', error);
    throw new Error(error.message || 'Erreur lors de la sauvegarde des règles de disponibilité');
  }
}

/**
 * Récupère les créneaux bloqués d'un photographe (`blocked_slots`).
 */
export async function getBlockedSlots(photographeId: string): Promise<BlockedSlot[]> {
  try {
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('start_datetime', { ascending: true });

    if (error) throw error;
    return (data || []) as BlockedSlot[];
  } catch (error: any) {
    console.error('❌ Erreur récupération créneaux bloqués:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des créneaux bloqués');
  }
}

/**
 * Crée un créneau bloqué.
 */
export async function createBlockedSlot(
  photographeId: string,
  data: { start_datetime: string; end_datetime: string; motif?: string }
): Promise<BlockedSlot> {
  try {
    const { data: slot, error } = await supabase
      .from('blocked_slots')
      .insert({
        photographe_id: photographeId,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        motif: data.motif || null,
      })
      .select()
      .single();

    if (error) throw error;
    return slot as BlockedSlot;
  } catch (error: any) {
    console.error('❌ Erreur création créneau bloqué:', error);
    throw new Error(error.message || 'Erreur lors de la création du créneau bloqué');
  }
}

/**
 * Supprime un créneau bloqué.
 */
export async function deleteBlockedSlot(slotId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression créneau bloqué:', error);
    throw new Error(error.message || 'Erreur lors de la suppression du créneau bloqué');
  }
}

/**
 * Vérifie si un photographe est disponible pour une période donnée.
 * Vérifie : règle récurrente, chevauchement blocked_slots, chevauchement réservations confirmées.
 *
 * @param photographeId ID du photographe
 * @param start Date/heure de début ISO
 * @param end Date/heure de fin ISO
 */
export async function isPhotographerAvailable(
  photographeId: string,
  start: string,
  end: string
): Promise<boolean> {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Date de début ou de fin invalide');
    }

    const jourSemaine = startDate.getDay(); // 0 = dimanche ... 6 = samedi

    // 1. Vérifier la règle récurrente pour ce jour
    const { data: rules, error: rulesError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('photographe_id', photographeId)
      .eq('jour_semaine', jourSemaine)
      .eq('disponible', true);

    if (rulesError) throw rulesError;

    const hasRule = (rules || []).length > 0;
    if (!hasRule) {
      return false; // Aucune règle active ce jour
    }

    // Vérifier que la plage horaire demandée est couverte par une règle
    const startTime = startDate.toTimeString().slice(0, 5); // HH:MM
    const endTime = endDate.toTimeString().slice(0, 5);

    const ruleCovers = (rules || []).some((rule) => {
      const ruleStart = rule.heure_debut;
      const ruleEnd = rule.heure_fin;
      return startTime >= ruleStart && endTime <= ruleEnd;
    });

    if (!ruleCovers) {
      return false;
    }

    // 2. Vérifier les créneaux bloqués
    const { data: blocked, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('photographe_id', photographeId)
      .lte('start_datetime', end)
      .gte('end_datetime', start);

    if (blockedError) throw blockedError;

    if (blocked && blocked.length > 0) {
      return false;
    }

    // 3. Vérifier les réservations confirmées
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('prestataire_id', photographeId)
      .in('statut', ['confirmed', 'en_cours', 'terminee'])
      .not('date', 'is', null);

    if (reservationsError) throw reservationsError;

    if (reservations && reservations.length > 0) {
      const overlap = reservations.some((res: any) => {
        const resDate = new Date(`${res.date}T${res.heure_debut || '00:00'}`);
        const resEnd = new Date(resDate.getTime() + (res.duree_heures || 0) * 60 * 60 * 1000);
        return resDate < endDate && resEnd > startDate;
      });

      if (overlap) {
        return false;
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Erreur vérification disponibilité:', error);
    throw new Error(error.message || 'Erreur lors de la vérification de la disponibilité');
  }
}