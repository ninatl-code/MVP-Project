import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FooterPresta from '../../components/FooterPresta';

interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  time?: string;
}

export default function CalendrierPrestataire() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, date, heure, annonces(titre)')
      .eq('prestataire_id', user.id)
      .order('date', { ascending: true });

    const eventsData: Event[] = (reservations || []).map(r => ({
      id: r.id,
      date: r.date,
      title: Array.isArray(r.annonces) && r.annonces.length > 0 ? r.annonces[0].titre : 'Réservation',
      type: 'reservation',
      time: r.heure
    }));

    setEvents(eventsData);
    setLoading(false);
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

  return (
    <View style={styles.container}>
      
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>📅 Mon Planning</Text>

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Aucun événement programmé</Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDate}>
                <Text style={styles.eventDay}>
                  {new Date(event.date).getDate()}
                </Text>
                <Text style={styles.eventMonth}>
                  {new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
                </Text>
              </View>
              
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.time && (
                  <Text style={styles.eventTime}>⏰ {event.time}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 100, // Espace pour le footer
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 24
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 16
  },
  eventDate: {
    width: 60,
    height: 60,
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  eventDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  eventMonth: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase'
  },
  eventContent: {
    flex: 1,
    justifyContent: 'center'
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF'
  }
});

