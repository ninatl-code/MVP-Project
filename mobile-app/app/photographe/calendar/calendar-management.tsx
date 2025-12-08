import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '../../components/FooterPresta';
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
};

interface CalendarOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  bgColor: string;
}

export default function CalendarManagementPage() {
  const router = useRouter();

  const options: CalendarOption[] = [
    {
      id: 'availability',
      title: 'Disponibilités Hebdomadaires',
      description: 'Gérez vos horaires de travail par jour de la semaine',
      icon: 'calendar',
      route: '/prestataires/availability-calendar',
      color: COLORS.primary,
      bgColor: '#E0F2FE',
    },
    {
      id: 'blocked',
      title: 'Périodes Bloquées',
      description: 'Vacances, congés et indisponibilités',
      icon: 'calendar-clear',
      route: '/prestataires/blocked-slots',
      color: COLORS.warning,
      bgColor: '#FEF3C7',
    },
    {
      id: 'instant',
      title: 'Réservation Instantanée',
      description: 'Configuration de la confirmation automatique',
      icon: 'flash',
      route: '/prestataires/instant-booking-settings',
      color: COLORS.success,
      bgColor: '#D1FAE5',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestion du Calendrier</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <View style={styles.infoBannerText}>
              <Text style={styles.infoBannerTitle}>Optimisez vos réservations</Text>
              <Text style={styles.infoBannerDescription}>
                Un calendrier bien configuré augmente vos chances de réservation de 60%
              </Text>
            </View>
          </View>

          {/* Options Grid */}
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.bgColor }]}>
                <Ionicons name={option.icon as any} size={32} color={option.color} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}

          {/* Quick Stats */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 Statistiques Rapides</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Heures disponibles</Text>
                <Text style={styles.statSubLabel}>cette semaine</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Jours bloqués</Text>
                <Text style={styles.statSubLabel}>ce mois-ci</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Taux de réponse</Text>
                <Text style={styles.statSubLabel}>24h</Text>
              </View>
            </View>
          </View>

          {/* Best Practices */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Bonnes Pratiques</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>
                Mettez à jour vos disponibilités au moins une semaine à l'avance
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>
                Bloquez vos vacances dès que possible pour éviter les conflits
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>
                La réservation instantanée augmente vos chances de 40%
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.tipText}>
                Configurez un temps tampon entre deux prestations
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  infoBanner: {
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoBannerText: { flex: 1 },
  infoBannerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  infoBannerDescription: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },

  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },

  statsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  tipsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});
