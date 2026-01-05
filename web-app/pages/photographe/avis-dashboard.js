import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Star, MessageSquare, Clock, Calendar, AlertCircle,
  CheckCircle, ChevronRight, Send, X, Loader2, TrendingUp,
  ThumbsUp, ThumbsDown, Filter, Search
} from 'lucide-react';

const COLORS = {
  primary: '#F8F9FB',
  accent: '#130183',
  secondary: '#5C6BC0',
  background: '#FFFFFF',
  text: '#222222',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FFC107'
};

export default function AvisDashboardPage() {
  const router = useRouter();
  const { user, photographeProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    pendingResponses: 0,
    thisMonth: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('avis')
        .select(`
          *,
          reviewer:particulier_id(prenom, nom, photos),
          reservation:reservation_id(
            annonces(titre)
          )
        `)
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    const total = reviewsData.reduce((sum, r) => sum + (r.note || r.overall_rating || 0), 0);
    const average = reviewsData.length > 0 ? total / reviewsData.length : 0;
    const pending = reviewsData.filter(r => !r.reponse_prestataire && !r.provider_response).length;

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonth = reviewsData.filter(
      r => new Date(r.created_at) >= thisMonthStart
    ).length;

    // Rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(r => {
      const rating = r.note || r.overall_rating || 0;
      if (rating >= 1 && rating <= 5) {
        distribution[Math.round(rating)]++;
      }
    });

    setStats({
      averageRating: average,
      totalReviews: reviewsData.length,
      pendingResponses: pending,
      thisMonth,
      ratingDistribution: distribution
    });
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setSubmitting(true);
    try {
      await supabase
        .from('avis')
        .update({ 
          reponse_prestataire: responseText.trim(),
          date_reponse: new Date().toISOString()
        })
        .eq('id', selectedReview.id);

      setSelectedReview(null);
      setResponseText('');
      await fetchReviews();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredReviews = () => {
    let filtered = reviews;

    // Filter by status
    if (filter === 'pending') {
      filtered = filtered.filter(r => !r.reponse_prestataire && !r.provider_response);
    } else if (filter === 'responded') {
      filtered = filtered.filter(r => r.reponse_prestataire || r.provider_response);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.commentaire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reviewer?.prenom?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.accent }} />
        </div>
      </div>
    );
  }

  const filteredReviews = getFilteredReviews();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>Mes Avis Clients</h1>
            <p className="text-gray-500 mt-1">Gérez et répondez aux avis de vos clients</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Note moyenne */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <Star className="w-6 h-6" style={{ color: COLORS.star }} />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>
                  {stats.averageRating.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500">Note moyenne</p>
              </div>
            </div>
          </div>

          {/* Total avis */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{stats.totalReviews}</p>
                <p className="text-sm text-gray-500">Total avis</p>
              </div>
            </div>
          </div>

          {/* En attente */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <Clock className="w-6 h-6" style={{ color: COLORS.warning }} />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{stats.pendingResponses}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </div>
            </div>
          </div>

          {/* Ce mois */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{stats.thisMonth}</p>
                <p className="text-sm text-gray-500">Ce mois</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.text }}>Distribution des notes</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, background: COLORS.accent }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert for pending */}
        {stats.pendingResponses > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800">Réponses en attente</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Vous avez {stats.pendingResponses} avis sans réponse. Répondre rapidement améliore votre image professionnelle !
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tous ({reviews.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                À répondre ({stats.pendingResponses})
              </button>
              <button
                onClick={() => setFilter('responded')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'responded' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Répondus ({reviews.length - stats.pendingResponses})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-48"
              />
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'pending' ? 'Aucun avis en attente' :
               filter === 'responded' ? 'Aucune réponse publiée' :
               'Aucun avis pour le moment'}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'Les avis de vos clients apparaîtront ici' : 'Changez de filtre pour voir plus d\'avis'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map(review => {
              const rating = review.note || review.overall_rating || 0;
              const comment = review.commentaire || review.comment || '';
              const response = review.reponse_prestataire || review.provider_response;
              const hasResponse = !!response;

              return (
                <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-all">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {review.reviewer?.photos ? (
                          <img src={review.reviewer.photos} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold" style={{ color: COLORS.accent }}>
                            {review.reviewer?.prenom?.[0] || 'C'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: COLORS.text }}>
                          {review.reviewer?.prenom || 'Client'} {review.reviewer?.nom?.[0] || ''}.
                        </p>
                        <p className="text-sm text-gray-500">
                          {review.reservation?.annonces?.titre || 'Prestation'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {renderStars(rating)}
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-gray-600 mb-4">{comment}</p>

                  {/* Response */}
                  {hasResponse && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4" style={{ borderLeftColor: COLORS.accent }}>
                      <p className="text-sm font-medium mb-1" style={{ color: COLORS.accent }}>Votre réponse</p>
                      <p className="text-sm text-gray-600">{response}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {hasResponse ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Répondu</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">En attente de réponse</span>
                      </div>
                    )}

                    {!hasResponse && (
                      <button
                        onClick={() => {
                          setSelectedReview(review);
                          setResponseText('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all"
                        style={{ background: COLORS.accent }}
                      >
                        <Send className="w-4 h-4" />
                        <span className="text-sm font-medium">Répondre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Response Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Répondre à l'avis</h3>
              <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Review preview */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: COLORS.accent }}>
                    {selectedReview.reviewer?.prenom?.[0] || 'C'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {selectedReview.reviewer?.prenom || 'Client'}
                  </p>
                  {renderStars(selectedReview.note || selectedReview.overall_rating || 0)}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                "{selectedReview.commentaire || selectedReview.comment}"
              </p>
            </div>

            {/* Response textarea */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Votre réponse</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Remerciez le client et montrez que vous prenez en compte son avis..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                Votre réponse sera visible publiquement
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedReview(null)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || submitting}
                className="flex-1 px-4 py-3 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: COLORS.accent }}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Publier
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
