import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';
import { Star, ArrowLeft, User, Calendar, MessageSquare, TrendingUp, ChevronDown } from 'lucide-react';

export default function AvisPage() {
  const router = useRouter();
  const { id: annonceId } = router.query;
  const [annonce, setAnnonce] = useState(null);
  const [avis, setAvis] = useState([]);
  const [avisOriginal, setAvisOriginal] = useState([]); // Pour garder l'ordre original
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, note_desc, note_asc
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    if (annonceId) {
      fetchAnnonceAndAvis();
    }
  }, [annonceId]);

  const fetchAnnonceAndAvis = async () => {
    setLoading(true);
    
    try {
      // 1. Récupérer l'annonce
      const { data: annonceData, error: annonceError } = await supabase
        .from('annonces')
        .select(`
          *,
          prestataire:prestataire(nom, photos)
        `)
        .eq('id', annonceId)
        .single();

      if (annonceError) {
        console.error('Erreur annonce:', annonceError);
        return;
      }

      // Si l'annonce existe et a une ville, récupérer le nom de la ville
      if (annonceData.ville) {
        const { data: villeData, error: villeError } = await supabase
          .from("villes")
          .select("id, ville")
          .eq("id", annonceData.ville)
          .single();
        
        if (villeData) {
          annonceData.villeInfo = villeData;
        }
      }

      setAnnonce(annonceData);

      // 2. Récupérer tous les avis de cette annonce directement via annonce_id  
      const { data: avisData, error: avisError } = await supabase
        .from('avis')
        .select(`
          *,
          particulier:particulier_id(nom, photos)
        `)
        .eq('annonce_id', annonceId)
        .order('created_at', { ascending: false });

      if (avisError) {
        console.error('Erreur lors de la récupération des avis:', avisError);
      } else {
        setAvisOriginal(avisData || []);
        setAvis(avisData || []);
        calculateStats(avisData || []);
        
        // Mettre à jour le rate de l'annonce si il y a des avis
        if (avisData && avisData.length > 0) {
          const moyenne = avisData.reduce((sum, avis) => sum + avis.note, 0) / avisData.length;
          await updateAnnonceRate(annonceId, moyenne);
        }
      }

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour appliquer le tri quand sortBy ou avisOriginal change
  useEffect(() => {
    if (avisOriginal.length > 0) {
      applySorting();
    }
  }, [sortBy, avisOriginal]);

  const applySorting = () => {
    const sorted = [...avisOriginal].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date_asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'note_desc':
          return b.note - a.note;
        case 'note_asc':
          return a.note - b.note;
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    setAvis(sorted);
  };

  const calculateStats = (avisData) => {
    if (avisData.length === 0) {
      setStats({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      return;
    }

    const total = avisData.length;
    const sum = avisData.reduce((acc, avis) => acc + avis.note, 0);
    const average = sum / total;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avisData.forEach(avis => {
      if (distribution.hasOwnProperty(avis.note)) {
        distribution[avis.note]++;
      }
    });

    setStats({ average, total, distribution });
  };

  const updateAnnonceRate = async (annonceId, moyenne) => {
    const { error } = await supabase
      .from('annonces')
      .update({ rate: Math.round(moyenne * 10) / 10 }) // Arrondi à 1 décimale
      .eq('id', annonceId);

    if (error) {
      console.error('Erreur mise à jour rate:', error);
    } else {
      console.log(`✅ Rate de l'annonce ${annonceId} mis à jour: ${Math.round(moyenne * 10) / 10}`);
    }
  };

  const renderStars = (rating, size = 'w-5 h-5') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des avis...</p>
        </div>
      </div>
    );
  }

  if (!annonce) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Annonce non trouvée</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
      <div className="bg-gradient-to-r from-white to-blue-50 shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white hover:shadow-md rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Avis clients</h1>
              <p className="text-gray-600 font-medium">{annonce.titre}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>🏢 {annonce.prestataire?.nom}</span>
                <span>📍 {annonce.villeInfo?.ville || 'Localisation non spécifiée'}</span>
                <span>💰 {annonce.prix ? `${annonce.prix}€` : 'Prix sur demande'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="max-w-6xl mx-auto px-6 py-8">

          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">          {/* Sidebar - Statistiques */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              
              {/* Note moyenne */}
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {stats.average > 0 ? stats.average.toFixed(1) : '—'}
                </div>
                <div className="mb-3">
                  {renderStars(Math.round(stats.average), 'w-6 h-6')}
                </div>
                <p className="text-gray-600">
                  {stats.total} avis client{stats.total > 1 ? 's' : ''}
                </p>
              </div>

              {/* Distribution des notes */}
              {stats.total > 0 && (
                <div className="mb-8">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Répartition des notes
                  </h2>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.distribution[rating];
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    
                    return (
                      <div key={rating} className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-700 w-8">
                          {rating} ⭐
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-8">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info prestataire */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Prestataire</h2>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                    {annonce.prestataire?.photos ? (
                      <img 
                        src={annonce.prestataire.photos} 
                        alt={annonce.prestataire.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {annonce.prestataire?.nom || 'Prestataire'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {annonce.titre}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal - Liste des avis */}
          <div className="lg:col-span-2">
            {stats.total === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Aucun avis pour le moment
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Cette annonce n'a pas encore reçu d'avis. Soyez le premier à partager votre expérience avec ce prestataire !
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/annonces/${annonceId}`)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Voir l'annonce
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Retour
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Tous les avis ({stats.total})
                    </h2>
                    
                    {/* Sélecteur de tri */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Trier par :</span>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="date_desc">📅 Plus récents</option>
                          <option value="date_asc">📅 Plus anciens</option>
                          <option value="note_desc">⭐ Meilleures notes</option>
                          <option value="note_asc">⭐ Notes plus faibles</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicateur de tri */}
                  {stats.total > 1 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <span className="font-medium">
                          {sortBy === 'date_desc' && '📅 Triés du plus récent au plus ancien'}
                          {sortBy === 'date_asc' && '📅 Triés du plus ancien au plus récent'}
                          {sortBy === 'note_desc' && '⭐ Triés des meilleures aux moins bonnes notes'}
                          {sortBy === 'note_asc' && '⭐ Triés des moins bonnes aux meilleures notes'}
                        </span>
                        <span className="text-blue-500">• {stats.total} avis</span>
                      </div>
                    </div>
                  )}
                </div>

                {avis.map((avis) => (
                  <div 
                    key={avis.id} 
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header de l'avis */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                          {avis.particulier?.photos ? (
                            <img 
                              src={avis.particulier.photos} 
                              alt={avis.particulier.nom}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {avis.particulier?.nom || 'Client anonyme'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(avis.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {renderStars(avis.note)}
                        <span className="text-sm font-medium text-gray-600 mt-1">
                          {avis.note}/5
                        </span>
                      </div>
                    </div>

                    {/* Commentaire */}
                    {avis.commentaire && (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border-l-4 border-blue-400">
                        <p className="text-gray-700 leading-relaxed italic">
                          "{avis.commentaire}"
                        </p>
                      </div>
                    )}

                    {/* Type de service et badges */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {avis.commande_id ? '📦 Commande' : '📅 Réservation'}
                        </span>
                        {avis.note >= 4 && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            ⭐ Recommandé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
