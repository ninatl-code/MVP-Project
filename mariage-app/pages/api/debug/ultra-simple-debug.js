// API ultra-simple pour débugger le problème de réservation
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reservationId, userId } = req.body;

    console.log("🔍 DEBUT DEBUG - Données reçues:", { reservationId, userId });

    // Étape 1: Voir si la réservation existe tout court (sans filtre)
    const { data: allReservations, error: allError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId);

    console.log("🔍 ÉTAPE 1 - Réservation existe?", { allReservations, allError });

    if (allError) {
      return res.status(500).json({ 
        error: 'Erreur base de données',
        details: allError 
      });
    }

    if (!allReservations || allReservations.length === 0) {
      return res.status(404).json({ 
        error: 'ID de réservation inexistant',
        reservationId,
        message: 'Aucune réservation trouvée avec cet ID'
      });
    }

    const foundReservation = allReservations[0];
    console.log("🔍 ÉTAPE 2 - Réservation trouvée:", foundReservation);

    // Étape 2: Vérifier les colonnes disponibles
    const columnCheck = {
      hasParticulier: 'particulier' in foundReservation,
      hasParticulierId: 'particulier_id' in foundReservation,
      particulierValue: foundReservation.particulier,
      particulierIdValue: foundReservation.particulier_id,
      userId: userId,
      userIdType: typeof userId
    };

    console.log("🔍 ÉTAPE 3 - Analyse des colonnes:", columnCheck);

    // Étape 3: Test des correspondances
    let ownershipTest = {
      particulierMatch: foundReservation.particulier === userId,
      particulierIdMatch: foundReservation.particulier_id === userId,
      belongsToUser: false
    };

    if (foundReservation.particulier === userId) {
      ownershipTest.belongsToUser = true;
      ownershipTest.matchedColumn = 'particulier';
    } else if (foundReservation.particulier_id === userId) {
      ownershipTest.belongsToUser = true;
      ownershipTest.matchedColumn = 'particulier_id';
    }

    console.log("🔍 ÉTAPE 4 - Test de propriété:", ownershipTest);

    // Étape 4: Vérifier si l'annonce existe et a des conditions
    let annonceInfo = null;
    if (foundReservation.annonce_id) {
      const { data: annonceData, error: annonceError } = await supabase
        .from('annonces')
        .select('id, titre, condition_annulation, conditions_annulation')
        .eq('id', foundReservation.annonce_id)
        .single();

      annonceInfo = { annonceData, annonceError };
      console.log("🔍 ÉTAPE 5 - Info annonce:", annonceInfo);
    }

    // Si tout va bien, on procède à l'annulation
    if (ownershipTest.belongsToUser) {
      const { cancelReason } = req.body;
      
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

      console.log("🔍 ÉTAPE 6 - Mise à jour réservation:", { updateResult, updateError });

      if (updateError) {
        return res.status(500).json({
          error: 'Erreur lors de la mise à jour',
          details: updateError
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Réservation annulée avec succès',
        reservation: updateResult[0],
        debug: {
          reservationFound: true,
          reservation: foundReservation,
          columnAnalysis: columnCheck,
          ownershipTest: ownershipTest,
          annonceInfo: annonceInfo,
          updateResult: updateResult
        }
      });
    } else {
      return res.status(403).json({
        error: 'Cette réservation ne vous appartient pas',
        debug: {
          reservationFound: true,
          reservation: foundReservation,
          columnAnalysis: columnCheck,
          ownershipTest: ownershipTest,
          canProceed: false
        }
      });
    }

  } catch (error) {
    console.error('🚨 ERREUR COMPLÈTE:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message,
      stack: error.stack 
    });
  }
}