import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  orange: '#FF9500',
};

interface Recommendation {
  id: string;
  recommendation_type: string;
  target_id: string;
  score: number;
  reasoning: any;
  metadata: any;
  service?: {
    id: string;
    titre: string;
    prix_base: number;
    categorie: string;
    image_url?: string;
    prestataires: {
      nom: string;
      prenom: string;
    };
  };
  provider?: {
    user_id: string;
    nom: string;
    prenom: string;
    bio?: string;
    photo_profil?: string;
  };
}

export default function AIRecommendationsScreen() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('services');
  const [userId, setUserId] = useState<string | null>(null);

  const tabs = [
    { id: 'services', label: 'For You', icon: 'sparkles' },
    { id: 'providers', label: 'Top Providers', icon: 'people' },
    { id: 'trending', label: 'Trending', icon: 'trending-up' },
  ];

  useEffect(() => {
    loadRecommendations();
  }, [activeTab]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      if (activeTab === 'services') {
        await loadServiceRecommendations(user.id);
      } else if (activeTab === 'providers') {
        await loadProviderRecommendations(user.id);
      } else {
        await loadTrendingServices(user.id);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceRecommendations = async (userId: string) => {
    try {
      // Get user's recommendations
      const { data: recs, error: recsError } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('recommendation_type', 'service')
        .gt('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(10);

      if (recsError) throw recsError;

      // Get service details
      if (recs && recs.length > 0) {
        const serviceIds = recs.map((r) => r.target_id);
        const { data: services, error: servicesError } = await supabase
          .from('annonces')
          .select(`
            *,
            prestataires (nom, prenom, photo_profil)
          `)
          .in('id', serviceIds)
          .eq('statut', 'active');

        if (servicesError) throw servicesError;

        const combined = recs.map((rec) => ({
          ...rec,
          service: services?.find((s) => s.id === rec.target_id),
        }));

        setRecommendations(combined);
      } else {
        // Fallback: show popular services
        await loadTrendingServices(userId);
      }
    } catch (error) {
      console.error('Error loading service recommendations:', error);
    }
  };

  const loadProviderRecommendations = async (userId: string) => {
    try {
      const { data: scores, error } = await supabase
        .from('provider_scores')
        .select(`
          *,
          prestataires!provider_id (user_id, nom, prenom, bio, photo_profil)
        `)
        .order('overall_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = scores?.map((s) => ({
        id: s.provider_id,
        recommendation_type: 'provider',
        target_id: s.provider_id,
        score: s.overall_score / 100,
        reasoning: {
          quality: s.quality_score,
          reliability: s.reliability_score,
          response: s.response_score,
        },
        metadata: {},
        provider: s.prestataires,
      }));

      setRecommendations(formatted || []);
    } catch (error) {
      console.error('Error loading provider recommendations:', error);
    }
  };

  const loadTrendingServices = async (userId: string) => {
    try {
      // Get services with most bookings in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: services, error } = await supabase
        .from('annonces')
        .select(`
          *,
          prestataires (nom, prenom, photo_profil),
          reservations (id)
        `)
        .eq('statut', 'active')
        .gte('reservations.cree_a', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = services?.map((s) => ({
        id: s.id,
        recommendation_type: 'service',
        target_id: s.id,
        score: 0.85,
        reasoning: { trending: true },
        metadata: {},
        service: s,
      }));

      setRecommendations(formatted || []);
    } catch (error) {
      console.error('Error loading trending services:', error);
    }
  };

  const trackClick = async (recommendationId: string, targetId: string) => {
    try {
      await supabase
        .from('ai_recommendations')
        .update({ is_clicked: true })
        .eq('id', recommendationId);

      // Navigate to service/provider
      router.push(`/annonces/${targetId}` as any);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const renderServiceCard = (item: Recommendation) => {
    const service = item.service;
    if (!service) return null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.serviceCard}
        onPress={() => trackClick(item.id, service.id)}
      >
        <Image
          source={{ uri: service.image_url || 'https://via.placeholder.com/300x200' }}
          style={styles.serviceImage}
        />
        <View style={styles.scoreBadge}>
          <Ionicons name="star" size={12} color={COLORS.warning} />
          <Text style={styles.scoreBadgeText}>{Math.round(item.score * 100)}% match</Text>
        </View>
        <View style={styles.serviceContent}>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {service.titre}
          </Text>
          <Text style={styles.serviceProvider}>
            by {service.prestataires.prenom} {service.prestataires.nom}
          </Text>
          <View style={styles.serviceMeta}>
            <View style={styles.servicePrice}>
              <Text style={styles.servicePriceText}>${service.prix_base}</Text>
            </View>
            {item.reasoning?.reason && (
              <View style={styles.reasonBadge}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                <Text style={styles.reasonText} numberOfLines={1}>
                  {item.reasoning.reason}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProviderCard = (item: Recommendation) => {
    const provider = item.provider;
    if (!provider) return null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.providerCard}
        onPress={() => router.push(`/prestataires/${provider.user_id}` as any)}
      >
        <Image
          source={{ uri: provider.photo_profil || 'https://via.placeholder.com/100' }}
          style={styles.providerImage}
        />
        <View style={styles.providerContent}>
          <View style={styles.providerHeader}>
            <Text style={styles.providerName}>
              {provider.prenom} {provider.nom}
            </Text>
            <View style={styles.providerScoreBadge}>
              <Text style={styles.providerScoreText}>{Math.round(item.score)}</Text>
              <Ionicons name="star" size={14} color={COLORS.warning} />
            </View>
          </View>
          {provider.bio && (
            <Text style={styles.providerBio} numberOfLines={2}>
              {provider.bio}
            </Text>
          )}
          <View style={styles.providerStats}>
            {item.reasoning?.quality && (
              <View style={styles.providerStat}>
                <Ionicons name="star" size={12} color={COLORS.success} />
                <Text style={styles.providerStatText}>
                  Quality {Math.round(item.reasoning.quality)}
                </Text>
              </View>
            )}
            {item.reasoning?.reliability && (
              <View style={styles.providerStat}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                <Text style={styles.providerStatText}>
                  Reliable {Math.round(item.reasoning.reliability)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Recommendations</Text>
        <TouchableOpacity onPress={() => router.push('/particuliers/preferences' as any)}>
          <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing your preferences...</Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
          <Text style={styles.emptyText}>
            Start browsing and booking services to get personalized recommendations
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/search' as any)}
          >
            <Text style={styles.emptyButtonText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {activeTab === 'providers'
            ? recommendations.map(renderProviderCard)
            : recommendations.map(renderServiceCard)}
        </ScrollView>
      )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  serviceContent: {
    padding: 16,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicePrice: {
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  servicePriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.border,
  },
  providerContent: {
    flex: 1,
    marginLeft: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  providerScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerScoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
    marginRight: 4,
  },
  providerBio: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  providerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  providerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
