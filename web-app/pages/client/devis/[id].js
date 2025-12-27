import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  ArrowLeft, Calendar, MapPin, Euro, Camera, 
  Star, MessageSquare, Check, X, Clock, Shield,
  FileText, ChevronRight, AlertCircle, CheckCircle
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  accepte: { label: 'Accepté', color: 'bg-green-100 text-green-700' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
  expire: { label: 'Expiré', color: 'bg-gray-100 text-gray-700' },
};

export default function DevisDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId } = useAuth();
  
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');

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
            note_moyenne,
            nombre_avis,
            ville,
            specialites,
            verifie,
            description,
            profile:profiles(nom, prenom)
          ),
          demande:demandes_client(
            id,
            titre,
            categorie,
            date_souhaitee,
            lieu,
            budget_min,
            budget_max
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

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Update devis status
      const { error: devisError } = await supabase
        .from('devis')
        .update({ statut: 'accepte', date_acceptation: new Date().toISOString() })
        .eq('id', id);

      if (devisError) throw devisError;

      // Update demande status
      if (devis.demande_id) {
        await supabase
          .from('demandes_client')
          .update({ status: 'fulfilled' })
          .eq('id', devis.demande_id);
      }

      // Redirect to payment
      router.push(`/client/devis/${id}/payment`);
    } catch (error) {
      console.error('Error accepting devis:', error);
    } finally {
      setAccepting(false);
    }
  };

  const handleRefuse = async () => {
    setRefusing(true);
    try {
      const { error } = await supabase
        .from('devis')
        .update({ 
          statut: 'refuse', 
          date_refus: new Date().toISOString(),
          motif_refus: refuseReason || null
        })
        .eq('id', id);

      if (error) throw error;
      
      setDevis(prev => ({ ...prev, statut: 'refuse' }));
      setShowRefuseModal(false);
    } catch (error) {
      console.error('Error refusing devis:', error);
    } finally {
      setRefusing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getExpirationDays = () => {
    if (!devis?.created_at) return 0;
    const created = new Date(devis.created_at);
    const validityDays = devis.validite_jours || 30;
    const expiration = new Date(created.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysLeft = Math.ceil((expiration - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
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
          <p className="text-gray-600 mb-6">Ce devis n'existe pas ou a été supprimé.</p>
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
  const statusConfig = STATUS_CONFIG[devis.statut] || STATUS_CONFIG.en_attente;
  const expirationDays = getExpirationDays();
  const canRespond = devis.statut === 'en_attente' && expirationDays > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Devis header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-gray-500">Devis #{id.substring(0, 8)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {devis.titre || demande?.titre || 'Devis photographe'}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{devis.montant}€</p>
                  {devis.statut === 'en_attente' && (
                    <p className={`text-sm ${expirationDays <= 3 ? 'text-red-500' : 'text-gray-500'}`}>
                      {expirationDays > 0 
                        ? `Expire dans ${expirationDays} jour${expirationDays > 1 ? 's' : ''}`
                        : 'Expiré'}
                    </p>
                  )}
                </div>
              </div>

              {/* Devis details */}
              {devis.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-line">{devis.description}</p>
                </div>
              )}

              {/* What's included */}
              {devis.prestations_incluses && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Ce qui est inclus</h3>
                  <ul className="space-y-2">
                    {devis.prestations_incluses.split('\n').map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Breakdown */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Détail du prix</h3>
                <div className="space-y-2">
                  {devis.details_prix ? (
                    JSON.parse(devis.details_prix).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{item.montant}€</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Prestation photo</span>
                        <span className="font-medium">{devis.montant}€</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-bold text-lg">{devis.montant}€</span>
                  </div>
                </div>
              </div>

              {/* Payment terms */}
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                <h4 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Conditions de paiement
                </h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Acompte de 30% à la réservation : <strong>{Math.round(devis.montant * 0.3)}€</strong></li>
                  <li>• Solde de 70% après la prestation : <strong>{Math.round(devis.montant * 0.7)}€</strong></li>
                  <li>• Annulation gratuite jusqu'à 48h avant</li>
                </ul>
              </div>
            </div>

            {/* Related demande */}
            {demande && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Demande associée</h3>
                <div 
                  onClick={() => router.push(`/client/demandes/${demande.id}`)}
                  className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                >
                  <h4 className="font-medium text-gray-900 mb-2">{demande.titre}</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {demande.date_souhaitee && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(demande.date_souhaitee)}
                      </span>
                    )}
                    {demande.lieu && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {demande.lieu}
                      </span>
                    )}
                    {(demande.budget_min || demande.budget_max) && (
                      <span className="flex items-center gap-1">
                        <Euro className="w-4 h-4" />
                        {demande.budget_min && demande.budget_max 
                          ? `${demande.budget_min}€ - ${demande.budget_max}€`
                          : `Max ${demande.budget_max}€`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {canRespond && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Répondre au devis</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {accepting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Acceptation...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Accepter et payer l'acompte
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRefuseModal(true)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Refuser
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Photographer info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Le photographe</h3>
              
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
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {photographe.ville}
                    </p>
                  )}
                </div>
              </div>

              {photographe?.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {photographe.description}
                </p>
              )}

              {photographe?.specialites && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Spécialités</p>
                  <div className="flex flex-wrap gap-1">
                    {photographe.specialites.slice(0, 4).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/messages?photographe=${devis.photographe_id}`)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Contacter
                </button>
                <button
                  onClick={() => router.push(`/photographes/${devis.photographe_id}`)}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Voir le profil complet
                </button>
              </div>
            </div>

            {/* Expiration warning */}
            {devis.statut === 'en_attente' && expirationDays <= 5 && expirationDays > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Devis bientôt expiré</p>
                    <p className="text-sm text-yellow-700">
                      Ce devis expire dans {expirationDays} jour{expirationDays > 1 ? 's' : ''}.
                      Pensez à y répondre rapidement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <strong>Besoin d'aide ?</strong> Notre équipe est disponible pour répondre à vos questions.
              </p>
              <button
                onClick={() => router.push('/support')}
                className="text-sm text-indigo-600 font-medium mt-2 hover:underline"
              >
                Contacter le support →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Refuse modal */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Refuser ce devis ?
            </h3>
            <p className="text-gray-600 mb-4">
              Vous pouvez indiquer la raison de votre refus (optionnel). Le photographe sera notifié.
            </p>
            
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              placeholder="Raison du refus (optionnel)..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefuseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuse}
                disabled={refusing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {refusing ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
