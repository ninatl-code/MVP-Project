import React from 'react';

const COLORS = {
  primary: '#5C6BC0',
  success: '#10B981',
  warning: '#F59E0B',
  gold: '#FFD700',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
};

const TRUST_LEVEL_CONFIG = {
  unverified: {
    label: 'Non vérifié',
    color: COLORS.textLight,
    icon: '⚠️',
  },
  basic: {
    label: 'Basique',
    color: COLORS.warning,
    icon: '🛡️',
  },
  verified: {
    label: 'Vérifié',
    color: COLORS.success,
    icon: '✅',
  },
  trusted: {
    label: 'Approuvé',
    color: COLORS.primary,
    icon: '⭐',
  },
  elite: {
    label: 'Élite',
    color: COLORS.gold,
    icon: '👑',
  },
};

const BADGE_CONFIG = {
  identity_verified: {
    label: 'Identité vérifiée',
    icon: '👤',
    color: COLORS.primary,
  },
  email_verified: {
    label: 'Email vérifié',
    icon: '📧',
    color: COLORS.success,
  },
  phone_verified: {
    label: 'Téléphone vérifié',
    icon: '📱',
    color: COLORS.success,
  },
  business_verified: {
    label: 'Professionnel certifié',
    icon: '💼',
    color: COLORS.gold,
  },
  insurance_verified: {
    label: 'Assuré',
    icon: '🛡️',
    color: COLORS.primary,
  },
  background_check: {
    label: 'Vérification effectuée',
    icon: '✓',
    color: COLORS.success,
  },
};

export default function TrustBadges({ 
  verificationStatus, 
  showScore = true, 
  compact = false 
}) {
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

  const levelConfig = TRUST_LEVEL_CONFIG[trust_level] || TRUST_LEVEL_CONFIG.unverified;

  // Build active badges list
  const activeBadges = [];
  
  if (identity_verified) activeBadges.push('identity_verified');
  if (email_verified) activeBadges.push('email_verified');
  if (phone_verified) activeBadges.push('phone_verified');
  if (business_verified) activeBadges.push('business_verified');
  
  // Add custom badges
  badges.forEach(badge => {
    if (BADGE_CONFIG[badge] && !activeBadges.includes(badge)) {
      activeBadges.push(badge);
    }
  });

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <div style={{...styles.compactBadge, backgroundColor: levelConfig.color + '20'}}>
          <span style={{fontSize: 14}}>{levelConfig.icon}</span>
          <span style={{...styles.compactText, color: levelConfig.color}}>
            {levelConfig.label}
          </span>
        </div>
        {activeBadges.length > 0 && (
          <span style={styles.badgeCount}>+{activeBadges.length}</span>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Trust Level Badge */}
      <div style={styles.trustLevelContainer}>
        <div style={{...styles.trustLevelBadge, backgroundColor: levelConfig.color + '20'}}>
          <span style={{fontSize: 40}}>{levelConfig.icon}</span>
          <div style={styles.trustLevelInfo}>
            <span style={{...styles.trustLevelLabel, color: levelConfig.color}}>
              {levelConfig.label}
            </span>
            {showScore && (
              <div style={styles.scoreContainer}>
                <span style={styles.scoreValue}>{trust_score}</span>
                <span style={styles.scoreMax}>/100</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Badges */}
      {activeBadges.length > 0 && (
        <div style={styles.badgesContainer}>
          <h3 style={styles.badgesTitle}>Vérifications</h3>
          <div style={styles.badgesList}>
            {activeBadges.map((badgeKey) => {
              const badge = BADGE_CONFIG[badgeKey];
              if (!badge) return null;

              return (
                <div key={badgeKey} style={styles.badgeItem}>
                  <div style={{...styles.badgeIcon, backgroundColor: badge.color + '20'}}>
                    <span style={{fontSize: 20}}>{badge.icon}</span>
                  </div>
                  <span style={styles.badgeLabel}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trust Score Breakdown */}
      {showScore && (
        <div style={styles.scoreBreakdown}>
          <h3 style={styles.breakdownTitle}>Score de confiance</h3>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill, 
                width: `${trust_score}%`,
                backgroundColor: levelConfig.color,
              }} 
            />
          </div>
          <p style={styles.scoreDescription}>
            {trust_score < 30 && 'Complétez votre profil et vos vérifications pour augmenter votre score'}
            {trust_score >= 30 && trust_score < 60 && 'Bon début ! Continuez à vérifier votre identité'}
            {trust_score >= 60 && trust_score < 80 && 'Profil de confiance établi'}
            {trust_score >= 80 && 'Excellent score de confiance !'}
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  compactContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 16,
  },
  compactText: {
    fontSize: 13,
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
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  trustLevelInfo: {
    flex: 1,
  },
  trustLevelLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    display: 'block',
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreMax: {
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  badgesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    margin: 0,
  },
  badgesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  badgeItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  scoreBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    margin: 0,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s ease',
  },
  scoreDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: '20px',
    margin: 0,
  },
};
