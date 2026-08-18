import { supabase } from './supabaseClient';

/**
 * Event Service (eventService.ts)
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

export interface EventProgramItem {
  id: string;
  reservation_id: string;
  ordre: number;
  heure_debut?: string;
  heure_fin?: string;
  titre: string;
  description?: string;
  creer_par: 'client' | 'photographe';
  created_at?: string;
  updated_at?: string;
}

export interface EventPriorityPhoto {
  id: string;
  reservation_id: string;
  consigne: string;
  ordre: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationChange {
  id: string;
  reservation_id: string;
  type_changement: string;
  description: string;
  auteur_id: string;
  auteur_role: 'client' | 'photographe' | 'admin';
  nouveau_valeurs?: any;
  ancien_valeurs?: any;
  created_at?: string;
}

/**
 * Récupère le déroulé événement (programme) d'une réservation, ordonné par `ordre`.
 */
export async function getEventProgram(reservationId: string): Promise<EventProgramItem[]> {
  try {
    const { data, error } = await supabase
      .from('event_program_items')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as EventProgramItem[];
  } catch (error: any) {
    console.error('❌ Erreur récupération programme événement:', error);
    throw new Error(error.message || 'Erreur lors de la récupération du programme');
  }
}

/**
 * Ajoute un item au déroulé événement.
 */
export async function createEventProgramItem(
  data: Omit<EventProgramItem, 'id' | 'created_at' | 'updated_at'>
): Promise<EventProgramItem> {
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
      .single();

    if (error) throw error;

    // Enregistrer le changement
    await recordReservationChange({
      reservation_id: data.reservation_id,
      type_changement: 'programme_ajout',
      description: `Ajout au programme : ${data.titre}`,
      auteur_id: data.creer_par === 'client' ? '' : '',
      auteur_role: data.creer_par,
      nouveau_valeurs: { titre: data.titre, ordre: data.ordre },
    });

    return item as EventProgramItem;
  } catch (error: any) {
    console.error('❌ Erreur ajout programme événement:', error);
    throw new Error(error.message || 'Erreur lors de l\'ajout au programme');
  }
}

/**
 * Met à jour un item du déroulé événement.
 */
export async function updateEventProgramItem(
  itemId: string,
  updates: Partial<EventProgramItem>
): Promise<EventProgramItem> {
  try {
    const { data: item, error } = await supabase
      .from('event_program_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return item as EventProgramItem;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour programme événement:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour du programme');
  }
}

/**
 * Supprime un item du déroulé événement.
 */
export async function deleteEventProgramItem(itemId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('event_program_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression programme événement:', error);
    throw new Error(error.message || 'Erreur lors de la suppression du programme');
  }
}

/**
 * Récupère les prises de vue importantes (consignes textuelles uniquement).
 */
export async function getEventPriorityPhotos(reservationId: string): Promise<EventPriorityPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('event_priority_photos')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as EventPriorityPhoto[];
  } catch (error: any) {
    console.error('❌ Erreur récupération prises de vue importantes:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des prises de vue importantes');
  }
}

/**
 * Ajoute une consigne de prise de vue importante (texte uniquement, jamais de fichier).
 */
export async function createEventPriorityPhoto(
  data: { reservation_id: string; consigne: string; ordre?: number; creer_par?: 'client' | 'photographe' }
): Promise<EventPriorityPhoto> {
  try {
    const { data: photo, error } = await supabase
      .from('event_priority_photos')
      .insert({
        reservation_id: data.reservation_id,
        consigne: data.consigne,
        ordre: data.ordre ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return photo as EventPriorityPhoto;
  } catch (error: any) {
    console.error('❌ Erreur ajout prise de vue importante:', error);
    throw new Error(error.message || 'Erreur lors de l\'ajout de la prise de vue importante');
  }
}

/**
 * Supprime une consigne de prise de vue importante.
 */
export async function deleteEventPriorityPhoto(photoId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('event_priority_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression prise de vue importante:', error);
    throw new Error(error.message || 'Erreur lors de la suppression de la prise de vue importante');
  }
}

/**
 * Enregistre une modification importante de réservation dans `reservation_changes`
 * puis déclenche la notification correspondante.
 */
export async function recordReservationChange(
  data: Omit<ReservationChange, 'id' | 'created_at'>
): Promise<ReservationChange> {
  try {
    const { data: change, error } = await supabase
      .from('reservation_changes')
      .insert({
        reservation_id: data.reservation_id,
        type_changement: data.type_changement,
        description: data.description,
        auteur_id: data.auteur_id,
        auteur_role: data.auteur_role,
        nouveau_valeurs: data.nouveau_valeurs || null,
        ancien_valeurs: data.ancien_valeurs || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Déclencher la notification correspondante
    await supabase.from('notifications').insert({
      type: 'reservation_modifiee',
      titre: 'Réservation modifiée',
      contenu: data.description,
      reservation_id: data.reservation_id,
      user_id: data.auteur_role === 'client' ? null : null,
    });

    return change as ReservationChange;
  } catch (error: any) {
    console.error('❌ Erreur enregistrement changement réservation:', error);
    throw new Error(error.message || 'Erreur lors de l\'enregistrement du changement');
  }
}

/**
 * Marque l'arrivée du photographe sur place :
 * renseigne `arrive_sur_place_at` et passe `statut_prestation` à 'photographe_arrive'.
 */
export async function markPhotographerArrived(reservationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        arrive_sur_place_at: new Date().toISOString(),
        statut_prestation: 'photographe_arrive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (error) throw error;

    await recordReservationChange({
      reservation_id: reservationId,
      type_changement: 'arrivee_photographe',
      description: 'Le photographe est arrivé sur place',
      auteur_id: '',
      auteur_role: 'photographe',
    });
  } catch (error: any) {
    console.error('❌ Erreur arrivée photographe:', error);
    throw new Error(error.message || 'Erreur lors de l\'arrivée du photographe');
  }
}

/**
 * Marque les photos comme prêtes :
 * renseigne `photos_pretes_at` puis crée une notification client.
 * NE téléverse AUCUN média.
 */
export async function markPhotosAvailable(reservationId: string, clientId?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        photos_pretes_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (error) throw error;

    // Notification client
    await supabase.from('notifications').insert({
      type: 'photos_disponibles',
      titre: 'Vos photos sont prêtes !',
      contenu: 'Le photographe a partagé vos photos. Retrouvez le lien de livraison externe dans votre réservation.',
      reservation_id: reservationId,
      user_id: clientId || null,
    });

    await recordReservationChange({
      reservation_id: reservationId,
      type_changement: 'photos_pretes',
      description: 'Les photos sont prêtes et disponibles',
      auteur_id: '',
      auteur_role: 'photographe',
    });
  } catch (error: any) {
    console.error('❌ Erreur marquage photos disponibles:', error);
    throw new Error(error.message || 'Erreur lors du marquage des photos disponibles');
  }
}