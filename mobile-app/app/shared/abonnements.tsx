import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  accent: '#130183',
  primary: '#5C6BC0',
  text: '#1C1C1E',
  textLight: '#6B7280',
  background: '#F9F7F4',
  gold: '#D4AF37',
  green: '#A3B18A',
};

const PLANS = [
  {
    id: 'freemium',
    name: 'Freemium',
    tag: 'Phase lancement',
    priceMonthly: 0,
    priceYearly: 0,
    highlight: false,
    description: 'Tester la plateforme et recevoir ses premières demandes',
    features: [
      'Profil visible',
      'Accès aux demandes (limité)',
      'Notifications standard',
      'Réponses limitées',
      'Support basique',
    ],
  },
  {
    id: 'boost',
    name: 'Boost',
    tag: 'Croissance',
    priceMonthly: 129,
    priceYearly: 129 * 10,
    highlight: false,
    description: 'Gagner des clients plus régulièrement',
    features: [
      'Accès illimité aux demandes',
      'Réponses illimitées',
      'Notification rapide',
      'Priorité modérée dans les résultats',
      'Support standard',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: '⭐ Recommandé',
    priceMonthly: 299,
    priceYearly: 299 * 10,
    highlight: true,
    description: 'Maximiser les demandes et les conversions',
    features: [
      'Tout Boost inclus',
      'Priorité sur les nouvelles demandes',
      'Mise en avant dans les résultats',
      'Badge prestataire vérifié',
      'Statistiques avancées',
      'Outils de devis rapides',
      'Support prioritaire',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tag: 'Top visibilité',
    priceMonthly: 599,
    priceYearly: 599 * 10,
    highlight: false,
    description: 'Dominer sa zone et recevoir les meilleurs clients',
    features: [
      'Tout Pro inclus',
      'Mise en avant homepage',
      'Accès anticipé aux demandes',
      'Boost automatique du profil',
      'Assistant de conversion',
      'Analyse complète performance',
      'Support dédié',
    ],
  },
];

export default function Abonnements() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const getPrice = (plan: typeof PLANS[0]) =>
    billing === 'monthly' ? plan.priceMonthly : plan.priceYearly;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Choisissez votre formule</Text>
        <Text style={styles.pageSubtitle}>
          Développez votre activité en recevant plus de clients et de demandes qualifiées.
        </Text>

        {/* Toggle facturation */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setBilling('monthly')}
          >
            <Text style={[styles.toggleBtnText, billing === 'monthly' && styles.toggleBtnTextActive]}>
              Mensuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'yearly' && styles.toggleBtnActiveGold]}
            onPress={() => setBilling('yearly')}
          >
            <Text style={[styles.toggleBtnText, billing === 'yearly' && styles.toggleBtnTextActive]}>
              Annuel (2 mois offerts)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        {PLANS.map(plan => {
          const isSelected = selected === plan.id;
          const price = getPrice(plan);
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.highlight && styles.planCardHighlight,
                isSelected && styles.planCardSelected,
              ]}
            >
              {/* Tag */}
              <View style={[styles.planTag, plan.highlight ? styles.planTagGold : styles.planTagNeutral]}>
                <Text style={[styles.planTagText, plan.highlight && { color: '#fff' }]}>{plan.tag}</Text>
              </View>

              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDesc}>{plan.description}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>
                  {price === 0 ? 'Gratuit' : `${price} MAD`}
                </Text>
                {price > 0 && <Text style={styles.planPricePer}> / mois</Text>}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {plan.features.map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color={COLORS.green} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.planBtn,
                  plan.id === 'freemium' && styles.planBtnFree,
                  plan.highlight && styles.planBtnGold,
                  isSelected && styles.planBtnSelected,
                ]}
                onPress={() => setSelected(plan.id)}
              >
                <Text style={[
                  styles.planBtnText,
                  plan.id === 'freemium' && { color: COLORS.text },
                ]}>
                  {plan.id === 'freemium'
                    ? 'Commencer gratuitement'
                    : isSelected ? 'Sélectionné ✓' : 'Choisir'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 30, padding: 4,
    alignSelf: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 3,
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  toggleBtnActive: { backgroundColor: '#F6DCE8' },
  toggleBtnActiveGold: { backgroundColor: COLORS.gold },
  toggleBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.textLight },
  toggleBtnTextActive: { color: COLORS.text, fontWeight: '700' },
  planCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  planCardHighlight: { borderColor: COLORS.gold },
  planCardSelected: { borderColor: COLORS.accent },
  planTag: {
    position: 'absolute', top: -10, right: 16,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  planTagGold: { backgroundColor: COLORS.gold },
  planTagNeutral: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  planTagText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  planName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4, marginTop: 8 },
  planDesc: { fontSize: 13, color: COLORS.textLight, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  planPrice: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  planPricePer: { fontSize: 13, color: COLORS.textLight },
  featuresContainer: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: 13, color: '#374151' },
  planBtn: {
    paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.green,
  },
  planBtnFree: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  planBtnGold: { backgroundColor: COLORS.gold },
  planBtnSelected: { backgroundColor: COLORS.accent },
  planBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
