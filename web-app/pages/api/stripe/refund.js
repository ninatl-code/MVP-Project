import { stripe } from "./init";
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  console.log('🔥 API REFUND - Début de traitement');
  console.log('📝 Paramètres reçus:', { reservationId, cancelReason, userId });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reservationId, cancelReason, userId } = req.body;

    if (!reservationId || !userId) {
      console.log('❌ Paramètres manquants:', { reservationId, userId });
      return res.status(400).json({ error: 'reservationId et userId requis' });
    }

    // 1. Récupérer les informations de la réservation ou commande
    console.log('🔍 Recherche de la réservation/commande ID:', reservationId);
    
    let reservation = null;
    let resError = null;
    let isReservation = false;

    // Essayer d'abord dans la table reservations
    console.log('🔍 Recherche dans la table reservations...');
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        prestations_photographe!reservations_annonce_id_fkey(conditions_annulation, titre)
      `)
      .eq('id', reservationId)
      .eq('particulier_id', userId)
      .single();

    console.log('📊 Résultat reservations:', { data: reservationData, error: reservationError });

    if (!reservationError && reservationData) {
      reservation = reservationData;
      isReservation = true;
      console.log('✅ Trouvé dans reservations:', reservation);
    } else {
      // Essayer dans la table commandes si pas trouvé dans reservations
      console.log('🔍 Recherche dans la table commandes...');
      const { data: commandeData, error: commandeError } = await supabase
        .from('commandes')
        .select(`
          *,
          prestations_photographe!commandes_annonce_id_fkey(conditions_annulation, titre)
        `)
        .eq('id', reservationId)
        .eq('particulier_id', userId)
        .single();

      console.log('📊 Résultat commandes:', { data: commandeData, error: commandeError });

      if (!commandeError && commandeData) {
        reservation = commandeData;
        isReservation = false;
        console.log('✅ Trouvé dans commandes:', reservation);
        // Pour les commandes, on applique une politique d'annulation flexible par défaut
        if (!reservation.annonces?.conditions_annulation) {
          reservation.annonces = { 
            ...reservation.annonces, 
            conditions_annulation: 'Flexible' 
          };
        }
      } else {
        resError = reservationError || commandeError;
        console.log('❌ Aucune réservation/commande trouvée:', resError);
      }
    }

    if (resError || !reservation) {
      console.log('❌ Erreur finale - Réservation/commande introuvable');
      return res.status(404).json({ error: 'Réservation ou commande non trouvée' });
    }

    // 2. Vérifier les conditions d'annulation
    const conditionAnnulation = reservation.annonces?.conditions_annulation;
    const reservationDate = new Date(reservation.date);
    const currentDate = new Date();
    const timeDiff = reservationDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

    let refundPercentage = 0;
    let canRefund = false;
    let refundReason = '';

    switch (conditionAnnulation) {
      case 'Flexible':
        if (hoursDiff >= 24) {
          canRefund = true;
          refundPercentage = 100;
          refundReason = 'Annulation flexible - Plus de 24h avant';
        }
        break;

      case 'Modéré':
        if (daysDiff >= 7) {
          canRefund = true;
          refundPercentage = 100;
          refundReason = 'Annulation modérée - Plus de 7 jours avant';
        } else if (daysDiff >= 1) {
          canRefund = true;
          refundPercentage = 50;
          refundReason = 'Annulation modérée - Moins de 7 jours, remboursement partiel';
        }
        break;

      case 'Strict':
        // Pour les conditions strictes, on permet le remboursement uniquement si justification de force majeure
        if (cancelReason && cancelReason.trim().length >= 20) {
          canRefund = true;
          refundPercentage = 0;
          refundReason = 'Force majeure - Pas de remboursement automatique';
        }
        break;

      default:
        // Politique par défaut
        if (hoursDiff >= 24) {
          canRefund = true;
          refundPercentage = 100;
          refundReason = 'Politique par défaut - Plus de 24h avant';
        }
    }

    if (!canRefund) {
      return res.status(400).json({ 
        error: 'Annulation non autorisée selon les conditions',
        conditionAnnulation,
        timeRemaining: { daysDiff, hoursDiff }
      });
    }

    // 3. Récupérer le paiement Stripe associé ou utiliser le montant de la réservation
    const { data: paiement, error: paiementError } = await supabase
      .from('paiements')
      .select('stripe_payment_intent_id, montant, stripe_session_id')
      .eq('reservation_id', reservationId)
      .eq('statut', 'succeeded')
      .single();

    let montantOriginal = reservation.montant || 0;
    let stripePaymentIntentId = null;

    if (!paiementError && paiement) {
      montantOriginal = paiement.montant;
      stripePaymentIntentId = paiement.stripe_payment_intent_id;
    } else {
      if (!montantOriginal) {
        return res.status(400).json({ error: 'Aucun montant à rembourser trouvé' });
      }
    }

    // 4. Calculer le montant de remboursement
    const montantRembourse = Math.round((montantOriginal * refundPercentage) / 100);
    let stripeRefund = null;
    let refundMethod = 'no_refund';

    // 5. Traiter le remboursement Stripe si nécessaire
    if (refundPercentage > 0 && stripePaymentIntentId) {
      try {
        stripeRefund = await stripe.refunds.create({
          payment_intent: stripePaymentIntentId,
          amount: montantRemburse * 100, // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            reservation_id: reservationId,
            user_id: userId,
            refund_percentage: refundPercentage.toString(),
            original_amount: montantOriginal.toString(),
            condition_annulation: conditionAnnulation
          }
        });

        refundMethod = 'stripe_automatic';
        
      } catch (stripeError) {
        // Si le charge a déjà été remboursé, on considère que c'est OK
        if (stripeError.code === 'charge_already_refunded') {
          refundMethod = 'already_refunded';
        } else {
          refundMethod = 'stripe_failed';
        }
      }
    } else if (refundPercentage > 0) {
      refundMethod = 'manual_required';
    }

    // 6. Enregistrer le remboursement dans notre base
    console.log('💾 Préparation des données de remboursement...');
    console.log('📋 isReservation:', isReservation);
    
    const remboursementData = {
      particulier_id: userId,
      prestataire_id: reservation.prestataire_id,
      annonce_id: reservation.annonce_id,
      montant_original: montantOriginal,
      pourcentage_remboursement: refundPercentage,
      montant_rembourse: montantRembourse,
      stripe_charge_id: stripePaymentIntentId,
      stripe_refund_id: stripeRefund?.id || null,
      stripe_status: stripeRefund ? 'succeeded' : (refundPercentage > 0 ? 'pending' : 'succeeded'),
      motif_annulation: cancelReason || refundReason,
      condition_appliquee: conditionAnnulation,
      force_majeure: conditionAnnulation === 'Strict',
      date_reservation: reservation.date,
      date_remboursement: stripeRefund ? new Date().toISOString() : null,
      status: stripeRefund ? 'completed' : (refundPercentage > 0 ? 'processing' : 'completed')
    };

    // Ajouter l'ID approprié selon le type (réservation ou commande)
    if (isReservation) {
      remboursementData.reservation_id = reservationId;
      console.log('🏷️ Ajout reservation_id:', reservationId);
    } else {
      remboursementData.commande_id = reservationId;
      console.log('🏷️ Ajout commande_id:', reservationId);
    }

    console.log('📝 Données complètes à insérer:', remboursementData);

    const { data: remboursementResult, error: refundError } = await supabase
      .from('remboursements')
      .insert([remboursementData])
      .select();

    console.log('💾 Résultat insertion remboursements:', { data: remboursementResult, error: refundError });

    if (refundError) {
      console.log('❌ Erreur lors de l\'insertion du remboursement:', refundError);
      return res.status(500).json({ error: 'Erreur enregistrement remboursement' });
    }

    // 7. Mettre à jour le statut de la réservation ou commande
    const tableName = isReservation ? 'reservations' : 'commandes';
    console.log('🔄 Mise à jour du statut dans la table:', tableName, 'ID:', reservationId);
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ 
        status: 'cancelled',
        date_annulation: new Date().toISOString(),
        motif_annulation: cancelReason || refundReason
      })
      .eq('id', reservationId);

    console.log('📊 Résultat mise à jour statut:', { error: updateError });

    if (updateError) {
      console.log('❌ Erreur mise à jour statut:', updateError);
      return res.status(500).json({ error: `Erreur mise à jour ${tableName}` });
    }

    // 8. Envoyer notification au particulier (client)
    const notificationType = isReservation ? 'reservation' : 'commande';
    console.log('🔔 Envoi notification au particulier:', reservation.particulier_id);
    
    let contenuClient = '';
    if (isReservation) {
      contenuClient = 'Votre réservation a été annulée par le prestataire. Si un acompte a été payé, vous serez remboursé dans les plus brefs délais selon les conditions d\'annulation du prestataire';
    } else {
      contenuClient = 'Votre commande a été annulée par le prestataire. Vous serez remboursé dans les plus brefs délais';
    }
    
    const { error: notifError } = await supabase
      .from('notifications')
      .insert([{
        user_id: reservation.particulier_id,
        type: notificationType,
        contenu: contenuClient,
        [isReservation ? 'reservation_id' : 'commande_id']: reservationId
      }]);

    console.log('📊 Résultat notification:', { error: notifError });

    // 9. Réponse selon le type de remboursement
    console.log('🎯 Préparation de la réponse finale...');
    const responseMessage = {
      'stripe_automatic': `Remboursement automatique de ${montantRembourse} DH effectué via Stripe`,
      'already_refunded': `Cette réservation a déjà été remboursée`,
      'stripe_failed': `Échec du remboursement automatique. Remboursement manuel de ${montantRembourse} DH requis`,
      'manual_required': `Remboursement manuel de ${montantRembourse} DH requis (paiement non-Stripe)`,
      'no_refund': 'Annulation confirmée. Aucun remboursement selon les conditions d\'annulation'
    };

    const finalResponse = {
      success: true,
      message: responseMessage[refundMethod],
      refund_method: refundMethod,
      montant_remboursement: montantRembourse,
      pourcentage_remboursement: refundPercentage,
      condition_appliquee: conditionAnnulation,
      stripe_refund_id: stripeRefund?.id || null,
      remboursement_id: remboursementResult?.[0]?.id
    };

    console.log('✅ SUCCÈS - Réponse finale:', finalResponse);
    
    return res.status(200).json(finalResponse);

  } catch (error) {
    console.log('💥 ERREUR GLOBALE:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message 
    });
  }
}