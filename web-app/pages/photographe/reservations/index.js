import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import { 
  Calendar, MapPin, Clock, Euro, User, Search,
  ChevronRight, CheckCircle, XCircle, AlertCircle,
  Clock3, Camera, MessageSquare, Filter, Phone
} from 'lucide-react';

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock3 },
  confirmee: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  terminee: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Camera },
  litige: { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function PhotographerReservationsPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchReservations();
    }
  }, [photographeProfile, filter, timeFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          client:profiles!reservations_client_id_fkey(
            id, nom, prenom, email, avatar_url, telephone
          ),
          package:packages_types(id, titre)
        `)
        .eq('prestataire_id', photographeProfile.id)
        .order('date', { ascending: timeFilter === 'upcoming' });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

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

  const handleConfirm = async (reservationId) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'confirmee' })
        .eq('id', reservationId);

      if (error) throw error;
      fetchReservations();
    } catch (error) {
      console.error('Error confirming reservation:', error);
    }
  };

  const handleComplete = async (reservationId) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'terminee' })
        .eq('id', reservationId);

      if (error) throw error;
      fetchReservations();
    } catch (error) {
      console.error('Error completing reservation:', error);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const clientName = `${r.client?.prenom} ${r.client?.nom}`.toLowerCase();
    return (
      clientName.includes(searchQuery.toLowerCase()) ||
      r.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lieu?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group by month
  const groupedReservations = filteredReservations.reduce((groups, reservation) => {
    const rawDate = reservation.date_prestation || reservation.date;
    const date = rawDate ? new Date(rawDate) : null;
    const monthKey = date && !isNaN(date) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '0000-00';
    const monthLabel = date && !isNaN(date) ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Date inconnue';
    
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
            <p className="text-gray-600 mt-1">{reservations.length} réservation(s)</p>
          </div>
          
          <button
            onClick={() => router.push('/photographe/agenda')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
          >
            <Calendar className="w-5 h-5" />
            Voir l'agenda
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par client, lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              {['upcoming', 'past', 'all'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    timeFilter === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'upcoming' ? 'À venir' : t === 'past' ? 'Passées' : 'Toutes'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reservations list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h2>
            <p className="text-gray-500">
              {timeFilter === 'upcoming' 
                ? 'Vous n\'avez pas de réservation à venir.'
                : 'Aucune réservation ne correspond à ces critères.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReservations)
              .sort(([a], [b]) => timeFilter === 'past' ? b.localeCompare(a) : a.localeCompare(b))
              .map(([monthKey, { label, items }]) => (
                <div key={monthKey}>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4 capitalize">{label}</h2>
                  <div className="space-y-4">
                    {items.map((reservation) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        onClick={() => router.push(`/photographe/reservations/${reservation.id}`)}
                        onConfirm={() => handleConfirm(reservation.id)}
                        onComplete={() => handleComplete(reservation.id)}
                        onMessage={() => router.push(`/messages?client=${reservation.client_id}`)}
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

function ReservationCard({ reservation, onClick, onConfirm, onComplete, onMessage }) {
  const client = reservation.client;
  const config = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG.en_attente;
  const Icon = config.icon;

  const rawDate = reservation.date_prestation || reservation.date;
  const resaDate = rawDate ? new Date(rawDate) : null;
  const validDate = resaDate && !isNaN(resaDate);
  const isUpcoming = validDate ? resaDate >= new Date() : false;

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const formatDuration = () => {
    if (!reservation.heure_debut || !reservation.heure_fin) return null;
    const [h1, m1] = reservation.heure_debut.split(':').map(Number);
    const [h2, m2] = reservation.heure_fin.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : `${m}min`;
  };

  const duration = formatDuration();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Date */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
          isUpcoming ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {validDate ? (
            <>
              <span className="text-xs font-medium uppercase">
                {resaDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className="text-2xl font-bold">
                {resaDate.getDate()}
              </span>
              <span className="text-xs">
                {resaDate.toLocaleDateString('fr-FR', { month: 'short' })}
              </span>
            </>
          ) : (
            <span className="text-xs text-center px-1">Date N/A</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            {reservation.heure_debut && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {formatTime(reservation.heure_debut)}
                {reservation.heure_fin && ` → ${formatTime(reservation.heure_fin)}`}
              </span>
            )}
            {duration && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">
                {duration}
              </span>
            )}
          </div>

          <h2 className="font-semibold text-gray-900 mb-1 truncate">
            {reservation.titre || reservation.package?.titre || 'Prestation photo'}
          </h2>

          {reservation.package?.titre && reservation.titre && (
            <p className="text-xs text-indigo-500 mb-1 truncate">
              Forfait : {reservation.package.titre}
            </p>
          )}

          {/* Client info */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {client?.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>
              <div>
                <span className="font-medium text-gray-700">{client?.prenom} {client?.nom}</span>
                {client?.email && (
                  <span className="block text-xs text-gray-400">{client.email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {reservation.lieu && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{reservation.lieu}</span>
              </div>
            )}
            {reservation.nb_photos && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Camera className="w-3.5 h-3.5" />
                <span>{reservation.nb_photos} photos</span>
              </div>
            )}
            {reservation.type_prestation && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {reservation.type_prestation}
              </span>
            )}
          </div>
        </div>

        {/* Price & Actions */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-bold text-gray-900">
            {reservation.montant_total != null ? `${reservation.montant_total} DH` : '—'}
          </p>
          
          <div className="flex items-center gap-2">
            {reservation.statut === 'en_attente' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                Confirmer
              </button>
            )}
            {reservation.statut === 'confirmee' && !isUpcoming && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Terminer
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessage();
              }}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            {client?.telephone && (
              <a
                href={`tel:${client.telephone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
