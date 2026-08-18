import { supabase } from './supabaseClient'

/**
 * Availability Service (availabilityService.js)
 * ------------------------------------------------
 * Builds photographer availability from:
 * - availability_rules   (recurring weekly rules: jour_semaine, heure_debut, heure_fin, disponible)
 * - blocked_slots        (one-off unavailability blocks)
 * - reservations         (confirmed bookings -> considered unavailable)
 *
 * Never uses `provider_availability`.
 * Matching uses this single logic to return only compatible photographers.
 */

/**
 * Récupère les règles de disponibilité hebdomadaires d'un photographe
 * (table `availability_rules`).
 */
export async function getAvailabilityRules(photographeId) {
  try {
    const { data, error } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('jour_semaine', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération règles de disponibilité:', error)
    throw error
  }
}

/**
 * Sauvegarde les règles de disponibilité hebdomadaires d'un photographe.
 * Supprime puis réinsère dans une même séquence.
 */
export async function saveAvailabilityRules(photographeId, rules) {
  try {
    // 1. Supprimer les règles actuelles
    const { error: deleteError } = await supabase
      .from('availability_rules')
      .delete()
      .eq('photographe_id', photographeId)

    if (deleteError) throw deleteError

    // 2. Insérer les nouvelles règles
    if (rules.length > 0) {
      const rows = rules.map((rule) => ({
        photographe_id: photographeId,
        jour_semaine: rule.jour_semaine,
        heure_debut: rule.heure_debut,
        heure_fin: rule.heure_fin,
        disponible: rule.disponible ?? true,
      }))

      const { error: insertError } = await supabase
        .from('availability_rules')
        .insert(rows)

      if (insertError) throw insertError
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde règles de disponibilité:', error)
    throw error
  }
}

/**
 * Récupère les créneaux bloqués d'un photographe (`blocked_slots`).
 */
export async function getBlockedSlots(photographeId) {
  try {
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('start_datetime', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération créneaux bloqués:', error)
    throw error
  }
}

/**
 * Crée un créneau bloqué.
 */
export async function createBlockedSlot(photographeId, data) {
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
      .single()

    if (error) throw error
    return slot
  } catch (error) {
    console.error('❌ Erreur création créneau bloqué:', error)
    throw error
  }
}

/**
 * Supprime un créneau bloqué.
 */
export async function deleteBlockedSlot(slotId) {
  try {
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', slotId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Erreur suppression créneau bloqué:', error)
    throw error
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
export async function isPhotographerAvailable(photographeId, start, end) {
  try {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Date de début ou de fin invalide')
    }

    const jourSemaine = startDate.getDay() // 0 = dimanche ... 6 = samedi

    // 1. Vérifier la règle récurrente pour ce jour
    const { data: rules, error: rulesError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('photographe_id', photographeId)
      .eq('jour_semaine', jourSemaine)
      .eq('disponible', true)

    if (rulesError) throw rulesError

    const hasRule = (rules || []).length > 0
    if (!hasRule) {
      return false // Aucune règle active ce jour
    }

    // Vérifier que la plage horaire demandée est couverte par une règle
    const startTime = startDate.toTimeString().slice(0, 5) // HH:MM
    const endTime = endDate.toTimeString().slice(0, 5)

    const ruleCovers = (rules || []).some((rule) => {
      return startTime >= rule.heure_debut && endTime <= rule.heure_fin
    })

    if (!ruleCovers) {
      return false
    }

    // 2. Vérifier les créneaux bloqués
    const { data: blocked, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('photographe_id', photographeId)
      .lte('start_datetime', end)
      .gte('end_datetime', start)

    if (blockedError) throw blockedError

    if (blocked && blocked.length > 0) {
      return false
    }

    // 3. Vérifier les réservations confirmées
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('prestataire_id', photographeId)
      .in('statut', ['confirmed', 'en_cours', 'terminee'])
      .not('date', 'is', null)

    if (reservationsError) throw reservationsError

    if (reservations && reservations.length > 0) {
      const overlap = reservations.some((res) => {
        const resDate = new Date(`${res.date}T${res.heure_debut || '00:00'}`)
        const resEnd = new Date(resDate.getTime() + (res.duree_heures || 0) * 60 * 60 * 1000)
        return resDate < endDate && resEnd > startDate
      })

      if (overlap) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('❌ Erreur vérification disponibilité:', error)
    throw error
  }
}