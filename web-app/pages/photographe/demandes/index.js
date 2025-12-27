import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import { 
  Search, Filter, Calendar, MapPin, Euro, Users,
  Clock, ChevronRight, Zap, Eye, FileText, Star,
  TrendingUp, CheckCircle
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Toutes', icon: '📷' },
  { id: 'mariage', label: 'Mariage', icon: '💒' },
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'evenement', label: 'Événement', icon: '🎉' },
  { id: 'corporate', label: 'Corporate', icon: '🏢' },
  { id: 'produit', label: 'Produit', icon: '📦' },
  { id: 'immobilier', label: 'Immobilier', icon: '🏠' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
];

export default function PhotographerDemandesPage() {
  const router = useRouter();
  const { photographeProfile, profileId } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [myDevis, setMyDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDemandes();
    if (photographeProfile?.id) {
      fetchMyDevis();
    }
  }, [photographeProfile, categoryFilter]);

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demandes_client')
        .select(`
          *,
          client:profiles!demandes_client_particulier_id_fkey(nom, prenom, photo_profil),
          devis(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('categorie', categoryFilter);
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

  const fetchMyDevis = async () => {
    try {
      const { data, error } = await supabase
        .from('devis')
        .select('demande_id')
        .eq('photographe_id', photographeProfile.id);

      if (error) throw error;
      setMyDevis(data?.map(d => d.demande_id) || []);
    } catch (error) {
      console.error('Error fetching my devis:', error);
    }
  };

  const filteredDemandes = demandes.filter(d => {
    // Search
    const matchesSearch = 
      d.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.lieu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Location
    const matchesLocation = !locationFilter || 
      d.lieu?.toLowerCase().includes(locationFilter.toLowerCase());

    // Budget
    const matchesBudget = !budgetMin || 
      (d.budget_max && d.budget_max >= parseInt(budgetMin));

    return matchesSearch && matchesLocation && matchesBudget;
  });

  const hasSubmittedDevis = (demandeId) => myDevis.includes(demandeId);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Flexible';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays} jours`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Demandes clients
          </h1>
          <p className="text-gray-600 mt-1">
            Trouvez des clients et proposez vos services
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre, lieu, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                showFilters ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtres
            </button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation
                </label>
                <input
                  type="text"
                  placeholder="Ville, département..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget minimum
                </label>
                <input
                  type="number"
                  placeholder="200"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setLocationFilter('');
                    setBudgetMin('');
                  }}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
          <span>{filteredDemandes.length} demande(s) trouvée(s)</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {demandes.filter(d => {
              const hoursSinceCreation = (Date.now() - new Date(d.created_at)) / (1000 * 60 * 60);
              return hoursSinceCreation < 24;
            }).length} nouvelle(s) aujourd'hui
          </span>
        </div>

        {/* Demandes list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredDemandes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune demande trouvée
            </h3>
            <p className="text-gray-500">
              Essayez de modifier vos critères de recherche.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDemandes.map((demande) => (
              <DemandeCard
                key={demande.id}
                demande={demande}
                hasSubmitted={hasSubmittedDevis(demande.id)}
                onClick={() => router.push(`/photographe/demandes/${demande.id}`)}
                onSubmit={() => router.push(`/photographe/demandes/${demande.id}/devis`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DemandeCard({ demande, hasSubmitted, onClick, onSubmit }) {
  const getCategoryIcon = (category) => {
    const icons = {
      'mariage': '💒', 'portrait': '👤', 'evenement': '🎉', 'corporate': '🏢',
      'produit': '📦', 'immobilier': '🏠', 'famille': '👨‍👩‍👧‍👦', 'grossesse': '🤰',
      'nouveau-ne': '👶', 'animalier': '🐕', 'culinaire': '🍽️',
    };
    return icons[category?.toLowerCase()] || '📷';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Flexible';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays} jours`;
  };

  const isNew = (Date.now() - new Date(demande.created_at)) / (1000 * 60 * 60) < 24;
  const devisCount = demande.devis?.[0]?.count || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Category icon */}
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl">
          {getCategoryIcon(demande.categorie)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isNew && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Nouveau
              </span>
            )}
            <span className="text-sm text-gray-500">{getTimeAgo(demande.created_at)}</span>
            {hasSubmitted && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                <CheckCircle className="w-3 h-3" />
                Devis envoyé
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 mb-2 truncate">
            {demande.titre}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {demande.description || 'Aucune description'}
          </p>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(demande.date_souhaitee)}
              {demande.date_flexible && ' (flexible)'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {demande.lieu || 'Non précisé'}
            </span>
            {demande.duree_estimee && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {demande.duree_estimee}h
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-3">
          {/* Budget */}
          <div className="text-right">
            <p className="text-sm text-gray-500">Budget</p>
            <p className="font-bold text-lg text-indigo-600">
              {demande.budget_min && demande.budget_max 
                ? `${demande.budget_min}€ - ${demande.budget_max}€`
                : demande.budget_max 
                ? `Max ${demande.budget_max}€`
                : 'Non défini'}
            </p>
          </div>

          {/* Devis count */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{devisCount} devis</span>
          </div>

          {/* Action button */}
          {!hasSubmitted ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSubmit();
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all"
            >
              Proposer un devis
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Voir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
