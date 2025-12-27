import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  CheckCircle, Calendar, MapPin, Camera, 
  ArrowRight, Download, MessageSquare, Home
} from 'lucide-react';
import confetti from 'canvas-confetti';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { devis: devisId, reservation: reservationId } = router.query;
  const { user } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trigger confetti animation
    if (typeof window !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    if (devisId || reservationId) {
      fetchBookingDetails();
    }
  }, [devisId, reservationId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      if (reservationId) {
        // Fetch existing reservation
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            *,
            photographe:profils_photographe(
              nom_entreprise,
              photo_profil,
              profile:profiles(nom, prenom)
            )
          `)
          .eq('id', reservationId)
          .single();

        if (error) throw error;
        setBooking(data);
      } else if (devisId) {
        // Fetch devis and create reservation if needed
        const { data: devisData, error: devisError } = await supabase
          .from('devis')
          .select(`
            *,
            photographe:profils_photographe(
              nom_entreprise,
              photo_profil,
              profile:profiles(nom, prenom)
            ),
            demande:demandes_client(
              titre,
              date_souhaitee,
              lieu
            )
          `)
          .eq('id', devisId)
          .single();

        if (devisError) throw devisError;
        
        setBooking({
          ...devisData,
          date_prestation: devisData.demande?.date_souhaitee,
          lieu: devisData.demande?.lieu,
          titre: devisData.titre || devisData.demande?.titre,
          montant_total: devisData.montant,
        });
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'À définir';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
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

  const photographe = booking?.photographe;
  const profile = photographe?.profile;
  const depositAmount = Math.round((booking?.montant_total || booking?.montant || 0) * 0.30);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Réservation confirmée !
          </h1>
          <p className="text-gray-600">
            Votre paiement a été accepté. Le photographe a été notifié de votre réservation.
          </p>
        </div>

        {/* Booking summary card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          {/* Photographer header */}
          <div className="bg-indigo-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                {photographe?.photo_profil ? (
                  <img
                    src={photographe.photo_profil}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <p className="text-indigo-200 text-sm">Votre photographe</p>
                <h2 className="text-xl font-semibold">
                  {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
                </h2>
              </div>
            </div>
          </div>

          {/* Booking details */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {booking?.titre || 'Prestation photo'}
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>{formatDate(booking?.date_prestation)}</span>
              </div>
              {booking?.lieu && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span>{booking.lieu}</span>
                </div>
              )}
            </div>

            {/* Payment summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Acompte payé</span>
                <span className="font-semibold text-green-600">{depositAmount}€</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Solde restant</span>
                <span>{(booking?.montant_total || booking?.montant || 0) - depositAmount}€</span>
              </div>
            </div>
          </div>

          {/* Confirmation number */}
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Numéro de confirmation</p>
                <p className="font-mono font-semibold text-gray-900">
                  #{(reservationId || devisId || '').substring(0, 8).toUpperCase()}
                </p>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <div>
                <p className="font-medium text-gray-900">Paiement confirmé</p>
                <p className="text-sm text-gray-500">Votre acompte a été encaissé avec succès</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Confirmation du photographe</p>
                <p className="text-sm text-gray-500">
                  Le photographe confirmera les détails de la prestation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-gray-400">Jour J</p>
                <p className="text-sm text-gray-400">
                  Profitez de votre séance photo !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/messages?photographe=${booking?.photographe_id}`)}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Contacter le photographe
          </button>
          
          <button
            onClick={() => router.push('/client/reservations')}
            className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            Voir mes réservations
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 text-gray-500 rounded-xl font-medium hover:text-gray-700 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </button>
        </div>

        {/* Email notification */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Un email de confirmation a été envoyé à votre adresse email.
            <br />
            Vérifiez votre dossier spam si vous ne le recevez pas.
          </p>
        </div>
      </main>
    </div>
  );
}
