import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, MapPin, Calendar, Filter, Star, Camera, Euro,
  ChevronDown, ChevronUp, X, SlidersHorizontal, Heart,
  Clock, CheckCircle, Grid, List
} from 'lucide-react';

export default function RecherchePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [photographes, setPhotographes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    specialite: '',
    ville: '',
    prixMin: '',
    prixMax: '',
    noteMin: '',
    disponible: false,
    instantBooking: false,
  });
  const [sortBy, setSortBy] = useState('pertinence');

  const specialites = [
    'Mariage',
    'Portrait',
    'Événement',
    'Corporate',
    'Produit',
    'Mode',
    'Immobilier',
    'Nouveau-né',
    'Famille',
    'Sport',
    'Culinaire',
    'Nature',
  ];

  useEffect(() => {
    fetchPhotographes();
  }, [filters, sortBy]);

  const fetchPhotographes = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profils_photographe')
        .select(`
          *,
          profile:profiles!profils_photographe_user_id_fkey(id, nom, avatar_url, ville)
        `)
        .eq('actif', true);

      // Apply filters
      if (filters.specialite) {
        query = query.contains('specialites', [filters.specialite]);
      }
      if (filters.ville) {
        query = query.ilike('profile.ville', `%${filters.ville}%`);
      }
      if (filters.prixMin) {
        query = query.gte('tarif_horaire', parseInt(filters.prixMin));
      }
      if (filters.prixMax) {
        query = query.lte('tarif_horaire', parseInt(filters.prixMax));
      }
      if (filters.noteMin) {
        query = query.gte('note_moyenne', parseFloat(filters.noteMin));
      }
      if (filters.instantBooking) {
        query = query.eq('reservation_instantanee', true);
      }

      // Apply sorting
      switch (sortBy) {
        case 'note':
          query = query.order('note_moyenne', { ascending: false });
          break;
        case 'prix_asc':
          query = query.order('tarif_horaire', { ascending: true });
          break;
        case 'prix_desc':
          query = query.order('tarif_horaire', { ascending: false });
          break;
        case 'avis':
          query = query.order('nombre_avis', { ascending: false });
          break;
        default:
          query = query.order('note_moyenne', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Client-side search filter
      let results = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(p => 
          p.profile?.nom?.toLowerCase().includes(searchLower) ||
          p.bio?.toLowerCase().includes(searchLower) ||
          p.specialites?.some(s => s.toLowerCase().includes(searchLower))
        );
      }

      setPhotographes(results);
    } catch (error) {
      console.error('Error fetching photographes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPhotographes();
  };

  const clearFilters = () => {
    setFilters({
      specialite: '',
      ville: '',
      prixMin: '',
      prixMax: '',
      noteMin: '',
      disponible: false,
      instantBooking: false,
    });
    setSearch('');
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== false).length;

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Trouvez le photographe idéal
          </h1>
          <p className="text-indigo-100 mb-8">
            Des milliers de photographes professionnels près de chez vous
          </p>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, spécialité..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:ring-2 focus:ring-white"
              />
            </div>
            <div className="relative md:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.ville}
                onChange={(e) => setFilters(f => ({ ...f, ville: e.target.value }))}
                placeholder="Ville"
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:ring-2 focus:ring-white"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition"
            >
              Rechercher
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                showFilters ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            <p className="text-gray-600">
              <span className="font-semibold">{photographes.length}</span> photographes trouvés
            </p>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pertinence">Pertinence</option>
              <option value="note">Mieux notés</option>
              <option value="avis">Plus d'avis</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
            </select>

            <div className="hidden md:flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'bg-white'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filtres</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Specialité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spécialité
                </label>
                <select
                  value={filters.specialite}
                  onChange={(e) => setFilters(f => ({ ...f, specialite: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Toutes</option>
                  {specialites.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {/* Prix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (€/heure)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.prixMin}
                    onChange={(e) => setFilters(f => ({ ...f, prixMin: e.target.value }))}
                    className="w-1/2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.prixMax}
                    onChange={(e) => setFilters(f => ({ ...f, prixMax: e.target.value }))}
                    className="w-1/2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note minimum
                </label>
                <select
                  value={filters.noteMin}
                  onChange={(e) => setFilters(f => ({ ...f, noteMin: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Toutes</option>
                  <option value="4.5">4.5+ étoiles</option>
                  <option value="4">4+ étoiles</option>
                  <option value="3.5">3.5+ étoiles</option>
                  <option value="3">3+ étoiles</option>
                </select>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.instantBooking}
                      onChange={(e) => setFilters(f => ({ ...f, instantBooking: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Réservation instantanée</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : photographes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun photographe trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              Essayez de modifier vos critères de recherche
            </p>
            <button
              onClick={clearFilters}
              className="text-indigo-600 hover:text-indigo-800"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {photographes.map((photographe) => (
              <Link
                key={photographe.id}
                href={`/photographe/${photographe.user_id}`}
                className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Image */}
                <div className={`bg-gray-100 ${viewMode === 'list' ? 'w-48 h-48' : 'h-48'}`}>
                  {photographe.photo_couverture || photographe.profile?.avatar_url ? (
                    <img
                      src={photographe.photo_couverture || photographe.profile?.avatar_url}
                      alt={photographe.profile?.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {photographe.profile?.nom || 'Photographe'}
                      </h3>
                      {photographe.profile?.ville && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {photographe.profile.ville}
                        </p>
                      )}
                    </div>
                    {photographe.reservation_instantanee && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Instant
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex">{renderStars(photographe.note_moyenne || 0)}</div>
                    <span className="text-sm font-medium text-gray-700">
                      {(photographe.note_moyenne || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({photographe.nombre_avis || 0} avis)
                    </span>
                  </div>

                  {/* Specialités */}
                  {photographe.specialites && photographe.specialites.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {photographe.specialites.slice(0, 3).map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                      {photographe.specialites.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{photographe.specialites.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1 text-indigo-600">
                      <Euro className="w-5 h-5" />
                      <span className="font-semibold">
                        {photographe.tarif_horaire || '—'}€
                      </span>
                      <span className="text-sm text-gray-500">/heure</span>
                    </div>
                    <span className="text-sm text-indigo-600 font-medium">
                      Voir le profil →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
