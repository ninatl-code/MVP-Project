import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { onNewDemande } from '../../../lib/matchingService';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import * as demandeService from '../../../lib/demandeService';
import {getDemandeById, cancelDemande, fulfillDemande, reactivateDemande} from '../../../lib/demandeService';

import { 
  Plus, Search, Filter, Calendar, MapPin, 
  Clock, ChevronRight, FileText, Eye,
  CheckCircle, XCircle, AlertCircle, Copy, ArrowLeft, RefreshCw, Trash2
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

const STATUS_CONFIG = {
  ouverte:  { label: 'Active',   color: 'green',  icon: CheckCircle },
  pourvue:  { label: 'Pourvue',  color: 'blue',   icon: CheckCircle },
  annulee:  { label: 'Annulée',  color: 'red',    icon: XCircle },
  expiree:  { label: 'Expirée',  color: 'gray',   icon: AlertCircle },
};

export default function MesDemandesPage() {
  const router = useRouter();
  const { profileId } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedId, setResolvedId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [duplicating, setDuplicating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState(null);

  // Résoudre l'ID via getSession() (cache local, pas de requête réseau)
  useEffect(() => {
    if (profileId) {
      setResolvedId(profileId);
      return;
    }
    const resolveId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setResolvedId(session.user.id);
      else router.push('/login');
    };
    resolveId();
  }, [profileId]);

  useEffect(() => {
    if (resolvedId) fetchDemandes();
  }, [resolvedId]);

const fetchDemandes = async () => {
  if (!resolvedId) return; // ← guard
  setLoading(true);
  try {
    const { data, error } = await demandeService.getClientDemandes(resolvedId);
    if (error) throw error;
    setDemandes(Array.isArray(data) ? data : []); // ← sécurisé
  } catch (error) {
    console.error('Error fetching demandes:', error);
    setDemandes([]); // ← évite de laisser un état invalide
  } finally {
    setLoading(false);
  }
};

  // Filtrage 100% client-side — pas de re-fetch réseau
  const filteredDemandes = demandes.filter(d => {
    const matchFilter = filter === 'all' || d.statut === filter;
    const matchSearch = !searchQuery ||
      d.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.categorie?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleDuplicate = async (ids) => {
    setDuplicating(true);
    try {
      const { data: rows, error } = await supabase
        .from('demandes_client')
        .select('*')
        .in('id', ids);
      if (error) throw error;

      const inserts = rows.map(({ id, created_at, updated_at, ...rest }) => ({
        ...rest,
        statut: 'ouverte',
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('demandes_client')
        .insert(inserts)
        .select('id, type_prestation, ville, date_souhaitee, categorie, titre');
      if (insertError) throw insertError;

      // Déclenche le matching pour chaque nouvelle demande
      (inserted || []).forEach(d => {
        onNewDemande(d.id, d);
      });

      setSelected([]);
      fetchDemandes();
    } catch (err) {
      console.error('[handleDuplicate]', err);
    } finally {
      setDuplicating(false);
    }
  };

  const handleCancelDemande = async (id) => {
      setCancelling(true);
      setCancelError(null);
      try {
        const resolvedClientId = profileId || (await supabase.auth.getSession()).data.session?.user?.id;
  
        const { error, count } = await cancelDemande(id)
  
        if (error) throw error;
        if (count === 0) throw new Error('Aucune ligne mise à jour. Vérifiez vos droits.');
  
        setDemandes(prev => ({ ...prev, statut: 'annulee' }));
        setShowCancelModal(false);
      } catch (error) {
        console.error('Error cancelling demande:', error);
        setCancelError(error.message || 'Une erreur est survenue. Réessayez.');
      } finally {
        setCancelling(false);
      }
    };
  
  const handleReactivateDemande = async (id) => {
      setReactivating(true);
      setReactivateError(null);
      try {
        const resolvedClientId = profileId || (await supabase.auth.getSession()).data.session?.user?.id;
  
        const { error, count } = await reactivateDemande(id)
  
        if (error) throw error;
        if (count === 0) throw new Error('Aucune ligne mise à jour. Vérifiez vos droits.');
  
        setDemandes(prev => ({ ...prev, statut: 'ouverte' }));
        setShowReactivateModal(false);
      } catch (error) {
        console.error('Error reactivating demande:', error);
        setReactivateError(error.message || 'Une erreur est survenue. Réessayez.');
      } finally {
        setReactivating(false);
      }
    };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'gray', icon: AlertCircle };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#130183]" />
              </button>
              <h1 className="text-2xl font-bold text-[#130183]">Mes demandes</h1>
            </div>
            <p className="text-gray-600 mt-1 pl-11">
              {demandes.length} demande{demandes.length > 1 ? 's' : ''} au total
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                onClick={() => handleDuplicate(selected)}
                disabled={duplicating}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                Dupliquer ({selected.length})
              </button>
            )}
            {selected.length > 0  && selected.some(id => demandes.find(d => d.id === id && d.statut === 'ouverte')) && (
              <button
                onClick={() => handleCancelDemande(selected)}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl border border-red-300 text-red-700 font-medium hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Annuler ({selected.length})
              </button>
            )}

            {selected.length > 0 && selected.some(id => demandes.find(d => d.id === id && d.statut === 'annulee')) && (
              <button
                onClick={() => handleReactivateDemande(selected)}
                disabled={reactivating}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl border border-green-300 text-green-700 font-medium hover:bg-green-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Réactiver ({selected.length})
              </button>
            )}
            <button
              onClick={() => router.push('/client/demandes/create')}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white font-medium transition-all"
              style={{ backgroundColor: COLORS.accent }}
            >
              <Plus className="w-5 h-5" />
              Nouvelle demande
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une demande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'ouverte', 'pourvue', 'annulee', 'expiree'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Toutes' : STATUS_CONFIG[status]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Demandes List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredDemandes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune demande trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              {filter !== 'all' 
                ? 'Aucune demande ne correspond à ce filtre.'
                : 'Créez votre première demande pour recevoir des devis de photographes.'}
            </p>
            <button
              onClick={() => router.push('/client/demandes/create')}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white font-medium"
              style={{ backgroundColor: COLORS.accent }}
            >
              <Plus className="w-5 h-5" />
              Créer une demande
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDemandes.map((demande) => (
              <div
                key={demande.id}
                onClick={() => router.push(`/client/demandes/${demande.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox sélection */}
                    <input
                      type="checkbox"
                      checked={selected.includes(demande.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(demande.id); }}
                      className="mt-1.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                    />
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {demande.titre || 'Demande sans titre'}
                      </h2>
                      {getStatusBadge(demande.statut)}
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {demande.description || 'Aucune description'}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {demande.categorie && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-lg">{getCategoryIcon(demande.categorie)}</span>
                          {demande.categorie}
                        </span>
                      )}
                      {demande.date_souhaitee && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(demande.date_souhaitee)}
                        </span>
                      )}
                      {demande.lieu && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {demande.lieu}
                        </span>
                      )}
                      {demande.budget_max && (
                        <span className="inline-flex items-center gap-1">
                          {`Max ${demande.budget_max} MAD`}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {demande.devis?.[0]?.count > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {demande.devis[0].count}
                        </div>
                        <div className="text-xs text-gray-500">
                          devis reçu{demande.devis[0].count > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate([demande.id]); }}
                      disabled={duplicating}
                      title="Dupliquer cette demande"
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-40"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {demande.statut === 'expiree' && (
                  <div className="mt-4 pt-4 border-t border-amber-100 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                      <p>
                        Cette demande a expiré car la date souhaitée
                        {demande.date_souhaitee ? ` (${formatDate(demande.date_souhaitee)})` : ''}
                        {' '}est passée.
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push('/client/demandes/create'); }}
                      className="flex-shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-all"
                    >
                      Créer une nouvelle demande
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    'mariage': '💒',
    'portrait': '👤',
    'evenement': '🎉',
    'corporate': '🏢',
    'produit': '📦',
    'immobilier': '🏠',
    'famille': '👨‍👩‍👧‍👦',
    'grossesse': '🤰',
    'nouveau-ne': '👶',
    'animalier': '🐕',
    'culinaire': '🍽️',
  };
  return icons[category?.toLowerCase()] || '📷';
}
