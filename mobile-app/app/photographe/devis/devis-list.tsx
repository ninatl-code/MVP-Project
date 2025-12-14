import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '@/components/photographe/FooterPresta';

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

interface DevisItem {
  id: string;
  status: string;
  created_at: string;
  montant?: number;
  client?: { nom: string };
  demande?: { titre: string };
}

export default function DevisList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devisList, setDevisList] = useState<DevisItem[]>([]);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchDevis();
  }, [filter]);

  const fetchDevis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      let query = supabase
        .from('devis')
        .select(`
          id,
          status,
          created_at,
          montant,
          client:profiles!client_id(nom),
          demande:demandes_client(titre)
        `)
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (!error) {
        const transformedData = (data || []).map(devis => ({
          ...devis,
          client: Array.isArray(devis.client) ? devis.client[0] : devis.client,
          demande: Array.isArray(devis.demande) ? devis.demande[0] : devis.demande
        }));
        setDevisList(transformedData);
      }
    } catch (err) {
      console.error('Error fetching devis:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevis();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepte': return COLORS.success;
      case 'refuse': return COLORS.error;
      case 'en_attente': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepte': return 'Accepté';
      case 'refuse': return 'Refusé';
      case 'en_attente': return 'En attente';
      case 'envoye': return 'Envoyé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes Devis</Text>
          <TouchableOpacity 
            onPress={() => router.push('/photographe/devis/devis-create' as any)}
            style={styles.addButton}
          >
            <Ionicons name="add-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'en_attente', label: 'En attente' },
            { key: 'envoye', label: 'Envoyés' },
            { key: 'accepte', label: 'Acceptés' },
            { key: 'refuse', label: 'Refusés' }
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {devisList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun devis</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? "Créez votre premier devis" 
                : `Aucun devis ${getStatusLabel(filter).toLowerCase()}`}
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/photographe/devis/devis-create' as any)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Créer un devis</Text>
            </TouchableOpacity>
          </View>
        ) : (
          devisList.map((devis) => (
            <TouchableOpacity
              key={devis.id}
              style={styles.devisCard}
              onPress={() => router.push(`/photographe/devis/devis?id=${devis.id}` as any)}
            >
              <View style={styles.devisHeader}>
                <View style={styles.devisInfo}>
                  <Text style={styles.devisClient}>{devis.client?.nom || 'Client inconnu'}</Text>
                  <Text style={styles.devisTitle}>{devis.demande?.titre || 'Sans titre'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(devis.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(devis.status) }]}>
                    {getStatusLabel(devis.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.devisFooter}>
                <View style={styles.devisDetail}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.devisDetailText}>
                    {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {devis.montant && (
                  <View style={styles.devisAmount}>
                    <Text style={styles.amountText}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.montant)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  devisCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  devisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  devisInfo: {
    flex: 1,
  },
  devisClient: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  devisTitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  devisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devisDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devisDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  devisAmount: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
});
