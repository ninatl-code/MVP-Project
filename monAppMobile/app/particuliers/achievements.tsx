import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import FooterParti from '../../components/FooterParti';

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
  locked: '#E5E5EA',
};

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  unlock_criteria: any;
  rarity: string;
  user_achievement?: {
    unlocked_at: string;
    progress: any;
  } | null;
}

const RARITY_COLORS = {
  common: COLORS.textSecondary,
  rare: COLORS.primary,
  epic: COLORS.purple,
  legendary: COLORS.warning,
};

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'apps' },
  { id: 'bookings', label: 'Réservations', icon: 'calendar' },
  { id: 'reviews', label: 'Avis', icon: 'star' },
  { id: 'social', label: 'Social', icon: 'people' },
  { id: 'milestones', label: 'Étapes', icon: 'trophy' },
];

export default function AchievementsScreen() {
  const routerHook = useRouter();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    unlocked: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load all achievements with user progress
      const { data: allAchievements, error: achError } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: false })
        .order('points_reward', { ascending: false });

      if (achError) throw achError;

      // Load user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Combine data
      const combined = allAchievements?.map((ach) => ({
        ...ach,
        user_achievement:
          userAchievements?.find((ua) => ua.achievement_id === ach.id) || null,
      }));

      setAchievements(combined || []);

      // Calculate stats
      const unlocked = combined?.filter((a) => a.user_achievement).length || 0;
      const totalPoints =
        combined
          ?.filter((a) => a.user_achievement)
          .reduce((sum, a) => sum + a.points_reward, 0) || 0;

      setStats({
        total: combined?.length || 0,
        unlocked,
        totalPoints,
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
      Alert.alert('Erreur', 'Impossible de charger les succès');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAchievements = () => {
    if (selectedCategory === 'all') {
      return achievements;
    }
    return achievements.filter((a) => a.category === selectedCategory);
  };

  const getProgress = (achievement: Achievement) => {
    if (!achievement.user_achievement) return 0;
    if (achievement.user_achievement.unlocked_at) return 100;

    const progress = achievement.user_achievement.progress;
    const criteria = achievement.unlock_criteria;

    if (criteria.count && progress?.current !== undefined) {
      return Math.min((progress.current / criteria.count) * 100, 100);
    }

    return 0;
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const isUnlocked = !!achievement.user_achievement?.unlocked_at;
    const progress = getProgress(achievement);

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          !isUnlocked && styles.achievementCardLocked,
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.achievementIconContainer,
            isUnlocked
              ? { backgroundColor: `${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}15` }
              : { backgroundColor: COLORS.locked },
          ]}
        >
          <Ionicons
            name={achievement.icon as any}
            size={32}
            color={
              isUnlocked
                ? RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]
                : COLORS.textSecondary
            }
          />
        </View>

        <View style={styles.achievementContent}>
          <View style={styles.achievementHeader}>
            <Text
              style={[
                styles.achievementTitle,
                !isUnlocked && styles.achievementTitleLocked,
              ]}
            >
              {achievement.title}
            </Text>
            <View
              style={[
                styles.rarityBadge,
                {
                  backgroundColor: `${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.rarityText,
                  {
                    color: RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS],
                  },
                ]}
              >
                {achievement.rarity}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.achievementDescription,
              !isUnlocked && styles.achievementDescriptionLocked,
            ]}
          >
            {achievement.description}
          </Text>

          <View style={styles.achievementFooter}>
            <View style={styles.achievementPoints}>
              <Ionicons
                name="star"
                size={14}
                color={isUnlocked ? COLORS.warning : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.achievementPointsText,
                  !isUnlocked && styles.achievementPointsTextLocked,
                ]}
              >
                {achievement.points_reward} points
              </Text>
            </View>

            {isUnlocked ? (
              <View style={styles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.unlockedText}>Débloqué</Text>
              </View>
            ) : progress > 0 ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            ) : (
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={14} color={COLORS.textSecondary} />
                <Text style={styles.lockedText}>Verrouillé</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const filteredAchievements = getFilteredAchievements();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Succès</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.unlocked}</Text>
          <Text style={styles.statLabel}>Débloqués</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Points gagnés</Text>
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={
                selectedCategory === category.id ? COLORS.primary : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Aucun succès</Text>
            <Text style={styles.emptyText}>
              Réalisez des réservations et interagissez avec la plateforme pour débloquer des succès !
            </Text>
          </View>
        ) : (
          filteredAchievements.map(renderAchievementCard)
        )}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => routerHook.back()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  categoriesScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  achievementTitleLocked: {
    color: COLORS.textSecondary,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  achievementDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  achievementDescriptionLocked: {
    color: COLORS.textSecondary,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 4,
  },
  achievementPointsTextLocked: {
    color: COLORS.textSecondary,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.locked,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
    textAlign: 'center',
    lineHeight: 22,
  },
});
