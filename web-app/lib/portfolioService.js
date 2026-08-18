import { supabase } from './supabaseClient'

/**
 * Portfolio Service (portfolioService.js)
 * ----------------------------------------
 * CRUD operations for the photographer public portfolio:
 * - portfolio_galleries  (galleries, filtered by photographe_id)
 * - portfolio_items      (images inside a gallery)
 *
 * Storage upload is used ONLY for the public portfolio and returns a URL
 * stored in `image_url` / `cover_image_url`.
 * Never uses a private client-delivery gallery nor stores final photos.
 */

/**
 * Liste les galeries du portfolio public d'un photographe.
 */
export async function getGalleries(photographeId, visibleOnly = false) {
  try {
    let query = supabase
      .from('portfolio_galleries')
      .select('*, portfolio_items(count)')
      .eq('photographe_id', photographeId)
      .order('ordre', { ascending: true })

    if (visibleOnly) {
      query = query.eq('visible', true)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération galeries portfolio:', error)
    throw error
  }
}

/**
 * Crée une galerie portfolio.
 */
export async function createGallery(photographeId, data) {
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
      .single()

    if (error) throw error
    return gallery
  } catch (error) {
    console.error('❌ Erreur création galerie portfolio:', error)
    throw error
  }
}

/**
 * Met à jour une galerie portfolio.
 */
export async function updateGallery(galleryId, updates) {
  try {
    // Ne pas laisser modifier photographe_id depuis cet appel
    const { photographe_id, ...safeUpdates } = updates

    const { data, error } = await supabase
      .from('portfolio_galleries')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', galleryId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Erreur mise à jour galerie portfolio:', error)
    throw error
  }
}

/**
 * Supprime une galerie portfolio.
 */
export async function deleteGallery(galleryId) {
  try {
    const { error } = await supabase
      .from('portfolio_galleries')
      .delete()
      .eq('id', galleryId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Erreur suppression galerie portfolio:', error)
    throw error
  }
}

/**
 * Liste les items d'une galerie portfolio.
 */
export async function getPortfolioItems(galleryId, visibleOnly = false) {
  try {
    let query = supabase
      .from('portfolio_items')
      .select('*')
      .eq('galerie_id', galleryId)
      .order('ordre', { ascending: true })

    if (visibleOnly) {
      query = query.eq('visible', true)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erreur récupération items portfolio:', error)
    throw error
  }
}

/**
 * Ajoute un item (photo) à une galerie portfolio.
 * `image_url` / `thumbnail_url` proviennent de l'upload Storage public.
 */
export async function createPortfolioItem(data) {
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
      .single()

    if (error) throw error
    return item
  } catch (error) {
    console.error('❌ Erreur création item portfolio:', error)
    throw error
  }
}

/**
 * Met à jour un item portfolio (ordre, principale, visible, thumbnail_url...).
 */
export async function updatePortfolioItem(itemId, data) {
  try {
    const { galerie_id, ...safeUpdates } = data

    const { data: item, error } = await supabase
      .from('portfolio_items')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return item
  } catch (error) {
    console.error('❌ Erreur mise à jour item portfolio:', error)
    throw error
  }
}

/**
 * Supprime un item portfolio.
 */
export async function deletePortfolioItem(itemId) {
  try {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
  } catch (error) {
    console.error('❌ Erreur suppression item portfolio:', error)
    throw error
  }
}