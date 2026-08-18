import { supabase } from './supabaseClient';

/**
 * Photographer Service (photographerService.ts)
 * ---------------------------------------------
 * Centralises all reads/writes for the photographer professional profile
 * using the `photographe` table and its link tables:
 * - photographe_styles            (photographer ↔ styles_photo)
 * - photographe_types_evenements   (photographer ↔ types_evenements_photo)
 * - photographe_documents          (verification documents, not generic photos)
 *
 * This service NEVER writes to `profils_prestataire`.
 */

export interface PhotographeProfile {
  id: string;
  bio?: string;
  entreprise?: string;
  site_web?: string;
  instagram?: string;
  rayon_deplacement_km?: number;
  prix_minimum?: number;
  annees_experience?: number;
  conditions_annulation?: string;
  pourcentage_acompte?: number;
  zone_geographique?: string;
  statut_validation?: string;
  verified_at?: string;
  verified_by?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PhotographeStyleLink {
  photographe_id: string;
  style_id: string;
}

export interface PhotographeEventTypeLink {
  photographe_id: string;
  type_evenement_id: string;
}

/**
 * Récupère un profil photographe par son ID (table `photographe`).
 */
export async function getPhotographerById(photographeId: string): Promise<PhotographeProfile | null> {
  try {
    const { data, error } = await supabase
      .from('photographe')
      .select('*')
      .eq('id', photographeId)
      .maybeSingle();

    if (error) throw error;
    return data as PhotographeProfile | null;
  } catch (error: any) {
    console.error('❌ Erreur récupération profil photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération du profil photographe');
  }
}

/**
 * Met à jour un profil photographe (table `photographe`).
 */
export async function updatePhotographer(
  photographeId: string,
  updates: Partial<PhotographeProfile>
): Promise<PhotographeProfile> {
  try {
    const { data, error } = await supabase
      .from('photographe')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photographeId)
      .select()
      .single();

    if (error) throw error;
    return data as PhotographeProfile;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour profil photographe:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour du profil photographe');
  }
}

/**
 * Récupère les styles photo associés à un photographe (table de liaison `photographe_styles`).
 */
export async function getPhotographerStyles(photographeId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('photographe_styles')
      .select('style_id')
      .eq('photographe_id', photographeId);

    if (error) throw error;
    return (data || []).map((row) => row.style_id);
  } catch (error: any) {
    console.error('❌ Erreur récupération styles photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des styles');
  }
}

/**
 * Remplace les styles d'un photographe (table `photographe_styles`).
 * Supprime puis réinsère dans une même séquence; en cas d'erreur partielle,
 * l'erreur est propagée au composant appelant.
 */
export async function setPhotographerStyles(
  photographeId: string,
  styleIds: string[]
): Promise<void> {
  try {
    // 1. Supprimer les associations actuelles
    const { error: deleteError } = await supabase
      .from('photographe_styles')
      .delete()
      .eq('photographe_id', photographeId);

    if (deleteError) throw deleteError;

    // 2. Insérer la nouvelle sélection
    if (styleIds.length > 0) {
      const rows: PhotographeStyleLink[] = styleIds.map((styleId) => ({
        photographe_id: photographeId,
        style_id: styleId,
      }));

      const { error: insertError } = await supabase
        .from('photographe_styles')
        .insert(rows);

      if (insertError) {
        console.error('❌ Erreur insertion styles photographe:', insertError);
        throw insertError;
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur mise à jour styles photographe:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour des styles');
  }
}

/**
 * Récupère les types d'événements associés à un photographe (table `photographe_types_evenements`).
 */
export async function getPhotographerEventTypes(photographeId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('photographe_types_evenements')
      .select('type_evenement_id')
      .eq('photographe_id', photographeId);

    if (error) throw error;
    return (data || []).map((row) => row.type_evenement_id);
  } catch (error: any) {
    console.error('❌ Erreur récupération types événements photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des types d\'événements');
  }
}

/**
 * Remplace les types d'événements d'un photographe (`photographe_types_evenements`).
 */
export async function setPhotographerEventTypes(
  photographeId: string,
  typeEventIds: string[]
): Promise<void> {
  try {
    // 1. Supprimer les associations actuelles
    const { error: deleteError } = await supabase
      .from('photographe_types_evenements')
      .delete()
      .eq('photographe_id', photographeId);

    if (deleteError) throw deleteError;

    // 2. Insérer la nouvelle sélection
    if (typeEventIds.length > 0) {
      const rows = typeEventIds.map((typeEvenementId) => ({
        photographe_id: photographeId,
        type_evenement_id: typeEvenementId,
      }));

      const { error: insertError } = await supabase
        .from('photographe_types_evenements')
        .insert(rows);

      if (insertError) throw insertError;
    }
  } catch (error: any) {
    console.error('❌ Erreur mise à jour types événements photographe:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour des types d\'événements');
  }
}

/**
 * Récupère les documents de vérification d'un photographe (`photographe_documents`).
 */
export async function getPhotographerDocuments(photographeId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('photographe_documents')
      .select('*')
      .eq('photographe_id', photographeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Erreur récupération documents photographe:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des documents');
  }
}

/**
 * Ajoute ou remplace un document de vérification (`photographe_documents`).
 * Storage est utilisé uniquement pour les fichiers de vérification.
 */
export async function upsertPhotographerDocument(
  photographeId: string,
  document: {
    type_document: string;
    url: string;
    statut?: 'pending' | 'approved' | 'rejected';
    motif_refus?: string;
  }
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('photographe_documents')
      .upsert({
        photographe_id: photographeId,
        type_document: document.type_document,
        url: document.url,
        statut: document.statut || 'pending',
        motif_refus: document.motif_refus || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Erreur upload document photographe:', error);
    throw new Error(error.message || 'Erreur lors de l\'upload du document');
  }
}