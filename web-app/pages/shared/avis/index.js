import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Star, StarHalf, ThumbsUp, MessageCircle, Filter,
  ChevronLeft, ChevronRight, Camera, Calendar, User
} from 'lucide-react';

export default function AvisPage() {
  const router = useRouter();
  const { user, activeRole } = useAuth();
  const [avis, setAvis] = useState([]);
  const [stats, setStats] = useState({
    moyenne: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, received, given
  const [sortBy, setSortBy] = useState('recent'); // recent, highest, lowest
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isPhotographe = activeRole === 'photographe' || activeRole === 'prestataire';

  useEffect(() => {
    if (user?.id) {
      fetchAvis();
    }
  }, [user, filter, sortBy, currentPage]);

  const fetchAvis = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('avis').select(`
        *,
        auteur:profiles!avis_auteur_id_fkey(id, nom, avatar_url),
        destinataire:profiles!avis_destinataire_id_fkey(id, nom, avatar_url),
        reservation:reservations(id, date_prestation, type_prestation)
      `, { count: 'exact' });

      // Filter by role
      if (filter === 'received') {
        query = query.eq('destinataire_id', user.id);
      } else if (filter === 'given') {
        query = query.eq('auteur_id', user.id);
      } else {
        query = query.or(`auteur_id.eq.${user.id},destinataire_id.eq.${user.id}`);
      }

      // Sort
      if (sortBy === 'highest') {
        query = query.order('note', { ascending: false });
      } else if (sortBy === 'lowest') {
        query = query.order('note', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      setAvis(data || []);

      // Calculate stats for received reviews
      if (isPhotographe) {
        const { data: statsData } = await supabase
          .from('avis')
          .select('note')
          .eq('destinataire_id', user.id);

        if (statsData && statsData.length > 0) {
          const total = statsData.length;
          const moyenne = statsData.reduce((sum, a) => sum + a.note, 0) / total;
          const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          statsData.forEach(a => {
            const rounded = Math.round(a.note);
            if (distribution[rounded] !== undefined) {
              distribution[rounded]++;
            }
          });
          setStats({ moyenne, total, distribution });
        }
      }
    } catch (error) {
      console.error('Error fetching avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<StarHalf key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-5 h-5 text-gray-300" />);
      }
    }
    return stars;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && avis.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes Avis</h1>
          <Link
            href={isPhotographe ? '/photographe/dashboard' : '/client/dashboard'}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Retour au tableau de bord
          </Link>
        </div>

        {/* Stats Card - Only for photographers */}
        {isPhotographe && stats.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="text-center md:text-left">
                <div className="text-5xl font-bold text-gray-900">
                  {stats.moyenne.toFixed(1)}
                </div>
                <div className="flex justify-center md:justify-start mt-2">
                  {renderStars(stats.moyenne)}
                </div>
                <p className="text-gray-500 mt-1">{stats.total} avis</p>
              </div>
              
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star];
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-600 w-3">{star}</span>
                      <Star className="w-4 h-4 text-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => { setFilter('received'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'received' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Reçus
              </button>
              <button
                onClick={() => { setFilter('given'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'given' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Donnés
              </button>
            </div>
            
            <div className="flex-1" />
            
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="recent">Plus récents</option>
              <option value="highest">Meilleures notes</option>
              <option value="lowest">Notes les plus basses</option>
            </select>
          </div>
        </div>

        {/* Avis List */}
        <div className="space-y-4">
          {avis.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun avis</h3>
              <p className="text-gray-500">
                {filter === 'given' 
                  ? "Vous n'avez pas encore laissé d'avis."
                  : filter === 'received'
                  ? "Vous n'avez pas encore reçu d'avis."
                  : "Aucun avis pour le moment."}
              </p>
            </div>
          ) : (
            avis.map((review) => {
              const isReceived = review.destinataire_id === user?.id;
              const otherPerson = isReceived ? review.auteur : review.destinataire;
              
              return (
                <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {otherPerson?.avatar_url ? (
                        <img 
                          src={otherPerson.avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-indigo-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {otherPerson?.nom || 'Utilisateur'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isReceived 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isReceived ? 'Reçu' : 'Donné'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex">{renderStars(review.note)}</div>
                        <span className="font-medium text-gray-700">{review.note}/5</span>
                      </div>
                      
                      {review.commentaire && (
                        <p className="text-gray-700 mb-3">{review.commentaire}</p>
                      )}
                      
                      {review.reservation && (
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t">
                          <div className="flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            <span>{review.reservation.type_prestation || 'Prestation'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(review.reservation.date_prestation)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {avis.length >= itemsPerPage && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-gray-600">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={avis.length < itemsPerPage}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
