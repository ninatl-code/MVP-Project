import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'expo-router';

interface Remboursement {
  id: string;
  montant_original: number;
  montant_rembourse: number;
  pourcentage_remboursement: number;
  statut_remboursement: string;
  condition_annulation: string;
  date_remboursement: string;
  date_traitement_admin?: string;
  motif_annulation?: string;
  notes_admin?: string;
  stripe_refund_id?: string;
  reservations?: any;
}

export default function MesRemboursements() {
  const [remboursements, setRemboursements] = useState<Remboursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemboursement, setSelectedRemboursement] = useState<Remboursement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      fetchRemboursements(user.id);
    };
    
    checkAuthAndFetch();
  }, []);

  const fetchRemboursements = async (userId: string) => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('remboursements')
      .select(`
        *,
        reservations!remboursements_reservation_id_fkey(
          date,
          annonces!reservations_annonce_id_fkey(titre, prestataire),
          profiles!reservations_prestataire_id_fkey(nom)
        )
      `)
      .eq('particulier_id', userId)
      .order('date_remboursement', { ascending: false });
    
    if (error) {
      console.error('Erreur chargement remboursements:', error);
    } else {
      setRemboursements(data || []);
    }
    
    setLoading(false);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      pending: { bg: '#FFF3CD', color: '#856404', label: '⏳ En cours d\'examen', icon: '📋' },
      processed: { bg: '#D4EDDA', color: '#155724', label: '✅ Remboursé', icon: '💰' },
      no_refund: { bg: '#F8D7DA', color: '#721C24', label: '❌ Aucun remboursement', icon: '🚫' },
      rejected: { bg: '#F8D7DA', color: '#721C24', label: '❌ Rejeté', icon: '⛔' }
    };
    
    const style = styles[status as keyof typeof styles] || styles.pending;
    
    return (
      <View style={[badgeStyles.container, { backgroundColor: style.bg }]}>
        <Text style={{ color: style.color }}>{style.icon}</Text>
        <Text style={[badgeStyles.text, { color: style.color }]}>{style.label}</Text>
      </View>
    );
  };

  const RefundCard = ({ remb }: { remb: Remboursement }) => (
    <TouchableOpacity
      style={cardStyles.container}
      onPress={() => setSelectedRemboursement(remb)}
      activeOpacity={0.7}
    >
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Text style={cardStyles.title}>
            {remb.reservations?.annonces?.titre || 'Service'}
          </Text>
          <Text style={cardStyles.subtitle}>
            <Text style={cardStyles.bold}>Prestataire:</Text> {remb.reservations?.profiles?.nom || 'N/A'}
          </Text>
          <Text style={cardStyles.subtitle}>
            <Text style={cardStyles.bold}>Date de la prestation:</Text>{' '}
            {remb.reservations?.date ? new Date(remb.reservations.date).toLocaleDateString('fr-FR') : 'N/A'}
          </Text>
        </View>
        
        <StatusBadge status={remb.statut_remboursement} />
      </View>

      <View style={cardStyles.statsGrid}>
        <View style={[cardStyles.statBox, { backgroundColor: '#F8F9FA' }]}>
          <Text style={cardStyles.statLabel}>Montant payé</Text>
          <Text style={cardStyles.statValue}>{remb.montant_original} MAD</Text>
        </View>
        
        <View style={[cardStyles.statBox, { backgroundColor: '#E8F5E8' }]}>
          <Text style={[cardStyles.statLabel, { color: '#155724' }]}>Remboursé</Text>
          <Text style={[cardStyles.statValue, { color: '#155724' }]}>
            {remb.montant_rembourse} MAD ({remb.pourcentage_remboursement}%)
          </Text>
        </View>
        
        <View style={[cardStyles.statBox, { backgroundColor: '#FFF3CD' }]}>
          <Text style={[cardStyles.statLabel, { color: '#856404' }]}>Conditions</Text>
          <Text style={[cardStyles.statValue, { color: '#856404', fontSize: 14 }]}>
            {remb.condition_annulation || 'N/A'}
          </Text>
        </View>
      </View>

      <Text style={cardStyles.date}>
        <Text style={cardStyles.bold}>Demandé le:</Text>{' '}
        {new Date(remb.date_remboursement).toLocaleDateString('fr-FR')} à{' '}
        {new Date(remb.date_remboursement).toLocaleTimeString('fr-FR')}
      </Text>
      
      {remb.date_traitement_admin && (
        <Text style={cardStyles.date}>
          <Text style={cardStyles.bold}>Traité le:</Text>{' '}
          {new Date(remb.date_traitement_admin).toLocaleDateString('fr-FR')}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement de vos remboursements...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>💰 Mes Remboursements</Text>
        <Text style={styles.pageSubtitle}>
          Suivez l'état de vos demandes de remboursement selon les conditions d'annulation.
        </Text>
      </View>

      {remboursements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>Aucun remboursement</Text>
          <Text style={styles.emptyText}>
            Vous n'avez encore aucune demande de remboursement.
          </Text>
        </View>
      ) : (
        <View>
          {remboursements.map((remb) => (
            <RefundCard key={remb.id} remb={remb} />
          ))}
        </View>
      )}

      {/* Modal détails */}
      <Modal
        visible={selectedRemboursement !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRemboursement(null)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>Détails du remboursement</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRemboursement(null)}
                  style={modalStyles.closeButton}
                >
                  <Text style={modalStyles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              {selectedRemboursement && (
                <>
                  <View style={modalStyles.statusContainer}>
                    <StatusBadge status={selectedRemboursement.statut_remboursement} />
                  </View>

                  <View style={modalStyles.section}>
                    <Text style={modalStyles.sectionTitle}>Informations de la réservation</Text>
                    <View style={modalStyles.infoBox}>
                      <Text style={modalStyles.infoText}>
                        <Text style={modalStyles.bold}>Service:</Text>{' '}
                        {selectedRemboursement.reservations?.annonces?.titre}
                      </Text>
                      <Text style={modalStyles.infoText}>
                        <Text style={modalStyles.bold}>Prestataire:</Text>{' '}
                        {selectedRemboursement.reservations?.profiles?.nom}
                      </Text>
                      <Text style={modalStyles.infoText}>
                        <Text style={modalStyles.bold}>Date de prestation:</Text>{' '}
                        {selectedRemboursement.reservations?.date
                          ? new Date(selectedRemboursement.reservations.date).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={modalStyles.section}>
                    <Text style={modalStyles.sectionTitle}>Détails financiers</Text>
                    <View style={modalStyles.financialGrid}>
                      <View style={[modalStyles.financialBox, { backgroundColor: '#F8F9FA' }]}>
                        <Text style={modalStyles.financialLabel}>Montant original</Text>
                        <Text style={modalStyles.financialValue}>{selectedRemboursement.montant_original} MAD</Text>
                      </View>
                      <View style={[modalStyles.financialBox, { backgroundColor: '#E8F5E8' }]}>
                        <Text style={[modalStyles.financialLabel, { color: '#155724' }]}>Montant remboursé</Text>
                        <Text style={[modalStyles.financialValue, { color: '#155724' }]}>
                          {selectedRemboursement.montant_rembourse} MAD ({selectedRemboursement.pourcentage_remboursement}%)
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedRemboursement.motif_annulation && (
                    <View style={modalStyles.section}>
                      <Text style={modalStyles.sectionTitle}>Motif d'annulation</Text>
                      <View style={modalStyles.motifBox}>
                        <Text style={modalStyles.motifText}>"{selectedRemboursement.motif_annulation}"</Text>
                      </View>
                    </View>
                  )}

                  {selectedRemboursement.notes_admin && (
                    <View style={modalStyles.section}>
                      <Text style={modalStyles.sectionTitle}>Notes administratives</Text>
                      <View style={modalStyles.notesBox}>
                        <Text style={modalStyles.notesText}>{selectedRemboursement.notes_admin}</Text>
                      </View>
                    </View>
                  )}

                  <View style={modalStyles.metaSection}>
                    {selectedRemboursement.stripe_refund_id && (
                      <Text style={modalStyles.metaText}>
                        <Text style={modalStyles.bold}>ID Remboursement Stripe:</Text>{' '}
                        {selectedRemboursement.stripe_refund_id}
                      </Text>
                    )}
                    <Text style={modalStyles.metaText}>
                      <Text style={modalStyles.bold}>Demande créée:</Text>{' '}
                      {new Date(selectedRemboursement.date_remboursement).toLocaleString('fr-FR')}
                    </Text>
                    {selectedRemboursement.date_traitement_admin && (
                      <Text style={modalStyles.metaText}>
                        <Text style={modalStyles.bold}>Traitée le:</Text>{' '}
                        {new Date(selectedRemboursement.date_traitement_admin).toLocaleString('fr-FR')}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedRemboursement(null)}
                    style={modalStyles.closeButtonBottom}
                  >
                    <Text style={modalStyles.closeButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  contentContainer: {
    padding: 24,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748B'
  },
  headerSection: {
    marginBottom: 24
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333'
  },
  pageSubtitle: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DEE2E6'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  emptyText: {
    color: '#666',
    textAlign: 'center'
  }
});

const badgeStyles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  text: {
    fontSize: 14,
    fontWeight: '600'
  }
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  headerLeft: {
    flex: 1,
    marginRight: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4
  },
  bold: {
    fontWeight: 'bold'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statBox: {
    flex: 1,
    minWidth: 150,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  }
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 600,
    width: '100%',
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333'
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    fontSize: 24,
    color: '#666'
  },
  statusContainer: {
    marginBottom: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8
  },
  infoText: {
    marginBottom: 8,
    color: '#333',
    fontSize: 14
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12
  },
  financialBox: {
    flex: 1,
    padding: 16,
    borderRadius: 8
  },
  financialLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  motifBox: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    borderRadius: 8,
    padding: 16
  },
  motifText: {
    fontStyle: 'italic',
    color: '#856404'
  },
  notesBox: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderRadius: 8,
    padding: 16
  },
  notesText: {
    color: '#1565C0'
  },
  metaSection: {
    marginBottom: 24
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  bold: {
    fontWeight: 'bold'
  },
  closeButtonBottom: {
    backgroundColor: '#6C757D',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});
