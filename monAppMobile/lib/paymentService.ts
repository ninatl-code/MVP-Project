import { supabase } from './supabaseClient';

interface CreateMobileSessionParams {
  amount: number;
  currency: string;
  customer_email?: string;
  metadata?: Record<string, string>;
  description?: string;
  annonce_id?: string;
  user_id?: string;
  reservation_id?: string;
}

interface PaymentService {
  createMobileSession: (params: CreateMobileSessionParams) => Promise<any>;
  confirmPayment: (paymentIntentId: string, reservationId?: string) => Promise<any>;
  getPaymentHistory: (userId: string) => Promise<any>;
}

export const paymentService: PaymentService = {
  /**
   * Crée une session de paiement mobile via l'API photo-app
   */
  createMobileSession: async (params: CreateMobileSessionParams) => {
    try {
      // Utiliser l'API existante du photo-app pour créer une session
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annonce_id: params.annonce_id,
          montant_acompte: params.amount,
          user_id: params.user_id,
          email: params.customer_email,
          reservation_id: params.reservation_id,
          // Mode mobile pour différencier du web
          mobile: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur createMobileSession:', error);
      throw error;
    }
  },

  /**
   * Confirme un paiement et met à jour les données
   */
  confirmPayment: async (paymentIntentId: string, reservationId?: string) => {
    try {
      if (reservationId) {
        // Mettre à jour le statut de la réservation
        const { error } = await supabase
          .from('reservations')
          .update({
            statut: 'acompte_paye',
            stripe_payment_intent_id: paymentIntentId,
            date_paiement_acompte: new Date().toISOString(),
          })
          .eq('id', reservationId);

        if (error) {
          console.error('Erreur mise à jour réservation:', error);
          throw error;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur confirmPayment:', error);
      throw error;
    }
  },

  /**
   * Récupère l'historique des paiements d'un utilisateur
   */
  getPaymentHistory: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          annonces (
            titre,
            tarif_unit,
            unit_tarif,
            profiles:prestataire (nom)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur getPaymentHistory:', error);
      throw error;
    }
  },
};

// Types pour les réponses
export interface Reservation {
  id: string;
  annonce_id: string;
  user_id: string;
  montant_total: number;
  montant_acompte: number;
  montant_restant: number;
  statut: 'en_attente_paiement' | 'acompte_paye' | 'termine' | 'annule' | 'paiement_echoue';
  stripe_payment_intent_id?: string;
  date_paiement_acompte?: string;
  created_at: string;
  annonces?: {
    titre: string;
    tarif_unit: number;
    unit_tarif: string;
    profiles: {
      nom: string;
    };
  };
}

export interface PaymentHistory {
  reservations: Reservation[];
  totalPaid: number;
  pendingPayments: number;
}