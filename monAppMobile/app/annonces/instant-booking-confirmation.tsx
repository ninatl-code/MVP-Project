import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FooterParti from '../../components/FooterParti';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function InstantBookingConfirmationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const annonceId = params.annonceId as string;
  const providerId = params.providerId as string;
  const bookingDateTime = new Date(params.bookingDateTime as string);
  const isInstantBooking = params.isInstantBooking === 'true';

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [annonce, setAnnonce] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [instantSettings, setInstantSettings] = useState<any>(null);
  const [conflictCheck, setConflictCheck] = useState<boolean>(false);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      // Fetch annonce details
      const { data: annonceData, error: annonceError } = await supabase
        .from('annonces')
        .select('*, profiles(*)')
        .eq('id', annonceId)
        .single();

      if (annonceError) throw annonceError;
      setAnnonce(annonceData);
      setProvider(annonceData.profiles);

      // Fetch instant booking settings
      if (isInstantBooking) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('instant_booking_settings')
          .select('*')
          .eq('provider_id', providerId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        setInstantSettings(settingsData);
      }

      // Check for conflicts
      await checkConflicts();
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const bufferMinutes = instantSettings?.buffer_minutes || 0;
      const startDateTime = new Date(bookingDateTime);
      const endDateTime = new Date(bookingDateTime.getTime() + (60 * 60 * 1000)); // 1 hour duration
      const bufferStartDateTime = new Date(startDateTime.getTime() - (bufferMinutes * 60 * 1000));

      // Check for existing reservations
      const { data: existingReservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('annonce_id', annonceId)
        .in('statut', ['confirmee', 'en_attente'])
        .or(`and(date_debut.lte.${endDateTime.toISOString()},date_fin.gte.${bufferStartDateTime.toISOString()})`);

      if (error) throw error;

      if (existingReservations && existingReservations.length > 0) {
        setConflictCheck(true);
        Alert.alert(
          'Créneau indisponible',
          'Ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleConfirmBooking = async () => {
    if (conflictCheck) {
      Alert.alert('Erreur', 'Ce créneau n\'est plus disponible');
      return;
    }

    setConfirming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour réserver');
        router.replace('/login');
        return;
      }

      // Double-check conflicts before inserting
      await checkConflicts();
      if (conflictCheck) {
        setConfirming(false);
        return;
      }

      // Calculate end time (1 hour duration as default)
      const endDateTime = new Date(bookingDateTime.getTime() + (60 * 60 * 1000));

      // Create reservation
      const reservationData = {
        client_id: user.id,
        prestataire_id: providerId,
        annonce_id: annonceId,
        date_debut: bookingDateTime.toISOString(),
        date_fin: endDateTime.toISOString(),
        statut: isInstantBooking ? 'confirmee' : 'en_attente',
        montant: annonce?.prix || 0,
        lieu: annonce?.lieu || '',
        description: `Réservation ${isInstantBooking ? 'instantanée' : ''} - ${annonce?.titre}`,
      };

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (reservationError) throw reservationError;

      // Send notification to provider (if not instant booking)
      if (!isInstantBooking) {
        await supabase.from('notifications').insert({
          user_id: providerId,
          type: 'nouvelle_reservation',
          titre: 'Nouvelle demande de réservation',
          message: `${user.email} souhaite réserver votre service`,
          lien: `/prestataires/reservations/${reservation.id}`,
        });
      } else {
        // Send confirmation notification to client
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'reservation_confirmee',
          titre: 'Réservation confirmée',
          message: `Votre réservation avec ${provider?.prenom} est confirmée`,
          lien: `/particuliers/reservations/${reservation.id}`,
        });

        // Send notification to provider
        await supabase.from('notifications').insert({
          user_id: providerId,
          type: 'reservation_confirmee',
          titre: 'Nouvelle réservation instantanée',
          message: `${user.email} a réservé votre service`,
          lien: `/prestataires/reservations/${reservation.id}`,
        });
      }

      Alert.alert(
        'Réservation réussie',
        isInstantBooking
          ? 'Votre réservation est confirmée ! Le prestataire a été notifié.'
          : 'Votre demande a été envoyée. Le prestataire vous répondra sous 24h.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/particuliers/reservations'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      
      if (error.code === '23505') {
        Alert.alert('Erreur', 'Une réservation existe déjà pour ce créneau');
      } else {
        Alert.alert('Erreur', 'Impossible de créer la réservation. Veuillez réessayer.');
      }
    } finally {
      setConfirming(false);
    }
  };

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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmation</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Instant Booking Badge */}
          {isInstantBooking && (
            <View style={styles.instantBanner}>
              <Ionicons name="flash" size={32} color={COLORS.success} />
              <View style={styles.instantBannerText}>
                <Text style={styles.instantBannerTitle}>Réservation instantanée</Text>
                <Text style={styles.instantBannerDescription}>
                  Confirmation automatique - Pas d'attente
                </Text>
              </View>
            </View>
          )}

          {/* Booking Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Détails de la réservation</Text>

            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Prestataire</Text>
                <Text style={styles.detailValue}>
                  {provider?.prenom} {provider?.nom}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{annonce?.titre}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {bookingDateTime.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Heure</Text>
                <Text style={styles.detailValue}>
                  {bookingDateTime.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Lieu</Text>
                <Text style={styles.detailValue}>{annonce?.lieu || 'À définir'}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, styles.priceRow]}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Prix</Text>
                <Text style={styles.priceValue}>{annonce?.prix}€</Text>
              </View>
            </View>
          </View>

          {/* Instant Booking Benefits */}
          {isInstantBooking && instantSettings && (
            <View style={styles.benefitsCard}>
              <Text style={styles.cardTitle}>✨ Avantages de la réservation instantanée</Text>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Confirmation immédiate</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Pas de temps d'attente</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>
                  Temps tampon de {instantSettings.buffer_minutes} minutes inclus
                </Text>
              </View>
            </View>
          )}

          {/* Important Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.warning} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Important</Text>
              <Text style={styles.infoText}>
                {isInstantBooking
                  ? 'En confirmant, vous acceptez de payer le montant total. Le prestataire sera immédiatement notifié.'
                  : 'Votre demande sera envoyée au prestataire. Vous recevrez une réponse dans les 24 heures.'}
              </Text>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              En confirmant cette réservation, vous acceptez les{' '}
              <Text style={styles.termsLink}>conditions générales</Text> et la{' '}
              <Text style={styles.termsLink}>politique d'annulation</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.confirmButtonText}>
                {isInstantBooking ? 'Confirmer et payer' : 'Envoyer la demande'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 180 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  instantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  instantBannerText: { flex: 1 },
  instantBannerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  instantBannerDescription: { fontSize: 14, color: COLORS.textLight },

  detailsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 8,
    backgroundColor: COLORS.backgroundLight,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: 8,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  priceValue: { fontSize: 24, fontWeight: '700', color: COLORS.primary },

  benefitsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  benefitText: { fontSize: 14, color: COLORS.text, flex: 1 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },

  termsSection: {
    paddingVertical: 12,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  footer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
