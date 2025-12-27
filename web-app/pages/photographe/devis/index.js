import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import { 
  FileText, Clock, Check, X, Euro, ChevronRight,
  User, Calendar, AlertCircle, Search
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

export default function PhotographeDevisPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    total: 0,
    revenue: 0
  });

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchDevis();
    }
  }, [photographeProfile]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          demande:demande_id (
            titre,
            categorie,
            date_souhaitee,
            client:client_id (
              prenom,
              nom,
              photo_profil
            )
          )
        `)
        .eq('photographe_id', photographeProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check and update expired devis
      const now = new Date();
      const processedDevis = (data || []).map(d => {
        if (d.statut === 'en_attente' && d.date_expiration && isAfter(now, new Date(d.date_expiration))) {
          return { ...d, statut: 'expire' };
        }
        return d;
      });

      setDevis(processedDevis);

      // Calculate stats
      setStats({
        pending: processedDevis.filter(d => d.statut === 'en_attente').length,
        accepted: processedDevis.filter(d => d.statut === 'accepte').length,
        total: processedDevis.length,
        revenue: processedDevis
          .filter(d => d.statut === 'accepte')
          .reduce((sum, d) => sum + (d.montant_total || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevis = devis.filter(d => {
    // Filter by status
    if (activeFilter !== 'all' && d.statut !== activeFilter) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName = `${d.demande?.client?.prenom || ''} ${d.demande?.client?.nom || ''}`.toLowerCase();
      const title = (d.demande?.titre || '').toLowerCase();
      return clientName.includes(query) || title.includes(query);
    }
    
    return true;
  });

  const filters = [
    { key: 'all', label: 'Tous', count: devis.length },
    { key: 'en_attente', label: 'En attente', count: stats.pending },
    { key: 'accepte', label: 'Acceptés', count: stats.accepted },
    { key: 'refuse', label: 'Refusés', count: devis.filter(d => d.statut === 'refuse').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes devis</h1>
          <p className="text-gray-600 mt-1">
            Gérez tous vos devis envoyés
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">En attente</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Acceptés</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">CA généré</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.revenue}€</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par client ou demande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto">
              {filters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeFilter === filter.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Devis List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredDevis.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun devis
            </h3>
            <p className="text-gray-500 mb-6">
              {activeFilter === 'all' 
                ? 'Vous n\'avez pas encore envoyé de devis'
                : 'Aucun devis avec ce statut'
              }
            </p>
            <Link
              href="/photographe/demandes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
            >
              Voir les demandes
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDevis.map((d) => (
              <DevisCard key={d.id} devis={d} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DevisCard({ devis }) {
  const statusConfig = STATUS_CONFIG[devis.statut] || STATUS_CONFIG['en_attente'];
  const StatusIcon = statusConfig.icon;
  const isExpired = devis.statut === 'en_attente' && devis.date_expiration && 
    isAfter(new Date(), new Date(devis.date_expiration));

  return (
    <Link href={`/photographe/devis/${devis.id}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${
                isExpired ? STATUS_CONFIG['expire'].color : statusConfig.color
              }`}>
                <StatusIcon className="w-4 h-4" />
                {isExpired ? 'Expiré' : statusConfig.label}
              </span>
              <span className="text-sm text-gray-500">
                Envoyé {formatDistanceToNow(new Date(devis.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>

            {/* Demande Title */}
            <h3 className="font-semibold text-gray-900 mb-2">
              {devis.demande?.titre || 'Demande sans titre'}
            </h3>

            {/* Client */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {devis.demande?.client?.photo_profil ? (
                  <img 
                    src={devis.demande.client.photo_profil} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span className="text-gray-600">
                {devis.demande?.client?.prenom} {devis.demande?.client?.nom}
              </span>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {devis.demande?.date_souhaitee && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(devis.demande.date_souhaitee), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
              {devis.date_expiration && devis.statut === 'en_attente' && !isExpired && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Clock className="w-4 h-4" />
                  Expire {formatDistanceToNow(new Date(devis.date_expiration), { addSuffix: true, locale: fr })}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">
              {devis.montant_total}€
            </p>
            {devis.acompte && (
              <p className="text-sm text-gray-500">
                Acompte: {devis.acompte}€
              </p>
            )}
          </div>
        </div>

        {/* Actions hint */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {devis.details?.length > 0 && (
              <span className="text-gray-500">
                {devis.details.length} ligne(s) de détail
              </span>
            )}
          </div>
          <span className="text-indigo-600 text-sm font-medium flex items-center gap-1">
            Voir détails
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
