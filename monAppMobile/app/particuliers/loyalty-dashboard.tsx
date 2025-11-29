import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabaseClient';

const { width } = Dimensions.get('window');

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
  pink: '#FF2D55',
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 10000,
};

const TIER_COLORS = {
  bronze: ['#CD7F32', '#A0522D'],
  silver: ['#C0C0C0', '#808080'],
  gold: ['#FFD700', '#FFA500'],
  platinum: ['#E5E4E2', '#B0B0B0'],
};

interface LoyaltyPoints {
  user_id: string;
  total_points: number;
  available_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetime_points: number;
  points_to_expire: number;
  next_expiry_date: string | null;
}

interface Transaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points_reward: number;
  unlock_criteria: any;
  user_achievement?: {
    unlocked_at: string;
  };
}

export default function LoyaltyDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load loyalty points
      const { data: points, error: pointsError } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') {
        throw pointsError;
      }

      if (points) {
        setLoyaltyPoints(points);
      } else {
        // Initialize loyalty account
        const { data: newPoints, error: insertError } = await supabase
          .from('loyalty_points')
          .insert({
            user_id: user.id,
            total_points: 0,
            available_points: 0,
            tier: 'bronze',
            lifetime_points: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setLoyaltyPoints(newPoints);
      }

      // Load recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transError) throw transError;
      setRecentTransactions(transactions || []);

      // Load recent achievements
      const { data: achievements, error: achError } = await supabase
        .from('achievements')
        .select(`
          *,
          user_achievements!inner (unlocked_at)
        `)
        .eq('user_achievements.user_id', user.id)
        .order('user_achievements.unlocked_at', { ascending: false })
        .limit(3);

      if (achError) throw achError;
      setRecentAchievements(
        achievements?.map((a: any) => ({
          ...a,
          user_achievement: { unlocked_at: a.user_achievements?.unlocked_at },
        })) || []
      );
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextTier = () => {
    if (!loyaltyPoints) return null;
    const currentTier = loyaltyPoints.tier;
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex === tiers.length - 1) return null;
    return tiers[currentIndex + 1] as keyof typeof TIER_THRESHOLDS;
  };

  const getProgressToNextTier = () => {
    if (!loyaltyPoints) return 0;
    const nextTier = getNextTier();
    if (!nextTier) return 100;

    const currentThreshold = TIER_THRESHOLDS[loyaltyPoints.tier];
    const nextThreshold = TIER_THRESHOLDS[nextTier];
    const progress =
      ((loyaltyPoints.lifetime_points - currentThreshold) /
        (nextThreshold - currentThreshold)) *
      100;

    return Math.min(Math.max(progress, 0), 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return 'arrow-up-circle';
      case 'redeemed':
        return 'arrow-down-circle';
      case 'expired':
        return 'time-outline';
      case 'bonus':
        return 'gift';
      default:
        return 'ellipse';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
      case 'bonus':
        return COLORS.success;
      case 'redeemed':
        return COLORS.primary;
      case 'expired':
        return COLORS.textSecondary;
      default:
        return COLORS.text;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!loyaltyPoints) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load loyalty data</Text>
      </View>
    );
  }

  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loyalty Rewards</Text>
        <TouchableOpacity onPress={() => router.push('/particuliers/loyalty-history' as any)}>
          <Ionicons name="time-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tier Card */}
        <LinearGradient
          colors={TIER_COLORS[loyaltyPoints.tier] as any}
          style={styles.tierCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierLabel}>Your Tier</Text>
              <Text style={styles.tierName}>
                {loyaltyPoints.tier.toUpperCase()}
              </Text>
            </View>
            <View style={styles.tierIcon}>
              <Ionicons name="medal" size={40} color={COLORS.surface} />
            </View>
          </View>

          <View style={styles.pointsRow}>
            <View style={styles.pointsItem}>
              <Text style={styles.pointsValue}>
                {loyaltyPoints.available_points.toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>Available Points</Text>
            </View>
            <View style={styles.pointsDivider} />
            <View style={styles.pointsItem}>
              <Text style={styles.pointsValue}>
                {loyaltyPoints.lifetime_points.toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>Lifetime Points</Text>
            </View>
          </View>

          {nextTier && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {TIER_THRESHOLDS[nextTier] - loyaltyPoints.lifetime_points} points to{' '}
                  {nextTier}
                </Text>
                <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/particuliers/rewards-catalog' as any)}
          >
            <Ionicons name="gift" size={24} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/particuliers/achievements' as any)}
          >
            <Ionicons name="trophy" size={24} color={COLORS.warning} />
            <Text style={styles.actionButtonText}>Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/particuliers/leaderboards' as any)}
          >
            <Ionicons name="bar-chart" size={24} color={COLORS.success} />
            <Text style={styles.actionButtonText}>Leaderboards</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <TouchableOpacity onPress={() => router.push('/particuliers/achievements' as any)}>
                <Text style={styles.seeAllButton}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.achievementsList}>
              {recentAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <View style={styles.achievementIcon}>
                    <Ionicons name={achievement.icon as any} size={24} color={COLORS.warning} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription} numberOfLines={1}>
                      {achievement.description}
                    </Text>
                    <View style={styles.achievementFooter}>
                      <View style={styles.achievementPoints}>
                        <Ionicons name="star" size={12} color={COLORS.warning} />
                        <Text style={styles.achievementPointsText}>
                          +{achievement.points_reward} pts
                        </Text>
                      </View>
                      {achievement.user_achievement && (
                        <Text style={styles.achievementDate}>
                          {formatDate(achievement.user_achievement.unlocked_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/particuliers/loyalty-history' as any)}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            <View style={styles.transactionsList}>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIconContainer,
                        {
                          backgroundColor: `${getTransactionColor(
                            transaction.transaction_type
                          )}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getTransactionIcon(transaction.transaction_type) as any}
                        size={20}
                        color={getTransactionColor(transaction.transaction_type)}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionPoints,
                      {
                        color: getTransactionColor(transaction.transaction_type),
                      },
                    ]}
                  >
                    {transaction.points > 0 ? '+' : ''}
                    {transaction.points}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Ways to Earn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ways to Earn Points</Text>
          <View style={styles.waysToEarnList}>
            {[
              { icon: 'calendar', text: 'Complete a booking', points: 100 },
              { icon: 'star', text: 'Leave a review', points: 50 },
              { icon: 'people', text: 'Refer a friend', points: 500 },
              { icon: 'trophy', text: 'Unlock achievements', points: 'Varies' },
            ].map((item, index) => (
              <View key={index} style={styles.earnItem}>
                <View style={styles.earnLeft}>
                  <View style={styles.earnIcon}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.earnText}>{item.text}</Text>
                </View>
                <Text style={styles.earnPoints}>+{item.points}</Text>
              </View>
            ))}
          </View>
        </View>
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
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
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
  tierCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  tierLabel: {
    fontSize: 14,
    color: COLORS.surface,
    opacity: 0.9,
    marginBottom: 4,
  },
  tierName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.surface,
  },
  tierIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  pointsItem: {
    flex: 1,
  },
  pointsDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.surface,
    marginBottom: 4,
  },
  pointsLabel: {
    fontSize: 12,
    color: COLORS.surface,
    opacity: 0.8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.surface,
    opacity: 0.9,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.surface,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  section: {
    backgroundColor: COLORS.surface,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.warning}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementPoints: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  waysToEarnList: {
    gap: 12,
    marginTop: 8,
  },
  earnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  earnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earnText: {
    fontSize: 15,
    color: COLORS.text,
  },
  earnPoints: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
  },
});
