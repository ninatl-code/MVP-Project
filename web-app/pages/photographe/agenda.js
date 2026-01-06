import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, X, Clock, MapPin, User, Trash2
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay,
  isToday, parseISO, addDays
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AgendaPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [indisponibilites, setIndisponibilites] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchCalendarData();
    }
  }, [photographeProfile, currentMonth]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch reservations
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select(`
          *,
          client:client_id (prenom, nom, photo_profil)
        `)
        .eq('photographe_id', photographeProfile.id)
        .gte('date_prestation', monthStart.toISOString())
        .lte('date_prestation', monthEnd.toISOString())
        .in('statut', ['confirme', 'en_attente', 'en_cours']);

      if (resError) throw resError;
      setReservations(resData || []);

      // Fetch indisponibilites
      const { data: indisData, error: indisError } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('photographe_id', photographeProfile.id)
        .gte('end_datetime', monthStart.toISOString())
        .lte('start_datetime', monthEnd.toISOString());

      if (indisError) throw indisError;
      setIndisponibilites(indisData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getEventsForDate = useCallback((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayReservations = reservations.filter(r => 
      format(parseISO(r.date_prestation), 'yyyy-MM-dd') === dateStr
    );

    const dayIndisponibilites = indisponibilites.filter(i => {
      const start = parseISO(i.start_datetime);
      const end = parseISO(i.end_datetime);
      return date >= start && date <= end;
    });

    return { reservations: dayReservations, indisponibilites: dayIndisponibilites };
  }, [reservations, indisponibilites]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleAddIndispo = () => {
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mon agenda</h1>
            <p className="text-gray-600 mt-1">
              Gérez vos disponibilités et suivez vos réservations
            </p>
          </div>
          
          <button
            onClick={handleAddIndispo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Ajouter indisponibilité
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, index) => {
                  const events = getEventsForDate(day);
                  const hasReservations = events.reservations.length > 0;
                  const isUnavailable = events.indisponibilites.length > 0;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square p-1 rounded-lg text-sm relative transition-all
                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                        ${isToday(day) ? 'ring-2 ring-indigo-500' : ''}
                        ${isSelected ? 'bg-indigo-100' : 'hover:bg-gray-100'}
                        ${isUnavailable && !hasReservations ? 'bg-gray-100' : ''}
                      `}
                    >
                      <span className={isToday(day) ? 'font-bold' : ''}>
                        {format(day, 'd')}
                      </span>
                      
                      {/* Event Indicators */}
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {hasReservations && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        )}
                        {isUnavailable && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-sm text-gray-600">Réservation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm text-gray-600">Indisponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded ring-2 ring-indigo-500"></div>
                <span className="text-sm text-gray-600">Aujourd'hui</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {selectedDate 
                ? format(selectedDate, 'EEEE d MMMM', { locale: fr })
                : 'Sélectionnez une date'
              }
            </h3>

            {selectedDate ? (
              <DayDetails 
                date={selectedDate}
                events={getEventsForDate(selectedDate)}
                photographeId={photographeProfile?.id}
                onUpdate={fetchCalendarData}
              />
            ) : (
              <p className="text-gray-500 text-sm">
                Cliquez sur une date pour voir les détails
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Add Indispo Modal */}
      {showAddModal && (
        <AddIndispoModal
          photographeId={photographeProfile?.id}
          selectedDate={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCalendarData();
          }}
        />
      )}
    </div>
  );
}

function DayDetails({ date, events, photographeId, onUpdate }) {
  const router = useRouter();
  const { reservations, indisponibilites } = events;

  const handleDeleteIndispo = async (indispoId) => {
    if (!confirm('Supprimer cette indisponibilité ?')) return;
    
    try {
      const { error } = await supabase
        .from('indisponibilites')
        .delete()
        .eq('id', indispoId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting indispo:', error);
    }
  };

  if (reservations.length === 0 && indisponibilites.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Aucun événement ce jour</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reservations */}
      {reservations.map(res => (
        <div 
          key={res.id}
          onClick={() => router.push(`/photographe/reservations/${res.id}`)}
          className="p-4 bg-indigo-50 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="font-medium text-indigo-900">Réservation</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>{res.client?.prenom} {res.client?.nom}</span>
            </div>
            {res.heure_debut && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{res.heure_debut} - {res.heure_fin || '?'}</span>
              </div>
            )}
            {res.lieu && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{res.lieu}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Indisponibilites */}
      {indisponibilites.map(indispo => (
        <div 
          key={indispo.id}
          className="p-4 bg-red-50 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="font-medium text-red-900">Indisponible</span>
            </div>
            <button
              onClick={() => handleDeleteIndispo(indispo.id)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          {indispo.motif && (
            <p className="text-sm text-red-700">{indispo.motif}</p>
          )}
          
          <p className="text-xs text-red-500 mt-2">
            Du {format(parseISO(indispo.start_datetime), 'dd/MM')} au {format(parseISO(indispo.end_datetime), 'dd/MM')}
          </p>
        </div>
      ))}
    </div>
  );
}

function AddIndispoModal({ photographeId, selectedDate, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_datetime: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    end_datetime: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('blocked_slots')
        .insert({
          photographe_id: photographeId,
          start_datetime: formData.start_datetime,
          end_datetime: formData.end_datetime,
          reason: formData.reason || null,
        });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error adding indispo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            Ajouter une indisponibilité
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                required
                value={formData.start_datetime}
                onChange={(e) => setFormData(prev => ({ ...prev, start_datetime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                required
                value={formData.end_datetime}
                onChange={(e) => setFormData(prev => ({ ...prev, end_datetime: e.target.value }))}
                min={formData.start_datetime}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison (optionnel)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              placeholder="Ex: Vacances, Formation..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
