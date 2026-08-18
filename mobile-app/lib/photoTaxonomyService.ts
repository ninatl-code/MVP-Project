import { supabase } from './supabaseClient';

/**
 * Photo Taxonomy Service (photoTaxonomyService.ts)
 * ------------------------------------------------
 * Centralises all reads from the photo taxonomy tables:
 * - types_evenements_photo  (event types offered for photo shoots)
 * - styles_photo            (photography styles)
 *
 * These tables are the single source of truth for event types and styles.
 * No business lists are hardcoded in the frontend.
 */

export interface PhotoEventType {
  id: string;
  nom: string;
  slug: string;
  ordre: number;
  actif: boolean;
}

export interface PhotoStyle {
  id: string;
  nom: string;
  slug: string;
  ordre: number;
  actif: boolean;
}

/**
 * Récupère les types d'événements photo actifs triés par ordre.
 * Source : types_evenements_photo
 */
export async function getEventTypes(): Promise<PhotoEventType[]> {
  try {
    const { data, error } = await supabase
      .from('types_evenements_photo')
      .select('id, nom, slug, ordre, actif')
      .eq('actif', true)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as PhotoEventType[];
  } catch (error: any) {
    console.error('❌ Erreur récupération types d\'événements:', error);
    throw new Error(error.message || 'Erreur lors du chargement des types d\'événements');
  }
}

/**
 * Récupère les styles photo actifs triés par id.
 * `styles_photo` est la seule source pour les styles photo.
 */
export async function getPhotoStyles(): Promise<PhotoStyle[]> {
  try {
    const { data, error } = await supabase
      .from('styles_photo')
      .select('id, nom, slug, ordre, actif')
      .eq('actif', true)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as PhotoStyle[];
  } catch (error: any) {
    console.error('❌ Erreur récupération styles photo:', error);
    throw new Error(error.message || 'Erreur lors du chargement des styles photo');
  }
}