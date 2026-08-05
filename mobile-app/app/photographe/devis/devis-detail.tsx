import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert, Modal
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  envoye: { label: 'Envoyé',  color: '#92400E', bg: '#FEF3C7' },
  lu:     { label: 'Lu',      color: '#92400E', bg: '#FEF3C7' },
  accepte:{ label: 'Accepté', color: '#065F46', bg: '#D1FAE5' },
  refuse: { label: 'Refusé',  color: '#991B1B', bg: '#FEE2E2' },
  expire: { label: 'Expiré',  color: '#4B5563', bg: '#F3F4F6' },
};

export default function DevisDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profileId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (id) fetchDevis();
  }, [id]);

  const fetchDevis = async () => {
    const prestataireId = profileId || user?.id;
    if (!prestataireId) return;

    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        client:profiles!devis_client_id_fkey(id, nom, email, avatar_url),
        demandes_client(id, titre, description, categorie, date_souhaitee, lieu, budget_max, statut)
      `)
      .eq('id', id)
      .eq('prestataire_id', prestataireId)
      .single();

    if (error) {
      Alert.alert('Erreur', 'Devis introuvable.');
      router.back();
      return;
    }

    const normalized = { ...data, statut: data.statut === 'envoye' ? 'lu' : data.statut };
    setDevis(normalized);

    if (normalized.statut === 'accepte') {
      const { data: resaData } = await supabase
        .from('reservations')
        .select('id, statut, client_id')
        .eq('devis_id', data.id)
        .in('statut', ['pending'])
        .maybeSingle();
      setPendingReservation(resaData || null);
    }

    setLoading(false);
  };

  const handleConfirmReservation = async () => {
    if (!pendingReservation) return;
    setConfirming(true);
    const { error } = await supabase
      .from('reservations')
      .update({ statut: 'confirmed', date_confirmation: new Date().toISOString() })
      .eq('id', pendingReservation.id);
    setConfirming(false);
    if (error) {
      Alert.alert('Erreur', 'Impossible de confirmer la réservation.');
    } else {
      router.push(`/photographe/reservations/reservation-detail?id=${pendingReservation.id}` as any);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from('devis')
      .update({ statut: 'refuse' })
      .eq('id', id);
    setCancelling(false);
    setShowCancelModal(false);
    if (error) {
      Alert.alert('Erreur', 'Impossible d\'annuler le devis.');
    } else {
      fetchDevis();
    }
  };

  const statusInfo = STATUS_CONFIG[devis?.statut] || { label: devis?.statut, color: '#374151', bg: '#F3F4F6' };
  const canCancel = ['lu', 'envoye'].includes(devis?.statut);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail du devis</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {/* Client */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client</Text>
          <Text style={styles.cardValue}>{devis?.client?.nom || '—'}</Text>
          <Text style={styles.cardSub}>{devis?.client?.email || ''}</Text>
        </View>

        {/* Demande liée */}
        {devis?.demandes_client && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Demande client</Text>
            <Text style={styles.cardValue}>{devis.demandes_client.titre || '—'}</Text>
            {devis.demandes_client.description && (
              <Text style={styles.cardSub}>{devis.demandes_client.description}</Text>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.textLight} />
              <Text style={styles.infoText}>
                {devis.demandes_client.date_souhaitee
                  ? new Date(devis.demandes_client.date_souhaitee).toLocaleDateString('fr-FR')
                  : '—'}
              </Text>
            </View>
            {devis.demandes_client.lieu && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={15} color={COLORS.textLight} />
                <Text style={styles.infoText}>{devis.demandes_client.lieu}</Text>
              </View>
            )}
            {devis.demandes_client.budget_max && (
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={15} color={COLORS.textLight} />
                <Text style={styles.infoText}>Budget max : {devis.demandes_client.budget_max} MAD</Text>
              </View>
            )}
          </View>
        )}

        {/* Montant & validité */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Devis</Text>
          {devis?.montant_total && (
            <Text style={[styles.cardValue, { color: COLORS.accent, fontSize: 22 }]}>
              {devis.montant_total} MAD
            </Text>
          )}
          {devis?.date_validite && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={15} color={COLORS.textLight} />
              <Text style={styles.infoText}>
                Valide jusqu'au {new Date(devis.date_validite).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          {devis?.message && (
            <Text style={[styles.cardSub, { marginTop: 8 }]}>{devis.message}</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {devis?.statut === 'accepte' && pendingReservation && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.success }]}
              onPress={handleConfirmReservation}
              disabled={confirming}
            >
              {confirming
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              }
              <Text style={styles.btnText}>Confirmer la réservation</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.error }]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Annuler le devis</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border }]}
            onPress={() => router.push('/shared/messages/messages-list' as any)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
            <Text style={[styles.btnText, { color: COLORS.text }]}>Contacter le client</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Annuler le devis ?</Text>
            <Text style={styles.modalSub}>Cette action est irréversible.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: COLORS.error }]}
                onPress={handleCancel}
                disabled={cancelling}
              >
                {cancelling
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnText}>Confirmer</Text>
                }
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
  cardSub: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  infoText: { fontSize: 14, color: COLORS.textLight },
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
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalBtnSecondary: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.backgroundLight },
  modalBtnSecondaryText: { color: COLORS.text, fontWeight: '600' },
  modalBtnPrimary: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
