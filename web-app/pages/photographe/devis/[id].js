import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import { 
  FileText, Clock, Check, X, Euro, ArrowLeft,
  User, Calendar, AlertCircle, MessageSquare, Trash2,
  Edit, Send, MapPin
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
  const { photographeProfile } = useAuth();
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id && photographeProfile?.id) {
      fetchDevis();
    }
  }, [id, photographeProfile]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          demande:demande_id (
            id,
            titre,
            description,
            categorie,
            date_souhaitee,
            lieu,
            budget_min,
            budget_max,
            statut,
            client:client_id (
              id,
              prenom,
              nom,
              photo_profil,
              email
            )
          )
        `)
        .eq('id', id)
        .eq('photographe_id', photographeProfile.id)
        .single();

      if (error) throw error;
      setDevis(data);
    } catch (error) {
      console.error('Error fetching devis:', error);
      router.push('/photographe/devis');
    } finally {
      setLoading(false);
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
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', devis.demande.client.id)
        .eq('photographe_id', photographeProfile.id)
        .single();

      if (existing) {
        router.push(`/messages/${existing.id}`);
      } else {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            client_id: devis.demande.client.id,
            photographe_id: photographeProfile.id,
            demande_id: devis.demande_id,
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
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          href="/photographe/devis"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux devis
        </Link>

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
                <span className="text-sm text-gray-500">
                  Devis #{devis.id.slice(0, 8)}
                </span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {devis.demande?.titre || 'Devis sans titre'}
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
              <h2 className="font-semibold text-gray-900 mb-4">Détails du devis</h2>

              {devis.message && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Message au client</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-xl p-4">
                    {devis.message}
                  </p>
                </div>
              )}

              {/* Detail Lines */}
              {devis.details && devis.details.length > 0 ? (
                <div className="space-y-3">
                  {devis.details.map((detail, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{detail.description}</p>
                        {detail.quantite && (
                          <p className="text-sm text-gray-500">
                            Quantité: {detail.quantite}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">{detail.montant}€</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun détail spécifié</p>
              )}

              {/* Total */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {devis.montant_total}€
                  </span>
                </div>
                {devis.acompte && (
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <span className="text-gray-500">Acompte demandé (30%)</span>
                    <span className="font-medium text-gray-700">{devis.acompte}€</span>
                  </div>
                )}
              </div>
            </div>

            {/* Demande Reference */}
            {devis.demande && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Demande associée</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                    <p className="text-gray-700">{devis.demande.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {devis.demande.date_souhaitee && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Date souhaitée</h3>
                        <p className="text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(devis.demande.date_souhaitee), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {devis.demande.lieu && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Lieu</h3>
                        <p className="text-gray-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {devis.demande.lieu}
                        </p>
                      </div>
                    )}
                  </div>

                  {devis.demande.budget_min && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Budget client</h3>
                      <p className="text-gray-900">
                        {devis.demande.budget_min}€ - {devis.demande.budget_max}€
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
                  {devis.demande?.client?.photo_profil ? (
                    <img 
                      src={devis.demande.client.photo_profil} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {devis.demande?.client?.prenom} {devis.demande?.client?.nom}
                  </p>
                  {devis.demande?.client?.email && (
                    <p className="text-sm text-gray-500">{devis.demande.client.email}</p>
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
                    <Link
                      href={`/photographe/demandes/${devis.demande_id}/devis?edit=${devis.id}`}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-5 h-5" />
                      Modifier
                    </Link>
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Annuler ce devis ?
            </h3>
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
