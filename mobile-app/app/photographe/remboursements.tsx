import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FooterPresta from '@/components/photographe/FooterPresta';

interface Remboursement {
  id: string;
  montant_original: number;
  montant_rembourse: number;
  statut_remboursement: string;
  date_remboursement: string;
  reservations?: { date: string; annonces?: { titre: string } };
}

export default function RemboursementsPrestataire() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [remboursements, setRemboursements] = useState<Remboursement[]>([]);

  useEffect(() => {
    fetchRemboursements();
  }, []);

  const fetchRemboursements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('remboursements')
      .select('*, reservations(date, annonces(titre))')
      .eq('prestataire_id', user.id)
      .order('date_remboursement', { ascending: false });

    if (!error) setRemboursements(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FCD34D';
      case 'processed': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En cours';
      case 'processed': return 'Remboursé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
        <FooterPresta />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Remboursements</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {remboursements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>Aucun remboursement</Text>
          </View>
        ) : (
          remboursements.map((remb) => (
            <View key={remb.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {remb.reservations?.annonces?.titre || 'Service'}
                </Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(remb.statut_remboursement) }]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(remb.statut_remboursement)}</Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Montant original:</Text>
                  <Text style={styles.infoValue}>{remb.montant_original} MAD</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Montant remboursé:</Text>
                  <Text style={[styles.infoValue, { color: '#EF4444' }]}>
                    {remb.montant_rembourse} MAD
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(remb.date_remboursement).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 100 // Espace pour le footer
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
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
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
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500'
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
