import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '@/components/photographe/FooterPresta';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

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

const DAYS_OF_WEEK = [
  { id: 0, label: 'Dimanche', short: 'Dim' },
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
];

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function AvailabilityCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Erreur', 'Impossible de charger les disponibilités');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startTimeStr = startTime.toTimeString().slice(0, 5);
      const endTimeStr = endTime.toTimeString().slice(0, 5);

      if (startTimeStr >= endTimeStr) {
        Alert.alert('Erreur', 'L\'heure de fin doit être après l\'heure de début');
        return;
      }

      const { error } = await supabase
        .from('provider_availability')
        .insert({
          provider_id: user.id,
          day_of_week: selectedDay,
          start_time: startTimeStr,
          end_time: endTimeStr,
          is_available: true,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Créneau ajouté avec succès');
      setShowAddModal(false);
      fetchAvailability();
    } catch (error: any) {
      console.error('Error adding slot:', error);
      if (error.code === '23505') {
        Alert.alert('Erreur', 'Ce créneau existe déjà');
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter le créneau');
      }
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer ce créneau ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('provider_availability')
                .delete()
                .eq('id', slotId);

              if (error) throw error;
              fetchAvailability();
            } catch (error) {
              console.error('Error deleting slot:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le créneau');
            }
          },
        },
      ]
    );
  };

  const handleToggleSlot = async (slotId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('provider_availability')
        .update({ is_available: !currentStatus })
        .eq('id', slotId);

      if (error) throw error;
      fetchAvailability();
    } catch (error) {
      console.error('Error toggling slot:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const groupedAvailability = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: availability.filter(slot => slot.day_of_week === day.id),
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterPresta />
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
          <Text style={styles.headerTitle}>Mes Disponibilités</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Définissez vos horaires de disponibilité hebdomadaires. Les clients pourront réserver pendant ces créneaux.
            </Text>
          </View>

          {/* Availability by Day */}
          {groupedAvailability.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <TouchableOpacity
                  style={styles.quickAddButton}
                  onPress={() => {
                    setSelectedDay(day.id);
                    setShowAddModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {day.slots.length === 0 ? (
                <Text style={styles.emptySlot}>Aucun créneau défini</Text>
              ) : (
                day.slots.map((slot) => (
                  <View
                    key={slot.id}
                    style={[
                      styles.slotItem,
                      !slot.is_available && styles.slotItemDisabled
                    ]}
                  >
                    <View style={styles.slotTime}>
                      <Ionicons
                        name={slot.is_available ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={slot.is_available ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.slotTimeText}>
                        {slot.start_time} - {slot.end_time}
                      </Text>
                    </View>
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        onPress={() => handleToggleSlot(slot.id!, slot.is_available)}
                      >
                        <Ionicons
                          name={slot.is_available ? 'pause-circle-outline' : 'play-circle-outline'}
                          size={24}
                          color={COLORS.textLight}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteSlot(slot.id!)}>
                        <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ))}

          {/* Quick Add Buttons */}
          <View style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>🚀 Actions rapides</Text>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Copier vers tous les jours ouvrables</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Horaires standards (9h-18h)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un créneau</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Day Selector */}
            <Text style={styles.modalLabel}>Jour de la semaine</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.daySelectorButton,
                    selectedDay === day.id && styles.daySelectorButtonActive
                  ]}
                  onPress={() => setSelectedDay(day.id)}
                >
                  <Text style={[
                    styles.daySelectorText,
                    selectedDay === day.id && styles.daySelectorTextActive
                  ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Pickers */}
            <Text style={styles.modalLabel}>Heure de début</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.timePickerText}>
                {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) setStartTime(selectedDate);
                }}
              />
            )}

            <Text style={styles.modalLabel}>Heure de fin</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.timePickerText}>
                {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setEndTime(selectedDate);
                }}
              />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddSlot}
              >
                <Text style={styles.modalSaveText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
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
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  content: { padding: 16 },

  infoCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  dayCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  quickAddButton: { padding: 4 },

  emptySlot: { fontSize: 14, color: COLORS.textLight, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  slotItemDisabled: { opacity: 0.5 },
  slotTime: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  slotTimeText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  slotActions: { flexDirection: 'row', gap: 16 },

  quickActionsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  quickActionsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  quickActionText: { fontSize: 14, color: COLORS.text, flex: 1 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16 },

  daySelector: { marginBottom: 16 },
  daySelectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
    marginRight: 8,
  },
  daySelectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  daySelectorText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  daySelectorTextActive: { color: 'white' },

  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
    marginBottom: 12,
  },
  timePickerText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
