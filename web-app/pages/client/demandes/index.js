import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  Plus, Search, Filter, Calendar, MapPin, 
  Clock, Euro, ChevronRight, FileText, Eye,
  CheckCircle, XCircle, AlertCircle
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

  // Résoudre l'ID sans attendre l'AuthContext (évite les chargements longs)
  useEffect(() => {
    const resolveId = async () => {
      if (profileId) {
        setResolvedId(profileId);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setResolvedId(user.id);
      else router.push('/login');
    };
    resolveId();
  }, [profileId]);

  useEffect(() => {
    if (resolvedId) fetchDemandes();
  }, [resolvedId, filter]);

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demandes_client')
        .select('*')
        .eq('client_id', resolvedId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDemandes(data || []);
    } catch (error) {
      console.error('Error fetching demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDemandes = demandes.filter(d => 
    d.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.categorie?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
            <p className="text-gray-600 mt-1">
              {demandes.length} demande{demandes.length > 1 ? 's' : ''} au total
            </p>
          </div>
          
          <button
            onClick={() => router.push('/client/demandes/create')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all"
            style={{ backgroundColor: COLORS.accent }}
          >
            <Plus className="w-5 h-5" />
            Nouvelle demande
          </button>
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
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
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
                      {(demande.budget_min || demande.budget_max) && (
                        <span className="inline-flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          {demande.budget_min && demande.budget_max 
                            ? `${demande.budget_min} DH - ${demande.budget_max} DH`
                            : demande.budget_max ? `Max ${demande.budget_max} DH` : `Min ${demande.budget_min} DH`
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
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
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
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
