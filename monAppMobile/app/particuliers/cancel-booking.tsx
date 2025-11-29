import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

interface Booking {
  id: string;
  annonce_id: string;
  client_id: string;
  date_reservation: string;
  heure_debut: string;
  duree: number;
  prix_total: number;
  statut: string;
  annonces: {
    titre: string;
    prestataire_id: string;
    prestataires: {
      nom: string;
      prenom: string;
    };
  };
}

interface CancellationPolicy {
  id: string;
  name: string;
  refund_rules: Array<{
    hours_before: number;
    refund_percentage: number;
  }>;
}

export default function CancelBookingScreen() {
  const params = useLocalSearchParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundPercentage, setRefundPercentage] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const cancellationReasons = [
    { id: 'schedule_conflict', label: 'Schedule Conflict', icon: 'calendar-outline' },
    { id: 'emergency', label: 'Emergency', icon: 'warning-outline' },
    { id: 'found_alternative', label: 'Found Alternative', icon: 'search-outline' },
    { id: 'weather', label: 'Weather Issues', icon: 'rainy-outline' },
    { id: 'price', label: 'Price Concerns', icon: 'cash-outline' },
    { id: 'other', label: 'Other Reason', icon: 'ellipsis-horizontal-outline' },
  ];

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);

      // Load booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('reservations')
        .select(`
          *,
          annonces (
            titre,
            prestataire_id,
            prestataires (nom, prenom)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);

      // Load cancellation policy
      const { data: policyData, error: policyError } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('provider_id', bookingData.annonces.prestataire_id)
        .eq('is_default', true)
        .single();

      if (policyError && policyError.code !== 'PGRST116') {
        throw policyError;
      }

      setPolicy(policyData);

      // Calculate refund
      if (policyData) {
        const calculated = calculateRefund(
          bookingData.date_reservation,
          bookingData.heure_debut,
          bookingData.prix_total,
          policyData.refund_rules
        );
        setRefundAmount(calculated.amount);
        setRefundPercentage(calculated.percentage);
      } else {
        // No policy, full refund
        setRefundAmount(bookingData.prix_total);
        setRefundPercentage(100);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const calculateRefund = (
    reservationDate: string,
    startTime: string,
    totalPrice: number,
    refundRules: Array<{ hours_before: number; refund_percentage: number }>
  ) => {
    const bookingDateTime = new Date(`${reservationDate}T${startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Sort rules by hours_before descending
    const sortedRules = [...refundRules].sort((a, b) => b.hours_before - a.hours_before);

    // Find applicable rule
    let refundPercentage = 0;
    for (const rule of sortedRules) {
      if (hoursUntilBooking >= rule.hours_before) {
        refundPercentage = rule.refund_percentage;
        break;
      }
    }

    const refundAmount = (totalPrice * refundPercentage) / 100;
    return { amount: refundAmount, percentage: refundPercentage };
  };

  const submitCancellation = async () => {
    if (!selectedReason) {
      Alert.alert('Missing Information', 'Please select a reason for cancellation');
      return;
    }

    if (!booking) return;

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel this booking?\n\nYou will receive a refund of $${refundAmount.toFixed(2)} (${refundPercentage}%)`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);

              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('Not authenticated');

              // Create cancellation request
              const { error: requestError } = await supabase
                .from('cancellation_requests')
                .insert({
                  booking_id: bookingId,
                  requested_by: user.id,
                  reason: selectedReason,
                  refund_amount: refundAmount,
                  status: 'pending',
                });

              if (requestError) throw requestError;

              // Update booking status
              const { error: updateError } = await supabase
                .from('reservations')
                .update({ statut: 'cancelled' })
                .eq('id', bookingId);

              if (updateError) throw updateError;

              Alert.alert(
                'Cancellation Requested',
                `Your cancellation has been submitted. You will receive $${refundAmount.toFixed(2)} as a refund.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancel Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={32} color={COLORS.warning} />
          <Text style={styles.warningTitle}>Cancellation Policy</Text>
          <Text style={styles.warningText}>
            {policy
              ? `You will receive a ${refundPercentage}% refund according to the provider's cancellation policy.`
              : 'You will receive a full refund for this cancellation.'}
          </Text>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingTitle}>{booking.annonces.titre}</Text>
              <Text style={styles.bookingProvider}>
                with {booking.annonces.prestataires.prenom} {booking.annonces.prestataires.nom}
              </Text>
            </View>
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>
                  {formatDate(booking.date_reservation, booking.heure_debut)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>
                  {formatTime(booking.heure_debut)} • {booking.duree}h
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>${booking.prix_total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Refund Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refund Summary</Text>
          <View style={styles.refundCard}>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Original Amount</Text>
              <Text style={styles.refundValue}>${booking.prix_total.toFixed(2)}</Text>
            </View>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Refund Percentage</Text>
              <Text style={[styles.refundValue, { color: COLORS.success }]}>
                {refundPercentage}%
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.refundRow}>
              <Text style={styles.refundTotalLabel}>You will receive</Text>
              <Text style={styles.refundTotalValue}>${refundAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Cancellation Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Cancellation</Text>
          <View style={styles.reasonsGrid}>
            {cancellationReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.reasonButtonSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Ionicons
                  name={reason.icon as any}
                  size={24}
                  color={selectedReason === reason.id ? COLORS.surface : COLORS.primary}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.reasonTextSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Policy Details */}
        {policy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Policy Details</Text>
            <View style={styles.policyCard}>
              <Text style={styles.policyName}>{policy.name}</Text>
              {policy.refund_rules.map((rule, index) => (
                <View key={index} style={styles.policyRule}>
                  <View style={styles.policyRuleDot} />
                  <Text style={styles.policyRuleText}>
                    {rule.refund_percentage}% refund if cancelled {rule.hours_before}+ hours before
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submitCancellation}
          disabled={submitting || !selectedReason}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={24} color={COLORS.surface} />
              <Text style={styles.submitButtonText}>Cancel Booking</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  warningCard: {
    backgroundColor: `${COLORS.warning}15`,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingHeader: {
    marginBottom: 16,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  bookingProvider: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bookingDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 12,
  },
  refundCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refundLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  refundValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  refundTotalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  refundTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reasonButton: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  reasonButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  reasonTextSelected: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  policyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  policyRule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  policyRuleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },
  policyRuleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: 8,
  },
});
