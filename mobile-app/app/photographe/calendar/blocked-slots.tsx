import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
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
  error: '#EF4444',
  warning: '#F59E0B',
};

interface BlockedSlot {
  id?: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  created_at?: string;
}

export default function BlockedSlotsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('vacation');

  const REASONS = [
    { value: 'vacation', label: 'Vacances', icon: 'airplane' },
    { value: 'personal', label: 'Personnel', icon: 'person' },
    { value: 'maintenance', label: 'Maintenance', icon: 'construct' },
    { value: 'other', label: 'Autre', icon: 'ellipsis-horizontal' },
  ];

  useEffect(() => {
    fetchBlockedSlots();
  }, []);

  const fetchBlockedSlots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('provider_id', user.id)
        .gte('end_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      setBlockedSlots(data || []);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      Alert.alert('Erreur', 'Impossible de charger les périodes bloquées');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedSlot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (startDate >= endDate) {
        Alert.alert('Erreur', 'La date de fin doit être après la date de début');
        return;
      }

      const { error } = await supabase
        .from('blocked_slots')
        .insert({
          provider_id: user.id,
          start_datetime: startDate.toISOString(),
          end_datetime: endDate.toISOString(),
          reason: selectedReason,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Période bloquée ajoutée avec succès');
      setShowAddModal(false);
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error adding blocked slot:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la période bloquée');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette période bloquée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('blocked_slots')
                .delete()
                .eq('id', slotId);

              if (error) throw error;
              fetchBlockedSlots();
            } catch (error) {
              console.error('Error deleting blocked slot:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la période');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDurationDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.ceil(hours / 24)} jour${Math.ceil(hours / 24) > 1 ? 's' : ''}`;
  };

  const getReasonIcon = (reason?: string) => {
    const reasonObj = REASONS.find(r => r.value === reason);
    return reasonObj?.icon || 'ellipsis-horizontal';
  };

  const getReasonLabel = (reason?: string) => {
    const reasonObj = REASONS.find(r => r.value === reason);
    return reasonObj?.label || 'Autre';
  };

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
          <Text style={styles.headerTitle}>Périodes Bloquées</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.warning} />
            <Text style={styles.infoText}>
              Bloquez des périodes pour vacances, congés ou toute autre raison. Aucune réservation ne pourra être faite pendant ces périodes.
            </Text>
          </View>

          {/* Empty State */}
          {blockedSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyStateTitle}>Aucune période bloquée</Text>
              <Text style={styles.emptyStateText}>
                Ajoutez vos vacances ou périodes d'indisponibilité
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Ajouter une période</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Blocked Slots List */
            blockedSlots.map((slot) => (
              <View key={slot.id} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <View style={styles.slotIconContainer}>
                    <Ionicons
                      name={getReasonIcon(slot.reason) as any}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotReason}>{getReasonLabel(slot.reason)}</Text>
                    <Text style={styles.slotDuration}>
                      {getDurationDays(slot.start_datetime, slot.end_datetime)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteSlot(slot.id!)}>
                    <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.slotDates}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateLabel}>Début</Text>
                    <View style={styles.dateChip}>
                      <Ionicons name="calendar" size={16} color={COLORS.primary} />
                      <Text style={styles.dateText}>{formatDateShort(slot.start_datetime)}</Text>
                    </View>
                  </View>

                  <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />

                  <View style={styles.dateBlock}>
                    <Text style={styles.dateLabel}>Fin</Text>
                    <View style={styles.dateChip}>
                      <Ionicons name="calendar" size={16} color={COLORS.primary} />
                      <Text style={styles.dateText}>{formatDateShort(slot.end_datetime)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
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
              <Text style={styles.modalTitle}>Bloquer une période</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Reason Selector */}
              <Text style={styles.modalLabel}>Raison</Text>
              <View style={styles.reasonGrid}>
                {REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason.value && styles.reasonButtonActive,
                    ]}
                    onPress={() => setSelectedReason(reason.value)}
                  >
                    <Ionicons
                      name={reason.icon as any}
                      size={24}
                      color={selectedReason === reason.value ? 'white' : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason.value && styles.reasonTextActive,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Start Date & Time */}
              <Text style={styles.modalLabel}>Date de début</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setTempStartDate(startDate);
                  setShowStartDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowStartDatePicker(false);
                    }
                    if (selectedDate && event.type === 'set') {
                      // Garder l'heure actuelle, changer seulement la date
                      const newDate = new Date(startDate);
                      newDate.setFullYear(selectedDate.getFullYear());
                      newDate.setMonth(selectedDate.getMonth());
                      newDate.setDate(selectedDate.getDate());
                      setStartDate(newDate);
                      setTempStartDate(newDate);
                      if (Platform.OS === 'ios') {
                        setShowStartDatePicker(false);
                      }
                    } else if (event.type === 'dismissed') {
                      setShowStartDatePicker(false);
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setTempStartDate(startDate);
                  setShowStartTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowStartTimePicker(false);
                    }
                    if (selectedDate && event.type === 'set') {
                      // Garder la date actuelle, changer seulement l'heure
                      const newDate = new Date(startDate);
                      newDate.setHours(selectedDate.getHours());
                      newDate.setMinutes(selectedDate.getMinutes());
                      setStartDate(newDate);
                      setTempStartDate(newDate);
                      if (Platform.OS === 'ios') {
                        setShowStartTimePicker(false);
                      }
                    } else if (event.type === 'dismissed') {
                      setShowStartTimePicker(false);
                    }
                  }}
                />
              )}

              {/* End Date & Time */}
              <Text style={styles.modalLabel}>Date de fin</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setTempEndDate(endDate);
                  setShowEndDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={startDate}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowEndDatePicker(false);
                    }
                    if (selectedDate && event.type === 'set') {
                      // Garder l'heure actuelle, changer seulement la date
                      const newDate = new Date(endDate);
                      newDate.setFullYear(selectedDate.getFullYear());
                      newDate.setMonth(selectedDate.getMonth());
                      newDate.setDate(selectedDate.getDate());
                      setEndDate(newDate);
                      setTempEndDate(newDate);
                      if (Platform.OS === 'ios') {
                        setShowEndDatePicker(false);
                      }
                    } else if (event.type === 'dismissed') {
                      setShowEndDatePicker(false);
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setTempEndDate(endDate);
                  setShowEndTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={tempEndDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowEndTimePicker(false);
                    }
                    if (selectedDate && event.type === 'set') {
                      // Garder la date actuelle, changer seulement l'heure
                      const newDate = new Date(endDate);
                      newDate.setHours(selectedDate.getHours());
                      newDate.setMinutes(selectedDate.getMinutes());
                      setEndDate(newDate);
                      setTempEndDate(newDate);
                      if (Platform.OS === 'ios') {
                        setShowEndTimePicker(false);
                      }
                    } else if (event.type === 'dismissed') {
                      setShowEndTimePicker(false);
                    }
                  }}
                />
              )}
            </ScrollView>

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
                onPress={handleAddBlockedSlot}
              >
                <Text style={styles.modalSaveText}>Bloquer</Text>
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
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  slotCard: {
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
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  slotReason: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  slotDuration: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },

  slotDates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },

  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  reasonButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
  },
  reasonButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  reasonTextActive: {
    color: 'white',
  },

  dateTimeButton: {
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
  dateTimeText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },

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
