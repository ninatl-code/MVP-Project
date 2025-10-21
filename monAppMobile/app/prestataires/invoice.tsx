import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';

interface Invoice {
  id: string;
  numero: string;
  montant_total: number;
  date_emission: string;
  statut: string;
  reservations?: { annonces?: { titre: string } };
  profiles?: { nom: string };
}

export default function InvoicePrestataire() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('factures')
      .select('*, reservations(annonces(titre)), profiles!factures_client_id_fkey(nom)')
      .eq('prestataire_id', user.id)
      .order('date_emission', { ascending: false });

    if (!error) setInvoices(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'pending': return '#FCD34D';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🧾 Mes Factures</Text>

        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyText}>Aucune facture générée</Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <View key={invoice.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Facture {invoice.numero}</Text>
                  <Text style={styles.cardSubtitle}>
                    {invoice.profiles?.nom || 'Client'}
                  </Text>
                  <Text style={styles.cardService}>
                    {invoice.reservations?.annonces?.titre || 'Service'}
                  </Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.statut) }]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(invoice.statut)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(invoice.date_emission).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Montant:</Text>
                  <Text style={[styles.infoValue, styles.amount]}>
                    {invoice.montant_total} MAD
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    padding: 24
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
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2
  },
  cardService: {
    fontSize: 12,
    color: '#9CA3AF'
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
  cardFooter: {
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
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981'
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
