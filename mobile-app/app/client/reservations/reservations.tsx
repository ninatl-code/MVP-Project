import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterParti from '@/components/client/FooterParti';

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
  info: '#3B82F6'
};

interface Reservation {
  id: string;
  package_id: string;
  package_titre: string;
  prestataire_id: string;
  prestataire_nom: string;
  date: string;
  heure: string;
  lieu: string;
  montant: number;
  statut: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  notes?: string;
}

export default function ReservationsParticulier() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        package_id,
        prestataire_id,
        date,
        heure_debut,
        lieu,
        montant_total,
        statut,
        created_at,
        notes_client
      `)
      .eq('client_id', user.id)
      .order('date', { ascending: false });

    console.log('📅 Reservations fetched:', data?.length || 0, error);

    if (!error && data) {
      // Pas de relation FK reconnue entre reservations.prestataire_id/package_id et
      // profiles/packages_types : on récupère ces infos séparément.
      const prestataireIds = [...new Set(data.map((r: any) => r.prestataire_id).filter(Boolean))];
      const packageIds = [...new Set(data.map((r: any) => r.package_id).filter(Boolean))];

      const [{ data: prestataires }, { data: packages }] = await Promise.all([
        prestataireIds.length
          ? supabase.from('profiles').select('id, nom').in('id', prestataireIds)
          : Promise.resolve({ data: [] as any[] }),
        packageIds.length
          ? supabase.from('packages_types').select('id, titre').in('id', packageIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const prestataireMap = new Map((prestataires || []).map((p: any) => [p.id, p]));
      const packageMap = new Map((packages || []).map((p: any) => [p.id, p]));

      const formattedData = data.map((r: any) => {
        const dateObj = new Date(r.date);
        const dateStr = dateObj.toLocaleDateString('fr-FR');
        const heureStr = r.heure_debut || '00:00';

        return {
          id: r.id,
          package_id: r.package_id,
          package_titre: packageMap.get(r.package_id)?.titre || 'Package',
          prestataire_id: r.prestataire_id,
          prestataire_nom: prestataireMap.get(r.prestataire_id)?.nom || 'Prestataire',
          date: dateStr,
          heure: heureStr,
          lieu: r.lieu || '',
          montant: r.montant_total,
          statut: r.statut,
          created_at: r.created_at,
          notes: r.notes_client
        };
      });
      setReservations(formattedData);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const handleCancelReservation = (reservation: Reservation) => {
    Alert.alert(
      'Annuler la réservation',
      `Êtes-vous sûr de vouloir annuler votre réservation pour "${reservation.package_titre}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('reservations')
              .update({ statut: 'cancelled' })
              .eq('id', reservation.id);

            if (error) {
              Alert.alert('Erreur', 'Impossible d\'annuler la réservation');
            } else {
              Alert.alert('Succès', 'Réservation annulée');
              fetchReservations();
            }
          }
        }
      ]
    );
  };

  const handleContactPrestataire = (reservation: Reservation) => {
    router.push('/shared/messages/messages-list' as any);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: COLORS.warning, icon: 'time-outline' };
      case 'confirmed':
        return { label: 'Confirmée', color: COLORS.success, icon: 'checkmark-circle-outline' };
      case 'completed':
        return { label: 'Terminée', color: COLORS.info, icon: 'checkmark-done-outline' };
      case 'cancelled':
        return { label: 'Annulée', color: COLORS.error, icon: 'close-circle-outline' };
      default:
        return { label: status, color: COLORS.textLight, icon: 'help-circle-outline' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount || 0);
  };

  const filteredReservations = filter === 'all' 
    ? reservations 
    : reservations.filter(r => r.statut === filter);

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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes réservations</Text>
          <Text style={styles.headerSubtitle}>{filteredReservations.length} réservation{filteredReservations.length > 1 ? 's' : ''}</Text>
        </LinearGradient>

        {/* Filtres */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                Toutes ({reservations.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
                En attente ({reservations.filter(r => r.statut === 'pending').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'confirmed' && styles.filterChipActive]}
              onPress={() => setFilter('confirmed')}
            >
              <Text style={[styles.filterChipText, filter === 'confirmed' && styles.filterChipTextActive]}>
                Confirmées ({reservations.filter(r => r.statut === 'confirmed').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterChipText, filter === 'completed' && styles.filterChipTextActive]}>
                Terminées ({reservations.filter(r => r.statut === 'completed').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'cancelled' && styles.filterChipActive]}
              onPress={() => setFilter('cancelled')}
            >
              <Text style={[styles.filterChipText, filter === 'cancelled' && styles.filterChipTextActive]}>
                Annulées ({reservations.filter(r => r.statut === 'cancelled').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Liste des réservations */}
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Aucune réservation</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'Vous n\'avez pas encore de réservation'
                : `Aucune réservation ${getStatusInfo(filter).label.toLowerCase()}`}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/client/search/search' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Explorer les annonces</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reservationsList}>
            {filteredReservations.map((reservation) => {
              const statusInfo = getStatusInfo(reservation.statut);
              return (
                <View key={reservation.id} style={styles.reservationCard}>
                  {/* Status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color="white" />
                    <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                  </View>

                  {/* Titre */}
                  <Text style={styles.reservationTitle}>{reservation.package_titre}</Text>

                  {/* Infos principales */}
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>{reservation.prestataire_nom}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>{formatDate(reservation.date)}</Text>
                  </View>

                  {reservation.heure && (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.infoText}>{reservation.heure}</Text>
                    </View>
                  )}

                  {reservation.lieu && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.infoText}>{reservation.lieu}</Text>
                    </View>
                  )}

                  {/* Montant */}
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Montant</Text>
                    <Text style={styles.amountValue}>{formatCurrency(reservation.montant)}</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.actionButtonSecondary}
                      onPress={() => handleContactPrestataire(reservation)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.actionButtonSecondaryText}>Contacter</Text>
                    </TouchableOpacity>

                    {(reservation.statut === 'pending' || reservation.statut === 'confirmed') && (
                      <TouchableOpacity 
                        style={styles.actionButtonDanger}
                        onPress={() => handleCancelReservation(reservation)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                        <Text style={styles.actionButtonDangerText}>Annuler</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { padding: 24, paddingTop: 20, paddingBottom: 32 },
  backButton: { marginBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },

  // Filtres
  filtersSection: { marginVertical: 16 },
  filtersScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  filterChipTextActive: { color: 'white' },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  emptyStateButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyStateButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },

  // Réservations
  reservationsList: { paddingHorizontal: 16, gap: 16 },
  reservationCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, marginBottom: 12 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  reservationTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 15, color: COLORS.text, flex: 1 },

  amountContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  amountLabel: { fontSize: 14, color: COLORS.textLight },
  amountValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  actionButtonSecondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  actionButtonDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error },
  actionButtonDangerText: { color: COLORS.error, fontSize: 14, fontWeight: '600' }
});
