import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  reservation: '#3B82F6',
  blocked: '#EF4444',
};

interface Event {
  id: string;
  date: string;
  title: string;
  type: 'reservation' | 'blocked';
  time?: string;
  duration?: number;
  client_name?: string;
  montant?: number;
  status?: string;
}

// Composant Filtre
export function EventFilter({ 
  filterType, 
  onFilterChange 
}: { 
  filterType: string; 
  onFilterChange: (type: string) => void 
}) {
  const filters = [
    { value: 'all', label: 'Tous', icon: 'apps' },
    { value: 'reservation', label: 'Réservations', icon: 'calendar' },
    { value: 'blocked', label: 'Bloqués', icon: 'lock-closed' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.value}
          style={[
            styles.filterButton,
            filterType === filter.value && styles.filterButtonActive
          ]}
          onPress={() => onFilterChange(filter.value)}
        >
          <Ionicons 
            name={filter.icon as any} 
            size={18} 
            color={filterType === filter.value ? '#fff' : COLORS.primary} 
          />
          <Text style={[
            styles.filterButtonText,
            filterType === filter.value && styles.filterButtonTextActive
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Composant Statistiques avancées
export function AdvancedStats({ events }: { events: Event[] }) {
  const reservations = events.filter(e => e.type === 'reservation');
  const confirmedReservations = reservations.filter(e => e.status === 'confirmed');
  const totalRevenue = confirmedReservations.reduce((sum, e) => sum + (e.montant || 0), 0);
  const avgReservationValue = confirmedReservations.length > 0 
    ? totalRevenue / confirmedReservations.length 
    : 0;

  const stats = [
    {
      label: 'Revenus totaux',
      value: `${totalRevenue.toFixed(2)}€`,
      icon: 'cash',
      color: COLORS.success
    },
    {
      label: 'Taux confirmation',
      value: `${reservations.length > 0 ? Math.round((confirmedReservations.length / reservations.length) * 100) : 0}%`,
      icon: 'checkmark-circle',
      color: COLORS.primary
    },
    {
      label: 'Panier moyen',
      value: `${avgReservationValue.toFixed(2)}€`,
      icon: 'trending-up',
      color: COLORS.warning
    },
  ];

  return (
    <View style={styles.advancedStatsContainer}>
      <Text style={styles.advancedStatsTitle}>Statistiques détaillées</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.advancedStatsScroll}
      >
        {stats.map((stat, index) => (
          <View key={index} style={styles.advancedStatCard}>
            <View style={[styles.advancedStatIcon, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.advancedStatValue}>{stat.value}</Text>
            <Text style={styles.advancedStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// Composant Vue Liste
export function EventListView({ 
  events, 
  onEventPress 
}: { 
  events: Event[]; 
  onEventPress: (event: Event) => void 
}) {
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <ScrollView style={styles.listViewContainer}>
      {sortedDates.map(date => (
        <View key={date} style={styles.dateGroup}>
          <Text style={styles.dateGroupTitle}>
            {new Date(date).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
          {groupedEvents[date].map(event => (
            <TouchableOpacity
              key={event.id}
              style={styles.listEventItem}
              onPress={() => onEventPress(event)}
            >
              <View style={[
                styles.listEventIndicator,
                { backgroundColor: event.type === 'reservation' ? COLORS.reservation : COLORS.blocked }
              ]} />
              <View style={styles.listEventContent}>
                <View style={styles.listEventHeader}>
                  <Text style={styles.listEventTitle}>{event.title}</Text>
                  {event.montant && (
                    <Text style={styles.listEventAmount}>{event.montant}€</Text>
                  )}
                </View>
                <View style={styles.listEventDetails}>
                  {event.time && (
                    <View style={styles.listEventDetail}>
                      <Ionicons name="time" size={14} color="#6B7280" />
                      <Text style={styles.listEventDetailText}>{event.time}</Text>
                    </View>
                  )}
                  {event.client_name && (
                    <View style={styles.listEventDetail}>
                      <Ionicons name="person" size={14} color="#6B7280" />
                      <Text style={styles.listEventDetailText}>{event.client_name}</Text>
                    </View>
                  )}
                  {event.duration && (
                    <View style={styles.listEventDetail}>
                      <Ionicons name="hourglass" size={14} color="#6B7280" />
                      <Text style={styles.listEventDetailText}>{event.duration}min</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// Composant Vue Semaine
export function WeekView({ 
  currentDate, 
  events, 
  onDayPress 
}: { 
  currentDate: Date; 
  events: Event[]; 
  onDayPress: (date: Date) => void 
}) {
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Lundi
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <View style={styles.weekViewContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {weekDays.map((day, index) => {
          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const dayEvents = events.filter(e => e.date === dateStr);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.weekDay,
                isToday && styles.weekDayToday
              ]}
              onPress={() => onDayPress(day)}
            >
              <Text style={[
                styles.weekDayName,
                isToday && styles.weekDayNameToday
              ]}>
                {dayNames[index]}
              </Text>
              <Text style={[
                styles.weekDayNumber,
                isToday && styles.weekDayNumberToday
              ]}>
                {day.getDate()}
              </Text>
              {dayEvents.length > 0 && (
                <View style={styles.weekDayBadge}>
                  <Text style={styles.weekDayBadgeText}>{dayEvents.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Filtres
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    padding: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  // Stats avancées
  advancedStatsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  advancedStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  advancedStatsScroll: {
    gap: 12,
  },
  advancedStatCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  advancedStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  advancedStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  advancedStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Vue Liste
  listViewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E5E7EB',
    textTransform: 'capitalize',
  },
  listEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listEventIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  listEventContent: {
    flex: 1,
  },
  listEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  listEventAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  listEventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listEventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listEventDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Vue Semaine
  weekViewContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekDay: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 60,
    backgroundColor: '#F9FAFB',
  },
  weekDayToday: {
    backgroundColor: COLORS.primary,
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  weekDayNameToday: {
    color: '#fff',
  },
  weekDayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weekDayNumberToday: {
    color: '#fff',
  },
  weekDayBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  weekDayBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});
