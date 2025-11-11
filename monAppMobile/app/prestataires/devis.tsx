import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FooterPresta from '../../components/FooterPresta';

interface Devis {
  id: string;
  titre: string;
  status: string;
  created_at: string;
  montant?: number;
  profiles?: { nom: string };
  annonces?: { titre: string };
}

export default function DevisPrestataire() {
  const [loading, setLoading] = useState(true);
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDevis();
  }, [filter]);

  const fetchDevis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('devis')
      .select('*, profiles!devis_particulier_id_fkey(nom), annonces(titre)')
      .eq('prestataire_id', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (!error) setDevisList(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FCD34D';
      case 'sent': return '#3B82F6';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'sent': return 'Envoyé';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      default: return status;
    }
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
      
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes Devis</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'pending', label: 'En attente' },
            { key: 'sent', label: 'Envoyés' },
            { key: 'accepted', label: 'Acceptés' },
            { key: 'rejected', label: 'Refusés' }
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.list}>
          {devisList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>Aucun devis trouvé</Text>
            </View>
          ) : (
            devisList.map((devis) => (
              <View key={devis.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{devis.titre}</Text>
                    <Text style={styles.cardSubtitle}>
                      {devis.profiles?.nom || 'Client'} • {devis.annonces?.titre || 'Service'}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(devis.status) }]}
                  >
                    <Text style={styles.statusText}>{getStatusLabel(devis.status)}</Text>
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📅</Text>
                    <Text style={styles.infoText}>
                      {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  {devis.montant && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>💰</Text>
                      <Text style={styles.infoText}>{devis.montant} MAD</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 100, // Espace pour le footer
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E'
  },
  filters: {
    flexDirection: 'row',
    marginBottom: 24
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterButtonActive: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0'
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  filterTextActive: {
    color: '#fff'
  },
  list: {
    flex: 1
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  cardInfo: {
    flexDirection: 'row',
    gap: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoIcon: {
    fontSize: 16
  },
  infoText: {
    fontSize: 14,
    color: '#374151'
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

