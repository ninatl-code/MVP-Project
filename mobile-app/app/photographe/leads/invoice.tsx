import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
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

interface LineItem {
  id?: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
}

interface Invoice {
  id: string;
  numero: string;
  montant_ht?: number;
  montant_tva?: number;
  montant_total: number;
  date_emission: string;
  date_echeance?: string;
  statut: string;
  notes?: string;
  conditions_paiement?: string;
  lignes?: LineItem[];
  client?: { nom: string; email: string; telephone?: string };
}

export default function InvoiceDetail() {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [updating, setUpdating] = useState(false);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('factures')
        .select(`
          *,
          client:profiles!client_id(nom, email, telephone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const transformedData = {
          ...data,
          client: Array.isArray(data.client) ? data.client[0] : data.client
        };
        setInvoice(transformedData);
      }
    } catch (error) {
      console.error('Erreur chargement facture:', error);
      Alert.alert('Erreur', 'Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    Alert.alert(
      'Marquer comme payée',
      'Confirmer que cette facture a été payée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setUpdating(true);
              const { error } = await supabase
                .from('factures')
                .update({ statut: 'payee', date_paiement: new Date().toISOString() })
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Succès', 'Facture marquée comme payée');
              fetchInvoice();
            } catch (error) {
              console.error('Erreur mise à jour:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour la facture');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleDownloadPDF = () => {
    Alert.alert('Téléchargement PDF', 'Fonctionnalité en développement');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payee': return COLORS.success;
      case 'en_attente': return COLORS.warning;
      case 'annulee': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'payee': return 'Payée';
      case 'en_attente': return 'En attente';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Facture introuvable</Text>
          <TouchableOpacity style={styles.backButtonEmpty} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facture {invoice.numero}</Text>
        <TouchableOpacity onPress={handleDownloadPDF} style={styles.downloadButton}>
          <Ionicons name="download-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.statut) + '20', borderColor: getStatusColor(invoice.statut) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(invoice.statut) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(invoice.statut) }]}>
              {getStatusLabel(invoice.statut)}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        {invoice.client && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Client</Text>
            </View>
            <View style={styles.clientCard}>
              <Text style={styles.clientName}>{invoice.client.nom}</Text>
              <Text style={styles.clientDetail}>{invoice.client.email}</Text>
              {invoice.client.telephone && (
                <Text style={styles.clientDetail}>{invoice.client.telephone}</Text>
              )}
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Dates</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date d'émission:</Text>
            <Text style={styles.infoValue}>
              {new Date(invoice.date_emission).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          {invoice.date_echeance && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date d'échéance:</Text>
              <Text style={styles.infoValue}>
                {new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {/* Lignes de facture */}
        {invoice.lignes && invoice.lignes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Détail des prestations</Text>
            </View>
            {invoice.lignes.map((line, index) => (
              <View key={index} style={styles.lineItem}>
                <Text style={styles.lineDescription}>{line.description}</Text>
                <View style={styles.lineDetails}>
                  <Text style={styles.lineDetailText}>
                    {line.quantite} × {line.prix_unitaire.toFixed(2)} €
                  </Text>
                  <Text style={styles.lineTotal}>
                    {(line.quantite * line.prix_unitaire).toFixed(2)} €
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Totaux */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calculator-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Montants</Text>
          </View>
          {invoice.montant_ht !== undefined && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValue}>{invoice.montant_ht.toFixed(2)} €</Text>
            </View>
          )}
          {invoice.montant_tva !== undefined && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA (20%)</Text>
              <Text style={styles.totalValue}>{invoice.montant_tva.toFixed(2)} €</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalLabelFinal}>Total TTC</Text>
            <Text style={styles.totalValueFinal}>{invoice.montant_total.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbox-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Conditions de paiement */}
        {invoice.conditions_paiement && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Conditions de paiement</Text>
            </View>
            <Text style={styles.conditionsText}>{invoice.conditions_paiement}</Text>
          </View>
        )}

        {/* Action Button */}
        {invoice.statut === 'en_attente' && (
          <TouchableOpacity 
            style={[styles.actionButton, updating && styles.actionButtonDisabled]}
            onPress={handleMarkAsPaid}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Marquer comme payée</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 15,
    marginBottom: 20,
  },
  backButtonEmpty: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 15,
  },
  downloadButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 10,
  },
  clientCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  clientDetail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  lineItem: {
    backgroundColor: COLORS.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  lineDescription: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
  },
  lineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalRowFinal: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  conditionsText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});
