import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { VILLES_MAROC } from '../../../constants/villes';

import {
  Search, MapPin, Star, Camera, SlidersHorizontal,
  Grid, List, X, CheckCircle, ArrowLeft
} from 'lucide-react';

const COLORS = {
  accent: '#130183',
};

// Toutes les spécialisations (sous-catégories)
const SPECIALISATIONS = [
  'Plomberie', 'Électricité', 'Ménage', 'Bricolage',
  'Chauffeur', 'Livraison', 'Déménagement',
  'Développement', 'Design', 'Marketing',
  'Cours particuliers', 'Coaching',
];

const ALL_SPECIALITES = [...SPECIALISATIONS];



export default function RecherchePrestatairesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [prestataires, setPrestataires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);


  const [filters, setFilters] = useState({
    specialite: '',
    ville: '',
    prixMin: '',
    prixMax: '',
    noteMin: '',
  });
  const [sortBy, setSortBy] = useState('note');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchPrestataires();
  }, [filters, sortBy, user, authLoading]);

  const fetchPrestataires = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, nom, prenom, avatar_url, ville, suspendu,
          profil:profils_prestataire!inner(
            bio, nom_entreprise, tarif_horaire_min, note_moyenne, nb_avis,
            specialisations, categories, identite_verifiee, statut_validation,
            portfolio_photos, rayon_deplacement_km
          )
        `)
        .eq('role', 'photographe')
        .eq('suspendu', false)
        .limit(200);

      if (error) throw error;

      let results = (data || [])
        .filter(p => p.profil?.statut_validation === 'approved')
        .map(p => ({
          ...p.profil,
          id: p.id,
          profile: { id: p.id, nom: p.nom, prenom: p.prenom, avatar_url: p.avatar_url, ville: p.ville },
        }));

      // Filtres
      if (filters.specialite) {
        results = results.filter(p =>
          p.categories?.some(c => c === filters.specialite) ||
          p.specialisations?.some(s => s === filters.specialite)
        );
      }
      if (filters.ville) {
        const v = filters.ville.toLowerCase();
        results = results.filter(p =>
          p.profile?.ville?.toLowerCase().includes(v)
        );
      }
      if (filters.prixMin) {
        results = results.filter(p => p.tarif_horaire_min >= parseInt(filters.prixMin));
      }
      if (filters.prixMax) {
        results = results.filter(p => !p.tarif_horaire_min || p.tarif_horaire_min <= parseInt(filters.prixMax));
      }
      if (filters.noteMin) {
        results = results.filter(p => (p.note_moyenne || 0) >= parseFloat(filters.noteMin));
      }

      // Sort client-side
      switch (sortBy) {
        case 'note':     results.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0)); break;
        case 'avis':     results.sort((a, b) => (b.nb_avis || 0) - (a.nb_avis || 0)); break;
        case 'prix_asc': results.sort((a, b) => (a.tarif_horaire_min || 9999) - (b.tarif_horaire_min || 9999)); break;
        case 'prix_desc':results.sort((a, b) => (b.tarif_horaire_min || 0) - (a.tarif_horaire_min || 0)); break;
      }

      setPrestataires(results);
    } catch (err) {
      console.error('Erreur recherche prestataires:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ specialite: '', ville: '', prixMin: '', prixMax: '', noteMin: '' });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== false).length;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Trouver un prestataire</h2>
          <p className="text-gray-600 mt-1">Recherchez parmi nos prestataires vérifiés</p>
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative sm:w-56">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <select
                value={filters.ville}
                onChange={e => setFilters(f => ({ ...f, ville: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white appearance-none"
              >
                <option value="">Toutes les villes</option>
                {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filters.specialite}
                onChange={e => setFilters(f => ({ ...f, specialite: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white appearance-none"
              >
                <option value="">Toutes les spécialités</option>
                {SPECIALISATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                
              </select>
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg border text-sm font-medium transition-all ${
                showFilters || activeFiltersCount > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Plus de filtres
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs text-black" style={{ backgroundColor: COLORS.accent }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Filtres avancés</h2>
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note minimum</label>
                <select
                  value={filters.noteMin}
                  onChange={e => setFilters(f => ({ ...f, noteMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                >
                  <option value="">Toutes</option>
                  <option value="4.5">4.5+ ⭐</option>
                  <option value="4">4+ ⭐</option>
                  <option value="3.5">3.5+ ⭐</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget DH/heure</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={filters.prixMin}
                    onChange={e => setFilters(f => ({ ...f, prixMin: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                  />
                  <input type="number" placeholder="Max" value={filters.prixMax}
                    onChange={e => setFilters(f => ({ ...f, prixMax: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trier par</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                >
                  <option value="note">Mieux notés</option>
                  <option value="avis">Plus d'avis</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{prestataires.length}</span> prestataire{prestataires.length !== 1 ? 's' : ''} trouvé{prestataires.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="note">Mieux notés</option>
              <option value="avis">Plus d'avis</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
            </select>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all ${viewMode === 'grid' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                style={viewMode === 'grid' ? { backgroundColor: COLORS.accent } : {}}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all ${viewMode === 'list' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                style={viewMode === 'list' ? { backgroundColor: COLORS.accent } : {}}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: COLORS.accent }} />
          </div>
        ) : prestataires.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucun prestataire trouvé</h2>
            <p className="text-gray-500 mb-4">Essayez de modifier vos critères de recherche</p>
            <button onClick={clearFilters} className="text-sm font-medium hover:underline" style={{ color: COLORS.accent }}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prestataires.map(p => (
              <PrestaireCard key={p.id} prestataire={p} router={router} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {prestataires.map(p => (
              <PrestaireRow key={p.id} prestataire={p} router={router} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function getVerificationPct(p) {
  const checks = [
    !!(p.nom_entreprise || p.profile?.nom),
    !!p.bio,
    !!p.profile?.avatar_url,
    !!p.tarif_horaire_min,
    p.specialisations?.length > 0,
    p.portfolio_photos?.length > 0,
    p.identite_verifiee === true,
    p.statut_validation === 'approved',
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function VerifBadge({ pct }) {
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6b7280';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 whitespace-nowrap">Profil complété</span>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ width: 48 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{pct}%</span>
    </div>
  );
}

function StarRating({ note }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className="w-3.5 h-3.5"
          fill={s <= Math.round(note) ? '#FBBF24' : 'none'}
          stroke={s <= Math.round(note) ? '#FBBF24' : '#D1D5DB'}
        />
      ))}
    </div>
  );
}

function PrestaireCard({ prestataire: p, router }) {
  const nom = p.nom_entreprise || `${p.profile?.prenom || ''} ${p.profile?.nom || ''}`.trim() || 'Prestataire';
  const verifPct = getVerificationPct(p);

  return (
    <div
      onClick={() => router.push(`/client/photographes/${p.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer"
    >
      {/* Avatar / cover */}
      <div className="h-40 bg-indigo-50 flex items-center justify-center">
        {p.profile?.avatar_url ? (
          <img src={p.profile.avatar_url} alt={nom} className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-12 h-12 text-indigo-200" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-semibold text-gray-900 truncate">{nom}</h2>
          {p.identite_verifiee && (
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" title="Identité vérifiée" />
          )}
        </div>

        {/* Ville */}
        {p.profile?.ville && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin className="w-3 h-3" />{p.profile.ville}
          </p>
        )}

        <div className="mb-2">
          <VerifBadge pct={verifPct} />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <StarRating note={p.note_moyenne || 0} />
          <span className="text-sm font-medium text-gray-700">{(p.note_moyenne || 0).toFixed(1)}</span>
          <span className="text-sm text-gray-400">({p.nb_avis || 0} avis)</span>
        </div>

        {p.specialisations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {p.specialisations.slice(0, 3).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">{s}</span>
            ))}
            {p.specialisations.length > 3 && (
              <span className="text-xs text-gray-400">+{p.specialisations.length - 3}</span>
            )}
          </div>
        )}

        {p.bio && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.bio}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {p.tarif_horaire_min ? (
              <span className="font-bold text-gray-900">{p.tarif_horaire_min} <span className="text-sm font-normal text-gray-500">DH/h</span></span>
            ) : (
              <span className="text-sm text-gray-400">Tarif sur demande</span>
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: COLORS.accent }}>Voir →</span>
        </div>
      </div>
    </div>
  );
}

function PrestaireRow({ prestataire: p, router }) {
  const nom = p.nom_entreprise || `${p.profile?.prenom || ''} ${p.profile?.nom || ''}`.trim() || 'Prestataire';
  const verifPct = getVerificationPct(p);

  return (
    <div
      onClick={() => router.push(`/client/photographes/${p.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
    >
      <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {p.profile?.avatar_url ? (
          <img src={p.profile.avatar_url} alt={nom} className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-8 h-8 text-indigo-200" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="font-semibold text-gray-900 truncate">{nom}</h2>
          {p.identite_verifiee && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" title="Identité vérifiée" />}
        </div>
        {p.categories?.length > 0 && (
          <p className="text-xs font-medium text-indigo-600 mb-0.5">{p.categories[0]}</p>
        )}
        {p.profile?.ville && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <MapPin className="w-3 h-3" />{p.profile.ville}
          </p>
        )}
        <div className="mb-1.5">
          <VerifBadge pct={verifPct} />
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <StarRating note={p.note_moyenne || 0} />
          <span className="text-sm text-gray-500">{(p.note_moyenne || 0).toFixed(1)} ({p.nb_avis || 0} avis)</span>
        </div>
        {p.specialisations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {p.specialisations.slice(0, 4).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">{s}</span>
            ))}
          </div>
        )}
        {p.bio && (
          <p className="text-xs text-gray-500 line-clamp-1">{p.bio}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {p.tarif_horaire_min ? (
          <p className="font-bold text-gray-900">{p.tarif_horaire_min} <span className="text-sm font-normal text-gray-500">DH/h</span></p>
        ) : (
          <p className="text-sm text-gray-400">Sur demande</p>
        )}
        <span className="text-sm font-medium mt-1 block" style={{ color: COLORS.accent }}>Voir le profil →</span>
      </div>
    </div>
  );
}
