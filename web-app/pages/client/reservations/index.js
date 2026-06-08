import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';

import { 
  Calendar, MapPin, Clock, Camera, Search,
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  Clock3, Star, MessageSquare
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  pending:    { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock3 },
  confirmed:  { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed:   { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  cancelled:    { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  in_progress:   { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Camera },
  litige:     { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function MesReservationsPage() {
  const router = useRouter();
  const { user, profileId, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchReservations();
  }, [user, authLoading, filter, timeFilter]);

  const fetchReservations = async () => {
    const clientId = profileId || user?.id;
    if (!clientId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          photographe:profils_prestataire(
            id,
            nom_entreprise,
            note_moyenne,
            nb_avis,
            identite_verifiee,
            profile:profiles(nom, avatar_url)
          ),
          package:packages_types(
            id,
            titre,
            description
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { descending: true });

      // Status filter
      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      // Time filter
      const today = new Date().toISOString().split('T')[0];
      if (timeFilter === 'upcoming') {
        query = query.gte('date', today);
      } else if (timeFilter === 'past') {
        query = query.lt('date', today);
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
    const date = reservation.date ? new Date(reservation.date) : null;
    const monthKey = date && !isNaN(date) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unknown';
    const monthLabel = date && !isNaN(date) ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Date inconnue';
    
    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, items: [] };
    }
    groups[monthKey].items.sort((a, b) => new Date(b.date) - new Date(a.date));
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
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par prestataire, lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent"
              />
            </div>

            {/* Time filter */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { id: 'upcoming', label: 'À venir' },
                { id: 'past', label: 'Passées' },
                { id: 'all', label: 'Toutes' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    timeFilter === t.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="confirmed">✅ Confirmée</option>
              <option value="in_progress">📷 En cours</option>
              <option value="completed">🏁 Terminée</option>
              <option value="cancelled">❌ Annulée</option>
            </select>
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
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Aucune réservation trouvée
            </h2>
            <p className="text-gray-500 mb-6">
              {filter !== 'all' || timeFilter !== 'all'
                ? 'Aucune réservation ne correspond à ces filtres.'
                : 'Vous n\'avez pas encore de réservation.'}
            </p>
            <button
              onClick={() => router.push('/client/recherche')}
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
              .sort(([a], [b]) => b.localeCompare(a))
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
                        onMessage={() => router.push(`/shared/messages?prestataire=${reservation.prestataire_id}`)}
                        onViewDemande={reservation.demande_id ? () => router.push(`/client/demandes/${reservation.demande_id}`) : null}
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

function ReservationCard({ reservation, onClick, onMessage, onViewDemande }) {
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

  const isUpcoming = reservation.date ? new Date(reservation.date) >= new Date() : false;
  const config = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG.pending;
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
            {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'short' }) : '—'}
          </span>
          <span className="text-2xl font-bold">
            {reservation.date ? new Date(reservation.date).getDate() : '?'}
          </span>
          <span className="text-xs">
            {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', { month: 'short' }) : '—'}
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

          <h2 className="font-semibold text-gray-900 mb-1 truncate">
            {reservation.titre || reservation.package?.nom || 'Prestation photo'}
          </h2>

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
                {photographe?.nom_entreprise || profile?.nom || 'Prestataire'}
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

          {onViewDemande && (
            <div className="mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDemande(); }}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Voir la demande associée →
              </button>
            </div>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-bold text-gray-900">
            {reservation.montant_total} DH
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
