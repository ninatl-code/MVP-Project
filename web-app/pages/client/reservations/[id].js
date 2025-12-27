import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  ArrowLeft, Calendar, MapPin, Clock, Euro, Camera, 
  Phone, Mail, MessageSquare, Star, Download, 
  CheckCircle, XCircle, AlertCircle, Clock3, Edit,
  FileText, CreditCard, Shield, ExternalLink
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-700', icon: Clock3, description: 'Le photographe doit confirmer la réservation' },
  confirmee: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle, description: 'Votre réservation est confirmée' },
  terminee: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle, description: 'La prestation a été effectuée' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle, description: 'Cette réservation a été annulée' },
  en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Camera, description: 'La prestation est en cours' },
  litige: { label: 'Litige en cours', color: 'bg-orange-100 text-orange-700', icon: AlertCircle, description: 'Un litige est en cours de résolution' },
};

export default function ReservationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId } = useAuth();
  
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReservation();
    }
  }, [id]);

  const fetchReservation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          photographe:profils_photographe(
            id,
            nom_entreprise,
            photo_profil,
            note_moyenne,
            nombre_avis,
            ville,
            telephone,
            email_pro,
            verifie,
            stripe_account_id,
            profile:profiles(nom, prenom, email)
          ),
          package:packages(
            id,
            nom,
            description,
            duree_heures,
            nombre_photos_incluses,
            prix
          ),
          paiement:paiements(
            id,
            montant,
            statut,
            type_paiement,
            created_at
          ),
          avis:avis(
            id,
            note,
            commentaire,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setReservation(data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'annulee', annule_par: 'client', date_annulation: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setReservation(prev => ({ ...prev, statut: 'annulee' }));
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const canCancel = () => {
    if (!reservation) return false;
    if (!['en_attente', 'confirmee'].includes(reservation.statut)) return false;
    
    // Check if prestation date is more than 48h away
    const prestationDate = new Date(reservation.date_prestation);
    const now = new Date();
    const hoursUntil = (prestationDate - now) / (1000 * 60 * 60);
    return hoursUntil > 48;
  };

  const canReview = () => {
    if (!reservation) return false;
    if (reservation.statut !== 'terminee') return false;
    if (reservation.avis?.length > 0) return false;
    return true;
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

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Réservation introuvable</h2>
          <p className="text-gray-600 mb-6">Cette réservation n'existe pas ou a été supprimée.</p>
          <button
            onClick={() => router.push('/client/reservations')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            Retour aux réservations
          </button>
        </div>
      </div>
    );
  }

  const photographe = reservation.photographe;
  const profile = photographe?.profile;
  const statusConfig = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG.en_attente;
  const StatusIcon = statusConfig.icon;
  const isUpcoming = new Date(reservation.date_prestation) > new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push('/client/reservations')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux réservations
        </button>

        {/* Status banner */}
        <div className={`${statusConfig.color.replace('100', '50')} border ${statusConfig.color.replace('100', '200').replace('text-', 'border-').split(' ')[0]} rounded-xl p-4 mb-6 flex items-center gap-3`}>
          <StatusIcon className={`w-5 h-5 ${statusConfig.color.split(' ')[1]}`} />
          <div>
            <p className={`font-medium ${statusConfig.color.split(' ')[1]}`}>{statusConfig.label}</p>
            <p className={`text-sm ${statusConfig.color.split(' ')[1].replace('700', '600')}`}>{statusConfig.description}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reservation details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {reservation.titre || reservation.package?.nom || 'Prestation photo'}
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{formatDate(reservation.date_prestation)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Horaires</p>
                    <p className="font-medium">
                      {formatTime(reservation.heure_debut)}
                      {reservation.heure_fin && ` - ${formatTime(reservation.heure_fin)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Lieu</p>
                    <p className="font-medium">{reservation.lieu || 'Non défini'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Euro className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Montant total</p>
                    <p className="font-medium text-lg">{reservation.montant_total}€</p>
                  </div>
                </div>
              </div>

              {/* Package details */}
              {reservation.package && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Détails du forfait</h3>
                  <p className="text-gray-600 text-sm mb-2">{reservation.package.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {reservation.package.duree_heures && (
                      <span>⏱ {reservation.package.duree_heures}h de shooting</span>
                    )}
                    {reservation.package.nombre_photos_incluses && (
                      <span>📷 {reservation.package.nombre_photos_incluses} photos incluses</span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {reservation.notes && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 text-sm">{reservation.notes}</p>
                </div>
              )}
            </div>

            {/* Payment info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Paiement
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Acompte versé (30%)</span>
                  <span className="font-medium">{Math.round(reservation.montant_total * 0.3)}€</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Solde à régler</span>
                  <span className="font-medium">{Math.round(reservation.montant_total * 0.7)}€</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-bold text-lg">{reservation.montant_total}€</span>
                </div>
              </div>

              {reservation.paiement?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Historique des paiements</p>
                  {reservation.paiement.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm py-2">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          p.statut === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {p.statut === 'completed' ? 'Payé' : 'En attente'}
                        </span>
                        <span className="ml-2 text-gray-600">{p.type_paiement}</span>
                      </div>
                      <span className="font-medium">{p.montant}€</span>
                    </div>
                  ))}
                </div>
              )}

              {reservation.statut === 'confirmee' && (
                <button
                  onClick={() => router.push(`/client/reservations/${id}/payment`)}
                  className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                >
                  Régler le solde
                </button>
              )}
            </div>

            {/* Review section */}
            {reservation.statut === 'terminee' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Avis
                </h3>

                {reservation.avis?.length > 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < reservation.avis[0].note
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-700">{reservation.avis[0].commentaire}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Publié le {formatDate(reservation.avis[0].created_at)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">Partagez votre expérience avec ce photographe</p>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-all"
                    >
                      Laisser un avis
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Photographer card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Votre photographe</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                  {photographe?.photo_profil ? (
                    <img
                      src={photographe.photo_profil}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
                    {photographe?.verifie && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </h4>
                  {photographe?.note_moyenne > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {photographe.note_moyenne.toFixed(1)}
                      {photographe.nombre_avis > 0 && ` (${photographe.nombre_avis} avis)`}
                    </div>
                  )}
                  {photographe?.ville && (
                    <p className="text-sm text-gray-500">{photographe.ville}</p>
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/messages?photographe=${reservation.photographe_id}`)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Envoyer un message
                </button>

                {photographe?.telephone && (
                  <a
                    href={`tel:${photographe.telephone}`}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Appeler
                  </a>
                )}

                <button
                  onClick={() => router.push(`/photographes/${reservation.photographe_id}`)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Voir le profil
                </button>
              </div>
            </div>

            {/* Actions */}
            {canCancel() && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-all"
                >
                  Annuler la réservation
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Annulation gratuite jusqu'à 48h avant la prestation
                </p>
              </div>
            )}

            {/* Help */}
            <div className="bg-indigo-50 rounded-2xl p-6">
              <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Besoin d'aide ?
              </h3>
              <p className="text-sm text-indigo-700 mb-4">
                Notre équipe est disponible pour répondre à vos questions.
              </p>
              <button
                onClick={() => router.push('/support')}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Contacter le support →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Annuler cette réservation ?
            </h3>
            <p className="text-gray-600 mb-6">
              Vous pouvez annuler cette réservation gratuitement car elle est à plus de 48h.
              Votre acompte sera remboursé dans un délai de 5 à 10 jours ouvrés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReviewModal && (
        <ReviewModal
          reservationId={id}
          photographeId={reservation.photographe_id}
          onClose={() => setShowReviewModal(false)}
          onSubmit={() => {
            setShowReviewModal(false);
            fetchReservation();
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({ reservationId, photographeId, onClose, onSubmit }) {
  const { profileId } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('avis')
        .insert({
          reservation_id: reservationId,
          photographe_id: photographeId,
          client_id: profileId,
          note: rating,
          commentaire: comment,
        });

      if (error) throw error;
      
      // Update photographer rating
      await supabase.rpc('update_photographer_rating', { p_photographe_id: photographeId });
      
      onSubmit();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Laisser un avis
        </h3>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Votre note</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-2">
            Votre commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publication...' : 'Publier mon avis'}
          </button>
        </div>
      </div>
    </div>
  );
}
