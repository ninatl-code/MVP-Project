import { supabase } from './supabaseClient'

/**
 * Event Service (eventService.js)
 * -------------------------------
 * Handles event-day operations for a reservation:
 * - event_program_items    (program timeline, ordered by `ordre`)
 * - event_priority_photos  (important shots, TEXT instructions only — never files)
 * - reservation_changes    (audit trail of important modifications)
 * - arrival & photos-ready markers on `reservations`
 *
 * Every important change (date, time, address, duration, people, program)
 * writes a `reservation_changes` entry and triggers the corresponding notification.
 * No media is ever uploaded here.
 */

/**
 * Récupère le déroulé événement (programme) d'une réservation, ordonné par `ordre`.
 */
export async function getEventProgram(reservationId) {
  try {
    const { data, error } = await supabase
      .from('event_program_items')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('ordre', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération programme événement:', error)
    throw error
  }
}

/**
 * Ajoute un item au déroulé événement.
 */
export async function createEventProgramItem(data) {
  try {
    const { data: item, error } = await supabase
      .from('event_program_items')
      .insert({
        reservation_id: data.reservation_id,
        ordre: data.ordre,
        heure_debut: data.heure_debut || null,
        heure_fin: data.heure_fin || null,
        titre: data.titre,
        description: data.description || null,
        creer_par: data.creer_par,
      })
      .select()
      .single()

    if (error) throw error

    // Enregistrer le changement
    await recordReservationChange({
      reservation_id: data.reservation_id,
      type_changement: 'programme_ajout',
      description: `Ajout au programme : ${data.titre}`,
      auteur_id: '',
      auteur_role: data.creer_par,
      nouveau_valeurs: { titre: data.titre, ordre: data.ordre },
    })

    return item
  } catch (error) {
    console.error('❌ Erreur ajout programme événement:', error)
    throw error
  }
}

/**
 * Met à jour un item du déroulé événement.
 */
export async function updateEventProgramItem(itemId, updates) {
  try {
    const { data: item, error } = await supabase
      .from('event_program_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return item
  } catch (error) {
    console.error('❌ Erreur mise à jour programme événement:', error)
    throw error
  }
}

/**
 * Supprime un item du déroulé événement.
 */
export async function deleteEventProgramItem(itemId) {
  try {
    const { error } = await supabase
      .from('event_program_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Erreur suppression programme événement:', error)
    throw error
  }
}

/**
 * Récupère les prises de vue importantes (consignes textuelles uniquement).
 */
export async function getEventPriorityPhotos(reservationId) {
  try {
    const { data, error } = await supabase
      .from('event_priority_photos')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('ordre', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération prises de vue importantes:', error)
    throw error
  }
}

/**
 * Ajoute une consigne de prise de vue importante (texte uniquement, jamais de fichier).
 */
export async function createEventPriorityPhoto(data) {
  try {
    const { data: photo, error } = await supabase
      .from('event_priority_photos')
      .insert({
        reservation_id: data.reservation_id,
        consigne: data.consigne,
        ordre: data.ordre ?? 0,
      })
      .select()
      .single()

    if (error) throw error
    return photo
  } catch (error) {
    console.error('❌ Erreur ajout prise de vue importante:', error)
    throw error
  }
}

/**
 * Supprime une consigne de prise de vue importante.
 */
export async function deleteEventPriorityPhoto(photoId) {
  try {
    const { error } = await supabase
      .from('event_priority_photos')
      .delete()
      .eq('id', photoId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Erreur suppression prise de vue importante:', error)
    throw error
  }
}

/**
 * Enregistre une modification importante de réservation dans `reservation_changes`
 * puis déclenche la notification correspondante.
 */
export async function recordReservationChange(data) {
  try {
    const { data: change, error } = await supabase
      .from('reservation_changes')
      .insert({
        reservation_id: data.reservation_id,
        type_changement: data.type_changement,
        description: data.description,
        auteur_id: data.auteur_id || '',
        auteur_role: data.auteur_role,
        nouveau_valeurs: data.nouveau_valeurs || null,
        ancien_valeurs: data.ancien_valeurs || null,
      })
      .select()
      .single()

    if (error) throw error

    // Déclencher la notification correspondante
    await supabase.from('notifications').insert({
      type: 'reservation_modifiee',
      titre: 'Réservation modifiée',
      contenu: data.description,
      reservation_id: data.reservation_id,
      user_id: null,
    })

    return change
  } catch (error) {
    console.error('❌ Erreur enregistrement changement réservation:', error)
    throw error
  }
}

/**
 * Marque l'arrivée du photographe sur place :
 * renseigne `arrive_sur_place_at` et passe `statut_prestation` à 'photographe_arrive'.
 */
export async function markPhotographerArrived(reservationId) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        arrive_sur_place_at: new Date().toISOString(),
        statut_prestation: 'photographe_arrive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)

    if (error) throw error

    await recordReservationChange({
      reservation_id: reservationId,
      type_changement: 'arrivee_photographe',
      description: 'Le photographe est arrivé sur place',
      auteur_id: '',
      auteur_role: 'photographe',
    })
  } catch (error) {
    console.error('❌ Erreur arrivée photographe:', error)
    throw error
  }
}

/**
 * Marque les photos comme prêtes :
 * renseigne `photos_pretes_at` puis crée une notification client.
 * NE téléverse AUCUN média.
 */
export async function markPhotosAvailable(reservationId, clientId) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        photos_pretes_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)

    if (error) throw error

    // Notification client
    await supabase.from('notifications').insert({
      type: 'photos_disponibles',
      titre: 'Vos photos sont prêtes !',
      contenu: 'Le photographe a partagé vos photos. Retrouvez le lien de livraison externe dans votre réservation.',
      reservation_id: reservationId,
      user_id: clientId || null,
    })

    await recordReservationChange({
      reservation_id: reservationId,
      type_changement: 'photos_pretes',
      description: 'Les photos sont prêtes et disponibles',
      auteur_id: '',
      auteur_role: 'photographe',
    })
  } catch (error) {
    console.error('❌ Erreur marquage photos disponibles:', error)
    throw error
  }
}