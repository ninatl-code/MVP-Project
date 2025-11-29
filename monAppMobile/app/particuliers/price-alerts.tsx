import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Switch } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

interface PriceAlert {
  id: string;
  annonce_id: string;
  target_price: number;
  current_price: number;
  alert_triggered: boolean;
  triggered_at?: string;
  is_active: boolean;
  created_at: string;
  annonces: {
    titre: string;
    photos?: string;
    rate: number;
    prestataire: string;
  };
}

export default function PriceAlertsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnonceId, setSelectedAnnonceId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlerts();
    subscribeToAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          annonces:annonce_id(
            titre,
            photos,
            rate,
            prestataire
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('price_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alerts',
        },
        (payload) => {
          console.log('Price alert change:', payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createAlert = async () => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      Alert.alert('Attention', 'Veuillez entrer un prix cible valide');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Get current price from annonce
      const { data: annonce } = await supabase
        .from('annonces')
        .select('rate')
        .eq('id', selectedAnnonceId)
        .single();

      if (!annonce) {
        Alert.alert('Erreur', 'Annonce introuvable');
        return;
      }

      const { error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          annonce_id: selectedAnnonceId,
          target_price: parseFloat(targetPrice),
          current_price: annonce.rate,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Alerte créée ! Vous serez notifié quand le prix baisse.');
      setShowCreateModal(false);
      setTargetPrice('');
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'alerte');
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (alertId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: !currentState })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, is_active: !currentState } : a)
      );
    } catch (error) {
      console.error('Error toggling alert:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'alerte');
    }
  };

  const deleteAlert = async (alertId: string) => {
    Alert.alert(
      'Confirmer',
      'Supprimer cette alerte prix ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('price_alerts')
                .delete()
                .eq('id', alertId);

              if (error) throw error;

              setAlerts(prev => prev.filter(a => a.id !== alertId));
              Alert.alert('Succès', 'Alerte supprimée');
            } catch (error) {
              console.error('Error deleting alert:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'alerte');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const calculateDiscount = (current: number, target: number) => {
    const diff = ((current - target) / current) * 100;
    return Math.round(diff);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active && !a.alert_triggered);
  const triggeredAlerts = alerts.filter(a => a.alert_triggered);
  const inactiveAlerts = alerts.filter(a => !a.is_active && !a.alert_triggered);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alertes Prix</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeAlerts.length}</Text>
            <Text style={styles.statLabel}>Actives</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{triggeredAlerts.length}</Text>
            <Text style={styles.statLabel}>Déclenchées</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune alerte prix</Text>
            <Text style={styles.emptyText}>
              Créez des alertes pour être notifié quand les prix baissent
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Créer une alerte</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {/* Triggered Alerts */}
            {triggeredAlerts.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.sectionTitle}>Prix atteints</Text>
                </View>
                {triggeredAlerts.map((alert) => (
                  <View key={alert.id} style={[styles.alertCard, styles.alertTriggered]}>
                    <View style={styles.alertBadge}>
                      <Ionicons name="trending-down" size={20} color={COLORS.success} />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle} numberOfLines={1}>
                        {alert.annonces.titre}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.oldPrice}>{formatPrice(alert.current_price)}</Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
                        <Text style={styles.newPrice}>{formatPrice(alert.target_price)}</Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            -{calculateDiscount(alert.current_price, alert.target_price)}%
                          </Text>
                        </View>
                      </View>
                      {alert.triggered_at && (
                        <Text style={styles.triggeredDate}>
                          Atteint le {new Date(alert.triggered_at).toLocaleDateString('fr-FR')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteAlert(alert.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="notifications" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Alertes actives</Text>
                </View>
                {activeAlerts.map((alert) => (
                  <View key={alert.id} style={styles.alertCard}>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle} numberOfLines={1}>
                        {alert.annonces.titre}
                      </Text>
                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.priceLabel}>Prix actuel</Text>
                          <Text style={styles.currentPrice}>{formatPrice(alert.current_price)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
                        <View>
                          <Text style={styles.priceLabel}>Prix cible</Text>
                          <Text style={styles.targetPrice}>{formatPrice(alert.target_price)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(
                                ((alert.current_price - alert.target_price) / alert.current_price) * 100,
                                100
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.alertActions}>
                      <Switch
                        value={alert.is_active}
                        onValueChange={() => toggleAlert(alert.id, alert.is_active)}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor={COLORS.background}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteAlert(alert.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Inactive Alerts */}
            {inactiveAlerts.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pause-circle" size={20} color={COLORS.textLight} />
                  <Text style={styles.sectionTitle}>Alertes en pause</Text>
                </View>
                {inactiveAlerts.map((alert) => (
                  <View key={alert.id} style={[styles.alertCard, styles.alertInactive]}>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: COLORS.textLight }]} numberOfLines={1}>
                        {alert.annonces.titre}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.inactivePrice}>
                          {formatPrice(alert.current_price)} → {formatPrice(alert.target_price)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alertActions}>
                      <Switch
                        value={alert.is_active}
                        onValueChange={() => toggleAlert(alert.id, alert.is_active)}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor={COLORS.background}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteAlert(alert.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle alerte prix</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Prix cible (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 150"
                value={targetPrice}
                onChangeText={setTargetPrice}
                keyboardType="numeric"
                autoFocus
              />

              <Text style={styles.helperText}>
                💡 Vous serez notifié quand le prix atteindra ou passera sous ce montant
              </Text>

              <TouchableOpacity
                style={[styles.saveButton, !targetPrice && styles.saveButtonDisabled]}
                onPress={createAlert}
                disabled={saving || !targetPrice}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="notifications" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Créer l'alerte</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  alertsList: {
    padding: 20,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  alertCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  alertTriggered: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  alertInactive: {
    opacity: 0.6,
  },
  alertBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  targetPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  oldPrice: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  newPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  inactivePrice: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  discountBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  triggeredDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
