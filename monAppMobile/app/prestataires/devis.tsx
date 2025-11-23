import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, SafeAreaView, TextInput, Modal } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '../../components/FooterPresta';

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

interface Devis {
  id: string;
  status: string;
  created_at: string;
  date: string;
  montant?: number;
  comment_client: string;
  comment_presta?: string;
  particulier_id: string;
  annonce_id: string;
  client?: { nom: string; email: string; telephone: string };
  annonces?: { titre: string };
}

export default function DevisPrestataire() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [filter, setFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [responseForm, setResponseForm] = useState({ montant: '', message: '', valideDays: '7' });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDevis();
  }, [filter]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.replace('/login');
        return;
      }

      console.log('Fetching devis for user:', user.id);

      let query = supabase
        .from('devis')
        .select(`
          id,
          status,
          created_at,
          montant,
          comment_client,
          comment_presta,
          date,
          particulier_id,
          annonce_id,
          client:profiles!particulier_id(nom, email, telephone),
          annonces(titre)
        `)
        .eq('prestataire_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching devis:', error);
      } else {
        console.log('Devis fetched:', data?.length || 0);
        setDevisList(data || []);
      }
    } catch (err) {
      console.error('Exception in fetchDevis:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevis();
    setRefreshing(false);
  };

  const openResponseModal = (devis: Devis) => {
    setSelectedDevis(devis);
    setResponseForm({ montant: '', message: '', valideDays: '7' });
    setModalVisible(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedDevis || !responseForm.montant) {
      Alert.alert('Erreur', 'Veuillez renseigner le montant');
      return;
    }

    setSubmitting(true);
    
    const montant = parseFloat(responseForm.montant);
    if (isNaN(montant) || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      setSubmitting(false);
      return;
    }

    const valideDays = parseInt(responseForm.valideDays) || 7;
    const valideJusquA = new Date();
    valideJusquA.setDate(valideJusquA.getDate() + valideDays);

    const { error } = await supabase
      .from('devis')
      .update({
        status: 'received',
        montant,
        reponse_prestataire: responseForm.message,
        valide_jusqu_a: valideJusquA.toISOString()
      })
      .eq('id', selectedDevis.id);

    setSubmitting(false);

    if (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la réponse');
    } else {
      Alert.alert('Succès', 'Votre devis a été envoyé au client');
      setModalVisible(false);
      fetchDevis();
    }
  };

  const handleReject = async (devisId: string) => {
    Alert.alert(
      'Refuser le devis',
      'Êtes-vous sûr de vouloir refuser cette demande de devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('devis')
              .update({ status: 'rejected' })
              .eq('id', devisId);

            if (error) {
              Alert.alert('Erreur', 'Impossible de refuser le devis');
            } else {
              Alert.alert('Refusé', 'Le devis a été refusé');
              fetchDevis();
            }
          }
        }
      ]
    );
  };

  const handleContact = (devis: Devis) => {
    const profile = Array.isArray(devis.client) ? devis.client[0] : devis.client;
    if (!profile) return;

    Alert.alert(
      'Contacter le client',
      `${profile.nom}\n\nEmail: ${profile.email}\nTél: ${profile.telephone}`,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Envoyer un message', onPress: () => router.push('/prestataires/messages') }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'received': return COLORS.info;
      case 'accepted': return COLORS.success;
      case 'rejected': return COLORS.error;
      case 'expired': return COLORS.textLight;
      default: return COLORS.border;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'received': return 'Envoyé';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'received': return 'send-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'expired': return 'hourglass-outline';
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
          <Text style={styles.headerTitle}>Devis</Text>
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
          { key: 'all', label: 'Tous' },
          { key: 'pending', label: 'En attente' },
          { key: 'received', label: 'Envoyés' },
          { key: 'accepted', label: 'Acceptés' },
          { key: 'rejected', label: 'Refusés' }
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
        {devisList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucun devis</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Les demandes de devis apparaîtront ici'
                : `Aucun devis ${getStatusLabel(filter).toLowerCase()}`}
            </Text>
          </View>
        ) : (
          devisList.map((devis) => {
            const profile = Array.isArray(devis.client) ? devis.client[0] : devis.client;
            const annonce = Array.isArray(devis.annonces) ? devis.annonces[0] : devis.annonces;

            return (
              <View key={devis.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{annonce?.titre || 'Service'}</Text>
                    <View style={styles.clientRow}>
                      <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.clientText}>{profile?.nom || 'Client'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(devis.status) }]}>
                    <Ionicons name={getStatusIcon(devis.status)} size={14} color="#FFFFFF" />
                    <Text style={styles.statusText}>{getStatusLabel(devis.status)}</Text>
                  </View>
                </View>

                {/* Détails */}
                <View style={styles.cardBody}>
                  <View style={styles.messageSection}>
                    <Text style={styles.messageLabel}>Demande du client:</Text>
                    <Text style={styles.messageText}>{devis.message_client}</Text>
                  </View>

                  {devis.reponse_prestataire && (
                    <View style={styles.responseSection}>
                      <Text style={styles.responseLabel}>Votre réponse:</Text>
                      <Text style={styles.responseText}>{devis.reponse_prestataire}</Text>
                    </View>
                  )}

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.textLight} />
                      <Text style={styles.detailText}>
                        {new Date(devis.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>

                    {devis.montant && (
                      <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                        <Text style={[styles.detailText, styles.priceText]}>{devis.montant}€</Text>
                      </View>
                    )}
                  </View>

                  {devis.valide_jusqu_a && (
                    <View style={styles.validityBanner}>
                      <Ionicons name="time-outline" size={16} color={COLORS.info} />
                      <Text style={styles.validityText}>
                        Valide jusqu'au {new Date(devis.valide_jusqu_a).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handleContact(devis)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Contacter</Text>
                  </TouchableOpacity>

                  {devis.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => openResponseModal(devis)}
                      >
                        <Ionicons name="send" size={18} color="#FFFFFF" />
                        <Text style={styles.actionBtnPrimaryText}>Répondre</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtnDanger}
                        onPress={() => handleReject(devis.id)}
                      >
                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                        <Text style={styles.actionBtnDangerText}>Refuser</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de réponse */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Répondre au devis</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDevis && (
                <>
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Service</Text>
                    <Text style={styles.modalInfoValue}>
                      {Array.isArray(selectedDevis.annonces) 
                        ? selectedDevis.annonces[0]?.titre 
                        : selectedDevis.annonces?.titre || 'Service'}
                    </Text>
                  </View>

                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalInfoLabel}>Demande du client</Text>
                    <Text style={styles.modalInfoValue}>{selectedDevis.message_client}</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Montant du devis * (€)</Text>
                    <TextInput
                      style={styles.input}
                      value={responseForm.montant}
                      onChangeText={(text) => setResponseForm({ ...responseForm, montant: text })}
                      placeholder="Ex: 150"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Validité (jours)</Text>
                    <TextInput
                      style={styles.input}
                      value={responseForm.valideDays}
                      onChangeText={(text) => setResponseForm({ ...responseForm, valideDays: text })}
                      placeholder="7"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.inputHint}>Le devis sera valide pendant ce nombre de jours</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Message (optionnel)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={responseForm.message}
                      onChangeText={(text) => setResponseForm({ ...responseForm, message: text })}
                      placeholder="Détails sur votre offre..."
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, submitting && styles.modalBtnDisabled]}
                onPress={handleSubmitResponse}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    gap: 12,
    marginBottom: 16,
  },
  messageSection: {
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  responseSection: {
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
  },
  priceText: {
    fontWeight: '700',
    color: COLORS.success,
    fontSize: 16,
  },
  validityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.info + '15',
    borderRadius: 8,
  },
  validityText: {
    fontSize: 13,
    color: COLORS.info,
    fontWeight: '600',
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
    backgroundColor: COLORS.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  modalInfoCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
});

