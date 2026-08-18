import { supabase } from './supabaseClient'

/**
 * Photo Taxonomy Service (photoTaxonomyService.js)
 * ------------------------------------------------
 * Centralises all reads from the photo taxonomy tables:
 * - types_evenements_photo  (event types offered for photo shoots)
 * - styles_photo            (photography styles)
 *
 * These tables are the single source of truth for event types and styles.
 * No business lists are hardcoded in the frontend.
 * Errors are propagated to the calling component.
 */

/**
 * Récupère les types d'événements photo actifs triés par ordre.
 * Source : types_evenements_photo
 */
export async function getEventTypes() {
  try {
    const { data, error } = await supabase
      .from('types_evenements_photo')
      .select('id, nom, slug, ordre, actif')
      .eq('actif', true)
      .order('ordre', { ascending: true })

    if (error) throw error

    // Normaliser les données pour le frontend
    return (data || []).map((et) => ({
      id: et.id,
      nom: et.nom,
      slug: et.slug,
      ordre: et.ordre,
      actif: et.actif,
    }))
  } catch (error) {
    console.error('❌ Erreur récupération types d\'événements:', error)
    throw error
  }
}

/**
 * Récupère les styles photo actifs depuis que `styles_photo`.
 * Source : styles_photo
 */
export async function getPhotoStyles() {
  try {
    const { data, error } = await supabase
      .from('styles_photo')
      .select('id, nom, slug, ordre, actif')
      .eq('actif', true)
      .order('ordre', { ascending: true })

    if (error) throw error

    return (data || []).map((s) => ({
      id: s.id,
      nom: s.nom,
      slug: s.slug,
      ordre: s.ordre,
      actif: s.actif,
    }))
  } catch (error) {
    console.error('❌ Erreur récupération styles photo:', error)
    throw error
  }
}