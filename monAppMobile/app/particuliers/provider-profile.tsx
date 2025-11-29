import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import TrustBadges from '../../components/TrustBadges';
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
  star: '#FFC107',
};

interface Provider {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  bio?: string;
  photos?: string;
  ville_id?: string;
  created_at: string;
}

interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  business_verified: boolean;
  trust_score: number;
  trust_level: string;
  badges: string[];
}

export default function ProviderPublicProfilePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const providerId = params.providerId as string;

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [villeNom, setVilleNom] = useState('');
  const [stats, setStats] = useState({
    totalAnnonces: 0,
    averageRating: 0,
    totalReviews: 0,
    responseRate: 0,
  });
  const [recentAnnonces, setRecentAnnonces] = useState<any[]>([]);

  useEffect(() => {
    if (providerId) {
      fetchProviderData();
    }
  }, [providerId]);

  const fetchProviderData = async () => {
    try {
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('prestataires')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // Fetch ville name
      if (providerData.ville_id) {
        const { data: villeData } = await supabase
          .from('villes')
          .select('ville')
          .eq('id', providerData.ville_id)
          .single();
        setVilleNom(villeData?.ville || '');
      }

      // Fetch verification status
      const { data: verificationData, error: verificationError } = await supabase
        .from('user_verification_status')
        .select('*')
        .eq('user_id', providerId)
        .single();

      if (!verificationError && verificationData) {
        setVerificationStatus(verificationData);
      }

      // Fetch stats
      const { data: annonces } = await supabase
        .from('annonces')
        .select('id, titre, photos, rate')
        .eq('prestataire', providerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentAnnonces(annonces || []);

      const { data: reviews } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('provider_id', providerId);

      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0 && reviews
        ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews 
        : 0;

      setStats({
        totalAnnonces: annonces?.length || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        responseRate: 95, // Could be calculated from message response data
      });
    } catch (error) {
      console.error('Error fetching provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'P';
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.floor(rating) ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={16}
            color={COLORS.star}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.textLight} />
        <Text style={styles.errorText}>Prestataire introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          {provider.photos ? (
            <Image source={{ uri: provider.photos }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(provider.nom)}</Text>
            </View>
          )}

          <Text style={styles.providerName}>
            {provider.prenom} {provider.nom}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="white" />
            <Text style={styles.locationText}>{villeNom || 'Localisation non définie'}</Text>
          </View>

          <View style={styles.ratingRow}>
            {renderStars(stats.averageRating)}
            <Text style={styles.ratingText}>
              {stats.averageRating}/5 ({stats.totalReviews} avis)
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Trust & Verification Section */}
      {verificationStatus && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Vérifications</Text>
          </View>
          <View style={styles.card}>
            <TrustBadges 
              verificationStatus={verificationStatus} 
              showScore={true}
              compact={false}
            />
          </View>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="briefcase" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.totalAnnonces}</Text>
            <Text style={styles.statLabel}>Annonces</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color={COLORS.star} />
            <Text style={styles.statValue}>{stats.averageRating}/5</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.responseRate}%</Text>
            <Text style={styles.statLabel}>Taux de réponse</Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      {provider.bio && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>À propos</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.bioText}>{provider.bio}</Text>
          </View>
        </View>
      )}

      {/* Recent Listings */}
      {recentAnnonces.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Annonces récentes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.annoncesScroll}>
            {recentAnnonces.map((annonce: any) => (
              <TouchableOpacity
                key={annonce.id}
                style={styles.annonceCard}
                onPress={() => router.push(`/annonces/${annonce.id}`)}
              >
                {annonce.photos && (
                  <Image
                    source={{ uri: annonce.photos.split(',')[0] }}
                    style={styles.annonceImage}
                  />
                )}
                <View style={styles.annonceInfo}>
                  <Text style={styles.annonceTitle} numberOfLines={2}>
                    {annonce.titre}
                  </Text>
                  {annonce.rate > 0 && (
                    <View style={styles.annonceRating}>
                      <Ionicons name="star" size={14} color={COLORS.star} />
                      <Text style={styles.annonceRatingText}>{annonce.rate}/5</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Contact Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => router.push('/messages' as any)}
        >
          <Ionicons name="chatbubble" size={20} color="white" />
          <Text style={styles.contactButtonText}>Contacter</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
    position: 'relative',
  },
  backIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  bioText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  annoncesScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  annonceCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  annonceImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.backgroundLight,
  },
  annonceInfo: {
    padding: 12,
    gap: 6,
  },
  annonceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  annonceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  annonceRatingText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
