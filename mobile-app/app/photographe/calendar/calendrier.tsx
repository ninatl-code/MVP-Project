import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import FooterPresta from '@/components/photographe/FooterPresta';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  bg: '#F9FAFB',
};

interface Event {
  id: string;
  date: string;
  title: string;
  type: 'reservation' | 'blocked';
  time?: string;
  client_name?: string;
  montant?: number;
  status?: string;
  motif?: string;
  isFullDay?: boolean;
}

export default function CalendrierPrestataire() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  
  // Modal états
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'reservation' | 'blocked'>('reservation');
  
  // Form réservation
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [clientNom, setClientNom] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedAnnonce, setSelectedAnnonce] = useState('');
  const [montant, setMontant] = useState('');
  const [participants, setParticipants] = useState('1');
  const [endroit, setEndroit] = useState('');
  const [commentaire, setCommentaire] = useState('');
  
  // Form blocage
  const [blockStartDate, setBlockStartDate] = useState(new Date());
  const [blockEndDate, setBlockEndDate] = useState(new Date());
  const [blockStartTime, setBlockStartTime] = useState(new Date());
  const [blockEndTime, setBlockEndTime] = useState(new Date());
  const [motifBlock, setMotifBlock] = useState('');
  
  // DatePickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showBlockStartDatePicker, setShowBlockStartDatePicker] = useState(false);
  const [showBlockEndDatePicker, setShowBlockEndDatePicker] = useState(false);
  const [showBlockStartTimePicker, setShowBlockStartTimePicker] = useState(false);
  const [showBlockEndTimePicker, setShowBlockEndTimePicker] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalReservations: 0,
    confirmedReservations: 0,
    blockedDays: 0,
    revenue: 0
  });

  useEffect(() => {
    initCalendar();
  }, []);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, events]);

  const initCalendar = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/auth/login' as any);
      return;
    }
    setUser(authUser);
    await fetchEvents(authUser.id);
    await fetchAnnonces(authUser.id);
  };

  const fetchAnnonces = async (userId: string) => {
    // Annonces table no longer exists in the schema - set empty array
    setAnnonces([]);
  };

  const fetchEvents = async (userId: string) => {
    setLoading(true);

    // Récupérer les réservations
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id, 
        date, 
        statut,
        montant_total,
        notes_photographe,
        demande_id,
        client:profiles!client_id(nom, prenom)
      `)
      .eq('photographe_id', userId)
      .order('date', { ascending: true });

    console.log('📅 Reservations:', reservations?.length || 0);
    if (reservationsError) console.error('❌ Error reservations:', reservationsError);

    // Récupérer les blocked slots
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('photographe_id', userId)
      .order('start_datetime', { ascending: true });

    console.log('🔒 Blocked slots:', blockedSlots?.length || 0);
    if (blockedError) console.error('❌ Error blocked:', blockedError);

    // Mapper les réservations
    const reservationEvents: Event[] = (reservations || []).map((r: any) => {
      const dateObj = new Date(r.date);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      return {
        id: r.id,
        date: dateStr,
        title: 'Réservation',
        type: 'reservation' as const,
        time: timeStr,
        montant: r.montant_total,
        client_name: r.client ? `${r.client.prenom || ''} ${r.client.nom}`.trim() : 'Client',
        status: r.statut
      };
    });

    // Mapper les créneaux bloqués
    const blockedEvents: Event[] = (blockedSlots || []).map(b => {
      const dateObj = new Date(b.date);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      return {
        id: b.id,
        date: dateStr,
        title: 'Période bloquée',
        type: 'blocked' as const,
        motif: b.motif || 'Indisponible',
        isFullDay: true
      };
    });

    const allEvents = [...reservationEvents, ...blockedEvents];
    setEvents(allEvents);

    // Calculer stats
    const confirmed = reservationEvents.filter(e => e.status === 'confirmed');
    const totalRevenue = confirmed.reduce((sum, e) => sum + (Number(e.montant) || 0), 0);
    
    setStats({
      totalReservations: reservationEvents.length,
      confirmedReservations: confirmed.length,
      blockedDays: blockedEvents.length,
      revenue: totalRevenue
    });

    console.log('📊 Stats:', {
      totalReservations: reservationEvents.length,
      confirmedReservations: confirmed.length,
      blockedDays: blockedEvents.length,
      revenue: totalRevenue
    });

    setLoading(false);
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Jours du mois précédent
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      days.push({
        date: dayDate,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        events: events.filter(e => e.date === dateStr)
      });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: dayDate,
        dateStr,
        isCurrentMonth: true,
        isToday: dayDate.toDateString() === today.toDateString(),
        events: events.filter(e => e.date === dateStr)
      });
    }
    
    // Jours du mois suivant
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const dayDate = new Date(year, month + 1, i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      days.push({
        date: dayDate,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        events: events.filter(e => e.date === dateStr)
      });
    }
    
    setCalendarDays(days);
  };

  const openAddModal = (type: 'reservation' | 'blocked') => {
    setModalType(type);
    setShowAddModal(true);
    
    // Reset form
    if (type === 'reservation') {
      setStartDate(selectedDate);
      setStartTime(new Date());
      setClientNom('');
      setClientEmail('');
      setClientPhone('');
      setSelectedAnnonce('');
      setMontant('');
      setParticipants('1');
      setEndroit('');
      setCommentaire('');
    } else {
      setBlockStartDate(selectedDate);
      setBlockEndDate(selectedDate);
      setBlockStartTime(new Date());
      setBlockEndTime(new Date());
      setMotifBlock('');
    }
  };

  const handleSaveReservation = async () => {
    if (!user || !clientNom || !participants) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const dateTime = new Date(startDate);
    dateTime.setHours(startTime.getHours());
    dateTime.setMinutes(startTime.getMinutes());

    const { error } = await supabase
      .from('reservations')
      .insert({
        photographe_id: user.id,
        client_id: user.id, // Photographer is creating for their own calendar
        titre: clientNom,
        categorie: 'personnelle',
        date: dateTime.toISOString().split('T')[0],
        heure_debut: dateTime.toISOString().split('T')[1],
        lieu: endroit || 'À confirmer',
        montant_total: montant ? parseFloat(montant) : 0,
        description: commentaire || null,
        status: 'confirmed'
      });

    if (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Erreur', 'Impossible de créer la réservation');
      return;
    }

    Alert.alert('Succès', 'Réservation créée avec succès');
    setShowAddModal(false);
    await fetchEvents(user.id);
  };

  const handleSaveBlock = async () => {
    if (!user) return;

    const startDateTime = new Date(blockStartDate);
    startDateTime.setHours(blockStartTime.getHours());
    startDateTime.setMinutes(blockStartTime.getMinutes());

    const endDateTime = new Date(blockEndDate);
    endDateTime.setHours(blockEndTime.getHours());
    endDateTime.setMinutes(blockEndTime.getMinutes());

    if (startDateTime >= endDateTime) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début');
      return;
    }

    const { error } = await supabase
      .from('blocked_slots')
      .insert({
        photographe_id: user.id,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        reason: motifBlock || 'Période bloquée'
      });

    if (error) {
      console.error('Error creating block:', error);
      Alert.alert('Erreur', 'Impossible de bloquer la période');
      return;
    }

    Alert.alert('Succès', 'Période bloquée avec succès');
    setShowAddModal(false);
    await fetchEvents(user.id);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement du calendrier...</Text>
        </View>
      </View>
    );
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Calendrier</Text>
        <TouchableOpacity onPress={() => openAddModal('reservation')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="calendar" size={28} color={COLORS.success} />
          <Text style={styles.statValue}>{stats.totalReservations}</Text>
          <Text style={styles.statLabel}>Réservations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="checkmark-circle" size={28} color={COLORS.warning} />
          <Text style={styles.statValue}>{stats.confirmedReservations}</Text>
          <Text style={styles.statLabel}>Confirmées</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="lock-closed" size={28} color={COLORS.error} />
          <Text style={styles.statValue}>{stats.blockedDays}</Text>
          <Text style={styles.statLabel}>Bloqués</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="cash" size={28} color={COLORS.primary} />
          <Text style={styles.statValue}>{stats.revenue.toFixed(0)}€</Text>
          <Text style={styles.statLabel}>Revenus</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: COLORS.success }]}
          onPress={() => openAddModal('reservation')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.quickActionText}>Nouvelle Réservation</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: COLORS.error }]}
          onPress={() => openAddModal('blocked')}
        >
          <Ionicons name="lock-closed" size={20} color="#fff" />
          <Text style={styles.quickActionText}>Bloquer Période</Text>
        </TouchableOpacity>
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
            <Text style={styles.todayButtonText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendrier */}
      <ScrollView style={styles.mainScroll}>
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
              const hasReservation = day.events.some((e: Event) => e.type === 'reservation');
              const hasBlock = day.events.some((e: Event) => e.type === 'blocked');
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.dayCellInactive,
                    day.isToday && styles.dayCellToday,
                    hasBlock && styles.dayCellBlocked
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.dayNumberInactive,
                    day.isToday && styles.dayNumberToday,
                    hasBlock && styles.dayNumberBlocked
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  
                  {/* Indicateurs */}
                  <View style={styles.eventIndicators}>
                    {hasReservation && (
                      <View style={[styles.eventDot, { backgroundColor: COLORS.success }]} />
                    )}
                    {hasBlock && !hasReservation && (
                      <View style={[styles.eventDot, { backgroundColor: COLORS.error }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Événements du jour sélectionné */}
        <View style={styles.dayEvents}>
          <Text style={styles.dayEventsTitle}>
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {calendarDays.find(d => d.date.toDateString() === selectedDate.toDateString())?.events.length > 0 ? (
            calendarDays.find(d => d.date.toDateString() === selectedDate.toDateString())?.events.map((event: Event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { borderLeftColor: event.type === 'reservation' ? COLORS.success : COLORS.error }]}
                onPress={() => {
                  if (event.type === 'reservation') {
                    router.push(`/prestataires/reservation-detail?id=${event.id}` as any);
                  }
                }}
              >
                <View style={styles.eventHeader}>
                  <Ionicons 
                    name={event.type === 'reservation' ? 'calendar' : 'lock-closed'} 
                    size={20} 
                    color={event.type === 'reservation' ? COLORS.success : COLORS.error} 
                  />
                  <Text style={styles.eventTitle}>{event.title}</Text>
                </View>
                {event.time && (
                  <Text style={styles.eventDetail}>🕐 {event.time}</Text>
                )}
                {event.client_name && (
                  <Text style={styles.eventDetail}>👤 {event.client_name}</Text>
                )}
                {event.montant && (
                  <Text style={styles.eventDetail}>💰 {event.montant}€</Text>
                )}
                {event.motif && (
                  <Text style={styles.eventDetail}>📝 {event.motif}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noEvents}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.noEventsText}>Aucun événement ce jour</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Ajout */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {modalType === 'reservation' ? 'Nouvelle Réservation' : 'Bloquer une Période'}
            </Text>
            <TouchableOpacity 
              onPress={modalType === 'reservation' ? handleSaveReservation : handleSaveBlock}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {modalType === 'reservation' ? (
              /* FORMULAIRE RÉSERVATION */
              <>
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>📅 Date et Heure</Text>
                  
                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeCol}>
                      <Text style={styles.inputLabel}>Date *</Text>
                      <TouchableOpacity 
                        style={styles.dateTimeButton}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.dateTimeButtonText}>
                          {startDate.toLocaleDateString('fr-FR')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.dateTimeCol}>
                      <Text style={styles.inputLabel}>Heure *</Text>
                      <TouchableOpacity 
                        style={styles.dateTimeButton}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.dateTimeButtonText}>
                          {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>👤 Client</Text>
                  
                  <Text style={styles.inputLabel}>Nom du client *</Text>
                  <TextInput
                    style={styles.input}
                    value={clientNom}
                    onChangeText={setClientNom}
                    placeholder="Nom complet"
                    placeholderTextColor={COLORS.textLight}
                  />
                  
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={clientEmail}
                    onChangeText={setClientEmail}
                    placeholder="email@exemple.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                  />
                  
                  <Text style={styles.inputLabel}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    value={clientPhone}
                    onChangeText={setClientPhone}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>📸 Prestation</Text>
                  
                  <Text style={styles.inputLabel}>Annonce *</Text>
                  <View style={styles.pickerContainer}>
                    {annonces.map(annonce => (
                      <TouchableOpacity
                        key={annonce.id}
                        style={[
                          styles.annonceChip,
                          selectedAnnonce === String(annonce.id) && styles.annonceChipSelected
                        ]}
                        onPress={() => setSelectedAnnonce(String(annonce.id))}
                      >
                        <Text style={[
                          styles.annonceChipText,
                          selectedAnnonce === String(annonce.id) && styles.annonceChipTextSelected
                        ]}>
                          {annonce.titre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.inputLabel}>Participants *</Text>
                      <TextInput
                        style={styles.input}
                        value={participants}
                        onChangeText={setParticipants}
                        placeholder="1"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.inputLabel}>Montant (€)</Text>
                      <TextInput
                        style={styles.input}
                        value={montant}
                        onChangeText={setMontant}
                        placeholder="0"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.inputLabel}>Lieu</Text>
                  <TextInput
                    style={styles.input}
                    value={endroit}
                    onChangeText={setEndroit}
                    placeholder="Adresse ou nom du lieu"
                    placeholderTextColor={COLORS.textLight}
                  />
                  
                  <Text style={styles.inputLabel}>Commentaire</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={commentaire}
                    onChangeText={setCommentaire}
                    placeholder="Notes supplémentaires..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : (
              /* FORMULAIRE BLOCAGE */
              <>
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>🔒 Période à bloquer</Text>
                  
                  <Text style={styles.inputLabel}>Date de début *</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowBlockStartDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {blockStartDate.toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.inputLabel}>Heure de début *</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowBlockStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {blockStartTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.inputLabel}>Date de fin *</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowBlockEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {blockEndDate.toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.inputLabel}>Heure de fin *</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setShowBlockEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {blockEndTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.inputLabel}>Motif</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={motifBlock}
                    onChangeText={setMotifBlock}
                    placeholder="Vacances, congés, indisponibilité..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* DatePickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowStartDatePicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowStartTimePicker(false);
                if (date) setStartTime(date);
              }}
            />
          )}
          {showBlockStartDatePicker && (
            <DateTimePicker
              value={blockStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBlockStartDatePicker(false);
                if (date) setBlockStartDate(date);
              }}
            />
          )}
          {showBlockEndDatePicker && (
            <DateTimePicker
              value={blockEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBlockEndDatePicker(false);
                if (date) setBlockEndDate(date);
              }}
            />
          )}
          {showBlockStartTimePicker && (
            <DateTimePicker
              value={blockStartTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBlockStartTimePicker(false);
                if (date) setBlockStartTime(date);
              }}
            />
          )}
          {showBlockEndTimePicker && (
            <DateTimePicker
              value={blockEndTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBlockEndTimePicker(false);
                if (date) setBlockEndTime(date);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navButton: {
    padding: 8,
  },
  monthDisplay: {
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  mainScroll: {
    flex: 1,
  },
  calendar: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: '#FEF3C7',
    borderColor: COLORS.warning,
  },
  dayCellBlocked: {
    backgroundColor: '#FEE2E2',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dayNumberInactive: {
    color: COLORS.textLight,
  },
  dayNumberToday: {
    color: COLORS.warning,
    fontWeight: 'bold',
  },
  dayNumberBlocked: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  eventIndicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayEvents: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  dayEventsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  eventCard: {
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  eventDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noEventsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeCol: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
  },
  dateTimeButtonText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  annonceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
  },
  annonceChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  annonceChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  annonceChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});
