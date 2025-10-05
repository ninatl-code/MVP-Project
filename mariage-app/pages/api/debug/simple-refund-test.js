// API simplifiée pour tester les remboursements sans Stripe
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("🔄 Test de remboursement simple:", new Date().toISOString());

  try {
    const { reservationId, cancelReason, userId } = req.body;

    if (!reservationId || !userId) {
      return res.status(400).json({ error: 'reservationId et userId requis' });
    }

    console.log("🔍 Paramètres reçus:", { reservationId, userId, cancelReason });

    // Test de récupération de réservation avec plusieurs méthodes
    let reservation = null;
    let columnUsed = null;

    // Méthode 1: avec particulier_id
    const { data: res1, error: err1 } = await supabase
      .from('reservations')
      .select(`
        *,
        annonces!reservations_annonce_id_fkey(id, titre, condition_annulation, conditions_annulation)
      `)
      .eq('id', reservationId)
      .eq('particulier_id', userId);

    console.log("🔍 Test avec particulier_id:", { res1, err1 });

    if (res1 && res1.length > 0) {
      reservation = res1[0];
      columnUsed = 'particulier_id';
    } else {
      // Méthode 2: avec particulier
      const { data: res2, error: err2 } = await supabase
        .from('reservations')
        .select(`
          *,
          annonces!reservations_annonce_id_fkey(id, titre, condition_annulation, conditions_annulation)
        `)
        .eq('id', reservationId)
        .eq('particulier', userId);

      console.log("🔍 Test avec particulier:", { res2, err2 });

      if (res2 && res2.length > 0) {
        reservation = res2[0];
        columnUsed = 'particulier';
      }
    }

    if (!reservation) {
      // Test final: réservation sans filtrage par utilisateur
      const { data: res3, error: err3 } = await supabase
        .from('reservations')
        .select(`
          *,
          annonces!reservations_annonce_id_fkey(id, titre, condition_annulation, conditions_annulation)
        `)
        .eq('id', reservationId);

      console.log("🔍 Test sans filtre utilisateur:", { res3, err3 });

      if (res3 && res3.length > 0) {
        return res.status(400).json({ 
          error: 'Réservation trouvée mais n\'appartient pas à l\'utilisateur',
          reservation: res3[0],
          expectedUserId: userId
        });
      } else {
        return res.status(404).json({ 
          error: 'Réservation non trouvée',
          reservationId,
          userId
        });
      }
    }

    // Calculer les conditions de remboursement
    const conditionAnnulation = reservation.annonces?.condition_annulation || 
                               reservation.annonces?.conditions_annulation || 
                               'Flexible';

    const reservationDate = new Date(reservation.date);
    const currentDate = new Date();
    const timeDiff = reservationDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

    let refundPercentage = 0;
    let canRefund = false;

    switch (conditionAnnulation) {
      case 'Flexible':
        if (hoursDiff >= 24) {
          canRefund = true;
          refundPercentage = 100;
        }
        break;
      case 'Modéré':
        if (daysDiff >= 7) {
          canRefund = true;
          refundPercentage = 100;
        } else if (daysDiff >= 1) {
          canRefund = true;
          refundPercentage = 50;
        }
        break;
      case 'Strict':
        if (cancelReason && cancelReason.trim().length >= 20) {
          canRefund = true;
          refundPercentage = 0; // Force majeure - remboursement admin requis
        }
        break;
      default:
        if (hoursDiff >= 24) {
          canRefund = true;
          refundPercentage = 100;
        }
    }

    // Mettre à jour la réservation avec le statut cancelled
    const { data: updateResult, error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        date_annulation: new Date().toISOString(),
        motif_annulation: cancelReason || 'Annulation selon conditions'
      })
      .eq('id', reservationId)
      .select();

    if (updateError) {
      return res.status(500).json({
        error: 'Erreur lors de la mise à jour de la réservation',
        details: updateError
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Réservation annulée avec succès',
      reservation: updateResult[0],
      originalReservation: reservation,
      columnUsed,
      conditionAnnulation,
      timeCalculation: {
        reservationDate: reservationDate.toISOString(),
        currentDate: currentDate.toISOString(),
        daysDiff,
        hoursDiff
      },
      refundCalculation: {
        canRefund,
        refundPercentage,
        montantOriginal: reservation.montant || 0,
        montantRembourse: Math.round(((reservation.montant || 0) * refundPercentage) / 100)
      }
    });

  } catch (error) {
    console.error('Erreur test simple:', error);
    return res.status(500).json({ 
      error: 'Erreur interne',
      details: error.message 
    });
  }
}