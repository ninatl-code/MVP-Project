import { supabase } from './supabaseClient';

/**
 * Portfolio Service (portfolioService.ts)
 * ----------------------------------------
 * CRUD operations for the photographer public portfolio:
 * - portfolio_galleries  (galleries, filtered by photographe_id)
 * - portfolio_items      (images inside a gallery)
 *
 * Storage upload is used ONLY for the public portfolio and returns a URL
 * stored in `image_url` / `cover_image_url`.
 * Never uses a private client-delivery gallery nor stores final photos.
 */

export interface PortfolioGallery {
  id: string;
  photographe_id: string;
  titre: string;
  description?: string;
  cover_image_url?: string;
  visible: boolean;
  ordre: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItem {
  id: string;
  galerie_id: string;
  image_url: string;
  thumbnail_url?: string;
  titre?: string;
  description?: string;
  ordre: number;
  principale: boolean;
  visible: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Liste les galeries du portfolio public d'un photographe.
 */
export async function getGalleries(photographeId: string, visibleOnly = false): Promise<PortfolioGallery[]> {
  try {
    let query = supabase
      .from('portfolio_galleries')
      .select('*, portfolio_items(count)')
      .eq('photographe_id', photographeId)
      .order('ordre', { ascending: true });

    if (visibleOnly) {
      query = query.eq('visible', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PortfolioGallery[];
  } catch (error: any) {
    console.error('❌ Erreur récupération galeries portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des galeries');
  }
}

/**
 * Crée une galerie portfolio.
 */
export async function createGallery(
  photographeId: string,
  data: { titre: string; description?: string; cover_image_url?: string; visible?: boolean }
): Promise<PortfolioGallery> {
  try {
    const { data: gallery, error } = await supabase
      .from('portfolio_galleries')
      .insert({
        photographe_id: photographeId,
        titre: data.titre,
        description: data.description || null,
        cover_image_url: data.cover_image_url || null,
        visible: data.visible ?? true,
        ordre: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return gallery as PortfolioGallery;
  } catch (error: any) {
    console.error('❌ Erreur création galerie portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la création de la galerie');
  }
}

/**
 * Met à jour une galerie portfolio.
 */
export async function updateGallery(
  galleryId: string,
  updates: Partial<PortfolioGallery>
): Promise<PortfolioGallery> {
  try {
    // Ne pas laisser modifier photographe_id depuis cet appel
    const { photographe_id, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('portfolio_galleries')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', galleryId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioGallery;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour galerie portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour de la galerie');
  }
}

/**
 * Supprime une galerie portfolio.
 */
export async function deleteGallery(galleryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('portfolio_galleries')
      .delete()
      .eq('id', galleryId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression galerie portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la suppression de la galerie');
  }
}

/**
 * Liste les items d'une galerie portfolio.
 */
export async function getPortfolioItems(galleryId: string, visibleOnly = false): Promise<PortfolioItem[]> {
  try {
    let query = supabase
      .from('portfolio_items')
      .select('*')
      .eq('galerie_id', galleryId)
      .order('ordre', { ascending: true });

    if (visibleOnly) {
      query = query.eq('visible', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PortfolioItem[];
  } catch (error: any) {
    console.error('❌ Erreur récupération items portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des items');
  }
}

/**
 * Ajoute un item (photo) à une galerie portfolio.
 * `image_url` / `thumbnail_url` proviennent de l'upload Storage public.
 */
export async function createPortfolioItem(
  data: {
    galerie_id: string;
    image_url: string;
    thumbnail_url?: string;
    titre?: string;
    description?: string;
    ordre?: number;
    principale?: boolean;
    visible?: boolean;
  }
): Promise<PortfolioItem> {
  try {
    const { data: item, error } = await supabase
      .from('portfolio_items')
      .insert({
        galerie_id: data.galerie_id,
        image_url: data.image_url,
        thumbnail_url: data.thumbnail_url || null,
        titre: data.titre || null,
        description: data.description || null,
        ordre: data.ordre ?? 0,
        principale: data.principale ?? false,
        visible: data.visible ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return item as PortfolioItem;
  } catch (error: any) {
    console.error('❌ Erreur création item portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la création de l\'item');
  }
}

/**
 * Met à jour un item portfolio (ordre, principale, visible, thumbnail_url...).
 */
export async function updatePortfolioItem(
  itemId: string,
  data: Partial<PortfolioItem>
): Promise<PortfolioItem> {
  try {
    const { galerie_id, ...safeUpdates } = data;

    const { data: item, error } = await supabase
      .from('portfolio_items')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return item as PortfolioItem;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour item portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la mise à jour de l\'item');
  }
}

/**
 * Supprime un item portfolio.
 */
export async function deletePortfolioItem(itemId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Erreur suppression item portfolio:', error);
    throw new Error(error.message || 'Erreur lors de la suppression de l\'item');
  }
}