import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, SafeAreaView } from 'react-native';
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
  info: '#3B82F6'
};

interface Reservation {
  id: string;
  date: string;
  lieu?: string;
  statut: string;
  montant_total: number;
  notes_photographe?: string;
  client_id: string;
  package_id: string;
  client?: { nom: string; email: string; telephone: string; avatar_url: string } | { nom: string; email: string; telephone: string; avatar_url: string }[];
  packages_types?: { titre: string } | { titre: string }[];
  created_at: string;
}

export default function ReservationsPrestataire() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchReservations();
  }, [filter]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.replace('/auth/login');
        return;
      }

      console.log('Fetching reservations for user:', user.id);

      let query = supabase
        .from('reservations')
        .select(`
          id,
          date,
          statut,
          montant_total,
          lieu,
          notes_photographe,
          client_id,
          package_id,
          created_at,
          client:profiles!reservations_client_id_fkey(nom, email, telephone, avatar_url),
          packages_types!reservations_package_id_fkey(titre)
        `)
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching reservations:', error);
      } else {
        console.log('Reservations fetched:', data?.length || 0);
        setReservations(data || []);
      }
    } catch (err) {
      console.error('Exception in fetchReservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleAccept = async (reservationId: string) => {
    Alert.alert(
      'Accepter la réservation',
      'Voulez-vous confirmer cette réservation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            setActionLoading(reservationId);
            const { error } = await supabase
              .from('reservations')
              .update({ statut: 'confirmed' })
              .eq('id', reservationId);

            setActionLoading(null);

            if (error) {
              Alert.alert('Erreur', 'Impossible d\'accepter la réservation');
            } else {
              Alert.alert('Succès', 'Réservation confirmée');
              fetchReservations();
            }
          }
        }
      ]
    );
  };

  const handleRefuse = async (reservationId: string) => {
    Alert.alert(
      'Refuser la réservation',
      'Êtes-vous sûr de vouloir refuser cette réservation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(reservationId);
            const { error } = await supabase
              .from('reservations')
              .update({ statut: 'cancelled' })
              .eq('id', reservationId);

            setActionLoading(null);

            if (error) {
              Alert.alert('Erreur', 'Impossible de refuser la réservation');
            } else {
              Alert.alert('Refusée', 'La réservation a été refusée');
              fetchReservations();
            }
          }
        }
      ]
    );
  };

  const handleComplete = async (reservationId: string) => {
    Alert.alert(
      'Terminer la réservation',
      'Marquer cette réservation comme terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          onPress: async () => {
            setActionLoading(reservationId);
            const { error } = await supabase
              .from('reservations')
              .update({ statut: 'completed' })
              .eq('id', reservationId);

            setActionLoading(null);

            if (error) {
              Alert.alert('Erreur', 'Impossible de terminer la réservation');
            } else {
              Alert.alert('Succès', 'Réservation terminée');
              fetchReservations();
            }
          }
        }
      ]
    );
  };

  const handleContact = (reservation: Reservation) => {
    const profile = Array.isArray(reservation.client) ? reservation.client[0] : reservation.client;
    if (!profile) return;

    Alert.alert(
      'Contacter le client',
      `${profile.nom}\n\nEmail: ${profile.email}\nTél: ${profile.telephone}`,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Envoyer un message', onPress: () => router.push('/shared/messages/messages-list' as any) }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'confirmed': return COLORS.success;
      case 'paid': return COLORS.info;
      case 'completed': return COLORS.textLight;
      case 'cancelled': return COLORS.error;
      default: return COLORS.border;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'paid': return 'Payée';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'paid': return 'card-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réservations</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filtres */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'pending', label: 'En attente' },
          { key: 'confirmed', label: 'Confirmées' },
          { key: 'completed', label: 'Terminées' },
          { key: 'cancelled', label: 'Annulées' }
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucune réservation</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'Les réservations de vos clients apparaîtront ici' 
                : `Aucune réservation ${getStatusLabel(filter).toLowerCase()}`}
            </Text>
          </View>
        ) : (
          reservations.map((reservation) => {
            const profile = Array.isArray(reservation.client) ? reservation.client[0] : reservation.client;
            const packageData = Array.isArray(reservation.packages_types) ? reservation.packages_types[0] : reservation.packages_types;
            
            return (
              <View key={reservation.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{packageData?.titre || 'Service'}</Text>
                    <View style={styles.clientRow}>
                      <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.clientText}>{profile?.nom || 'Client'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.statut) }]}>
                    <Ionicons name={getStatusIcon(reservation.statut)} size={14} color="#FFFFFF" />
                    <Text style={styles.statusText}>{getStatusLabel(reservation.statut)}</Text>
                  </View>
                </View>

                {/* Détails */}
                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailText}>
                      {new Date(reservation.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>

                  {reservation.lieu && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.detailText} numberOfLines={2}>{reservation.lieu}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                    <Text style={[styles.detailText, styles.priceText]}>{reservation.montant_total}€</Text>
                  </View>

                  {reservation.notes_photographe && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Message du client:</Text>
                      <Text style={styles.notesText}>{reservation.notes_photographe}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handleContact(reservation)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Contacter</Text>
                  </TouchableOpacity>

                  {reservation.statut === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, actionLoading === reservation.id && styles.actionBtnDisabled]}
                        onPress={() => handleAccept(reservation.id)}
                        disabled={actionLoading === reservation.id}
                      >
                        {actionLoading === reservation.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.actionBtnPrimaryText}>Accepter</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtnDanger, actionLoading === reservation.id && styles.actionBtnDisabled]}
                        onPress={() => handleRefuse(reservation.id)}
                        disabled={actionLoading === reservation.id}
                      >
                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                        <Text style={styles.actionBtnDangerText}>Refuser</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {reservation.statut === 'confirmed' && (
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, actionLoading === reservation.id && styles.actionBtnDisabled]}
                      onPress={() => handleComplete(reservation.id)}
                      disabled={actionLoading === reservation.id}
                    >
                      {actionLoading === reservation.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnPrimaryText}>Terminer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filtersContainer: {
    maxHeight: 60,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
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
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  priceText: {
    fontWeight: '700',
    color: COLORS.success,
    fontSize: 16,
  },
  notesSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.background,
  },
  actionBtnDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
});

