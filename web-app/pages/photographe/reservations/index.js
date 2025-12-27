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
  const [timeFilter, setTimeFilter] = useState('upcoming');
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
            id, nom, prenom, email, photo_profil, telephone
          ),
          package:packages(id, nom)
        `)
        .eq('photographe_id', photographeProfile.id)
        .order('date_prestation', { ascending: timeFilter === 'upcoming' });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

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

            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                  filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Tous
              </button>
              {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                    filter === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {config.label}
                </button>
              ))}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
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
  const isUpcoming = new Date(reservation.date_prestation) >= new Date();

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

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

          {/* Client info */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {client?.photo_profil ? (
                  <img src={client.photo_profil} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3 h-3 text-gray-500" />
                )}
              </div>
              <span>{client?.prenom} {client?.nom}</span>
            </div>
          </div>

          {reservation.lieu && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{reservation.lieu}</span>
            </div>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-bold text-gray-900">{reservation.montant_total}€</p>
          
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
