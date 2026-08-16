/**
 * Service pour gérer les devis des prestataires
 * Aligné sur le schéma Supabase réel (table devis)
 */

import { supabase } from './supabaseClient';

export interface Devis {
  id: string;
  demande_id: string;
  prestataire_id: string;
  client_id: string;
  titre: string;
  description: string;
  message_personnalise?: string;

  // Tarifs
  tarif_base: number;
  frais_deplacement?: number;
  frais_additionnels?: any;
  remise_montant?: number;
  remise_percent?: number;
  montant_total: number;
  monnaie?: string;

  // Prestation
  duree_prestation_heures: number;
  options_supplementaires?: any;

  // Paiement
  acompte_percent?: number;
  acompte_montant?: number;
  modalites_paiement?: string[];
  echeancier_paiement?: any;
  conditions_annulation?: string;
  penalites_annulation?: any;

  // Disponibilités
  dates_disponibles?: string[];
  horaires_proposes?: any;

  // Documents
  devis_pdf_url?: string;
  contrat_url?: string;

  // Validité
  duree_validite_jours?: number;
  date_expiration?: string;

  // Statut
  statut: 'envoye' | 'accepte' | 'refuse' | 'expire';
  lu_at?: string;
  accepte_at?: string;
  refuse_at?: string;
  reponse_client?: string;
  raison_refus?: string;

  created_at: string;
  updated_at: string;

  // Relations jointes
  demande?: any;
  prestataire?: any;
  client?: any;
}

export interface CreateDevisData {
  demande_id: string;
  client_id: string;
  titre: string;
  description: string;
  message_personnalise?: string;

  // Tarifs (obligatoires)
  tarif_base: number;
  montant_total: number;
  duree_prestation_heures: number;

  // Optionnels
  frais_deplacement?: number;
  frais_additionnels?: any;
  remise_montant?: number;
  remise_percent?: number;
  options_supplementaires?: any;
  acompte_percent?: number;
  acompte_montant?: number;
  modalites_paiement?: string[];
  conditions_annulation?: string;
  dates_disponibles?: string[];
  duree_validite_jours?: number;
}

/**
 * Créer un nouveau devis
 */
export async function createDevis(
  photographeId: string,
  data: CreateDevisData
): Promise<Devis> {
  try {
    const validiteJours = data.duree_validite_jours || 15;
    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + validiteJours);

    const { data: devis, error } = await supabase
      .from('devis')
      .insert({
        prestataire_id: photographeId,
        client_id: data.client_id,
        demande_id: data.demande_id,
        titre: data.titre,
        description: data.description,
        message_personnalise: data.message_personnalise || null,

        tarif_base: data.tarif_base,
        frais_deplacement: data.frais_deplacement || 0,
        frais_additionnels: data.frais_additionnels || {},
        remise_montant: data.remise_montant || 0,
        remise_percent: data.remise_percent || 0,
        montant_total: data.montant_total,
        monnaie: 'MAD',

        duree_prestation_heures: data.duree_prestation_heures,
        options_supplementaires: data.options_supplementaires || [],

        acompte_percent: data.acompte_percent || 30,
        acompte_montant: data.acompte_montant || null,
        modalites_paiement: data.modalites_paiement || [],
        conditions_annulation: data.conditions_annulation || null,
        dates_disponibles: data.dates_disponibles || null,

        duree_validite_jours: validiteJours,
        date_expiration: expireLe.toISOString().split('T')[0],

        statut: 'envoye',
      })
      .select(`
        *,
        demande:demandes_client(titre, categorie, lieu, ville, date_souhaitee),
        client:profiles!devis_client_id_fkey(nom, avatar_url)
      `)
      .single();

    if (error) throw error;
    if (!devis) throw new Error('Aucun devis créé');

    return devis;
  } catch (error: any) {
    console.error('❌ Erreur création devis:', error);
    throw new Error(error.message || 'Erreur lors de la création du devis');
  }
}

/**
 * Récupérer tous les devis d'un photographe
 */
export async function getPhotographeDevis(photographeId: string): Promise<Devis[]> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        demande:demandes_client(id, titre, categorie, lieu, ville, date_souhaitee, statut),
        client:profiles!devis_client_id_fkey(nom, avatar_url)
      `)
      .eq('prestataire_id', photographeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération devis photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des devis');
  }
}

/**
 * Récupérer tous les devis pour une demande (client voit tous les devis reçus)
 */
export async function getDemandeDevis(demandeId: string): Promise<Devis[]> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .eq('demande_id', demandeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Pas de relation FK reconnue entre devis.prestataire_id et profiles :
    // on récupère les profils séparément et on les rattache côté client.
    const prestataireIds = [...new Set(data.map((d) => d.prestataire_id).filter(Boolean))];
    const { data: prestataires } = prestataireIds.length
      ? await supabase.from('profiles').select('id, nom, avatar_url, ville').in('id', prestataireIds)
      : { data: [] as any[] };
    const prestataireMap = new Map((prestataires || []).map((p: any) => [p.id, p]));

    return data.map((d) => ({ ...d, prestataire: prestataireMap.get(d.prestataire_id) || null }));
  } catch (error: any) {
    console.error('❌ Erreur récupération devis demande:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des devis');
  }
}

/**
 * Récupérer un devis par ID
 */
export async function getDevisById(devisId: string): Promise<Devis> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        demande:demandes_client(*),
        client:profiles!devis_client_id_fkey(*)
      `)
      .eq('id', devisId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Devis non trouvé');

    // Pas de relation FK reconnue entre devis.prestataire_id et profiles :
    // on récupère le profil séparément.
    let prestataire = null;
    if (data.prestataire_id) {
      const { data: presta } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.prestataire_id)
        .maybeSingle();
      prestataire = presta;
    }

    // Marquer comme lu si c'est la première lecture
    if (!data.lu_at) {
      await supabase
        .from('devis')
        .update({
          lu_at: new Date().toISOString(),
        })
        .eq('id', devisId);
    }

    return { ...data, prestataire };
  } catch (error: any) {
    console.error('❌ Erreur récupération devis:', error);
    throw new Error(error.message || 'Erreur lors de la récupération du devis');
  }
}

/**
 * Accepter un devis (client choisit un devis)
 */
export async function accepterDevis(devisId: string, demandeId: string): Promise<void> {
  try {
    // 1. Accepter le devis sélectionné
    const { error: acceptError } = await supabase
      .from('devis')
      .update({
        statut: 'accepte',
        accepte_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId);

    if (acceptError) throw acceptError;

    // 2. Refuser tous les autres devis de cette demande
    const { error: refuseError } = await supabase
      .from('devis')
      .update({
        statut: 'refuse',
        refuse_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('demande_id', demandeId)
      .neq('id', devisId)
      .in('statut', ['envoye']);

    if (refuseError) throw refuseError;

    // 3. Marquer la demande comme pourvue
    const { error: demandeError } = await supabase
      .from('demandes_client')
      .update({ statut: 'pourvue', pourvue_at: new Date().toISOString() })
      .eq('id', demandeId);

    if (demandeError) throw demandeError;

    console.log('✅ Devis accepté et demande pourvue');
  } catch (error: any) {
    console.error('❌ Erreur acceptation devis:', error);
    throw new Error(error.message || 'Erreur lors de l\'acceptation du devis');
  }
}

/**
 * Refuser un devis (client refuse un devis spécifique)
 */
export async function refuserDevis(devisId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('devis')
      .update({
        statut: 'refuse',
        refuse_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId);

    if (error) throw error;
    console.log('✅ Devis refusé');
  } catch (error: any) {
    console.error('❌ Erreur refus devis:', error);
    throw new Error(error.message || 'Erreur lors du refus du devis');
  }
}

/**
 * Compter le nombre de devis envoyés pour une demande
 */
export async function countDemandeDevis(demandeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('devis')
      .select('*', { count: 'exact', head: true })
      .eq('demande_id', demandeId);

    if (error) throw error;
    return count || 0;
  } catch (error: any) {
    console.error('❌ Erreur comptage devis:', error);
    return 0;
  }
}

/**
 * Vérifier si un photographe a déjà envoyé un devis pour une demande
 */
export async function hasAlreadySentDevis(photographeId: string, demandeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('id')
      .eq('prestataire_id', photographeId)
      .eq('demande_id', demandeId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error('❌ Erreur vérification devis:', error);
    return false;
  }
}