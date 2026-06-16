import { supabase } from './supabaseClient';
import { createNotification, NOTIFICATION_TYPES } from './notificationService';

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

  await createNotification({
    userId: prestataireId,
    type: NOTIFICATION_TYPES.PROFIL_APPROUVE,
    titre: '✅ Profil approuvé',
    contenu: 'Félicitations ! Votre profil a été validé. Vous êtes maintenant visible dans les recherches.',
  });
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

  await createNotification({
    userId: prestataireId,
    type: NOTIFICATION_TYPES.PROFIL_REFUSE,
    titre: '❌ Profil non validé',
    contenu: motif
      ? `Votre profil n'a pas été validé. Raison : ${motif}`
      : "Votre profil n'a pas été validé par notre équipe.",
  });
};

// ─────────────────────────────────────────────────────────
// SUSPEND USER
// ─────────────────────────────────────────────────────────
export const suspendreutilisateur = async (userId, raison, role) => {
  const { error } = await supabase
    .from('profiles')
    .update({ suspendu: true, suspension_reason: raison || null })
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

  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.COMPTE_SUSPENDU,
    titre: '⚠️ Compte suspendu',
    contenu: raison
      ? `Votre compte a été suspendu. Raison : ${raison}`
      : 'Votre compte a été suspendu par notre équipe.',
  });
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

  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.COMPTE_REACTIVE,
    titre: '✅ Compte réactivé',
    contenu: 'Votre compte a été réactivé. Vous pouvez à nouveau utiliser la plateforme.',
  });
};

// ─────────────────────────────────────────────────────────
// HIDE DEMANDE
// ─────────────────────────────────────────────────────────
export const masquerDemande = async (demandeId, clientId, raison) => {
  const { error } = await supabase
    .from('demandes_client')
    .update({ actif: false, suspension_reason: raison || null })
    .eq('id', demandeId);

  if (error) throw error;

  await createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.DEMANDE_MASQUEE,
    titre: '🚫 Demande masquée',
    contenu: raison
      ? `Votre demande a été masquée. Raison : ${raison}`
      : 'Votre demande a été masquée par notre équipe.',
    demandeId,
  });
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
    createNotification({
      userId: auteurId,
      type: NOTIFICATION_TYPES.AVIS_MASQUE,
      titre: '🚫 Avis masqué',
      contenu: raison
        ? `Votre avis a été masqué. Raison : ${raison}`
        : 'Votre avis a été masqué par notre équipe.',
    }),
    createNotification({
      userId: prestataireId,
      type: NOTIFICATION_TYPES.AVIS_MASQUE,
      titre: '🚫 Un avis a été masqué',
      contenu: "Un avis sur votre profil a été masqué par notre équipe de modération.",
    }),
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

  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.AVERTISSEMENT,
    titre: labels[severity] || '⚠️ Avertissement',
    contenu: raison,
  });
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

  await createNotification({
    userId: reporterId,
    type: NOTIFICATION_TYPES.SIGNALEMENT_CLOTURE,
    titre: '✅ Signalement traité',
    contenu: adminComment
      ? `Votre signalement a été traité. Réponse de l'équipe : ${adminComment}`
      : 'Votre signalement a été traité par notre équipe.',
  });
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
