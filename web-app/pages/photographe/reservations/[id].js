import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import { 
  ArrowLeft, User, Calendar, Clock, MapPin, Euro,
  MessageSquare, Check, X, AlertCircle, Phone, Mail,
  Camera, FileText, CheckCircle
} from 'lucide-react';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  'en_attente': { 
    label: 'En attente', 
    color: 'bg-yellow-100 text-yellow-700',
    description: 'En attente de confirmation'
  },
  'confirme': { 
    label: 'Confirmée', 
    color: 'bg-blue-100 text-blue-700',
    description: 'Prestation confirmée'
  },
  'en_cours': { 
    label: 'En cours', 
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Prestation en cours'
  },
  'termine': { 
    label: 'Terminée', 
    color: 'bg-green-100 text-green-700',
    description: 'Prestation terminée avec succès'
  },
  'annule': { 
    label: 'Annulée', 
    color: 'bg-red-100 text-red-700',
    description: 'Cette réservation a été annulée'
  },
};

export default function PhotographeReservationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { photographeProfile } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id && photographeProfile?.id) {
      fetchReservation();
    }
  }, [id, photographeProfile]);

  const fetchReservation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          client:client_id (
            id, prenom, nom, email, telephone, photo_profil
          ),
          devis:devis_id (
            id, montant_total, message, details
          ),
          demande:demande_id (
            id, titre, description, categorie
          )
        `)
        .eq('id', id)
        .eq('photographe_id', photographeProfile.id)
        .single();

      if (error) throw error;
      setReservation(data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      router.push('/photographe/reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'confirme' })
        .eq('id', id);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: reservation.client_id,
        type: 'reservation_confirmee',
        titre: 'Réservation confirmée',
        message: `Votre réservation du ${format(parseISO(reservation.date_prestation), 'dd MMM yyyy', { locale: fr })} a été confirmée`,
        reservation_id: id
      });

      fetchReservation();
    } catch (error) {
      console.error('Error confirming:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'termine' })
        .eq('id', id);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: reservation.client_id,
        type: 'reservation_terminee',
        titre: 'Prestation terminée',
        message: `Votre prestation du ${format(parseISO(reservation.date_prestation), 'dd MMM yyyy', { locale: fr })} est terminée. N'hésitez pas à laisser un avis !`,
        reservation_id: id
      });

      fetchReservation();
    } catch (error) {
      console.error('Error completing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          statut: 'annule',
          motif_annulation: cancelReason
        })
        .eq('id', id);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: reservation.client_id,
        type: 'reservation_annulee',
        titre: 'Réservation annulée',
        message: `La réservation du ${format(parseISO(reservation.date_prestation), 'dd MMM yyyy', { locale: fr })} a été annulée par le photographe`,
        reservation_id: id
      });

      setShowCancelModal(false);
      fetchReservation();
    } catch (error) {
      console.error('Error cancelling:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', reservation.client_id)
        .eq('photographe_id', photographeProfile.id)
        .single();

      if (existing) {
        router.push(`/messages/${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            client_id: reservation.client_id,
            photographe_id: photographeProfile.id,
            reservation_id: id,
          })
          .select()
          .single();

        if (error) throw error;
        router.push(`/messages/${newConv.id}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Réservation introuvable</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG['en_attente'];
  const isPastDate = isPast(parseISO(reservation.date_prestation));
  const canConfirm = reservation.statut === 'en_attente';
  const canComplete = reservation.statut === 'confirme' && isPastDate;
  const canCancel = ['en_attente', 'confirme'].includes(reservation.statut);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href="/photographe/reservations"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux réservations
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span className="text-sm text-gray-500">
                  Réf: #{reservation.id.slice(0, 8)}
                </span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {reservation.demande?.titre || 'Prestation photo'}
              </h1>
              <p className="text-gray-500">{statusConfig.description}</p>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-6">Détails de la prestation</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {format(parseISO(reservation.date_prestation), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                {reservation.heure_debut && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Horaires</p>
                      <p className="font-medium text-gray-900">
                        {reservation.heure_debut} - {reservation.heure_fin || '?'}
                      </p>
                    </div>
                  </div>
                )}

                {reservation.lieu && (
                  <div className="flex items-center gap-3 col-span-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Lieu</p>
                      <p className="font-medium text-gray-900">{reservation.lieu}</p>
                    </div>
                  </div>
                )}
              </div>

              {reservation.demande?.description && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-700">{reservation.demande.description}</p>
                </div>
              )}

              {reservation.notes && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-gray-700">{reservation.notes}</p>
                </div>
              )}
            </div>

            {/* Devis Details */}
            {reservation.devis && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Tarification</h2>
                
                {reservation.devis.details && reservation.devis.details.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {reservation.devis.details.map((detail, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">{detail.description}</span>
                        <span className="font-medium">{detail.montant}€</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {reservation.montant_total || reservation.devis.montant_total}€
                  </span>
                </div>

                {reservation.montant_paye && (
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-gray-500">Acompte reçu</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {reservation.montant_paye}€
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Client</h2>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {reservation.client?.photo_profil ? (
                    <img 
                      src={reservation.client.photo_profil} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {reservation.client?.prenom} {reservation.client?.nom}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {reservation.client?.email && (
                  <a 
                    href={`mailto:${reservation.client.email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
                  >
                    <Mail className="w-4 h-4" />
                    {reservation.client.email}
                  </a>
                )}
                {reservation.client?.telephone && (
                  <a 
                    href={`tel:${reservation.client.telephone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
                  >
                    <Phone className="w-4 h-4" />
                    {reservation.client.telephone}
                  </a>
                )}
              </div>

              <button
                onClick={startConversation}
                className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Envoyer un message
              </button>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
              
              <div className="space-y-3">
                {canConfirm && (
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Confirmer la réservation
                  </button>
                )}

                {canComplete && (
                  <button
                    onClick={handleComplete}
                    disabled={actionLoading}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Marquer comme terminée
                  </button>
                )}

                {reservation.statut === 'confirme' && !isPastDate && (
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <Camera className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 font-medium">
                      Prestation à venir
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {format(parseISO(reservation.date_prestation), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}

                {reservation.statut === 'termine' && (
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium">
                      Prestation terminée
                    </p>
                  </div>
                )}

                {reservation.statut === 'annule' && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-red-700 font-medium text-center">
                      Réservation annulée
                    </p>
                    {reservation.motif_annulation && (
                      <p className="text-xs text-red-600 mt-2 text-center">
                        "{reservation.motif_annulation}"
                      </p>
                    )}
                  </div>
                )}

                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Link to devis/demande */}
            {reservation.devis_id && (
              <Link
                href={`/photographe/devis/${reservation.devis_id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Voir le devis associé</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Annuler cette réservation ?
            </h3>
            <p className="text-gray-600 mb-4">
              Le client sera notifié. Cette action peut avoir des implications sur le paiement.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison de l'annulation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Expliquez la raison..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Non, garder
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
