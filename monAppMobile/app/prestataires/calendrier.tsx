import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FooterPresta from '../../components/FooterPresta';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  reservation: '#3B82F6',
  blocked: '#EF4444',
  available: '#10B981'
};

interface Event {
  id: string;
  date: string;
  title: string;
  type: 'reservation' | 'blocked' | 'available';
  time?: string;
  duration?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  annonce_title?: string;
  status?: string;
  motif?: string;
  start_time?: string;
  end_time?: string;
  num_reservation?: string;
  montant?: number;
  commentaire?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
  isSelected: boolean;
}

export default function CalendrierPrestataire() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: '',
    time: '09:00',
    motif: ''
  });
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalReservations: 0,
    blockedDays: 0,
    upcomingEvents: 0
  });

  useEffect(() => {
    initCalendar();
  }, []);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, events, selectedDate]);

  const initCalendar = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/login' as any);
      return;
    }
    setUser(authUser);
    await fetchEvents(authUser.id);
  };

  const fetchEvents = async (userId: string) => {
    setLoading(true);

    // Récupérer les réservations
    const { data: reservations } = await supabase
      .from('reservations')
      .select(`
        id, 
        date, 
        heure, 
        status,
        num_reservation,
        montant,
        commentaire,
        annonces(id, titre),
        profiles!reservations_particulier_id_fkey(nom, email, telephone)
      `)
      .eq('prestataire_id', userId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Récupérer les blocs de temps depuis blocked_slots
    const { data: blockedTimes } = await supabase
      .from('blocked_slots')
      .select('id, prestataire_id, date, motif, annonce_id')
      .eq('prestataire_id', userId)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });

    const reservationEvents: Event[] = (reservations || []).map(r => ({
      id: r.id,
      date: r.date,
      title: Array.isArray(r.annonces) ? r.annonces[0]?.titre || 'Réservation' : 'Réservation',
      type: 'reservation' as const,
      time: r.heure,
      num_reservation: r.num_reservation,
      montant: r.montant,
      commentaire: r.commentaire,
      client_name: Array.isArray(r.profiles) ? r.profiles[0]?.nom : '',
      client_email: Array.isArray(r.profiles) ? r.profiles[0]?.email : '',
      client_phone: Array.isArray(r.profiles) ? r.profiles[0]?.telephone : '',
      annonce_title: Array.isArray(r.annonces) ? r.annonces[0]?.titre : '',
      status: r.status
    }));

    const blockedEvents: Event[] = (blockedTimes || []).map(b => {
      const dateObj = new Date(b.date);
      const dateOnly = dateObj.toISOString().split('T')[0];
      const timeOnly = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      return {
        id: b.id,
        date: dateOnly,
        title: b.motif || 'Indisponible',
        type: 'blocked' as const,
        start_time: timeOnly,
        end_time: undefined,
        motif: b.motif
      };
    });

    const allEvents = [...reservationEvents, ...blockedEvents];
    setEvents(allEvents);

    // Calculer les stats
    const upcomingCount = allEvents.filter(e => new Date(e.date) >= new Date()).length;
    setStats({
      totalReservations: reservationEvents.length,
      blockedDays: blockedEvents.length,
      upcomingEvents: upcomingCount
    });

    setLoading(false);
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = dimanche
    
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Jours du mois précédent à afficher
    const prevMonthDays = startingDayOfWeek;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Générer les jours
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Jours du mois précédent
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dayEvents = events.filter(e => e.date === dayDate.toISOString().split('T')[0]);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: false,
        events: dayEvents,
        isSelected: dayDate.toDateString() === selectedDate.toDateString()
      });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dayEvents = events.filter(e => e.date === dayDate.toISOString().split('T')[0]);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: dayDate.toDateString() === today.toDateString(),
        events: dayEvents,
        isSelected: dayDate.toDateString() === selectedDate.toDateString()
      });
    }
    
    // Jours du mois suivant pour compléter la grille (42 jours = 6 semaines)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const dayDate = new Date(year, month + 1, i);
      const dayEvents = events.filter(e => e.date === dayDate.toISOString().split('T')[0]);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: false,
        events: dayEvents,
        isSelected: dayDate.toDateString() === selectedDate.toDateString()
      });
    }
    
    setCalendarDays(days);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDayPress = (day: CalendarDay) => {
    setSelectedDate(day.date);
  };

  const handleAddBlock = async () => {
    if (!user || !blockForm.date || !blockForm.time) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Créer le timestamp combiné date + heure
    const dateTimeString = `${blockForm.date}T${blockForm.time}:00`;
    const timestamp = new Date(dateTimeString).toISOString();

    const { error } = await supabase
      .from('blocked_slots')
      .insert({
        prestataire_id: user.id,
        date: timestamp,
        motif: blockForm.motif || 'Indisponible'
      });

    if (error) {
      console.error('Erreur blocage:', error);
      Alert.alert('Erreur', 'Impossible de bloquer cette période');
      return;
    }

    Alert.alert('Succès', 'Période bloquée avec succès');
    setShowBlockModal(false);
    setBlockForm({ date: '', time: '09:00', motif: '' });
    await fetchEvents(user.id);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      </View>
    );
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendrier</Text>
        <TouchableOpacity onPress={() => setShowBlockModal(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color={COLORS.reservation} />
          <Text style={styles.statValue}>{stats.totalReservations}</Text>
          <Text style={styles.statLabel}>Réservations</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="lock-closed" size={24} color={COLORS.blocked} />
          <Text style={styles.statValue}>{stats.blockedDays}</Text>
          <Text style={styles.statLabel}>Bloqués</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color={COLORS.available} />
          <Text style={styles.statValue}>{stats.upcomingEvents}</Text>
          <Text style={styles.statLabel}>À venir</Text>
        </View>
      </View>

      {/* Navigation mois */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.monthDisplay}>
          <Text style={styles.monthText}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
            <Text style={styles.todayText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll}>
        {/* Calendrier */}
        <View style={styles.calendar}>
          {/* Jours de la semaine */}
          <View style={styles.weekDays}>
            {dayNames.map(day => (
              <View key={day} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Grille des jours */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const hasReservation = day.events.some(e => e.type === 'reservation');
              const isBlocked = day.events.some(e => e.type === 'blocked');
              
              return (
                <TouchableOpacity
                  key={`${day.date.toISOString()}-${index}`}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.dayCellInactive,
                    day.isToday && styles.dayCellToday,
                    day.isSelected && styles.dayCellSelected
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <Text style={[
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.dayNumberInactive,
                    day.isToday && styles.dayNumberToday
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  
                  {/* Indicateurs d'événements */}
                  {day.events.length > 0 && (
                    <View style={styles.eventIndicators}>
                      {hasReservation && (
                        <View style={[styles.eventDot, { backgroundColor: COLORS.reservation }]} />
                      )}
                      {isBlocked && (
                        <View style={[styles.eventDot, { backgroundColor: COLORS.blocked }]} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Événements du jour sélectionné */}
        {selectedDate && (
          <View style={styles.selectedDayEvents}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
            <View style={styles.eventsList}>
              {calendarDays
                .find(d => d.date.toDateString() === selectedDate.toDateString())
                ?.events.map(event => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={[
                      styles.eventItem,
                      { borderLeftColor: event.type === 'reservation' ? COLORS.reservation : COLORS.blocked }
                    ]}
                    onPress={() => {
                      if (event.type === 'reservation') {
                        router.push(`/prestataires/reservation-detail?id=${event.id}` as any);
                      }
                    }}
                    disabled={event.type !== 'reservation'}
                  >
                    <View style={styles.eventItemHeader}>
                      <Ionicons 
                        name={event.type === 'reservation' ? 'calendar' : 'lock-closed'} 
                        size={20} 
                        color={event.type === 'reservation' ? COLORS.reservation : COLORS.blocked} 
                      />
                      <Text style={styles.eventItemTitle}>{event.title}</Text>
                      {event.type === 'reservation' && (
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                      )}
                    </View>
                    {event.num_reservation && (
                      <Text style={styles.eventItemNumber}>
                        N° {event.num_reservation}
                      </Text>
                    )}
                    {event.time && (
                      <Text style={styles.eventItemTime}>🕐 {event.time}</Text>
                    )}
                    {event.client_name && (
                      <Text style={styles.eventItemClient}>👤 {event.client_name}</Text>
                    )}
                    {event.motif && (
                      <Text style={styles.eventItemMotif}>📝 {event.motif}</Text>
                    )}
                    {event.status && (
                      <Text style={styles.eventItemStatus}>
                        Statut: {event.status}
                      </Text>
                    )}
                  </TouchableOpacity>
                )) || <Text style={styles.noEvents}>Aucun événement ce jour</Text>
              }
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal pour bloquer une période */}
      <Modal
        visible={showBlockModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquer une période</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Date *</Text>
              <TextInput
                style={styles.input}
                value={blockForm.date}
                onChangeText={(text) => setBlockForm({ ...blockForm, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Heure *</Text>
              <TextInput
                style={styles.input}
                value={blockForm.time}
                onChangeText={(text) => setBlockForm({ ...blockForm, time: text })}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Motif (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={blockForm.motif}
                onChangeText={(text) => setBlockForm({ ...blockForm, motif: text })}
                placeholder="Ex: Vacances, rendez-vous personnel..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleAddBlock}
              >
                <Text style={styles.submitButtonText}>Bloquer cette période</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center'
  },
  addButton: {
    padding: 8
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff'
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  navButton: {
    padding: 8
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 12
  },
  todayText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  mainScroll: {
    flex: 1
  },
  calendar: {
    backgroundColor: '#fff',
    padding: 16
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  dayCellInactive: {
    opacity: 0.3
  },
  dayCellToday: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B'
  },
  dayCellSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: COLORS.primary
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937'
  },
  dayNumberInactive: {
    color: '#9CA3AF'
  },
  dayNumberToday: {
    color: '#F59E0B',
    fontWeight: 'bold'
  },
  eventIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  selectedDayEvents: {
    padding: 16,
    backgroundColor: '#F9FAFB'
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'capitalize'
  },
  eventsList: {
    gap: 8
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  eventItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1
  },
  eventItemNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start'
  },
  eventItemTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  eventItemClient: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  eventItemMotif: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2
  },
  eventItemStatus: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4
  },
  noEvents: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  modalBody: {
    padding: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

