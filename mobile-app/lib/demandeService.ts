import { supabase } from './supabaseClient';

/**
 * Client Request Service (demandeService.ts)
 * -------------------------------------------
 * Handles all CRUD operations for photo service requests (demandes_client table).
 *
 * Payload cible (photographe uniquement):
 * - type_evenement_id, date_souhaitee, lieu, ville,
 *   latitude_evenement, longitude_evenement, nb_personnes,
 *   duree_estimee_heures, budget_max, style_photo_id, commentaire
 *
 * Key functions:
 * - createDemande() — Creates a new request
 * - getClientDemandes() — Fetches all requests for a given client
 * - getDemandeById() — Fetches a single request with full details
 * - updateDemande() — Updates an existing request
 * - annulerDemande() — Cancels a request (sets statut to 'annulee')
 */

export interface DemandeClient {
  id: string;
  client_id: string;
  type_evenement_id?: string;
  date_souhaitee?: string;
  lieu?: string;
  ville?: string;
  latitude_evenement?: number;
  longitude_evenement?: number;
  nb_personnes?: number;
  duree_estimee_heures?: number;
  budget_max?: number;
  style_photo_id?: string;
  commentaire?: string;
  statut: 'ouverte' | 'en_cours' | 'pourvue' | 'annulee' | 'expiree';
  date_expiration?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDemandeData {
  type_evenement_id: string;
  date_souhaitee: string;
  lieu: string;
  ville: string;
  latitude_evenement?: number;
  longitude_evenement?: number;
  nb_personnes?: number;
  duree_estimee_heures?: number;
  budget_max?: number;
  style_photo_id?: string;
  commentaire?: string;
}

export interface UpdateDemandeData extends Partial<CreateDemandeData> {
  statut?: 'ouverte' | 'en_cours' | 'pourvue' | 'annulee' | 'expiree';
}

/**
 * Créer une nouvelle demande
 */
export async function createDemande(userId: string, data: CreateDemandeData): Promise<DemandeClient> {
  try {
    // Calculer la date d'expiration (30 jours par défaut)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);

    const { data: demande, error } = await supabase
      .from('demandes_client')
      .insert({
        client_id: userId,
        type_evenement_id: data.type_evenement_id,
        date_souhaitee: data.date_souhaitee,
        lieu: data.lieu,
        ville: data.ville || data.lieu,
        latitude_evenement: data.latitude_evenement || null,
        longitude_evenement: data.longitude_evenement || null,
        nb_personnes: data.nb_personnes || null,
        duree_estimee_heures: data.duree_estimee_heures || null,
        budget_max: data.budget_max || null,
        style_photo_id: data.style_photo_id || null,
        commentaire: data.commentaire || null,
        statut: 'ouverte',
        date_expiration: expireDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return demande;
  } catch (error: any) {
    console.error('❌ Erreur création demande:', error);
    throw new Error(error.message || 'Erreur lors de la création de la demande');
  }
}

/**
 * Récupérer les demandes d'un client
 */
export async function getClientDemandes(clientId: string): Promise<DemandeClient[]> {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('*, devis(count)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération demandes client:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des demandes');
  }
}

/**
 * Récupérer une demande par ID
 */
export async function getDemandeById(demandeId: string): Promise<DemandeClient | null> {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', demandeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Erreur récupération demande:', error);
    throw new Error(error.message || 'Erreur lors de la récupération de la demande');
  }
}

/**
 * Mettre à jour une demande
 */
export async function updateDemande(demandeId: string, updates: UpdateDemandeData): Promise<DemandeClient> {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour demande:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour de la demande');
  }
}

/**
 * Marquer une demande comme pourvue (un devis a été accepté)
 */
export async function markDemandePourvue(demandeId: string): Promise<void> {
  try {
    await supabase
      .from('demandes_client')
      .update({
        statut: 'pourvue',
        pourvue_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandeId);
  } catch (error: any) {
    console.error('❌ Erreur marquage demande pourvue:', error);
    throw error;
  }
}

/**
 * Annuler une demande
 */
export async function annulerDemande(demandeId: string): Promise<void> {
  try {
    await supabase
      .from('demandes_client')
      .update({
        statut: 'annulee',
        fermee_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', demandeId);
  } catch (error: any) {
    console.error('❌ Erreur annulation demande:', error);
    throw error;
  }
}