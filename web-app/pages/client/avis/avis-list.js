import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import * as avisService from '../../../lib/avisService';

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
  const { user, profileId, loading: authLoading } = useAuth();
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (profileId) fetchAvis();
  }, [user, profileId, authLoading]);

  const fetchAvis = async () => {
    setLoading(true);
    try {
      // 1. Avis du client
      const { data: avisData, error } = await avisService.getClientReviews(profileId);

      if (error) throw error;

      if (!avisData || avisData.length === 0) {
        setAvis([]);
        return;
      }

      // 2. IDs prestataires uniques
      const prestataireIds = [
        ...new Set(avisData.map(a => a.prestataire_id))
      ];

      // 3. Récupération des profils prestataires
      const { data: prestataires, error: err2 } = await supabase
        .from('profiles')
        .select('id, nom, avatar_url')
        .in('id', prestataireIds);

      if (err2) throw err2;

      // 4. Mapping prestataires
      const prestataireMap = {};
      prestataires.forEach(p => {
        prestataireMap[p.id] = p;
      });

      // 5. Fusion des données
      const enrichedAvis = avisData.map(a => ({
        ...a,
        prestataire: prestataireMap[a.prestataire_id] || null,
      }));

      // 6. Set state
      setAvis(enrichedAvis);

    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filtered = avis.filter(a =>
    a.prestataire?.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.comment?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/client/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#130183]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#130183]">Mes avis</h1>
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
                    {a.prestataire?.nom?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{a.prestataire?.nom || 'Prestataire'}</p>
                      <StarRating note={a.rating || 0} />
                    </div>
                    {a.comment && (
                      <p className="text-gray-600 text-sm mt-1">{a.comment}</p>
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
