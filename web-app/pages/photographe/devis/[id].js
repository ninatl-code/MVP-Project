import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import * as messageService from '../../../lib/messageService';

import { 
  FileText, Clock, Check, X, Euro, ArrowLeft,
  User, Calendar, AlertCircle, MessageSquare, Trash2,
  Edit, Send, MapPin, Banknote, Timer, Package, CreditCard,
  ChevronRight, Tag, Bell
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  'en_attente': { 
    label: 'En attente', 
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock 
  },
  'accepte': { 
    label: 'Accepté', 
    color: 'bg-green-100 text-green-700',
    icon: Check 
  },
  'refuse': { 
    label: 'Refusé', 
    color: 'bg-red-100 text-red-700',
    icon: X 
  },
  'expire': { 
    label: 'Expiré', 
    color: 'bg-gray-100 text-gray-600',
    icon: AlertCircle 
  },
  'annule': { 
    label: 'Annulé', 
    color: 'bg-gray-100 text-gray-600',
    icon: X 
  },
};

export default function PhotographeDevisDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId, photographeProfile } = useAuth();
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const prestataireId = user?.id || profileId || photographeProfile?.id;
    if (id && prestataireId) fetchDevis(prestataireId);
    else if (id && !prestataireId) setLoading(false);
  }, [id, user, profileId, photographeProfile]);

  const fetchDevis = async (prestataireId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          profiles!devis_client_id_fkey(id, nom, email, avatar_url),
          demandes_client(id, titre, description, categorie, date_souhaitee, lieu, budget_max, statut)
        `)
        .eq('id', id)
        .eq('prestataire_id', prestataireId)
        .single();

      if (error) throw error;
      // Normalize 'envoye' → 'en_attente'
      const normalized = { ...data, statut: data.statut === 'envoye' ? 'en_attente' : data.statut };
      setDevis(normalized);

      // Si accepté, chercher la réservation pending associée
      if (normalized.statut === 'accepte') {
        const { data: resaData } = await supabase
          .from('reservations')
          .select('id, statut, client_id')
          .eq('devis_id', data.id)
          .in('statut', ['pending'])
          .maybeSingle();
        setPendingReservation(resaData || null);
      }
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!pendingReservation) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'confirmed', date_confirmation: new Date().toISOString() })
        .eq('id', pendingReservation.id);
      if (error) throw error;


      router.push(`/photographe/reservations/${pendingReservation.id}`);
    } catch (err) {
      console.error('[handleConfirmReservation]', err);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('devis')
        .update({ statut: 'annule' })
        .eq('id', id);

      if (error) throw error;
      setShowCancelModal(false);
      fetchDevis();
    } catch (error) {
      console.error('Error cancelling devis:', error);
    } finally {
      setCancelling(false);
    }
  };

  const startConversation = async () => {
    try {
      // Check if conversation exists
      const {data : newConv, error} = await messageService.createConversation(devis.client_id,user?.id || profileId || photographeProfile?.id,null, devis.demande_id)
      
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

  if (!devis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Devis introuvable</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[devis.statut] || STATUS_CONFIG['en_attente'];
  const StatusIcon = statusConfig.icon;
  const isExpired = devis.statut === 'en_attente' && devis.date_expiration && 
    isAfter(new Date(), new Date(devis.date_expiration));
  const displayStatus = isExpired ? 'expire' : devis.statut;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          href="/photographe/devis"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux devis
        </Link>

        {/* Bannière réservation en attente de confirmation */}
        {pendingReservation && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">
                Veuillez confirmer votre réservation —{' '}
                <Link href={`/photographe/reservations/${pendingReservation.id}`} className="underline hover:text-red-900">
                  Voir la réservation
                </Link>
              </p>
            </div>
            <button
              onClick={handleConfirmReservation}
              disabled={confirming}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {confirming ? 'Confirmation...' : 'Confirmer la réservation'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${
                  isExpired ? STATUS_CONFIG['expire'].color : statusConfig.color
                }`}>
                  <StatusIcon className="w-4 h-4" />
                  {isExpired ? 'Expiré' : statusConfig.label}
                </span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {devis.demandes_client?.titre || devis.titre || 'Devis sans titre'}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>
                  Créé le {format(new Date(devis.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
                {devis.date_expiration && displayStatus === 'en_attente' && (
                  <span className="text-yellow-600">
                    Expire {formatDistanceToNow(new Date(devis.date_expiration), { addSuffix: true, locale: fr })}
                  </span>
                )}
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Détails du devis</h2>

              {/* Description */}
              {devis.description && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-gray-700 bg-gray-50 rounded-xl p-4 text-sm leading-relaxed">{devis.description}</p>
                </div>
              )}

              {/* Message personnalisé */}
              {devis.message_personnalise && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Message au client</p>
                  <p className="text-gray-700 bg-indigo-50 rounded-xl p-4 text-sm leading-relaxed border border-indigo-100">{devis.message_personnalise}</p>
                </div>
              )}

              {/* Détail tarification */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" />Tarification
                </p>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {devis.tarif_base != null && (
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Tarif de base</span>
                      <span className="text-sm font-semibold text-gray-900">{Number(devis.tarif_base).toLocaleString('fr-FR')} MAD</span>
                    </div>
                  )}
                  {devis.frais_deplacement > 0 && (
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Frais de déplacement</span>
                      <span className="text-sm font-semibold text-gray-900">{Number(devis.frais_deplacement).toLocaleString('fr-FR')} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-indigo-50">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">{Number(devis.montant_total).toLocaleString('fr-FR')} MAD</span>
                  </div>
                </div>
              </div>

              {/* Acompte */}
              {(devis.acompte_percent > 0 || devis.acompte_montant > 0) && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />Acompte demandé
                  </p>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-sm text-amber-700">{devis.acompte_percent}% à la réservation</span>
                    <span className="font-bold text-amber-700">{Number(devis.acompte_montant || (devis.montant_total * devis.acompte_percent / 100)).toLocaleString('fr-FR')} MAD</span>
                  </div>
                </div>
              )}

              {/* Durée & validité */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {devis.duree_prestation_heures > 0 && (
                  <div className="px-4 py-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Timer className="w-3 h-3" />Durée prestation</p>
                    <p className="font-semibold text-gray-900">{devis.duree_prestation_heures}h</p>
                  </div>
                )}
                {devis.duree_validite_jours > 0 && (
                  <div className="px-4 py-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Validité</p>
                    <p className="font-semibold text-gray-900">{devis.duree_validite_jours} jours</p>
                  </div>
                )}
              </div>

              {/* Services inclus */}
              {devis.services_inclus?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />Services inclus
                  </p>
                  <ul className="space-y-1.5">
                    {devis.services_inclus.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Horaires proposés */}
              {devis.horaires_proposes?.detail && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Horaires proposés
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{devis.horaires_proposes.detail}</p>
                </div>
              )}

              {/* Modalités de paiement */}
              {devis.modalites_paiement?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />Modalités de paiement
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {devis.modalites_paiement.map((m, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Demande Reference */}
            {devis.demandes_client && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Demande associée</h2>
                
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-1">Description</h2>
                    <p className="text-gray-700">{devis.demandes_client.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {devis.demandes_client.date_souhaitee && (
                      <div>
                        <h2 className="text-sm font-medium text-gray-500 mb-1">Date souhaitée</h2>
                        <p className="text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(devis.demandes_client.date_souhaitee), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {devis.demandes_client.lieu && (
                      <div>
                        <h2 className="text-sm font-medium text-gray-500 mb-1">Lieu</h2>
                        <p className="text-gray-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {devis.demandes_client.lieu}
                        </p>
                      </div>
                    )}
                  </div>

                  {devis.demandes_client.budget_max && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500 mb-1">Budget client</h2>
                      <p className="text-gray-900">
                        Max {devis.demandes_client.budget_max} DH
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/photographe/demandes/${devis.demande_id}`}
                    className="text-indigo-600 text-sm font-medium hover:underline"
                  >
                    Voir la demande complète →
                  </Link>
                </div>
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
                  {devis.profiles?.avatar_url ? (
                    <img 
                      src={devis.profiles.avatar_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {devis.profiles?.nom || 'Client'}
                  </p>
                  {devis.profiles?.email && (
                    <p className="text-sm text-gray-500">{devis.profiles.email}</p>
                  )}
                </div>
              </div>

              <button
                onClick={startConversation}
                className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Contacter
              </button>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
              
              <div className="space-y-3">
                {displayStatus === 'en_attente' && (
                  <>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full px-4 py-2 border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Annuler ce devis
                    </button>
                  </>
                )}

                {displayStatus === 'accepte' && (
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">
                      Ce devis a été accepté
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Une réservation a été créée
                    </p>
                  </div>
                )}

                {displayStatus === 'refuse' && (
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-red-700 font-medium">
                      Ce devis a été refusé
                    </p>
                    {devis.motif_refus && (
                      <p className="text-sm text-red-600 mt-2">
                        "{devis.motif_refus}"
                      </p>
                    )}
                  </div>
                )}

                {displayStatus === 'expire' && (
                  <div className="text-center p-4 bg-gray-100 rounded-xl">
                    <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-700 font-medium">
                      Ce devis a expiré
                    </p>
                    <Link
                      href={`/photographe/demandes/${devis.demande_id}/devis`}
                      className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium mt-2"
                    >
                      <Send className="w-4 h-4" />
                      Envoyer un nouveau devis
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Historique</h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-indigo-600"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Devis créé</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(devis.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>

                {devis.updated_at && devis.updated_at !== devis.created_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dernière modification</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(devis.updated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}

                {displayStatus === 'accepte' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Devis accepté</p>
                    </div>
                  </div>
                )}

                {displayStatus === 'refuse' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Devis refusé</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Annuler ce devis ?
            </h2>
            <p className="text-gray-600 mb-6">
              Cette action est irréversible. Le client ne pourra plus accepter ce devis.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Non, garder
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
