import { supabase } from './supabaseClient';
import { notifyNewDevis } from './notificationService';
import { fulfillDemande } from './demandeService';
import * as reservationService from  './reservationService';

/**
 * Create a new devis (quote) from service provider
 */
export const createDevis = async ({
  photographeId,
  clientId,
  demandeId,
  tarif_base,
  options_supplementaires = [],
  frais_deplacement = 0,
  message_personnalise,
  date_expiration,
  duree_prestation_heures,
  titre,
  description,
  acompte_percent = 0,
  acompte_montant = 0,
}) => {
  try {
    const montant_total = tarif_base + frais_deplacement;

    const { data, error } = await supabase
      .from('devis')
      .insert({
        prestataire_id: photographeId,
        client_id: clientId,
        demande_id: demandeId,
        titre: titre || 'Devis',
        description: description || '',
        tarif_base,
        frais_deplacement,
        options_supplementaires,
        montant_total,
        message_personnalise,
        date_expiration: typeof date_expiration === 'number'
        ? new Date(Date.now() + date_expiration * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : date_expiration,
        duree_prestation_heures,
        statut: 'envoye',
        acompte_percent,
        acompte_montant,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify client that a new devis was received
    notifyNewDevis (clientId, data.id, data.prestataire_id, data.demande_id);

    return { data, error: null };
  } catch (error) {
    console.error('Error creating devis:', error);
    return { data: null, error };
  }
};

/**
 * Get all devis sent by a service provider
 */
export const getPhotographeDevis = async (photographeId, status = null) => {
  try {
    let query = supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_client_id_fkey(nom, email, avatar_url),
        demandes_client(titre, categorie, lieu, date_souhaitee)
      `)
      .eq('prestataire_id', photographeId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('statut', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching service provider devis:', error);
    return { data: null, error };
  }
};

/**
 * Get all devis received by a client
 */
export const getClientDevis = async (clientId, status = null) => {
  try {
    let query = supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_prestatairep_id_fkey(id, nom, email, avatar_url),
        demandes_client(titre, categorie)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('statut', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching client devis:', error);
    return { data: null, error };
  }
};

/**
 * Get devis for a specific demande
 */
export const getDevisForDemande = async (demandeId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_prestatairep_id_fkey(
          id, 
          nom, 
          email, 
          avatar_url), profils_prestataire!devis_prestataire_id_fkey
          (
            note_moyenne,
            nb_avis,
            specialisations,
            portfolio_photos
          )
      `)
      .eq('demande_id', demandeId)
      .order('montant_total', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching devis for demande:', error);
    return { data: null, error };
  }
};

/**
 * Get single devis details
 */
export const getDevisById = async (devisId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        profiles!devis_prestatairep_id_fkey(id, nom, email, telephone, avatar_url),
        profiles!devis_client_id_fkey(id, nom, email, telephone, avatar_url),
        demandes_client(*)
      `)
      .eq('id', devisId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching devis:', error);
    return { data: null, error };
  }
};

/**
 * Accept a devis (client action)
 */
export const acceptDevis = async (devisId) => {
  try {
    // Get devis details first
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .single();

    if (devisError) throw devisError;

    // Update devis status
    const { data, error } = await supabase
      .from('devis')
      .update({
        statut: 'accepte',
        accepte_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();

    if (error) throw error;

    // Create reservation from accepted devis
    const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const { data: reservation, error: resError } = await reservationService.createReservation({
      client_id: devis.client_id,
      prestataire_id: devis.prestataire_id,
      devis_id: devisId,
      titre: devis.titre || 'Réservation',
      categorie: 'photographie',
      date: new Date().toISOString().split('T')[0],
      lieu: 'À définir',
      montant_total: devis.montant_total,
      acompte_montant: devis.acompte_montant || 0,
      statut: 'pending',
    })
      .select()
      .single();

    if (resError) {
      console.error('Error creating reservation:', resError);
    }

    // Mark demande as fulfilled if exists
    if (devis.demande_id) {
      await fulfillDemande(devis.demande_id);
    }

    return { data, reservation, error: null };
  } catch (error) {
    console.error('Error accepting devis:', error);
    
    const {error:notifError} = await notifyDevisAccepted (devis.prestataire_id,devisId,devis.demande_id);
    if (notifError) {
      console.error('Notification error:',notifError);
    }

    return { data: updatedDevis, reservation, error:null,};
  } 
};

/**
 * Reject a devis (client action)
 */
export const rejectDevis = async (devisId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .update({
        statut: 'refuse',
        raison_refus: reason,
        refuse_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .select()
      .single();
    
    const {error:notifError} = await notifyDevisRejected (devis.prestataire_id,devisId,devis.demande_id);
    if (notifError) {
      console.error('Notification error:', notifError);
    }
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting devis:', error);
    return { data: null, error };
  }
    
};

/**
 * Cancel a devis (service provider action)
 */
export const cancelDevis = async (devisId = null, demandeId = null) => {
  try {
    let query = supabase
      .from('devis')
      .update({
        statut: 'expire',
        expire_at: new Date().toISOString(),
      })
      .in('statut', ['envoye', 'lu']);

    if (devisId) {
      query = query.eq('id', devisId);
    } else if (demandeId) {
      query = query.in('demande_id', Array.isArray(demandeId) ? demandeId : [demandeId]);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error cancelling devis:', error);
    return { data: null, error };
  }
};

/**
 * Update devis (only if still pending)
 */
export const updateDevis = async (devisId, updates) => {
  try {
    // Recalculate total if pricing changed
    let montant_total = updates.tarif_base || 0;
    if (updates.options) {
      montant_total += updates.options.reduce((sum, opt) => sum + (opt.prix || 0), 0);
    }
    if (updates.frais_deplacement) {
      montant_total += updates.frais_deplacement;
    }

    const { data, error } = await supabase
      .from('devis')
      .update({
        ...updates,
        montant_total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', devisId)
      .eq('statut', 'envoye') // Only update pending devis
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating devis:', error);
    return { data: null, error };
  }
};

/**
 * Get devis statistics for service provider
 */
export const getDevisStats = async (photographeId) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('statut, montant_total')
      .eq('prestataire_id', photographeId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(d => d.statut === 'envoye').length || 0,
      accepted: data?.filter(d => d.statut === 'accepte').length || 0,
      rejected: data?.filter(d => d.statut === 'refuse').length || 0,
      cancelled: data?.filter(d => d.statut === 'expire').length || 0,
      totalRevenue: data?.filter(d => d.statut === 'accepte').reduce((sum, d) => sum + d.montant_total, 0) || 0,
      conversionRate: data?.length > 0 
        ? ((data.filter(d => d.statut === 'accepte').length / data.length) * 100).toFixed(1) 
        : 0,
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching devis stats:', error);
    return { stats: null, error };
  }
};

/**
 * Devis status labels and colors
 */
export const DEVIS_STATUS = {
  pending: { label: 'En attente', color: 'yellow' },
  accepted: { label: 'Accepté', color: 'green' },
  rejected: { label: 'Refusé', color: 'red' },
  cancelled: { label: 'Annulé', color: 'gray' },
  expired: { label: 'Expiré', color: 'gray' },
};

export default {
  createDevis,
  getPhotographeDevis,
  getClientDevis,
  getDevisForDemande,
  getDevisById,
  acceptDevis,
  rejectDevis,
  cancelDevis,
  updateDevis,
  getDevisStats,
  DEVIS_STATUS,
};
