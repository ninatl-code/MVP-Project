import { supabase } from './supabaseClient';
import { addPhotographeInteresse } from './demandeService';

/**
 * Service pour gérer les devis (quotes) envoyés par les photographes
 * Nouveau modèle: Les photographes envoient des devis en réponse aux demandes clients
 */

export interface Devis {
  id: string;
  photographe_id: string;
  demande_id: string;
  reservation_id?: string;
  titre: string;
  description: string;
  tarif_base: number;
  frais_deplacement?: number;
  options_supplementaires?: Array<{ nom: string; prix: number }>;
  remise?: number;
  montant_total: number;
  delai_validite_jours: number;
  conditions_particulieres?: string;
  statut: 'envoye' | 'lu' | 'accepte' | 'refuse' | 'expire';
  envoye_le: string;
  lu_le?: string;
  repondu_le?: string;
  expire_le: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDevisData {
  demande_id: string;
  titre: string;
  description: string;
  tarif_base: number;
  frais_deplacement?: number;
  options_supplementaires?: Array<{ nom: string; prix: number }>;
  remise?: number;
  delai_validite_jours?: number;
  conditions_particulieres?: string;
}

export interface UpdateDevisData {
  titre?: string;
  description?: string;
  tarif_base?: number;
  frais_deplacement?: number;
  options_supplementaires?: Array<{ nom: string; prix: number }>;
  remise?: number;
  delai_validite_jours?: number;
  conditions_particulieres?: string;
  statut?: 'envoye' | 'lu' | 'accepte' | 'refuse' | 'expire';
}

/**
 * Calculer le montant total d'un devis
 */
function calculateMontantTotal(
  tarifBase: number,
  fraisDeplacement: number = 0,
  options: Array<{ nom: string; prix: number }> = [],
  remise: number = 0
): number {
  const totalOptions = options.reduce((sum, opt) => sum + opt.prix, 0);
  const subtotal = tarifBase + fraisDeplacement + totalOptions;
  return Math.max(0, subtotal - remise);
}

/**
 * Créer un nouveau devis
 */
export async function createDevis(photographeId: string, data: CreateDevisData): Promise<Devis> {
  try {
    const delaiValidite = data.delai_validite_jours || 7;
    const now = new Date();
    const expireDate = new Date(now);
    expireDate.setDate(expireDate.getDate() + delaiValidite);

    const montantTotal = calculateMontantTotal(
      data.tarif_base,
      data.frais_deplacement,
      data.options_supplementaires,
      data.remise
    );

    const { data: devis, error } = await supabase
      .from('devis')
      .insert({
        photographe_id: photographeId,
        demande_id: data.demande_id,
        titre: data.titre,
        description: data.description,
        tarif_base: data.tarif_base,
        frais_deplacement: data.frais_deplacement || 0,
        options_supplementaires: data.options_supplementaires || [],
        remise: data.remise || 0,
        montant_total: montantTotal,
        delai_validite_jours: delaiValidite,
        conditions_particulieres: data.conditions_particulieres,
        statut: 'envoye',
        envoye_le: now.toISOString(),
        expire_le: expireDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Ajouter le photographe à la liste des photographes intéressés de la demande
    await addPhotographeInteresse(data.demande_id, photographeId);

    return devis;
  } catch (error: any) {
    console.error('❌ Erreur création devis:', error);
    throw new Error(error.message || 'Erreur lors de la création du devis');
  }
}

/**
 * Récupérer les devis envoyés par un photographe
 */
export async function getPhotographeDevis(photographeId: string): Promise<Devis[]> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('envoye_le', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération devis photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des devis');
  }
}

/**
 * Récupérer les devis reçus pour une demande
 */
export async function getDevisForDemande(demandeId: string): Promise<Devis[]> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .eq('demande_id', demandeId)
      .order('envoye_le', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération devis pour demande:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des devis');
  }
}

/**
 * Récupérer un devis par ID
 */
export async function getDevisById(devisId: string): Promise<Devis | null> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Erreur récupération devis:', error);
    throw new Error(error.message || 'Erreur lors de la récupération du devis');
  }
}

/**
 * Mettre à jour un devis
 */
export async function updateDevis(devisId: string, updates: UpdateDevisData): Promise<Devis> {
  try {
    const devis = await getDevisById(devisId);
    if (!devis) throw new Error('Devis non trouvé');

    // Recalculer le montant total si les prix changent
    let montantTotal = devis.montant_total;
    if (
      updates.tarif_base !== undefined ||
      updates.frais_deplacement !== undefined ||
      updates.options_supplementaires !== undefined ||
      updates.remise !== undefined
    ) {
      montantTotal = calculateMontantTotal(
        updates.tarif_base ?? devis.tarif_base,
        updates.frais_deplacement ?? devis.frais_deplacement,
        updates.options_supplementaires ?? devis.options_supplementaires,
        updates.remise ?? devis.remise
      );
    }

    const { data, error } = await supabase
      .from('devis')
      .update({
        ...updates,
        montant_total: montantTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour devis:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour du devis');
  }
}

/**
 * Marquer un devis comme lu par le client
 */
export async function markDevisAsRead(devisId: string): Promise<void> {
  try {
    const devis = await getDevisById(devisId);
    if (!devis) throw new Error('Devis non trouvé');

    if (devis.statut === 'envoye') {
      await supabase
        .from('devis')
        .update({
          statut: 'lu',
          lu_le: new Date().toISOString(),
        })
        .eq('id', devisId);
    }
  } catch (error: any) {
    console.error('❌ Erreur marquage devis lu:', error);
    throw error;
  }
}

/**
 * Accepter un devis (crée une réservation)
 */
export async function acceptDevis(devisId: string, clientId: string): Promise<{ devis: Devis; reservationId: string }> {
  try {
    const devis = await getDevisById(devisId);
    if (!devis) throw new Error('Devis non trouvé');

    if (devis.statut === 'expire') {
      throw new Error('Ce devis a expiré');
    }

    if (devis.statut === 'accepte') {
      throw new Error('Ce devis a déjà été accepté');
    }

    // Récupérer la demande pour obtenir les détails
    const { data: demande, error: demandeError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', devis.demande_id)
      .single();

    if (demandeError) throw demandeError;

    // Créer la réservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        client_id: clientId,
        photographe_id: devis.photographe_id,
        demande_id: devis.demande_id,
        devis_id: devisId,
        type_prestation: demande.categorie,
        date_prestation: demande.date_souhaitee,
        heure_debut: demande.heure_souhaitee,
        duree_heures: demande.duree_estimee_heures || 2,
        lieu_ville: demande.lieu_ville,
        lieu_adresse: demande.lieu_adresse,
        montant_total: devis.montant_total,
        statut_reservation: 'confirmee',
        statut_paiement: 'en_attente',
      })
      .select()
      .single();

    if (reservationError) throw reservationError;

    // Mettre à jour le devis
    const { data: updatedDevis, error: devisUpdateError } = await supabase
      .from('devis')
      .update({
        statut: 'accepte',
        reservation_id: reservation.id,
        repondu_le: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (devisUpdateError) throw devisUpdateError;

    // Marquer la demande comme pourvue
    await supabase
      .from('demandes_client')
      .update({ statut: 'pourvue' })
      .eq('id', devis.demande_id);

    // Refuser tous les autres devis pour cette demande
    await supabase
      .from('devis')
      .update({ 
        statut: 'refuse',
        repondu_le: new Date().toISOString(),
      })
      .eq('demande_id', devis.demande_id)
      .neq('id', devisId)
      .in('statut', ['envoye', 'lu']);

    return { devis: updatedDevis, reservationId: reservation.id };
  } catch (error: any) {
    console.error('❌ Erreur acceptation devis:', error);
    throw new Error(error.message || 'Erreur lors de l\'acceptation du devis');
  }
}

/**
 * Refuser un devis
 */
export async function refuseDevis(devisId: string): Promise<void> {
  try {
    await supabase
      .from('devis')
      .update({
        statut: 'refuse',
        repondu_le: new Date().toISOString(),
      })
      .eq('id', devisId);
  } catch (error: any) {
    console.error('❌ Erreur refus devis:', error);
    throw new Error(error.message || 'Erreur lors du refus du devis');
  }
}

/**
 * Supprimer un devis (brouillon uniquement)
 */
export async function deleteDevis(devisId: string, photographeId: string): Promise<void> {
  try {
    const devis = await getDevisById(devisId);
    if (!devis) throw new Error('Devis non trouvé');

    if (devis.photographe_id !== photographeId) {
      throw new Error('Vous n\'êtes pas autorisé à supprimer ce devis');
    }

    if (devis.statut !== 'envoye') {
      throw new Error('Vous ne pouvez supprimer que les devis non envoyés');
    }

    const { error } = await supabase
      .from('devis')
      .delete()
      .eq('id', devisId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression devis:', error);
    throw new Error(error.message || 'Erreur lors de la suppression du devis');
  }
}

/**
 * Vérifier et marquer les devis expirés
 */
export async function checkExpiredDevis(): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabase
      .from('devis')
      .update({ statut: 'expire' })
      .in('statut', ['envoye', 'lu'])
      .lt('expire_le', now);
  } catch (error: any) {
    console.error('❌ Erreur vérification devis expirés:', error);
  }
}

/**
 * Obtenir les statistiques des devis d'un photographe
 */
export async function getPhotographeDevisStats(photographeId: string): Promise<{
  total: number;
  envoyes: number;
  lus: number;
  acceptes: number;
  refuses: number;
  expires: number;
  tauxAcceptation: number;
  tauxLecture: number;
}> {
  try {
    const devisList = await getPhotographeDevis(photographeId);

    const stats = {
      total: devisList.length,
      envoyes: devisList.filter((d) => d.statut === 'envoye').length,
      lus: devisList.filter((d) => d.statut === 'lu').length,
      acceptes: devisList.filter((d) => d.statut === 'accepte').length,
      refuses: devisList.filter((d) => d.statut === 'refuse').length,
      expires: devisList.filter((d) => d.statut === 'expire').length,
      tauxAcceptation: 0,
      tauxLecture: 0,
    };

    if (stats.total > 0) {
      stats.tauxAcceptation = (stats.acceptes / stats.total) * 100;
      stats.tauxLecture = ((stats.lus + stats.acceptes + stats.refuses) / stats.total) * 100;
    }

    return stats;
  } catch (error: any) {
    console.error('❌ Erreur calcul stats devis:', error);
    throw new Error(error.message || 'Erreur lors du calcul des statistiques');
  }
}
