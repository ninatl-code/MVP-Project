import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FooterParti from '../../components/FooterParti';
import { LinearGradient } from 'expo-linear-gradient';
import { useCalendarRealtime } from '../../hooks/useCalendarRealtime';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface TimeSlot {
  time: string;
  available: boolean;
  isInstantBooking: boolean;
}

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedSlot {
  start_datetime: string;
  end_datetime: string;
}

export default function BookingCalendarPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const annonceId = params.annonceId as string;
  const providerId = params.providerId as string;

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);
  const [instantBookingSettings, setInstantBookingSettings] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<any>(null);

  // Generate calendar dates (current month)
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);

  useEffect(() => {
    generateCalendarDates();
    fetchAnnonceDetails();
    fetchAvailability();
    fetchBlockedSlots();
    fetchInstantBookingSettings();
  }, []);

  useEffect(() => {
    if (availability.length > 0) {
      generateTimeSlots();
    }
  }, [selectedDate, availability, blockedSlots]);

  // Real-time subscriptions for live updates
  useCalendarRealtime(providerId, (update) => {
    console.log('Calendar update received:', update);
    
    if (update.type === 'availability') {
      // Refresh availability data
      fetchAvailability();
    } else if (update.type === 'blocked_slot') {
      // Refresh blocked slots
      fetchBlockedSlots();
    } else if (update.type === 'reservation') {
      // Refresh time slots to reflect new bookings
      generateTimeSlots();
    }
  });

  const generateCalendarDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Next 2 months

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    setCalendarDates(dates);
  };

  const fetchAnnonceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select('*, profiles(*)')
        .eq('id', annonceId)
        .single();

      if (error) throw error;
      setAnnonce(data);
    } catch (error) {
      console.error('Error fetching annonce:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_available', true);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Erreur', 'Impossible de charger les disponibilités');
    }
  };

  const fetchBlockedSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('provider_id', providerId)
        .gte('end_datetime', new Date().toISOString());

      if (error) throw error;
      setBlockedSlots(data || []);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstantBookingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instant_booking_settings')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setInstantBookingEnabled(data.enabled);
        setInstantBookingSettings(data);
      }
    } catch (error) {
      console.error('Error fetching instant booking settings:', error);
    }
  };

  const isDateBlocked = (date: Date): boolean => {
    return blockedSlots.some(slot => {
      const start = new Date(slot.start_datetime);
      const end = new Date(slot.end_datetime);
      return date >= start && date <= end;
    });
  };

  const generateTimeSlots = () => {
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);

    if (dayAvailability.length === 0 || isDateBlocked(selectedDate)) {
      setTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    dayAvailability.forEach(avail => {
      const [startHour, startMin] = avail.start_time.split(':').map(Number);
      const [endHour, endMin] = avail.end_time.split(':').map(Number);

      // Generate 30-minute slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          const slotHour = hour;
          const slotMin = min;
          const nextMin = min + 30;
          const nextHour = nextMin >= 60 ? hour + 1 : hour;
          const adjustedMin = nextMin >= 60 ? 0 : nextMin;

          // Check if slot is within availability window
          const slotEnd = slotHour * 60 + slotMin + 30;
          const availEnd = endHour * 60 + endMin;
          if (slotEnd > availEnd) break;

          const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
          
          // Check if slot is in the past (for today)
          let available = true;
          if (isToday) {
            const slotDate = new Date(selectedDate);
            slotDate.setHours(slotHour, slotMin, 0, 0);
            
            // Apply advance notice if instant booking is enabled
            if (instantBookingEnabled && instantBookingSettings) {
              const minAdvanceMs = instantBookingSettings.advance_notice_hours * 60 * 60 * 1000;
              const minBookingTime = new Date(now.getTime() + minAdvanceMs);
              available = slotDate >= minBookingTime;
            } else {
              available = slotDate > now;
            }
          }

          // Check max advance days
          if (instantBookingEnabled && instantBookingSettings) {
            const maxAdvanceMs = instantBookingSettings.max_advance_days * 24 * 60 * 60 * 1000;
            const maxBookingDate = new Date(now.getTime() + maxAdvanceMs);
            const slotDate = new Date(selectedDate);
            slotDate.setHours(slotHour, slotMin, 0, 0);
            if (slotDate > maxBookingDate) {
              available = false;
            }
          }

          slots.push({
            time: slotTime,
            available,
            isInstantBooking: instantBookingEnabled && available,
          });
        }
      }
    });

    setTimeSlots(slots);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot.time);
  };

  const handleContinueBooking = () => {
    if (!selectedSlot) {
      Alert.alert('Attention', 'Veuillez sélectionner un créneau horaire');
      return;
    }

    const bookingDateTime = new Date(selectedDate);
    const [hour, min] = selectedSlot.split(':').map(Number);
    bookingDateTime.setHours(hour, min, 0, 0);

    router.push({
      pathname: '/annonces/instant-booking-confirmation' as any,
      params: {
        annonceId,
        providerId,
        bookingDateTime: bookingDateTime.toISOString(),
        isInstantBooking: instantBookingEnabled ? 'true' : 'false',
      },
    });
  };

  const isDateAvailable = (date: Date): boolean => {
    if (isDateBlocked(date)) return false;
    const dayOfWeek = date.getDay();
    return availability.some(a => a.day_of_week === dayOfWeek && a.is_available);
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterParti />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choisir une date</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Provider Info */}
          {annonce && (
            <View style={styles.providerCard}>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{annonce.profiles?.prenom || 'Prestataire'}</Text>
                <Text style={styles.providerService}>{annonce.titre}</Text>
              </View>
              {instantBookingEnabled && (
                <View style={styles.instantBadge}>
                  <Ionicons name="flash" size={16} color={COLORS.success} />
                  <Text style={styles.instantBadgeText}>Réservation instantanée</Text>
                </View>
              )}
            </View>
          )}

          {/* Calendar */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>Sélectionnez une date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {calendarDates.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isAvailable = isDateAvailable(date);
                const isPast = isPastDate(date);
                const isDisabled = !isAvailable || isPast;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                      isDisabled && styles.dateCardDisabled,
                    ]}
                    onPress={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.dateDayName,
                      isSelected && styles.dateTextSelected,
                      isDisabled && styles.dateTextDisabled,
                    ]}>
                      {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </Text>
                    <Text style={[
                      styles.dateDay,
                      isSelected && styles.dateTextSelected,
                      isDisabled && styles.dateTextDisabled,
                    ]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[
                      styles.dateMonth,
                      isSelected && styles.dateTextSelected,
                      isDisabled && styles.dateTextDisabled,
                    ]}>
                      {date.toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                    {!isDisabled && (
                      <View style={[styles.availableDot, isSelected && styles.availableDotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Time Slots */}
          <View style={styles.timeSlotsSection}>
            <Text style={styles.sectionTitle}>Créneaux disponibles</Text>
            {timeSlots.length === 0 ? (
              <View style={styles.emptySlots}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptySlotsText}>
                  {isDateBlocked(selectedDate)
                    ? 'Le prestataire n\'est pas disponible ce jour'
                    : 'Aucun créneau disponible pour cette date'}
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {timeSlots.map((slot, index) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.slotChip,
                        isSelected && styles.slotChipSelected,
                        !slot.available && styles.slotChipDisabled,
                      ]}
                      onPress={() => handleSlotSelect(slot)}
                      disabled={!slot.available}
                    >
                      <Text style={[
                        styles.slotTime,
                        isSelected && styles.slotTimeSelected,
                        !slot.available && styles.slotTimeDisabled,
                      ]}>
                        {slot.time}
                      </Text>
                      {slot.isInstantBooking && slot.available && (
                        <Ionicons name="flash" size={14} color={isSelected ? 'white' : COLORS.success} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Info Cards */}
          {instantBookingEnabled && instantBookingSettings && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Réservation instantanée : confirmation automatique en {instantBookingSettings.advance_notice_hours}h
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Button */}
      {selectedSlot && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.bookButton} onPress={handleContinueBooking}>
            <Text style={styles.bookButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 180 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  providerCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  providerInfo: { marginBottom: 12 },
  providerName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  providerService: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  instantBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.success },

  calendarSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  dateCard: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dateCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateCardDisabled: {
    opacity: 0.4,
  },
  dateDayName: { fontSize: 12, color: COLORS.textLight, textTransform: 'capitalize' },
  dateDay: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginVertical: 4 },
  dateMonth: { fontSize: 12, color: COLORS.textLight, textTransform: 'capitalize' },
  dateTextSelected: { color: 'white' },
  dateTextDisabled: { color: COLORS.textLight },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginTop: 6,
  },
  availableDotSelected: { backgroundColor: 'white' },

  timeSlotsSection: { marginBottom: 20 },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  slotChipDisabled: {
    opacity: 0.4,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  slotTimeSelected: { color: 'white' },
  slotTimeDisabled: { color: COLORS.textLight },

  emptySlots: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySlotsText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },

  footer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
