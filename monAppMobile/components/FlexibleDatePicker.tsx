import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
};

interface FlexibleDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: DateOption) => void;
  selectedOption?: string;
}

interface DateOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  dateRange: { start: Date; end: Date };
}

const getDateOptions = (): DateOption[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const nextWeekStart = new Date(weekEnd);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const weekendStart = new Date(today);
  while (weekendStart.getDay() !== 6) {
    weekendStart.setDate(weekendStart.getDate() + 1);
  }
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendStart.getDate() + 1);

  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  return [
    {
      id: 'today',
      label: "Aujourd'hui",
      icon: 'today',
      description: today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      dateRange: { start: today, end: today },
    },
    {
      id: 'tomorrow',
      label: 'Demain',
      icon: 'calendar',
      description: tomorrow.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      dateRange: { start: tomorrow, end: tomorrow },
    },
    {
      id: 'this-weekend',
      label: 'Ce week-end',
      icon: 'beer',
      description: `Sam ${weekendStart.getDate()} - Dim ${weekendEnd.getDate()}`,
      dateRange: { start: weekendStart, end: weekendEnd },
    },
    {
      id: 'this-week',
      label: 'Cette semaine',
      icon: 'calendar-outline',
      description: `${weekStart.getDate()} - ${weekEnd.getDate()} ${monthStart.toLocaleDateString('fr-FR', { month: 'long' })}`,
      dateRange: { start: today, end: weekEnd },
    },
    {
      id: 'next-week',
      label: 'La semaine prochaine',
      icon: 'arrow-forward-circle',
      description: `${nextWeekStart.getDate()} - ${nextWeekEnd.getDate()} ${nextWeekStart.toLocaleDateString('fr-FR', { month: 'long' })}`,
      dateRange: { start: nextWeekStart, end: nextWeekEnd },
    },
    {
      id: 'next-3-days',
      label: '3 prochains jours',
      icon: 'time',
      description: `${today.getDate()} - ${in3Days.getDate()} ${today.toLocaleDateString('fr-FR', { month: 'long' })}`,
      dateRange: { start: today, end: in3Days },
    },
    {
      id: 'next-7-days',
      label: '7 prochains jours',
      icon: 'time-outline',
      description: `${today.getDate()} - ${in7Days.getDate()} ${today.toLocaleDateString('fr-FR', { month: 'long' })}`,
      dateRange: { start: today, end: in7Days },
    },
    {
      id: 'this-month',
      label: 'Ce mois-ci',
      icon: 'calendar-clear',
      description: monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      dateRange: { start: today, end: monthEnd },
    },
    {
      id: 'next-month',
      label: 'Le mois prochain',
      icon: 'calendar-number',
      description: nextMonthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      dateRange: { start: nextMonthStart, end: nextMonthEnd },
    },
    {
      id: 'next-30-days',
      label: '30 prochains jours',
      icon: 'calendar-sharp',
      description: `${today.getDate()} ${today.toLocaleDateString('fr-FR', { month: 'short' })} - ${in30Days.getDate()} ${in30Days.toLocaleDateString('fr-FR', { month: 'short' })}`,
      dateRange: { start: today, end: in30Days },
    },
    {
      id: 'flexible',
      label: 'Dates flexibles',
      icon: 'options',
      description: "Je suis flexible sur les dates",
      dateRange: { start: today, end: in30Days },
    },
  ];
};

export default function FlexibleDatePicker({
  visible,
  onClose,
  onSelect,
  selectedOption,
}: FlexibleDatePickerProps) {
  const dateOptions = getDateOptions();

  const handleSelect = (option: DateOption) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Quand avez-vous besoin ?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Options Grid */}
          <View style={styles.optionsContainer}>
            {dateOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  selectedOption === option.id && styles.optionCardSelected,
                ]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  selectedOption === option.id && styles.iconContainerSelected,
                ]}>
                  <Ionicons
                    name={option.icon as any}
                    size={28}
                    color={selectedOption === option.id ? 'white' : COLORS.primary}
                  />
                </View>
                <Text style={[
                  styles.optionLabel,
                  selectedOption === option.id && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedOption === option.id && styles.optionDescriptionSelected,
                ]}>
                  {option.description}
                </Text>
                {selectedOption === option.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    maxHeight: '100%',
  },
  optionCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    minHeight: 140,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainerSelected: {
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  optionDescriptionSelected: {
    color: COLORS.text,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
