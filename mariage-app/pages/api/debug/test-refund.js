// Test API pour débugger le système de remboursement
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test 1: Vérifier les réservations existantes
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, particulier, particulier_id, prestataire_id, annonce_id, date, montant, status')
      .limit(5);

    // Test 2: Vérifier les annonces avec conditions
    const { data: annonces, error: annonceError } = await supabase
      .from('annonces')
      .select('id, titre, condition_annulation, conditions_annulation')
      .limit(5);

    // Test 3: Vérifier les paiements
    const { data: paiements, error: paiementError } = await supabase
      .from('paiements')
      .select('id, reservation_id, stripe_payment_intent_id, montant, statut')
      .limit(5);

    return res.status(200).json({
      success: true,
      debug: {
        reservations: {
          data: reservations,
          error: resError,
          count: reservations?.length || 0
        },
        annonces: {
          data: annonces,
          error: annonceError,
          count: annonces?.length || 0
        },
        paiements: {
          data: paiements,
          error: paiementError,
          count: paiements?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur test debug:', error);
    return res.status(500).json({ 
      error: 'Erreur interne',
      details: error.message 
    });
  }
}