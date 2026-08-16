import { supabase } from './supabaseClient';

/**
 * Service pour gérer les demandes clients
 * Aligné sur le schéma Supabase réel (table demandes_client)
 */

export interface DemandeClient {
  id: string;
  client_id: string;
  titre: string;
  description: string;
  categorie: string;
  nb_personnes?: number;
  est_public?: boolean;
  lieu: string;
  ville: string;
  date_souhaitee: string;
  heure_debut?: string;
  duree_estimee_heures?: number;
  type_prestation: string[];
  budget_max?: number;
  monnaie?: string;
  langues_souhaitees?: string[];
  instructions_speciales?: string;
  statut: 'ouverte' | 'en_cours' | 'pourvue' | 'annulee' | 'expiree';
  date_limite_reponse?: string;
  date_expiration?: string;
  criteres_matching?: any;
  details?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateDemandeData {
  titre: string;
  description: string;
  categorie: string;
  date_souhaitee: string;
  heure_debut?: string;
  duree_estimee_heures?: number;
  lieu: string;
  ville: string;
  budget_max?: number;
  nb_personnes?: number;
  type_prestation?: string[];
  langues_souhaitees?: string[];
  instructions_speciales?: string;
  details?: string[];
}

export interface UpdateDemandeData {
  titre?: string;
  description?: string;
  categorie?: string;
  date_souhaitee?: string;
  heure_debut?: string;
  duree_estimee_heures?: number;
  lieu?: string;
  ville?: string;
  budget_max?: number;
  nb_personnes?: number;
  type_prestation?: string[];
  instructions_speciales?: string;
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
        titre: data.titre,
        description: data.description,
        categorie: data.categorie,
        date_souhaitee: data.date_souhaitee,
        heure_debut: data.heure_debut || null,
        duree_estimee_heures: data.duree_estimee_heures || null,
        lieu: data.lieu,
        ville: data.ville || data.lieu,
        budget_max: data.budget_max || null,
        nb_personnes: data.nb_personnes || null,
        type_prestation: data.type_prestation || [],
        langues_souhaitees: data.langues_souhaitees || [],
        instructions_speciales: data.instructions_speciales || null,
        details: data.details || [],
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

/**
 * Rechercher les demandes ouvertes correspondant aux critères d'un prestataire
 * @param specialisations Spécialisations du prestataire
 * @param budgetMin Budget minimum du prestataire
 */
export async function searchDemandesForPrestataire(
  specialisations: string[],
  budgetMin?: number
): Promise<DemandeClient[]> {
  try {
    let query = supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte')
      .eq('actif', true);

    // Filtrer par catégorie (si le prestataire a des spécialisations)
    if (specialisations && specialisations.length > 0) {
      query = query.in('categorie', specialisations);
    }

    // Filtrer par budget (si le prestataire a un budget minimum)
    if (budgetMin) {
      query = query.or(`budget_max.gte.${budgetMin},budget_max.is.null`);
    }

    const { data: demandes, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return demandes || [];
  } catch (error: any) {
    console.error('❌ Erreur recherche demandes pour prestataire:', error);
    throw new Error(error.message || 'Erreur lors de la recherche des demandes');
  }
}

/**
 * Vérifier et marquer les demandes expirées
 */
export async function checkExpiredDemandes(): Promise<void> {
  try {
    const now = new Date().toISOString().split('T')[0];

    await supabase
      .from('demandes_client')
      .update({ statut: 'expiree', fermee_at: new Date().toISOString() })
      .eq('statut', 'ouverte')
      .lt('date_expiration', now);
  } catch (error: any) {
    console.error('❌ Erreur vérification demandes expirées:', error);
  }
}