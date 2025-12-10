import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';

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
  purple: '#AF52DE',
};

interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  reward_type: string;
  value: number;
  terms_conditions: string;
  valid_days: number;
  is_active: boolean;
  stock: number | null;
  category: string;
}

interface LoyaltyPoints {
  available_points: number;
  tier: string;
}

export default function RewardsCatalogScreen() {
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load user's loyalty points
      const { data: points, error: pointsError } = await supabase
        .from('loyalty_points')
        .select('available_points, tier')
        .eq('user_id', user.id)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') {
        throw pointsError;
      }

      setLoyaltyPoints(points || { available_points: 0, tier: 'bronze' });

      // Load available rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards_catalog')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
      Alert.alert('Erreur', 'Impossible de charger les récompenses');
    } finally {
      setLoading(false);
    }
  };

  const openRedeemModal = (reward: Reward) => {
    if (!loyaltyPoints || loyaltyPoints.available_points < reward.points_cost) {
      Alert.alert(
        'Points insuffisants',
        `Vous avez besoin de ${reward.points_cost} points pour échanger cette récompense. Vous avez actuellement ${loyaltyPoints?.available_points || 0} points.`,
        [
          { text: 'OK' },
          {
            text: 'Gagner des points',
            onPress: () => router.push('/particuliers/loyalty-dashboard' as any),
          },
        ]
      );
      return;
    }

    if (reward.stock !== null && reward.stock <= 0) {
      Alert.alert('Rupture de stock', 'Cette récompense est actuellement en rupture de stock.');
      return;
    }

    setSelectedReward(reward);
    setConfirmEmail('');
    setModalVisible(true);
  };

  const handleRedeem = async () => {
    if (!selectedReward || !userId) return;

    if (!confirmEmail.includes('@')) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    try {
      setRedeeming(true);

      // Create redemption record
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedReward.valid_days);

      const redemptionCode = `RWD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: redemption, error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({
          user_id: userId,
          reward_id: selectedReward.id,
          points_spent: selectedReward.points_cost,
          status: 'pending',
          redemption_code: redemptionCode,
          expiry_date: expiryDate.toISOString(),
          metadata: {
            email: confirmEmail,
            reward_title: selectedReward.title,
          },
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Deduct points
      const { error: pointsError } = await supabase
        .from('loyalty_points')
        .update({
          available_points: (loyaltyPoints?.available_points || 0) - selectedReward.points_cost,
        })
        .eq('user_id', userId);

      if (pointsError) throw pointsError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userId,
          points: -selectedReward.points_cost,
          transaction_type: 'redeemed',
          description: `Redeemed: ${selectedReward.title}`,
          reference_type: 'redemption',
          reference_id: redemption.id,
        });

      if (transactionError) throw transactionError;

      // Update stock if applicable
      if (selectedReward.stock !== null) {
        await supabase
          .from('rewards_catalog')
          .update({ stock: selectedReward.stock - 1 })
          .eq('id', selectedReward.id);
      }

      setModalVisible(false);
      Alert.alert(
        'Succès !',
        `Votre récompense a été échangée !\n\nCode d'échange : ${redemptionCode}\n\nConsultez votre email (${confirmEmail}) pour plus de détails.`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadRewards();
              router.push('/particuliers/loyalty-dashboard' as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error redeeming reward:', error);
      Alert.alert('Erreur', 'Échec de l\'échange de la récompense. Veuillez réessayer.');
    } finally {
      setRedeeming(false);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return 'pricetag';
      case 'voucher':
        return 'gift';
      case 'upgrade':
        return 'arrow-up-circle';
      case 'credit':
        return 'cash';
      default:
        return 'star';
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'discount':
        return COLORS.warning;
      case 'voucher':
        return COLORS.success;
      case 'upgrade':
        return COLORS.purple;
      case 'credit':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  const canAfford = (reward: Reward) => {
    return loyaltyPoints && loyaltyPoints.available_points >= reward.points_cost;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Catalogue de récompenses</Text>
        <TouchableOpacity onPress={() => router.push('/particuliers/loyalty-history' as any)}>
          <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Points Banner */}
      <View style={styles.pointsBanner}>
        <View style={styles.pointsContent}>
          <Text style={styles.pointsLabel}>Vos points disponibles</Text>
          <Text style={styles.pointsValue}>
            {loyaltyPoints?.available_points.toLocaleString() || 0}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.earnMoreButton}
          onPress={() => router.push('/particuliers/loyalty-dashboard' as any)}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <Text style={styles.earnMoreText}>Gagner plus</Text>
        </TouchableOpacity>
      </View>

      {/* Rewards List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {rewards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Aucune récompense disponible</Text>
            <Text style={styles.emptyText}>Revenez plus tard pour de nouvelles récompenses !</Text>
          </View>
        ) : (
          rewards.map((reward) => {
            const affordable = canAfford(reward);
            const outOfStock = reward.stock !== null && reward.stock <= 0;

            return (
              <TouchableOpacity
                key={reward.id}
                style={[
                  styles.rewardCard,
                  !affordable && styles.rewardCardDisabled,
                  outOfStock && styles.rewardCardOutOfStock,
                ]}
                onPress={() => openRedeemModal(reward)}
                disabled={!affordable || outOfStock}
              >
                <View
                  style={[
                    styles.rewardIconContainer,
                    {
                      backgroundColor: `${getRewardColor(reward.reward_type)}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name={getRewardIcon(reward.reward_type) as any}
                    size={32}
                    color={getRewardColor(reward.reward_type)}
                  />
                </View>

                <View style={styles.rewardContent}>
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    {outOfStock && (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Rupture de stock</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.rewardDescription} numberOfLines={2}>
                    {reward.description}
                  </Text>

                  <View style={styles.rewardFooter}>
                    <View style={styles.rewardMeta}>
                      <View style={styles.rewardPoints}>
                        <Ionicons name="star" size={16} color={COLORS.warning} />
                        <Text style={styles.rewardPointsText}>
                          {reward.points_cost.toLocaleString()} pts
                        </Text>
                      </View>
                      <Text style={styles.rewardValidity}>
                        Valide {reward.valid_days} jours
                      </Text>
                    </View>

                    {affordable && !outOfStock ? (
                      <View style={styles.redeemButton}>
                        <Text style={styles.redeemButtonText}>Échanger</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                      </View>
                    ) : !outOfStock ? (
                      <View style={styles.insufficientBadge}>
                        <Ionicons name="lock-closed" size={14} color={COLORS.error} />
                        <Text style={styles.insufficientText}>
                          Besoin de {reward.points_cost - (loyaltyPoints?.available_points || 0)} points
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {reward.stock !== null && reward.stock > 0 && reward.stock <= 10 && (
                    <View style={styles.stockWarning}>
                      <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                      <Text style={styles.stockWarningText}>
                        Plus que {reward.stock} en stock
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Redeem Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmer l'échange</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedReward && (
              <View style={styles.modalBody}>
                <View style={styles.modalRewardInfo}>
                  <Text style={styles.modalRewardTitle}>{selectedReward.title}</Text>
                  <Text style={styles.modalRewardPoints}>
                    {selectedReward.points_cost.toLocaleString()} points
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Entrez votre email pour recevoir la récompense :</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="votre@email.com"
                  value={confirmEmail}
                  onChangeText={setConfirmEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.modalTerms}>
                  <Text style={styles.modalTermsTitle}>Conditions d'utilisation :</Text>
                  <Text style={styles.modalTermsText}>{selectedReward.terms_conditions}</Text>
                  <Text style={styles.modalTermsText}>
                    • Valide pendant {selectedReward.valid_days} jours après échange
                  </Text>
                  <Text style={styles.modalTermsText}>• Non transférable et non remboursable</Text>
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, redeeming && styles.confirmButtonDisabled]}
                  onPress={handleRedeem}
                  disabled={redeeming}
                >
                  {redeeming ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer l'échange</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pointsContent: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  earnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  earnMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardCardDisabled: {
    opacity: 0.6,
  },
  rewardCardOutOfStock: {
    opacity: 0.5,
  },
  rewardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardContent: {
    flex: 1,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  outOfStockBadge: {
    backgroundColor: `${COLORS.error}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
  },
  rewardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardMeta: {
    flex: 1,
  },
  rewardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardPointsText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.warning,
    marginLeft: 4,
  },
  rewardValidity: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  insufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  insufficientText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 4,
  },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stockWarningText: {
    fontSize: 12,
    color: COLORS.warning,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBody: {
    padding: 16,
  },
  modalRewardInfo: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalRewardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalRewardPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalTerms: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalTermsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalTermsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
