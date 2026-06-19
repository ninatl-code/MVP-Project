import { supabase } from './supabaseClient';
import * as notificationService from './notificationService';

// ─────────────────────────────────────────────────────────
// VALIDATE PRESTATAIRE PROFILE
// ─────────────────────────────────────────────────────────
export const approuverPrestataire = async (prestataireId) => {
  const { error } = await supabase
    .from('profils_prestataire')
    .update({
      statut_validation: 'approved',
      identite_verifiee: true,
      score_confiance: 100,
      motif_refus: null,
    })
    .eq('id', prestataireId);

  if (error) throw error;

  await notificationService.notifyProfilApprouve(prestataireId);

};

// ─────────────────────────────────────────────────────────
// REFUSE PRESTATAIRE PROFILE
// ─────────────────────────────────────────────────────────
export const refuserPrestataire = async (prestataireId, motif) => {
  const { error } = await supabase
    .from('profils_prestataire')
    .update({
      statut_validation: 'rejected',
      identite_verifiee: false,
      score_confiance: 0,
      motif_refus: motif || null,
    })
    .eq('id', prestataireId);

  if (error) throw error;

  await 
  notificationService.notifyProfilRefuse(prestataireId, motif);
};

// ─────────────────────────────────────────────────────────
// SUSPEND USER
// ─────────────────────────────────────────────────────────
export const suspendreutilisateur = async (userId, raison, role) => {
  const { error } = await supabase
    .from('profiles')
    .update({ suspendu: true, suspension_reason: raison || null , date_suspension: new Date().toISOString()})
    .eq('id', userId);

  if (error) throw error;

  if (role === 'photographe') {
    // Hide prestataire profile from searches
    await supabase
      .from('profils_prestataire')
      .update({ statut_validation: 'suspended' })
      .eq('id', userId);
  }

  if (role === 'particulier') {
    // Deactivate all client demandes
    await supabase
      .from('demandes_client')
      .update({ actif: false })
      .eq('client_id', userId);
  }

  await   notificationService.notifyCompteSuspendu(userId, raison);
};

// ─────────────────────────────────────────────────────────
// REACTIVATE USER
// ─────────────────────────────────────────────────────────
export const reactiverUtilisateur = async (userId, role, previousValidation = 'approved') => {
  const { error } = await supabase
    .from('profiles')
    .update({ suspendu: false, suspension_reason: null })
    .eq('id', userId);

  if (error) throw error;

  if (role === 'photographe') {
    await supabase
      .from('profils_prestataire')
      .update({ statut_validation: previousValidation })
      .eq('id', userId);
  }

  if (role === 'particulier') {
    await supabase
      .from('demandes_client')
      .update({ actif: true })
      .eq('client_id', userId)
      .eq('statut', 'ouverte'); // only reactivate open ones
  }
  await notificationService.notifyCompteReactive (userId);

};

// ─────────────────────────────────────────────────────────
// HIDE DEMANDE
// ─────────────────────────────────────────────────────────
export const masquerDemande = async (demandeId, clientId, raison) => {
  const { error } = await supabase
    .from('demandes_client')
    .update({ actif: false, suspension_reason: raison || null, date_suspension: new Date().toISOString() })
    .eq('id', demandeId);

  if (error) throw error;

  await notificationService.notifyDemandeMasquee(clientId, demandeId, raison);
};

// ─────────────────────────────────────────────────────────
// REACTIVER DEMANDE
// ─────────────────────────────────────────────────────────
export const reactiverDemande = async (demandeId, clientId) => {
  const { error } = await supabase
    .from('demandes_client')
    .update({ actif: true, suspension_reason: null })
    .eq('id', demandeId);

  if (error) throw error;

  await notificationService.notifyDemandeReactive(clientId, demandeId);
};

// ─────────────────────────────────────────────────────────
// HIDE AVIS
// ─────────────────────────────────────────────────────────
export const masquerAvis = async (avisId, auteurId, prestataireId, raison) => {
  const { error } = await supabase
    .from('reviews_presta')
    .update({ visible: false, nonvisibility_reason: raison || null })
    .eq('id', avisId);

  if (error) throw error;

  await Promise.all([
    
    notificationService.notifyAvisMasqueClient(auteurId, avisId, raison),
    
    notificationService.notifyAvisMasquePresta(prestataireId, avisId, raison),

  ]);
};


// ─────────────────────────────────────────────────────────
// WARN USER
// ─────────────────────────────────────────────────────────
export const avertirUtilisateur = async (userId, raison, severity = 'warning', adminId) => {
  const { error } = await supabase
    .from('avertissements')
    .insert({ user_id: userId, reason: raison, severity, admin_id: adminId || null });

  if (error) throw error;

  const labels = { info: 'ℹ️ Information', warning: '⚠️ Avertissement', severe: '🚨 Avertissement grave' };
  const avertissementId = (await supabase.from('avertissements').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()).data.id;
  await notificationService.notifyAvertissement(userId, raison, avertissementId);
};

// ─────────────────────────────────────────────────────────
// CLOSE SIGNALEMENT
// ─────────────────────────────────────────────────────────
export const cloturerSignalement = async (signalementId, reporterId, adminComment) => {
  const { error } = await supabase
    .from('signalements')
    .update({
      status: 'closed',
      admin_comment: adminComment || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signalementId);

  if (error) throw error;

  await notificationService.notifySignalementCloture(reporterId, signalementId); 

};

// ─────────────────────────────────────────────────────────
// CREATE SIGNALEMENT (user-facing)
// ─────────────────────────────────────────────────────────
export const creerSignalement = async ({ reporterId, targetType, targetId, reason, description }) => {
  const { data, error } = await supabase
    .from('signalements')
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: String(targetId),
      reason,
      description: description || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
