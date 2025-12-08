import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  success: '#10B981',
  warning: '#F59E0B',
  gold: '#FFD700',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
};

interface TrustBadgesProps {
  verificationStatus?: {
    email_verified: boolean;
    phone_verified: boolean;
    identity_verified: boolean;
    business_verified: boolean;
    trust_score: number;
    trust_level: string;
    badges: string[];
  };
  showScore?: boolean;
  compact?: boolean;
}

const TRUST_LEVEL_CONFIG = {
  unverified: {
    label: 'Non vérifié',
    color: COLORS.textLight,
    icon: 'alert-circle-outline',
  },
  basic: {
    label: 'Basique',
    color: COLORS.warning,
    icon: 'shield-outline',
  },
  verified: {
    label: 'Vérifié',
    color: COLORS.success,
    icon: 'shield-checkmark-outline',
  },
  trusted: {
    label: 'Approuvé',
    color: COLORS.primary,
    icon: 'shield-checkmark',
  },
  elite: {
    label: 'Élite',
    color: COLORS.gold,
    icon: 'shield',
  },
};

const BADGE_CONFIG = {
  identity_verified: {
    label: 'Identité vérifiée',
    icon: 'person-circle',
    color: COLORS.primary,
  },
  email_verified: {
    label: 'Email vérifié',
    icon: 'mail',
    color: COLORS.success,
  },
  phone_verified: {
    label: 'Téléphone vérifié',
    icon: 'call',
    color: COLORS.success,
  },
  business_verified: {
    label: 'Professionnel certifié',
    icon: 'briefcase',
    color: COLORS.gold,
  },
  insurance_verified: {
    label: 'Assuré',
    icon: 'shield-checkmark',
    color: COLORS.primary,
  },
  background_check: {
    label: 'Vérification effectuée',
    icon: 'checkmark-circle',
    color: COLORS.success,
  },
};

export default function TrustBadges({ 
  verificationStatus, 
  showScore = true, 
  compact = false 
}: TrustBadgesProps) {
  if (!verificationStatus) {
    return null;
  }

  const {
    email_verified,
    phone_verified,
    identity_verified,
    business_verified,
    trust_score,
    trust_level,
    badges = [],
  } = verificationStatus;

  const levelConfig = TRUST_LEVEL_CONFIG[trust_level as keyof typeof TRUST_LEVEL_CONFIG] || TRUST_LEVEL_CONFIG.unverified;

  // Build active badges list
  const activeBadges: string[] = [];
  
  if (identity_verified) activeBadges.push('identity_verified');
  if (email_verified) activeBadges.push('email_verified');
  if (phone_verified) activeBadges.push('phone_verified');
  if (business_verified) activeBadges.push('business_verified');
  
  // Add custom badges
  badges.forEach(badge => {
    if (BADGE_CONFIG[badge as keyof typeof BADGE_CONFIG] && !activeBadges.includes(badge)) {
      activeBadges.push(badge);
    }
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactBadge, { backgroundColor: levelConfig.color + '20' }]}>
          <Ionicons name={levelConfig.icon as any} size={16} color={levelConfig.color} />
          <Text style={[styles.compactText, { color: levelConfig.color }]}>
            {levelConfig.label}
          </Text>
        </View>
        {activeBadges.length > 0 && (
          <Text style={styles.badgeCount}>+{activeBadges.length}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Trust Level Badge */}
      <View style={styles.trustLevelContainer}>
        <View style={[styles.trustLevelBadge, { backgroundColor: levelConfig.color + '20' }]}>
          <Ionicons name={levelConfig.icon as any} size={32} color={levelConfig.color} />
          <View style={styles.trustLevelInfo}>
            <Text style={[styles.trustLevelLabel, { color: levelConfig.color }]}>
              {levelConfig.label}
            </Text>
            {showScore && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreValue}>{trust_score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Verification Badges */}
      {activeBadges.length > 0 && (
        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Vérifications</Text>
          <View style={styles.badgesList}>
            {activeBadges.map((badgeKey) => {
              const badge = BADGE_CONFIG[badgeKey as keyof typeof BADGE_CONFIG];
              if (!badge) return null;

              return (
                <View key={badgeKey} style={styles.badgeItem}>
                  <View style={[styles.badgeIcon, { backgroundColor: badge.color + '20' }]}>
                    <Ionicons name={badge.icon as any} size={20} color={badge.color} />
                  </View>
                  <Text style={styles.badgeLabel}>{badge.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Trust Score Breakdown */}
      {showScore && (
        <View style={styles.scoreBreakdown}>
          <Text style={styles.breakdownTitle}>Score de confiance</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${trust_score}%`,
                  backgroundColor: levelConfig.color,
                }
              ]} 
            />
          </View>
          <Text style={styles.scoreDescription}>
            {trust_score < 30 && 'Complétez votre profil et vos vérifications pour augmenter votre score'}
            {trust_score >= 30 && trust_score < 60 && 'Bon début ! Continuez à vérifier votre identité'}
            {trust_score >= 60 && trust_score < 80 && 'Profil de confiance établi'}
            {trust_score >= 80 && 'Excellent score de confiance !'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  trustLevelContainer: {
    marginBottom: 8,
  },
  trustLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  trustLevelInfo: {
    flex: 1,
  },
  trustLevelLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreMax: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  badgesContainer: {
    gap: 12,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  badgesList: {
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  scoreBreakdown: {
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
  },
});
