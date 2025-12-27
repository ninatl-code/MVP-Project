import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { 
  Calendar, MapPin, Clock, Euro, Camera, Search,
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  Clock3, Star, MessageSquare, Filter
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock3 },
  confirmee: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  terminee: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Camera },
  litige: { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function MesReservationsPage() {
  const router = useRouter();
  const { user, profileId } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming');

  useEffect(() => {
    if (profileId) {
      fetchReservations();
    }
  }, [profileId, filter, timeFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          photographe:profils_photographe(
            id,
            nom_entreprise,
            photo_profil,
            note_moyenne,
            nombre_avis,
            verifie,
            profile:profiles(nom, prenom)
          ),
          package:packages(
            id,
            nom,
            description
          )
        `)
        .eq('client_id', profileId)
        .order('date_prestation', { ascending: timeFilter === 'upcoming' });

      // Status filter
      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      // Time filter
      const today = new Date().toISOString().split('T')[0];
      if (timeFilter === 'upcoming') {
        query = query.gte('date_prestation', today);
      } else if (timeFilter === 'past') {
        query = query.lt('date_prestation', today);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const photographeName = r.photographe?.nom_entreprise || 
      `${r.photographe?.profile?.prenom} ${r.photographe?.profile?.nom}`;
    return (
      photographeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lieu?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.en_attente;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Group reservations by month
  const groupedReservations = filteredReservations.reduce((groups, reservation) => {
    const date = new Date(reservation.date_prestation);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, items: [] };
    }
    groups[monthKey].items.push(reservation);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
          <p className="text-gray-600 mt-1">
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par photographe, lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Time filter */}
            <div className="flex gap-2">
              {[
                { id: 'upcoming', label: 'À venir' },
                { id: 'past', label: 'Passées' },
                { id: 'all', label: 'Toutes' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    timeFilter === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    filter === key
                      ? config.color.replace('100', '600').replace('text-', 'bg-').split(' ')[0] + ' text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reservations List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune réservation trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              {filter !== 'all' || timeFilter !== 'all'
                ? 'Aucune réservation ne correspond à ces filtres.'
                : 'Vous n\'avez pas encore de réservation.'}
            </p>
            <button
              onClick={() => router.push('/client/search')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
              style={{ backgroundColor: COLORS.accent }}
            >
              <Search className="w-5 h-5" />
              Trouver un photographe
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReservations)
              .sort(([a], [b]) => timeFilter === 'past' ? b.localeCompare(a) : a.localeCompare(b))
              .map(([monthKey, { label, items }]) => (
                <div key={monthKey}>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4 capitalize">
                    {label}
                  </h2>
                  <div className="space-y-4">
                    {items.map((reservation) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        onClick={() => router.push(`/client/reservations/${reservation.id}`)}
                        onMessage={() => router.push(`/messages?photographe=${reservation.photographe_id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ReservationCard({ reservation, onClick, onMessage }) {
  const photographe = reservation.photographe;
  const profile = photographe?.profile;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const isUpcoming = new Date(reservation.date_prestation) >= new Date();
  const config = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG.en_attente;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
          isUpcoming ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className="text-xs font-medium uppercase">
            {new Date(reservation.date_prestation).toLocaleDateString('fr-FR', { weekday: 'short' })}
          </span>
          <span className="text-2xl font-bold">
            {new Date(reservation.date_prestation).getDate()}
          </span>
          <span className="text-xs">
            {new Date(reservation.date_prestation).toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            {reservation.heure_debut && (
              <span className="text-sm text-gray-500">
                {formatTime(reservation.heure_debut)}
                {reservation.heure_fin && ` - ${formatTime(reservation.heure_fin)}`}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 mb-1 truncate">
            {reservation.titre || reservation.package?.nom || 'Prestation photo'}
          </h3>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            {/* Photographer info */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                {photographe?.photo_profil ? (
                  <img
                    src={photographe.photo_profil}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-3 h-3 text-indigo-600" />
                )}
              </div>
              <span className="truncate">
                {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
              </span>
              {photographe?.verifie && (
                <CheckCircle className="w-4 h-4 text-blue-600" />
              )}
            </div>

            {photographe?.note_moyenne > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {photographe.note_moyenne.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {reservation.lieu && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {reservation.lieu}
              </span>
            )}
          </div>
        </div>

        {/* Price & Actions */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-bold text-gray-900">
            {reservation.montant_total}€
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessage();
              }}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Envoyer un message"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
