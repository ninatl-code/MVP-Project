import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  ArrowLeft, Calendar, MapPin, Euro, Clock, Users, 
  Edit, Trash2, Eye, Check, X, MessageSquare, 
  ChevronRight, Star, Camera, AlertCircle, Share2
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', description: 'Votre demande est visible par les photographes' },
  fulfilled: { label: 'Pourvue', color: 'bg-blue-100 text-blue-700', description: 'Vous avez accepté un devis' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', description: 'Cette demande a été annulée' },
  expired: { label: 'Expirée', color: 'bg-gray-100 text-gray-700', description: 'Cette demande a expiré' },
};

export default function DemandeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId } = useAuth();
  
  const [demande, setDemande] = useState(null);
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('devis');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  const isNew = router.query.new === 'true';

  useEffect(() => {
    if (id) {
      fetchDemandeAndDevis();
    }
  }, [id]);

  const fetchDemandeAndDevis = async () => {
    setLoading(true);
    try {
      // Fetch demande
      const { data: demandeData, error: demandeError } = await supabase
        .from('demandes_client')
        .select('*')
        .eq('id', id)
        .single();

      if (demandeError) throw demandeError;
      setDemande(demandeData);

      // Fetch related devis
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select(`
          *,
          photographe:profils_photographe(
            id,
            nom_entreprise,
            note_moyenne,
            nombre_avis,
            photo_profil,
            ville,
            specialites,
            verifie,
            profile:profiles(nom, prenom)
          )
        `)
        .eq('demande_id', id)
        .order('created_at', { ascending: false });

      if (devisError) throw devisError;
      setDevis(devisData || []);
    } catch (error) {
      console.error('Error fetching demande:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDemande = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('demandes_client')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      
      setDemande(prev => ({ ...prev, status: 'cancelled' }));
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling demande:', error);
    } finally {
      setCancelling(false);
    }
  };

  const handleAcceptDevis = async (devisId) => {
    try {
      // Update devis status
      const { error: devisError } = await supabase
        .from('devis')
        .update({ statut: 'accepte' })
        .eq('id', devisId);

      if (devisError) throw devisError;

      // Update demande status
      const { error: demandeError } = await supabase
        .from('demandes_client')
        .update({ status: 'fulfilled' })
        .eq('id', id);

      if (demandeError) throw demandeError;

      // Redirect to payment
      router.push(`/client/devis/${devisId}/payment`);
    } catch (error) {
      console.error('Error accepting devis:', error);
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

  const getCategoryIcon = (category) => {
    const icons = {
      'mariage': '💒', 'portrait': '👤', 'evenement': '🎉', 'corporate': '🏢',
      'produit': '📦', 'immobilier': '🏠', 'famille': '👨‍👩‍👧‍👦', 'grossesse': '🤰',
      'nouveau-ne': '👶', 'animalier': '🐕', 'culinaire': '🍽️',
    };
    return icons[category?.toLowerCase()] || '📷';
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

  if (!demande) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Demande introuvable</h2>
          <p className="text-gray-600 mb-6">Cette demande n'existe pas ou a été supprimée.</p>
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

  const statusConfig = STATUS_CONFIG[demande.status] || STATUS_CONFIG.active;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Success banner */}
        {isNew && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Demande publiée avec succès !</p>
              <p className="text-sm text-green-700">Les photographes peuvent désormais vous envoyer leurs devis.</p>
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.push('/client/demandes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux demandes
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryIcon(demande.categorie)}</span>
                  <div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <h1 className="text-xl font-bold text-gray-900 mt-1">
                      {demande.titre}
                    </h1>
                  </div>
                </div>

                {demande.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/client/demandes/${id}/edit`)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-6">
                {demande.description || 'Aucune description fournie.'}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>
                    {formatDate(demande.date_souhaitee)}
                    {demande.date_flexible && <span className="text-indigo-600 ml-1">(flexible)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>{demande.lieu}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>{demande.duree_estimee}h estimées</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{demande.nombre_personnes} personne(s)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                  <Euro className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">
                    Budget: {demande.budget_min && demande.budget_max 
                      ? `${demande.budget_min}€ - ${demande.budget_max}€`
                      : demande.budget_max 
                      ? `Max ${demande.budget_max}€`
                      : 'Non défini'}
                  </span>
                </div>
              </div>

              {demande.exigences_specifiques && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-1">Exigences spécifiques</p>
                  <p className="text-sm text-gray-600">{demande.exigences_specifiques}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('devis')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'devis'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Devis reçus ({devis.length})
                </button>
                <button
                  onClick={() => setActiveTab('matchings')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'matchings'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Photographes suggérés
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'devis' ? (
                  devis.length === 0 ? (
                    <div className="text-center py-8">
                      <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Aucun devis pour le moment
                      </h3>
                      <p className="text-gray-500">
                        Les photographes peuvent encore vous envoyer des devis.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {devis.map((d) => (
                        <DevisCard
                          key={d.id}
                          devis={d}
                          onAccept={() => handleAcceptDevis(d.id)}
                          onView={() => router.push(`/client/devis/${d.id}`)}
                          onContact={() => router.push(`/messages?photographe=${d.photographe_id}`)}
                          demandeStatus={demande.status}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Fonctionnalité de suggestions à venir
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Devis reçus</span>
                  <span className="font-bold text-lg">{devis.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Vues</span>
                  <span className="font-bold text-lg">{demande.views || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Créée le</span>
                  <span className="text-sm text-gray-700">
                    {formatDate(demande.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status info */}
            <div className="bg-indigo-50 rounded-2xl p-6">
              <p className="text-sm text-indigo-800">
                <span className="font-medium">Statut:</span> {statusConfig.description}
              </p>
            </div>

            {/* Actions */}
            {demande.status === 'active' && devis.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <button
                  onClick={() => router.push(`/client/devis/compare?demande=${id}`)}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Comparer les devis
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Annuler cette demande ?
            </h3>
            <p className="text-gray-600 mb-6">
              Cette action est irréversible. Les photographes ne pourront plus voir votre demande ni vous envoyer de devis.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCancelDemande}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevisCard({ devis, onAccept, onView, onContact, demandeStatus }) {
  const photographe = devis.photographe;
  const profile = photographe?.profile;
  
  const getStatusBadge = (statut) => {
    const configs = {
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
      accepte: { label: 'Accepté', color: 'bg-green-100 text-green-700' },
      refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
      expire: { label: 'Expiré', color: 'bg-gray-100 text-gray-700' },
    };
    const config = configs[statut] || configs.en_attente;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-all">
      <div className="flex items-start gap-4">
        {/* Photographer avatar */}
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
          {photographe?.photo_profil ? (
            <img
              src={photographe.photo_profil}
              alt={photographe.nom_entreprise}
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-6 h-6 text-indigo-600" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
              </h4>
              {photographe?.verifie && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </div>
            {getStatusBadge(devis.statut)}
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            {photographe?.note_moyenne > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {photographe.note_moyenne.toFixed(1)}
                {photographe.nombre_avis > 0 && ` (${photographe.nombre_avis})`}
              </span>
            )}
            {photographe?.ville && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {photographe.ville}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-indigo-600">{devis.montant}€</p>
              <p className="text-xs text-gray-500">
                Validité: {devis.validite_jours || 30} jours
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onContact}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                title="Contacter"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={onView}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voir détails
              </button>
              {demandeStatus === 'active' && devis.statut === 'en_attente' && (
                <button
                  onClick={onAccept}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Accepter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
