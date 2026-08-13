import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',  color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmé',    color: '#065F46', bg: '#D1FAE5' },
  completed: { label: 'Terminé',     color: '#374151', bg: '#F3F4F6' },
  cancelled: { label: 'Annulé',      color: '#991B1B', bg: '#FEE2E2' },
  TBC:       { label: 'À confirmer', color: '#5B21B6', bg: '#EDE9FE' },
  paid:      { label: 'Payé',        color: '#065F46', bg: '#D1FAE5' },
};

export default function ReservationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) fetchReservation();
  }, [id]);

  const fetchReservation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/auth/login'); return; }

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        prestataire:profiles!reservations_prestataire_id_fkey(id, nom, email, telephone, avatar_url),
        annonce:prestations_photographe!reservations_annonce_id_fkey(titre, conditions_annulation)
      `)
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Erreur', 'Impossible de charger la réservation.');
      router.back();
      return;
    }
    setReservation(data);
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer un motif d\'annulation.');
      return;
    }
    setCancelling(true);
    const { error } = await supabase
      .from('reservations')
      .update({ statut: 'cancelled', motif_annulation: cancelReason })
      .eq('id', id);

    setCancelling(false);
    setShowCancelModal(false);
    if (error) {
      Alert.alert('Erreur', 'Impossible d\'annuler la réservation.');
    } else {
      Alert.alert('Succès', 'Réservation annulée.');
      fetchReservation();
    }
  };

  const statusInfo = STATUS_MAP[reservation?.statut] || { label: reservation?.statut, color: '#374151', bg: '#F3F4F6' };
  const canCancel = ['pending', 'confirmed', 'TBC'].includes(reservation?.statut);
  const canReview = reservation?.statut === 'completed';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail réservation</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {/* Service */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prestation</Text>
          <Text style={styles.cardValue}>{reservation?.annonce?.titre || reservation?.prestation || '—'}</Text>
        </View>

        {/* Prestataire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prestataire</Text>
          <Text style={styles.cardValue}>{reservation?.prestataire?.nom || '—'}</Text>
          {reservation?.prestataire?.telephone && (
            <View style={styles.row}>
              <Ionicons name="call-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.rowText}>{reservation.prestataire.telephone}</Text>
            </View>
          )}
          {reservation?.prestataire?.email && (
            <View style={styles.row}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.rowText}>{reservation.prestataire.email}</Text>
            </View>
          )}
        </View>

        {/* Date & Lieu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {reservation?.date && (
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.rowText}>
                {new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          )}
          {reservation?.heure && (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.rowText}>{reservation.heure}</Text>
            </View>
          )}
          {reservation?.lieu && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.rowText}>{reservation.lieu}</Text>
            </View>
          )}
        </View>

        {/* Montant */}
        {reservation?.montant && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Montant</Text>
            <Text style={[styles.cardValue, { color: COLORS.accent, fontSize: 22 }]}>
              {reservation.montant} MAD
            </Text>
          </View>
        )}

        {/* Conditions annulation */}
        {reservation?.annonce?.conditions_annulation && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conditions d'annulation</Text>
            <Text style={styles.cardValue}>{reservation.annonce.conditions_annulation}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canReview && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.primary }]}
              onPress={() => router.push(`/shared/avis/submit-review?reservation_id=${id}&prestataire_id=${reservation?.prestataire?.id}` as any)}
            >
              <Ionicons name="star-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Laisser un avis</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.error }]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Annuler</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border }]}
            onPress={() => router.push(`/shared/messages/messages-list` as any)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
            <Text style={[styles.btnText, { color: COLORS.text }]}>Messagerie</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal annulation */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Annuler la réservation</Text>
            <Text style={styles.modalSub}>Veuillez indiquer le motif d'annulation.</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Motif d'annulation..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: COLORS.error }]}
                onPress={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  statusBadge: {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  rowText: { fontSize: 14, color: COLORS.textLight },
  actions: { marginTop: 8, gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  modalSub: { fontSize: 14, color: COLORS.textLight, marginBottom: 16 },
  textarea: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    fontSize: 14, color: COLORS.text, minHeight: 100, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalBtnSecondary: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.backgroundLight },
  modalBtnSecondaryText: { color: COLORS.text, fontWeight: '600' },
  modalBtnPrimary: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
