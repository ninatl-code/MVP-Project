import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import Header from '../../../../components/HeaderParti';
import { 
  ArrowLeft, CreditCard, Lock, Shield, Check, 
  AlertCircle, Euro, Calendar, Camera, CheckCircle
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function DevisPaymentPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId } = useAuth();
  
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDevis();
    }
  }, [id]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          photographe:profils_photographe(
            id,
            nom_entreprise,
            photo_profil,
            stripe_account_id,
            verifie,
            profile:profiles(nom, prenom)
          ),
          demande:demandes_client(
            id,
            titre,
            date_souhaitee,
            lieu
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setDevis(data);
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!agreedToTerms) {
      setError('Veuillez accepter les conditions générales');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Calculate amounts
      const depositAmount = Math.round(devis.montant * 0.30); // 30% deposit
      const platformFee = Math.round(depositAmount * 0.15); // 15% platform fee

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-marketplace-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId: id,
          clientId: profileId,
          photographeId: devis.photographe_id,
          photographeStripeAccountId: devis.photographe?.stripe_account_id,
          amount: depositAmount,
          platformFee,
          description: `Acompte - ${devis.titre || devis.demande?.titre || 'Prestation photo'}`,
          successUrl: `${window.location.origin}/client/payment/success?devis=${id}`,
          cancelUrl: `${window.location.origin}/client/devis/${id}/payment`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'À définir';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Devis introuvable</h2>
          <button
            onClick={() => router.push('/client/demandes')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  const photographe = devis.photographe;
  const profile = photographe?.profile;
  const demande = devis.demande;
  const depositAmount = Math.round(devis.montant * 0.30);
  const remainingAmount = devis.montant - depositAmount;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push(`/client/devis/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au devis
        </button>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Payment form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Paiement de l'acompte</h1>
                  <p className="text-sm text-gray-500">Sécurisé par Stripe</p>
                </div>
              </div>

              {/* Reservation summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Récapitulatif</h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {photographe?.photo_profil ? (
                      <img
                        src={photographe.photo_profil}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {devis.titre || demande?.titre || 'Prestation photo'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(demande?.date_souhaitee)}</span>
                  </div>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="border-t border-gray-100 pt-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Détail du paiement</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Montant total de la prestation</span>
                    <span className="font-medium">{devis.montant}€</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>Acompte à payer maintenant (30%)</span>
                    <span className="font-bold text-lg">{depositAmount}€</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Solde à régler après la prestation</span>
                    <span>{remainingAmount}€</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">
                    J'accepte les{' '}
                    <a href="/terms" className="text-indigo-600 hover:underline">
                      conditions générales de vente
                    </a>{' '}
                    et la{' '}
                    <a href="/privacy" className="text-indigo-600 hover:underline">
                      politique de confidentialité
                    </a>
                    . Je comprends que l'acompte est remboursable en cas d'annulation
                    plus de 48h avant la prestation.
                  </span>
                </label>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePayment}
                disabled={processing || !agreedToTerms}
                className="w-full px-6 py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Redirection vers le paiement...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Payer {depositAmount}€
                  </>
                )}
              </button>

              {/* Security info */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Paiement sécurisé SSL
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Protection acheteur
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Why book with us */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Pourquoi réserver ici ?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Paiement sécurisé</p>
                    <p className="text-sm text-gray-500">
                      Vos données sont protégées par Stripe
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Annulation gratuite</p>
                    <p className="text-sm text-gray-500">
                      Remboursement intégral jusqu'à 48h avant
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Protection garantie</p>
                    <p className="text-sm text-gray-500">
                      Notre équipe vous accompagne en cas de litige
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Photographes vérifiés</p>
                    <p className="text-sm text-gray-500">
                      Tous nos photographes sont contrôlés
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="bg-indigo-50 rounded-xl p-4">
              <h4 className="font-medium text-indigo-900 mb-2">Besoin d'aide ?</h4>
              <p className="text-sm text-indigo-700 mb-3">
                Notre équipe est disponible pour répondre à vos questions avant le paiement.
              </p>
              <button
                onClick={() => router.push('/support')}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Contacter le support →
              </button>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Moyens de paiement acceptés</h3>
              <div className="flex flex-wrap gap-2">
                {['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'].map((method) => (
                  <span
                    key={method}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
