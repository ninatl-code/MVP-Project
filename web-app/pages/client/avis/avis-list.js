import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { Star, ArrowLeft, Search, Calendar } from 'lucide-react';

const COLORS = {
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

function StarRating({ note }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-4 h-4"
          fill={s <= note ? '#FBBF24' : 'none'}
          stroke={s <= note ? '#FBBF24' : '#D1D5DB'}
        />
      ))}
    </div>
  );
}

export default function AvisListPage() {
  const router = useRouter();
  const { profileId } = useAuth();
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedId, setResolvedId] = useState(null);

  // Résoudre l'ID sans attendre l'AuthContext
  useEffect(() => {
    const resolveId = async () => {
      if (profileId) { setResolvedId(profileId); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setResolvedId(user.id);
      else router.push('/login');
    };
    resolveId();
  }, [profileId]);

  useEffect(() => {
    if (resolvedId) fetchAvis();
  }, [resolvedId]);

  const fetchAvis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('avis')
        .select(`
          *,
          reviewee:profiles!avis_reviewee_id_fkey(id, nom, avatar_url)
        `)
        .eq('reviewer_id', resolvedId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvis(data || []);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = avis.filter(a =>
    a.reviewee?.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.commentaire?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/client/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes avis</h1>
            <p className="text-gray-500 text-sm mt-0.5">{avis.length} avis donnés</p>
          </div>
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par prestataire ou commentaire..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
            />
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: COLORS.accent }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucun avis</h2>
            <p className="text-gray-500">Vous n'avez pas encore laissé d'avis.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(a => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 flex-shrink-0 text-lg">
                    {a.reviewee?.nom?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{a.reviewee?.nom || 'Prestataire'}</p>
                      <StarRating note={a.note || 0} />
                    </div>
                    {a.commentaire && (
                      <p className="text-gray-600 text-sm mt-1">{a.commentaire}</p>
                    )}
                    {a.created_at && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                    )}
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
