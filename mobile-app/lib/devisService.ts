/**
 * Service pour gérer les devis des photographes
 * Table devis avec informations détaillées
 */

import { supabase } from './supabaseClient';

export interface Devis {
  id: string;
  demande_id: string;
  photographe_id: string;
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
  nb_photos_livrees: number;
  nb_videos_livrees?: number;
  delai_livraison_jours: number;
  
  // Retouches
  retouches_incluses?: number;
  niveau_retouche?: string;
  
  // Livraison
  modes_livraison_inclus?: string[];
  plateforme_livraison?: string;
  duree_acces_galerie_jours?: number;
  livraison_usb_incluse?: boolean;
  type_usb?: string;
  frais_livraison_physique?: number;
  
  // Formats
  formats_fichiers_livres?: string[];
  resolution_fichiers?: string;
  
  // Tirages
  tirages_inclus?: boolean;
  nb_tirages_inclus?: number;
  format_tirages_inclus?: string[];
  type_papier?: string;
  encadrement_inclus?: boolean;
  style_encadrement?: string;
  cadre_description?: string;
  frais_tirages?: number;
  frais_encadrement?: number;
  
  // Options
  droit_usage_commercial?: boolean;
  type_licence?: string;
  frais_licence?: number;
  clause_exclusivite?: boolean;
  duree_exclusivite_jours?: number;
  assurance_incluse?: boolean;
  materiel_supplementaire?: any;
  
  // Paiement
  acompte_requis_montant?: number;
  acompte_requis_percent?: number;
  echeancier_paiement?: any;
  conditions_annulation?: string;
  penalites_annulation?: any;
  
  // Validité
  validite_jours?: number;
  expire_le?: string;
  conditions_particulieres?: string;
  
  // Statut
  statut: 'envoye' | 'lu' | 'accepte' | 'refuse' | 'expire';
  envoye_le: string;
  lu_le?: string;
  decision_le?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations jointes
  demande?: any;
  photographe?: any;
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
  nb_photos_livrees: number;
  delai_livraison_jours: number;
  
  // Optionnels
  frais_deplacement?: number;
  frais_additionnels?: any;
  remise_montant?: number;
  remise_percent?: number;
  nb_videos_livrees?: number;
  retouches_incluses?: number;
  niveau_retouche?: string;
  modes_livraison_inclus?: string[];
  formats_fichiers_livres?: string[];
  validite_jours?: number;
  acompte_requis_percent?: number;
  conditions_particulieres?: string;
}

/**
 * Créer un nouveau devis
 */
export async function createDevis(
  photographeId: string,
  data: CreateDevisData
): Promise<Devis> {
  try {
    const validiteJours = data.validite_jours || 30;
    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + validiteJours);

    const { data: devis, error } = await supabase
      .from('devis')
      .insert({
        photographe_id: photographeId,
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
        monnaie: 'EUR',
        
        duree_prestation_heures: data.duree_prestation_heures,
        nb_photos_livrees: data.nb_photos_livrees,
        nb_videos_livrees: data.nb_videos_livrees || 0,
        delai_livraison_jours: data.delai_livraison_jours,
        
        retouches_incluses: data.retouches_incluses || null,
        niveau_retouche: data.niveau_retouche || null,
        
        modes_livraison_inclus: data.modes_livraison_inclus || [],
        formats_fichiers_livres: data.formats_fichiers_livres || ['JPEG'],
        
        validite_jours: validiteJours,
        expire_le: expireLe.toISOString(),
        conditions_particulieres: data.conditions_particulieres || null,
        
        acompte_requis_percent: data.acompte_requis_percent || 30,
        
        statut: 'envoye',
        envoye_le: new Date().toISOString(),
      })
      .select(`
        *,
        demande:demandes_client(titre, categorie, lieu, ville, date_souhaitee),
        photographe:profiles!devis_photographe_id_fkey(nom, avatar_url, ville),
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
 * Récupérer tous les devis pour une demande (client voit tous les devis reçus)
 */
export async function getDemandeDevis(demandeId: string): Promise<Devis[]> {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        photographe:profiles!devis_photographe_id_fkey(
          id,
          nom,
          avatar_url,
          ville
        )
      `)
      .eq('demande_id', demandeId)
      .order('envoye_le', { ascending: false });

    if (error) throw error;
    return data || [];
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
        photographe:profiles!devis_photographe_id_fkey(*),
        client:profiles!devis_client_id_fkey(*)
      `)
      .eq('id', devisId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Devis non trouvé');

    // Marquer comme lu si c'est la première lecture
    if (!data.lu_le) {
      await supabase
        .from('devis')
        .update({ 
          lu_le: new Date().toISOString(),
          statut: 'lu'
        })
        .eq('id', devisId);
    }

    return data;
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
        decision_le: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', devisId);

    if (acceptError) throw acceptError;

    // 2. Refuser tous les autres devis de cette demande
    const { error: refuseError } = await supabase
      .from('devis')
      .update({ 
        statut: 'refuse',
        decision_le: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('demande_id', demandeId)
      .neq('id', devisId)
      .in('statut', ['envoye', 'lu']);

    if (refuseError) throw refuseError;

    // 3. Marquer la demande comme pourvue
    const { error: demandeError } = await supabase
      .from('demandes_client')
      .update({ statut: 'pourvue' })
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
        decision_le: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      .eq('photographe_id', photographeId)
      .eq('demande_id', demandeId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error('❌ Erreur vérification devis:', error);
    return false;
  }
}
