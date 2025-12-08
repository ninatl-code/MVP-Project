import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterParti from '../../components/FooterParti';

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
  annonce_id: string;
  annonce_titre: string;
  prestataire_id: string;
  prestataire_nom: string;
  date: string;
  heure: string;
  lieu: string;
  montant: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        annonce_id,
        prestataire_id,
        date,
        endroit,
        montant,
        status,
        created_at,
        commentaire,
        annonces (titre),
        profiles!reservations_prestataire_id_fkey (nom)
      `)
      .eq('particulier_id', user.id)
      .order('date', { ascending: false });

    console.log('📅 Reservations fetched:', data?.length || 0, error);

    if (!error && data) {
      const formattedData = data.map((r: any) => {
        const dateObj = new Date(r.date);
        const dateStr = dateObj.toLocaleDateString('fr-FR');
        const heureStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        return {
          id: r.id,
          annonce_id: r.annonce_id,
          annonce_titre: Array.isArray(r.annonces) ? r.annonces[0]?.titre : r.annonces?.titre || 'Annonce',
          prestataire_id: r.prestataire_id,
          prestataire_nom: Array.isArray(r.profiles) ? r.profiles[0]?.nom : r.profiles?.nom || 'Prestataire',
          date: dateStr,
          heure: heureStr,
          lieu: r.endroit || '',
          montant: r.montant,
          status: r.status,
          created_at: r.created_at,
          notes: r.commentaire
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
      `Êtes-vous sûr de vouloir annuler votre réservation pour "${reservation.annonce_titre}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('reservations')
              .update({ status: 'cancelled' })
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
    router.push('/particuliers/messages');
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
      currency: 'EUR'
    }).format(amount || 0);
  };

  const filteredReservations = filter === 'all' 
    ? reservations 
    : reservations.filter(r => r.status === filter);

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
                En attente ({reservations.filter(r => r.status === 'pending').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'confirmed' && styles.filterChipActive]}
              onPress={() => setFilter('confirmed')}
            >
              <Text style={[styles.filterChipText, filter === 'confirmed' && styles.filterChipTextActive]}>
                Confirmées ({reservations.filter(r => r.status === 'confirmed').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterChipText, filter === 'completed' && styles.filterChipTextActive]}>
                Terminées ({reservations.filter(r => r.status === 'completed').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'cancelled' && styles.filterChipActive]}
              onPress={() => setFilter('cancelled')}
            >
              <Text style={[styles.filterChipText, filter === 'cancelled' && styles.filterChipTextActive]}>
                Annulées ({reservations.filter(r => r.status === 'cancelled').length})
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
              onPress={() => router.push('/particuliers/search')}
            >
              <Text style={styles.emptyStateButtonText}>Explorer les annonces</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reservationsList}>
            {filteredReservations.map((reservation) => {
              const statusInfo = getStatusInfo(reservation.status);
              return (
                <View key={reservation.id} style={styles.reservationCard}>
                  {/* Status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color="white" />
                    <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                  </View>

                  {/* Titre */}
                  <Text style={styles.reservationTitle}>{reservation.annonce_titre}</Text>

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

                    {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
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
