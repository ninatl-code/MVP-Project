import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';

import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, X, Clock, MapPin, User, Trash2, ArrowLeft,
  CheckSquare, Square, Ban
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay,
  isToday, parseISO, startOfDay, endOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';

// Statuts de devis à exclure de l'affichage (refusé / expiré = non actifs)
const DEVIS_STATUTS_EXCLUS = ['refuse', 'expire'];

export default function AgendaPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [devisList, setDevisList] = useState([]);
  const [indisponibilites, setIndisponibilites] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      // Bornes en 'yyyy-MM-dd' pour comparer proprement une colonne de type `date`
      // (évite les décalages de fuseau horaire induits par toISOString()).
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Les 3 requêtes sont indépendantes au moment de l'appel réseau
      // (le filtrage croisé devis/réservations se fait après, en mémoire)
      // -> on les lance en parallèle plutôt qu'en série pour diviser le temps de chargement.
      const [
        { data: resData, error: resError },
        { data: devisData, error: devisError },
        { data: indisData, error: indisError },
      ] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            id, date, heure_debut, heure_fin, statut, lieu, devis_id,
            client:client_id (prenom, nom, avatar_url)
          `)
          .eq('prestataire_id', photographeProfile.id)
          .gte('date', monthStartStr)
          .lte('date', monthEndStr)
          .in('statut', ['confirmed', 'pending', 'completed']),

        supabase
          .from('devis')
          .select(`
            id, statut, titre, demande_id,
            demande:demande_id!inner (date_souhaitee),
            client:client_id (prenom, nom)
          `)
          .eq('prestataire_id', photographeProfile.id)
          .not('statut', 'in', `(${DEVIS_STATUTS_EXCLUS.join(',')})`)
          .gte('demande.date_souhaitee', monthStartStr)
          .lte('demande.date_souhaitee', monthEndStr),

        supabase
          .from('blocked_slots')
          .select('id, start_datetime, end_datetime, reason, reservation_id')
          .eq('prestataire_id', photographeProfile.id)
          .gte('end_datetime', monthStart.toISOString())
          .lte('start_datetime', monthEnd.toISOString()),
      ]);

      if (resError) throw resError;
      if (devisError) throw devisError;
      if (indisError) throw indisError;

      setReservations(resData || []);

      // Un devis déjà transformé en réservation ne doit pas être affiché en plus
      // (sinon la même date apparaît à la fois en rouge - réservation - et en jaune - devis).
      const reservedDevisIds = new Set(
        (resData || []).map(r => r.devis_id).filter(Boolean)
      );
      const activeDevisData = (devisData || []).filter(d => !reservedDevisIds.has(d.id));
      setDevisList(activeDevisData);

      setIndisponibilites(indisData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('Impossible de charger le calendrier. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [photographeProfile, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchCalendarData();
    }
  }, [photographeProfile, currentMonth, fetchCalendarData]);

  const getDaysInMonth = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getEventsForDate = useCallback((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const confirmedReservations = reservations.filter(r =>
      format(parseISO(r.date), 'yyyy-MM-dd') === dateStr
    );

    // date_souhaitee est une colonne `date` : Postgrest la renvoie déjà en 'yyyy-MM-dd'
    const devis = devisList.filter(d => d.demande?.date_souhaitee === dateStr);

    const dayBlocked = indisponibilites.filter(i => {
      const start = parseISO(i.start_datetime);
      const end = parseISO(i.end_datetime);
      return start <= dayEnd && end >= dayStart;
    });

    const manualBlocked = dayBlocked.filter(i => !i.reservation_id);
    const autoBlocked = dayBlocked.filter(i => !!i.reservation_id);

    return { reservations: confirmedReservations, devis, manualBlocked, autoBlocked };
  }, [reservations, devisList, indisponibilites]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDateClick = (date) => {
    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) return prev.filter(d => !isSameDay(d, date));
      return [...prev, date];
    });
  };

  const handleUnblockDates = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      const { error } = await supabase
        .from('blocked_slots')
        .delete()
        .in('id', ids);
      if (error) throw error;
      fetchCalendarData();
      showToast(ids.length > 1 ? 'Dates débloquées avec succès' : 'Date débloquée avec succès');
    } catch (error) {
      console.error('Error unblocking dates:', error);
      showToast("Erreur lors du déblocage");
    }
  };

  const handleBlockSelectedDates = async () => {
    if (selectedDates.length === 0) return;
    try {
      const rows = selectedDates.map(d => {
        const startLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const endLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        return {
          prestataire_id: photographeProfile.id,
          start_datetime: startLocal.toISOString(),
          end_datetime: endLocal.toISOString(),
          reason: null,
        };
      });
      const { error } = await supabase.from('blocked_slots').insert(rows);
      if (error) throw error;
      fetchCalendarData();
      showToast(`${rows.length} date(s) bloquée(s) avec succès`);
      setSelectedDates([]);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du blocage');
    }
  };

  const handleUnblockSelectedDates = async () => {
    if (selectedDates.length === 0) return;
    const idsToDelete = [];
    for (const date of selectedDates) {
      const events = getEventsForDate(date);
      events.manualBlocked.forEach(b => idsToDelete.push(b.id));
    }
    if (idsToDelete.length === 0) {
      showToast('Aucune date bloquée manuellement dans la sélection');
      return;
    }
    await handleUnblockDates(idsToDelete);
    setSelectedDates([]);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#130183]" />
              </button>
              <h1 className="text-2xl font-bold text-[#130183]">Mon agenda</h1>
            </div>
            <p className="text-gray-600 mt-1 pl-11">
              Gérez vos disponibilités et suivez vos réservations
            </p>
          </div>

          <button
            onClick={() => setShowBlockModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Bloquer des dates
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
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
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
                  const hasDevis = events.devis.length > 0;
                  const isBlocked = events.manualBlocked.length > 0 || events.autoBlocked.length > 0;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDates.some(d => isSameDay(d, day));

                  let bgClass = '';
                  if (isSelected) bgClass = 'bg-indigo-200';
                  else if (hasReservations) bgClass = 'bg-red-50';
                  else if (hasDevis) bgClass = 'bg-yellow-50';
                  else if (isBlocked) bgClass = 'bg-gray-100';

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square p-1 rounded-lg text-sm relative transition-all
                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                        ${isToday(day) ? 'ring-2 ring-indigo-500' : ''}
                        ${bgClass || 'hover:bg-gray-100'}
                      `}
                    >
                      <span className={isToday(day) ? 'font-bold' : ''}>
                        {format(day, 'd')}
                      </span>

                      {/* Event Indicators */}
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {hasReservations && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        {hasDevis && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                        {isBlocked && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Réservation confirmée</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-sm text-gray-600">Devis en attente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm text-gray-600">Bloqué / indisponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded ring-2 ring-indigo-500"></div>
                <span className="text-sm text-gray-600">Aujourd'hui</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {selectedDates.length === 0 ? (
              <>
                <h2 className="font-semibold text-gray-900 mb-4">Sélectionnez une date</h2>
                <p className="text-gray-500 text-sm">Cliquez sur une ou plusieurs dates pour les bloquer ou débloquer</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">
                    {selectedDates.length === 1
                      ? format(selectedDates[0], 'EEEE d MMMM', { locale: fr })
                      : `${selectedDates.length} dates sélectionnées`
                    }
                  </h2>
                  <button
                    onClick={() => setSelectedDates([])}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Tout désélectionner
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <button
                    onClick={handleBlockSelectedDates}
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Bloquer la sélection
                  </button>
                  <button
                    onClick={handleUnblockSelectedDates}
                    className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Débloquer la sélection
                  </button>
                </div>

                {selectedDates.length === 1 && (
                  <DayDetails
                    date={selectedDates[0]}
                    events={getEventsForDate(selectedDates[0])}
                    photographeId={photographeProfile?.id}
                    onUpdate={fetchCalendarData}
                    onUnblock={handleUnblockDates}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm animate-fade-in">
            {toast}
          </div>
        )}
      </main>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de blocage de dates */}
      {showBlockModal && (
        <BlockDatesModal
          photographeId={photographeProfile?.id}
          selectedDate={selectedDates[0] || null}
          onClose={() => setShowBlockModal(false)}
          onSuccess={() => {
            setShowBlockModal(false);
            fetchCalendarData();
            showToast('Date(s) bloquée(s) avec succès');
          }}
        />
      )}
    </div>
  );
}

function DayDetails({ date, events, photographeId, onUpdate, onUnblock }) {
  const router = useRouter();
  const { reservations, devis, manualBlocked, autoBlocked } = events;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteOne = async () => {
    if (!confirmDelete) return;
    await onUnblock([confirmDelete]);
    setConfirmDelete(null);
    onUpdate();
  };

  const handleDeleteSelection = async () => {
    await onUnblock(selectedIds);
    setSelectedIds([]);
  };

  const isEmpty = reservations.length === 0 && devis.length === 0 &&
    manualBlocked.length === 0 && autoBlocked.length === 0;

  return (
    <>
      {isEmpty ? (
        <div className="text-center py-8">
          <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun événement ce jour</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Réservations confirmées */}
          {reservations.map(res => (
            <div
              key={res.id}
              onClick={() => router.push(`/photographe/reservations/${res.id}`)}
              className="p-4 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="font-medium text-red-900">Réservation</span>
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

          {/* Devis actifs */}
          {devis.map(d => (
            <div
              key={d.id}
              onClick={() => router.push(`/photographe/devis/${d.id}`)}
              className="p-4 bg-yellow-50 rounded-xl cursor-pointer hover:bg-yellow-100 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="font-medium text-yellow-900">Devis · {d.statut}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{d.client?.prenom} {d.client?.nom}</span>
                </div>
                {d.titre && (
                  <div className="text-gray-600 truncate">{d.titre}</div>
                )}
              </div>
            </div>
          ))}

          {/* Blocages manuels (avec sélection multiple pour déblocage) */}
          {manualBlocked.map(indispo => (
            <div key={indispo.id} className="p-4 bg-gray-100 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => toggleSelect(indispo.id)}
                  className="flex items-center gap-2"
                >
                  <span className="font-medium text-gray-900">Bloqué manuellement</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(indispo.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {indispo.reason && (
                <p className="text-sm text-gray-600">{indispo.reason}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Du {format(parseISO(indispo.start_datetime), 'dd/MM')} au {format(parseISO(indispo.end_datetime), 'dd/MM')}
              </p>
            </div>
          ))}

          {/* Blocages automatiques liés à une réservation (informatif, non modifiable ici) */}
          {autoBlocked.map(indispo => (
            <div key={indispo.id} className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-400">
                Créneau réservé automatiquement (lié à une réservation)
              </p>
            </div>
          ))}

        </div>
      )}

      {/* Modale de confirmation (suppression unique) */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-2">Débloquer cette date ?</h2>
            <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteOne}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                Débloquer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BlockDatesModal({ photographeId, selectedDate, onClose, onSuccess }) {
  const [mode, setMode] = useState('range'); // 'range' | 'multiple'
  const [loading, setLoading] = useState(false);
  const [rangeStart, setRangeStart] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [rangeEnd, setRangeEnd] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [multipleDates, setMultipleDates] = useState([
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  ]);
  const [reason, setReason] = useState('');

  const addDateField = () => setMultipleDates(prev => [...prev, format(new Date(), 'yyyy-MM-dd')]);
  const updateDateField = (idx, value) =>
    setMultipleDates(prev => prev.map((d, i) => (i === idx ? value : d)));
  const removeDateField = (idx) =>
    setMultipleDates(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let datesToBlock = [];

      if (mode === 'range') {
        datesToBlock = eachDayOfInterval({
          start: parseISO(rangeStart),
          end: parseISO(rangeEnd),
        });
      } else {
        datesToBlock = multipleDates
          .filter(Boolean)
          .map(d => parseISO(d));
      }

      if (datesToBlock.length === 0) {
        throw new Error('Aucune date sélectionnée');
      }

      const rows = datesToBlock.map(d => {
        // On construit minuit et 23:59:59 en heure LOCALE du navigateur, puis on
        // convertit en UTC via toISOString() : ça évite le décalage qui faisait
        // déborder le blocage sur le jour suivant (bug précédent).
        const startLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const endLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

        return {
          prestataire_id: photographeId,
          start_datetime: startLocal.toISOString(),
          end_datetime: endLocal.toISOString(),
          reason: reason || null,
        };
      });

      const { error } = await supabase.from('blocked_slots').insert(rows);
      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error blocking dates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Bloquer des dates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Choix du mode */}
          <div className="flex rounded-xl border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`flex-1 py-1.5 text-sm rounded-lg ${mode === 'range' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
            >
              Plage continue
            </button>
            <button
              type="button"
              onClick={() => setMode('multiple')}
              className={`flex-1 py-1.5 text-sm rounded-lg ${mode === 'multiple' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
            >
              Dates spécifiques
            </button>
          </div>

          {mode === 'range' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  required
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  required
                  value={rangeEnd}
                  min={rangeStart}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dates à bloquer</label>
              {multipleDates.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={d}
                    onChange={(e) => updateDateField(idx, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  {multipleDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDateField(idx)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDateField}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" /> Ajouter une date
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex: Vacances, Formation..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Blocage...' : 'Bloquer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}