import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert, RefreshControl, TextInput, Modal } from 'react-native';
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

interface Devis {
  id: string;
  annonce_id: string;
  annonce_titre: string;
  prestataire_id: string;
  prestataire_nom: string;
  status: 'pending' | 'received' | 'accepted' | 'rejected' | 'expired';
  montant?: number;
  message_client: string;
  reponse_prestataire?: string;
  created_at: string;
  updated_at: string;
  valide_jusqu_a?: string;
}

export default function DevisParticulier() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'received' | 'accepted' | 'rejected'>('all');
  const [showNewDevisModal, setShowNewDevisModal] = useState(false);
  const [newDevisMessage, setNewDevisMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDevis();
  }, []);

  const fetchDevis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('devis')
      .select(`
        id,
        annonce_id,
        prestataire_id,
        status,
        montant,
        comment_client,
        comment_presta,
        date_confirmation,
        date_refus,
        created_at,
        titre,
        annonces (titre),
        profiles!devis_prestataire_id_fkey (nom)
      `)
      .eq('particulier_id', user.id)
      .order('created_at', { ascending: false });

    console.log('📄 Devis fetched:', data?.length || 0, error);

    if (!error && data) {
      const formattedData = data.map((d: any) => ({
        id: d.id,
        annonce_id: d.annonce_id,
        annonce_titre: d.titre || (Array.isArray(d.annonces) ? d.annonces[0]?.titre : d.annonces?.titre) || 'Annonce',
        prestataire_id: d.prestataire_id,
        prestataire_nom: Array.isArray(d.profiles) ? d.profiles[0]?.nom : d.profiles?.nom || 'Prestataire',
        status: d.status,
        montant: d.montant,
        message_client: d.comment_client || '',
        reponse_prestataire: d.comment_presta || '',
        created_at: d.created_at,
        updated_at: d.date_confirmation || d.date_refus || d.created_at,
        valide_jusqu_a: null
      }));
      setDevis(formattedData);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDevis();
  };

  const handleAcceptDevis = (devis: Devis) => {
    Alert.alert(
      'Accepter le devis',
      `Voulez-vous accepter ce devis de ${formatCurrency(devis.montant || 0)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            const { error } = await supabase
              .from('devis')
              .update({ status: 'accepted' })
              .eq('id', devis.id);

            if (error) {
              Alert.alert('Erreur', 'Impossible d\'accepter le devis');
            } else {
              Alert.alert('Succès', 'Devis accepté ! Le prestataire sera notifié.');
              fetchDevis();
            }
          }
        }
      ]
    );
  };

  const handleRejectDevis = (devis: Devis) => {
    Alert.alert(
      'Refuser le devis',
      'Voulez-vous refuser ce devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('devis')
              .update({ status: 'rejected' })
              .eq('id', devis.id);

            if (error) {
              Alert.alert('Erreur', 'Impossible de refuser le devis');
            } else {
              Alert.alert('Devis refusé');
              fetchDevis();
            }
          }
        }
      ]
    );
  };

  const handleContactPrestataire = (devis: Devis) => {
    router.push('/particuliers/messages');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: COLORS.warning, icon: 'time-outline' };
      case 'received':
        return { label: 'Reçu', color: COLORS.info, icon: 'mail-outline' };
      case 'accepted':
        return { label: 'Accepté', color: COLORS.success, icon: 'checkmark-circle-outline' };
      case 'rejected':
        return { label: 'Refusé', color: COLORS.error, icon: 'close-circle-outline' };
      case 'expired':
        return { label: 'Expiré', color: COLORS.textLight, icon: 'alert-circle-outline' };
      default:
        return { label: status, color: COLORS.textLight, icon: 'help-circle-outline' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const filteredDevis = filter === 'all' 
    ? devis 
    : devis.filter(d => d.status === filter);

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
          <View style={styles.headerContent}>
            <Ionicons name="document-text" size={32} color="white" />
            <Text style={styles.headerTitle}>Mes devis</Text>
          </View>
          <Text style={styles.headerSubtitle}>{filteredDevis.length} demande{filteredDevis.length > 1 ? 's' : ''}</Text>
        </LinearGradient>

        {/* Filtres */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                Tous ({devis.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
                En attente ({devis.filter(d => d.status === 'pending').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'received' && styles.filterChipActive]}
              onPress={() => setFilter('received')}
            >
              <Text style={[styles.filterChipText, filter === 'received' && styles.filterChipTextActive]}>
                Reçus ({devis.filter(d => d.status === 'received').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'accepted' && styles.filterChipActive]}
              onPress={() => setFilter('accepted')}
            >
              <Text style={[styles.filterChipText, filter === 'accepted' && styles.filterChipTextActive]}>
                Acceptés ({devis.filter(d => d.status === 'accepted').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'rejected' && styles.filterChipActive]}
              onPress={() => setFilter('rejected')}
            >
              <Text style={[styles.filterChipText, filter === 'rejected' && styles.filterChipTextActive]}>
                Refusés ({devis.filter(d => d.status === 'rejected').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Liste des devis */}
        {filteredDevis.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Aucun devis</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'Vous n\'avez pas encore demandé de devis'
                : `Aucun devis ${getStatusInfo(filter).label.toLowerCase()}`}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/particuliers/search')}
            >
              <Text style={styles.emptyStateButtonText}>Explorer les annonces</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.devisList}>
            {filteredDevis.map((devis) => {
              const statusInfo = getStatusInfo(devis.status);
              return (
                <View key={devis.id} style={styles.devisCard}>
                  {/* Status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color="white" />
                    <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                  </View>

                  {/* Titre */}
                  <Text style={styles.devisTitle}>{devis.annonce_titre}</Text>

                  {/* Prestataire */}
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>{devis.prestataire_nom}</Text>
                  </View>

                  {/* Date demande */}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.textLight} />
                    <Text style={styles.infoTextLight}>Demandé le {formatDate(devis.created_at)}</Text>
                  </View>

                  {/* Message client */}
                  <View style={styles.messageSection}>
                    <Text style={styles.messageLabel}>Votre demande</Text>
                    <Text style={styles.messageText}>{devis.message_client}</Text>
                  </View>

                  {/* Réponse prestataire si reçu */}
                  {devis.status === 'received' && devis.reponse_prestataire && (
                    <View style={styles.reponseSection}>
                      <Text style={styles.reponseLabel}>Réponse du prestataire</Text>
                      <Text style={styles.reponseText}>{devis.reponse_prestataire}</Text>
                      
                      {devis.montant && (
                        <View style={styles.montantContainer}>
                          <Text style={styles.montantLabel}>Montant proposé</Text>
                          <Text style={styles.montantValue}>{formatCurrency(devis.montant)}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Montant si accepté */}
                  {(devis.status === 'accepted' || devis.status === 'rejected') && devis.montant && (
                    <View style={styles.montantContainer}>
                      <Text style={styles.montantLabel}>Montant</Text>
                      <Text style={styles.montantValue}>{formatCurrency(devis.montant)}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.actionButtonSecondary}
                      onPress={() => handleContactPrestataire(devis)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.actionButtonSecondaryText}>Contacter</Text>
                    </TouchableOpacity>

                    {devis.status === 'received' && (
                      <>
                        <TouchableOpacity 
                          style={styles.actionButtonSuccess}
                          onPress={() => handleAcceptDevis(devis)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                          <Text style={styles.actionButtonSuccessText}>Accepter</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.actionButtonDanger}
                          onPress={() => handleRejectDevis(devis)}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </>
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
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
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

  // Devis
  devisList: { paddingHorizontal: 16, gap: 16 },
  devisCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, marginBottom: 12 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  devisTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 15, color: COLORS.text, flex: 1 },
  infoTextLight: { fontSize: 14, color: COLORS.textLight, flex: 1 },

  messageSection: { marginTop: 12, padding: 12, backgroundColor: COLORS.backgroundLight, borderRadius: 8 },
  messageLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  messageText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  reponseSection: { marginTop: 12, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COLORS.success },
  reponseLabel: { fontSize: 12, fontWeight: '600', color: COLORS.success, marginBottom: 6 },
  reponseText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 12 },

  montantContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  montantLabel: { fontSize: 14, color: COLORS.textLight },
  montantValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  actionButtonSecondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  actionButtonSuccess: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.success },
  actionButtonSuccessText: { color: 'white', fontSize: 14, fontWeight: '600' },
  actionButtonDanger: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error, justifyContent: 'center', alignItems: 'center' }
});
