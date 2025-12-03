import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '../../components/FooterPresta';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface ReservationDetail {
  id: string;
  num_reservation: string;
  date: string;
  heure: string;
  status: string;
  montant: number;
  montant_acompte: number;
  commentaire: string;
  created_at: string;
  annonces: {
    id: string;
    titre: string;
    description: string;
  };
  particulier: {
    id: string;
    nom: string;
    email: string;
    telephone: string;
  };
}

export default function ReservationDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);

  useEffect(() => {
    if (id) {
      fetchReservationDetail();
    }
  }, [id]);

  const fetchReservationDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          num_reservation,
          date,
          heure,
          status,
          montant,
          montant_acompte,
          commentaire,
          created_at,
          annonces(id, titre, description),
          profiles!reservations_particulier_id_fkey(id, nom, email, telephone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setReservation({
        ...data,
        particulier: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
        annonces: Array.isArray(data.annonces) ? data.annonces[0] : data.annonces
      });
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'acompte_paye':
        return { label: 'Confirmée', color: COLORS.success, icon: 'checkmark-circle' };
      case 'pending':
      case 'en_attente':
        return { label: 'En attente', color: COLORS.warning, icon: 'time' };
      case 'cancelled':
      case 'annulee':
        return { label: 'Annulée', color: COLORS.error, icon: 'close-circle' };
      case 'completed':
      case 'termine':
        return { label: 'Terminée', color: '#6B7280', icon: 'checkmark-done-circle' };
      default:
        return { label: status || 'Inconnu', color: COLORS.textLight, icon: 'help-circle' };
    }
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleMessage = (clientId: string) => {
    router.push(`/prestataires/messages?userId=${clientId}` as any);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    Alert.alert(
      'Confirmer',
      `Voulez-vous vraiment changer le statut en "${getStatusInfo(newStatus).label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('reservations')
                .update({ status: newStatus })
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Succès', 'Statut mis à jour');
              fetchReservationDetail();
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Réservation introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(reservation.status);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      {/* Header avec gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails de la réservation</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.reservationNumberContainer}>
            <Text style={styles.reservationNumberLabel}>N° RÉSERVATION</Text>
            <Text style={styles.reservationNumber}>
              {reservation.num_reservation || reservation.id.substring(0, 8).toUpperCase()}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Informations du service */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Service</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.serviceTitle}>{reservation.annonces?.titre}</Text>
            {reservation.annonces?.description && (
              <Text style={styles.serviceDescription}>{reservation.annonces.description}</Text>
            )}
          </View>
        </View>

        {/* Date et heure */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Date et heure</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {new Date(reservation.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </View>
            {reservation.heure && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.infoLabel}>Heure</Text>
                <Text style={styles.infoValue}>{reservation.heure}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Client</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.clientName}>{reservation.particulier?.nom}</Text>
            
            <View style={styles.contactButtons}>
              {reservation.particulier?.telephone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCall(reservation.particulier.telephone)}
                >
                  <Ionicons name="call" size={20} color={COLORS.primary} />
                  <Text style={styles.contactButtonText}>Appeler</Text>
                </TouchableOpacity>
              )}
              
              {reservation.particulier?.email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleEmail(reservation.particulier.email)}
                >
                  <Ionicons name="mail" size={20} color={COLORS.primary} />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleMessage(reservation.particulier.id)}
              >
                <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                <Text style={styles.contactButtonText}>Message</Text>
              </TouchableOpacity>
            </View>

            {reservation.particulier?.email && (
              <Text style={styles.contactInfo}>📧 {reservation.particulier.email}</Text>
            )}
            {reservation.particulier?.telephone && (
              <Text style={styles.contactInfo}>📱 {reservation.particulier.telephone}</Text>
            )}
          </View>
        </View>

        {/* Montant */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Paiement</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Montant total</Text>
              <Text style={styles.priceValue}>{reservation.montant?.toFixed(2) || '0.00'} €</Text>
            </View>
            {reservation.montant_acompte > 0 && (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Acompte versé</Text>
                  <Text style={styles.priceValueSuccess}>
                    {reservation.montant_acompte?.toFixed(2)} €
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Reste à payer</Text>
                  <Text style={styles.priceValue}>
                    {(reservation.montant - reservation.montant_acompte).toFixed(2)} €
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Commentaire */}
        {reservation.commentaire && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbox" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Commentaire</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.commentText}>{reservation.commentaire}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Actions</Text>
          </View>
          <View style={styles.actionsCard}>
            {reservation.status !== 'confirmed' && reservation.status !== 'acompte_paye' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                onPress={() => handleUpdateStatus('confirmed')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Confirmer</Text>
              </TouchableOpacity>
            )}
            
            {reservation.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Marquer terminée</Text>
              </TouchableOpacity>
            )}
            
            {reservation.status !== 'cancelled' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.error }]}
                onPress={() => handleUpdateStatus('cancelled')}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Informations complémentaires */}
        <View style={styles.section}>
          <Text style={styles.metaText}>
            Créée le {new Date(reservation.created_at).toLocaleDateString('fr-FR')} à{' '}
            {new Date(reservation.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reservationNumberContainer: {
    flex: 1
  },
  reservationNumberLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4
  },
  reservationNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 2
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8EAF6',
    paddingVertical: 12,
    borderRadius: 8
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary
  },
  contactInfo: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textLight
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  priceValueSuccess: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20
  },
  actionsCard: {
    gap: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24
  }
});
