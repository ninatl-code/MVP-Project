import { supabase } from './supabaseClient';

/**
 * Service pour gérer les demandes clients
 * Nouveau modèle: Le client crée une demande, les photographes répondent avec des devis
 */

export interface DemandeClient {
  id: string;
  client_id: string;
  titre: string;
  description: string;
  categorie: string;
  date_souhaitee: string;
  heure_souhaitee?: string;
  duree_estimee_heures?: number;
  lieu_ville: string;
  lieu_code_postal: string;
  lieu_adresse?: string;
  lieu_latitude?: number;
  lieu_longitude?: number;
  budget_min?: number;
  budget_max?: number;
  statut: 'ouverte' | 'pourvue' | 'annulee' | 'expiree';
  nombre_devis_recus: number;
  photographes_notifies: string[];
  photographes_interesses: string[];
  created_at: string;
  updated_at: string;
  expire_le?: string;
}

export interface CreateDemandeData {
  titre: string;
  description: string;
  categorie: string;
  date_souhaitee: string;
  heure_souhaitee?: string;
  duree_estimee_heures?: number;
  lieu_ville: string;
  lieu_code_postal: string;
  lieu_adresse?: string;
  lieu_latitude?: number;
  lieu_longitude?: number;
  budget_min?: number;
  budget_max?: number;
}

export interface UpdateDemandeData {
  titre?: string;
  description?: string;
  categorie?: string;
  date_souhaitee?: string;
  heure_souhaitee?: string;
  duree_estimee_heures?: number;
  lieu_ville?: string;
  lieu_code_postal?: string;
  lieu_adresse?: string;
  lieu_latitude?: number;
  lieu_longitude?: number;
  budget_min?: number;
  budget_max?: number;
  statut?: 'ouverte' | 'pourvue' | 'annulee' | 'expiree';
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
        ...data,
        statut: 'ouverte',
        nombre_devis_recus: 0,
        photographes_notifies: [],
        photographes_interesses: [],
        expire_le: expireDate.toISOString(),
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
      .select('*')
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
      .single();

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
    await updateDemande(demandeId, { statut: 'pourvue' });
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
    await updateDemande(demandeId, { statut: 'annulee' });
  } catch (error: any) {
    console.error('❌ Erreur annulation demande:', error);
    throw error;
  }
}

/**
 * Ajouter un photographe à la liste des photographes notifiés
 */
export async function addPhotographeNotified(demandeId: string, photographeId: string): Promise<void> {
  try {
    const demande = await getDemandeById(demandeId);
    if (!demande) throw new Error('Demande non trouvée');

    const photographesNotifies = [...(demande.photographes_notifies || [])];
    if (!photographesNotifies.includes(photographeId)) {
      photographesNotifies.push(photographeId);

      await supabase
        .from('demandes_client')
        .update({ photographes_notifies: photographesNotifies })
        .eq('id', demandeId);
    }
  } catch (error: any) {
    console.error('❌ Erreur ajout photographe notifié:', error);
    throw error;
  }
}

/**
 * Ajouter un photographe à la liste des photographes intéressés (a envoyé un devis)
 */
export async function addPhotographeInteresse(demandeId: string, photographeId: string): Promise<void> {
  try {
    const demande = await getDemandeById(demandeId);
    if (!demande) throw new Error('Demande non trouvée');

    const photographesInteresses = [...(demande.photographes_interesses || [])];
    if (!photographesInteresses.includes(photographeId)) {
      photographesInteresses.push(photographeId);

      // Incrémenter le nombre de devis reçus
      await supabase
        .from('demandes_client')
        .update({
          photographes_interesses: photographesInteresses,
          nombre_devis_recus: demande.nombre_devis_recus + 1,
        })
        .eq('id', demandeId);
    }
  } catch (error: any) {
    console.error('❌ Erreur ajout photographe intéressé:', error);
    throw error;
  }
}

/**
 * Rechercher les demandes ouvertes correspondant aux critères d'un photographe
 * @param photographeId ID du photographe
 * @param location Location du photographe (ville, code postal)
 * @param rayonKm Rayon de déplacement du photographe
 * @param specialisations Spécialisations du photographe
 * @param budgetMin Budget minimum du photographe
 */
export async function searchDemandesForPhotographe(
  photographeId: string,
  location: { ville: string; codePostal: string },
  rayonKm: number,
  specialisations: string[],
  budgetMin?: number
): Promise<DemandeClient[]> {
  try {
    // Récupérer toutes les demandes ouvertes
    let query = supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte')
      .gt('expire_le', new Date().toISOString());

    // Filtrer par catégorie (si le photographe a des spécialisations)
    if (specialisations && specialisations.length > 0) {
      query = query.in('categorie', specialisations);
    }

    // Filtrer par budget (si le photographe a un budget minimum)
    if (budgetMin) {
      query = query.or(`budget_max.gte.${budgetMin},budget_max.is.null`);
    }

    const { data: demandes, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Filtrer par proximité géographique (simple filtre par code postal pour l'instant)
    // TODO: Implémenter calcul de distance géographique précis avec lat/lng
    const filteredDemandes = demandes?.filter((demande) => {
      // Vérifier si le photographe a déjà été notifié ou est déjà intéressé
      if (demande.photographes_notifies?.includes(photographeId)) {
        return true; // Inclure si déjà notifié (pour afficher dans sa liste)
      }

      // Filtrer par département (2 premiers chiffres du code postal)
      const photographeDept = location.codePostal.substring(0, 2);
      const demandeDept = demande.lieu_code_postal.substring(0, 2);

      // Simple filtre: même département ou départements limitrophes
      // TODO: Implémenter calcul de distance réel
      return photographeDept === demandeDept;
    });

    return filteredDemandes || [];
  } catch (error: any) {
    console.error('❌ Erreur recherche demandes pour photographe:', error);
    throw new Error(error.message || 'Erreur lors de la recherche des demandes');
  }
}

/**
 * Récupérer les demandes d'un photographe (demandes où il a envoyé un devis)
 */
export async function getPhotographeDemandes(photographeId: string): Promise<DemandeClient[]> {
  try {
    const { data, error } = await supabase
      .from('demandes_client')
      .select('*')
      .contains('photographes_interesses', [photographeId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération demandes photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des demandes');
  }
}

/**
 * Vérifier et marquer les demandes expirées
 */
export async function checkExpiredDemandes(): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabase
      .from('demandes_client')
      .update({ statut: 'expiree' })
      .eq('statut', 'ouverte')
      .lt('expire_le', now);
  } catch (error: any) {
    console.error('❌ Erreur vérification demandes expirées:', error);
  }
}
