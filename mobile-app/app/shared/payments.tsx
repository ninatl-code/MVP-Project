import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { paymentService, Reservation } from '../lib/paymentService';
import { COLORS, TYPOGRAPHY, SPACING } from '../lib/constants';
import Card from '../components/ui/Card';
import { InlineLoadingSpinner } from '../components/ui/LoadingSpinner';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);

  // Simuler un userId - dans une vraie app, cela viendrait de l'authentification
  const userId = '12345'; // À remplacer par le vrai système d'auth

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      const data = await paymentService.getPaymentHistory(userId);
      setPayments(data);
      
      // Calculer le total payé
      const total = data
        .filter((p: Reservation) => p.statut === 'acompte_paye' || p.statut === 'termine')
        .reduce((sum: number, p: Reservation) => sum + p.montant_acompte, 0);
      setTotalPaid(total);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des paiements');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acompte_paye':
      case 'termine':
        return COLORS.success;
      case 'en_attente_paiement':
        return COLORS.warning;
      case 'paiement_echoue':
      case 'annule':
        return COLORS.error;
      default:
        return COLORS.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'acompte_paye':
        return 'Acompte payé';
      case 'termine':
        return 'Terminé';
      case 'en_attente_paiement':
        return 'En attente';
      case 'paiement_echoue':
        return 'Échec';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  };

  const renderPaymentCard = (payment: Reservation) => {
    const serviceName = payment.annonces?.titre || 'Service inconnu';
    const providerName = payment.annonces?.profiles?.nom || 'Prestataire';
    const formattedDate = new Date(payment.created_at).toLocaleDateString('fr-FR');
    
    return (
      <TouchableOpacity
        key={payment.id}
        onPress={() => {
          // Navigation vers les détails de la réservation
          Alert.alert(
            'Détails de la réservation',
            `Réservation ${payment.id}\nStatut: ${getStatusLabel(payment.statut)}`
          );
        }}
        style={styles.paymentCard}
      >
        <Card style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{serviceName}</Text>
              <Text style={styles.providerName}>avec {providerName}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.statut) }]}>
              <Text style={styles.statusText}>{getStatusLabel(payment.statut)}</Text>
            </View>
          </View>

          <View style={styles.paymentDetails}>
            <View style={styles.amountRow}>
              <Text style={styles.label}>Acompte payé</Text>
              <Text style={styles.amount}>{payment.montant_acompte.toFixed(2)}€</Text>
            </View>
            
            <View style={styles.amountRow}>
              <Text style={styles.label}>Total service</Text>
              <Text style={styles.totalAmount}>{payment.montant_total.toFixed(2)}€</Text>
            </View>
            
            {payment.montant_restant > 0 && (
              <View style={styles.amountRow}>
                <Text style={styles.label}>Solde restant</Text>
                <Text style={styles.remainingAmount}>{payment.montant_restant.toFixed(2)}€</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.seeDetails}>Voir détails →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <InlineLoadingSpinner />
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header avec statistiques */}
        <View style={styles.header}>
          <Text style={styles.title}>💳 Mes paiements</Text>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{payments.length}</Text>
                <Text style={styles.statLabel}>Réservations</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalPaid.toFixed(0)}€</Text>
                <Text style={styles.statLabel}>Total payé</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Liste des paiements */}
        <View style={styles.paymentsList}>
          {payments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun paiement</Text>
              <Text style={styles.emptySubtitle}>
                Vos paiements et réservations apparaîtront ici
              </Text>
            </Card>
          ) : (
            payments.map(renderPaymentCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface Styles {
  container: ViewStyle;
  scrollView: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  header: ViewStyle;
  title: TextStyle;
  statsCard: ViewStyle;
  statsRow: ViewStyle;
  statItem: ViewStyle;
  statDivider: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  paymentsList: ViewStyle;
  paymentCard: ViewStyle;
  cardContent: ViewStyle;
  cardHeader: ViewStyle;
  serviceInfo: ViewStyle;
  serviceName: TextStyle;
  providerName: TextStyle;
  statusBadge: ViewStyle;
  statusText: TextStyle;
  paymentDetails: ViewStyle;
  amountRow: ViewStyle;
  label: TextStyle;
  amount: TextStyle;
  totalAmount: TextStyle;
  remainingAmount: TextStyle;
  cardFooter: ViewStyle;
  date: TextStyle;
  seeDetails: TextStyle;
  emptyCard: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },
  header: {
    padding: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  statsCard: {
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: SPACING.lg,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '700' as any,
    color: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  paymentsList: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  paymentCard: {
    marginBottom: SPACING.md,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  serviceInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  serviceName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  providerName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  paymentDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  amount: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.success,
  },
  totalAmount: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  remainingAmount: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.warning,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: SPACING.sm,
  },
  date: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  seeDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});