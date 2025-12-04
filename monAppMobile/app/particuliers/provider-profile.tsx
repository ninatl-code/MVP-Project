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
  warning: '#F59E0B',
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
    experienceYears: 0,
  });
  const [recentAnnonces, setRecentAnnonces] = useState<any[]>([]);
  const [avis, setAvis] = useState<any[]>([]);

  useEffect(() => {
    if (providerId) {
      fetchProviderData();
    }
  }, [providerId]);

  const fetchProviderData = async () => {
    try {
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError) {
        console.error('Error fetching provider data:', providerError);
        throw providerError;
      }
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

      // Fetch all annonces for stats
      const { data: allAnnonces } = await supabase
        .from('annonces')
        .select('id, titre, photo_couverture, rate, created_at, tarif_unit, unit_tarif, description')
        .eq('prestataire', providerId)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      setRecentAnnonces(allAnnonces?.slice(0, 6) || []);

      // Fetch avis
      const { data: avisData } = await supabase
        .from('avis')
        .select('*, particulier:particulier_id(nom, photos)')
        .in('annonce_id', allAnnonces?.map(a => a.id) || [])
        .order('created_at', { ascending: false })
        .limit(5);

      setAvis(avisData || []);

      const totalReviews = avisData?.length || 0;
      const averageRating = totalReviews > 0 && avisData
        ? avisData.reduce((sum: number, r: any) => sum + r.note, 0) / totalReviews 
        : 0;

      // Calculate experience years
      const firstAnnonce = allAnnonces?.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      const experienceYears = firstAnnonce
        ? Math.max(1, Math.floor((new Date().getTime() - new Date(firstAnnonce.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)))
        : 0;

      setStats({
        totalAnnonces: allAnnonces?.length || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        responseRate: 95,
        experienceYears,
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
            <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
            <Text style={styles.sectionTitle}>Confiance et sécurité</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.trustSubtitle}>
              {verificationStatus.identity_verified || verificationStatus.email_verified || verificationStatus.phone_verified
                ? 'Ce prestataire a été vérifié par notre équipe'
                : 'Vérifications en cours'}
            </Text>
            
            <View style={styles.verificationGrid}>
              {/* Identité */}
              <View style={styles.verificationItem}>
                <View style={[styles.verificationIcon, { 
                  backgroundColor: verificationStatus.identity_verified ? '#D1FAE5' : '#F3F4F6'
                }]}>
                  <Ionicons 
                    name={verificationStatus.identity_verified ? "checkmark-circle" : "ellipse-outline"} 
                    size={24} 
                    color={verificationStatus.identity_verified ? COLORS.success : COLORS.border} 
                  />
                </View>
                <Text style={[styles.verificationLabel, !verificationStatus.identity_verified && { color: COLORS.textLight }]}>
                  Identité {verificationStatus.identity_verified ? 'vérifiée' : 'non vérifiée'}
                </Text>
                <Text style={styles.verificationDesc}>
                  {verificationStatus.identity_verified ? 'Document officiel validé' : 'En attente de validation'}
                </Text>
              </View>

              {/* Email */}
              <View style={styles.verificationItem}>
                <View style={[styles.verificationIcon, { 
                  backgroundColor: verificationStatus.email_verified ? '#DBEAFE' : '#F3F4F6'
                }]}>
                  <Ionicons 
                    name={verificationStatus.email_verified ? "mail" : "mail-outline"} 
                    size={24} 
                    color={verificationStatus.email_verified ? COLORS.primary : COLORS.border} 
                  />
                </View>
                <Text style={[styles.verificationLabel, !verificationStatus.email_verified && { color: COLORS.textLight }]}>
                  Email {verificationStatus.email_verified ? 'vérifié' : 'non vérifié'}
                </Text>
                <Text style={styles.verificationDesc}>
                  {verificationStatus.email_verified ? 'Contact confirmé' : 'En attente de confirmation'}
                </Text>
              </View>

              {/* Téléphone */}
              <View style={styles.verificationItem}>
                <View style={[styles.verificationIcon, { 
                  backgroundColor: verificationStatus.phone_verified ? '#FEF3C7' : '#F3F4F6'
                }]}>
                  <Ionicons 
                    name={verificationStatus.phone_verified ? "call" : "call-outline"} 
                    size={24} 
                    color={verificationStatus.phone_verified ? COLORS.warning : COLORS.border} 
                  />
                </View>
                <Text style={[styles.verificationLabel, !verificationStatus.phone_verified && { color: COLORS.textLight }]}>
                  Téléphone {verificationStatus.phone_verified ? 'vérifié' : 'non vérifié'}
                </Text>
                <Text style={styles.verificationDesc}>
                  {verificationStatus.phone_verified ? 'Numéro authentifié' : 'En attente de validation'}
                </Text>
              </View>

              {/* Professionnel */}
              <View style={styles.verificationItem}>
                <View style={[styles.verificationIcon, { 
                  backgroundColor: verificationStatus.business_verified ? '#E0E7FF' : '#F3F4F6'
                }]}>
                  <Ionicons 
                    name={verificationStatus.business_verified ? "briefcase" : "briefcase-outline"} 
                    size={24} 
                    color={verificationStatus.business_verified ? COLORS.accent : COLORS.border} 
                  />
                </View>
                <Text style={[styles.verificationLabel, !verificationStatus.business_verified && { color: COLORS.textLight }]}>
                  {verificationStatus.business_verified ? 'Professionnel' : 'Non certifié'}
                </Text>
                <Text style={styles.verificationDesc}>
                  {verificationStatus.business_verified ? 'Entreprise enregistrée' : 'Certification en attente'}
                </Text>
              </View>
            </View>

            {(verificationStatus.identity_verified && verificationStatus.email_verified) && (
              <View style={styles.trustScore}>
                <Ionicons name="ribbon" size={20} color={COLORS.star} />
                <Text style={styles.trustScoreText}>Prestataire de confiance</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart" size={22} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Statistiques</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="briefcase" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalAnnonces}+</Text>
              <Text style={styles.statLabel}>Annonces</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={24} color={COLORS.star} />
              </View>
              <Text style={styles.statValue}>{stats.averageRating}/5</Text>
              <Text style={styles.statLabel}>Satisfaction</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="time" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats.experienceYears} an{stats.experienceYears > 1 ? 's' : ''}</Text>
              <Text style={styles.statLabel}>d'expérience</Text>
            </View>
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

      {/* Derniers avis */}
      {avis.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={22} color={COLORS.star} />
            <Text style={styles.sectionTitle}>Derniers avis ({avis.length})</Text>
          </View>
          <View style={styles.card}>
            {avis.map((avisItem: any, index: number) => (
              <View key={avisItem.id} style={[styles.avisItem, index < avis.length - 1 && styles.avisItemBorder]}>
                <View style={styles.avisHeader}>
                  <View style={styles.avisAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.avisAuthor}>{avisItem.particulier?.nom || 'Client'}</Text>
                    <View style={styles.avisRatingRow}>
                      {renderStars(avisItem.note)}
                      <Text style={styles.avisDate}>
                        {new Date(avisItem.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                </View>
                {avisItem.commentaire && (
                  <Text style={styles.avisComment}>{avisItem.commentaire}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Annonces */}
      {recentAnnonces.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Annonces ({stats.totalAnnonces})</Text>
          </View>
          <View style={styles.annoncesGrid}>
            {recentAnnonces.map((annonce: any) => (
              <TouchableOpacity
                key={annonce.id}
                style={styles.annonceCard}
                onPress={() => router.push({
                  pathname: '/particuliers/annonces/[id]',
                  params: { id: annonce.id }
                })}
              >
                <View style={styles.annonceImageContainer}>
                  {annonce.photo_couverture ? (
                    <Image
                      source={{ uri: typeof annonce.photo_couverture === 'string' && annonce.photo_couverture.startsWith('data:') 
                        ? annonce.photo_couverture 
                        : `data:image/jpeg;base64,${annonce.photo_couverture}` }}
                      style={styles.annonceImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.annonceImage, styles.annonceImagePlaceholder]}>
                      <Ionicons name="camera" size={32} color={COLORS.textLight} />
                    </View>
                  )}
                  {annonce.rate > 0 && (
                    <View style={styles.annonceRatingBadge}>
                      <Ionicons name="star" size={12} color={COLORS.star} />
                      <Text style={styles.annonceRatingBadgeText}>{annonce.rate}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.annonceInfo}>
                  <Text style={styles.annonceTitle} numberOfLines={2}>
                    {annonce.titre}
                  </Text>
                  {annonce.description && (
                    <Text style={styles.annonceDescription} numberOfLines={2}>
                      {annonce.description}
                    </Text>
                  )}
                  <Text style={styles.annoncePrice}>
                    {annonce.tarif_unit ? `${annonce.tarif_unit}€/${annonce.unit_tarif || 'unit'}` : 'Sur devis'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  trustSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  verificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  verificationItem: {
    width: '47%',
    alignItems: 'center',
    gap: 8,
  },
  verificationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  verificationDesc: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trustScoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.star,
  },
  avisItem: {
    paddingVertical: 16,
  },
  avisItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avisHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  avisAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avisAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  avisRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avisDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  avisComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginLeft: 52,
  },
  annoncesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  annonceCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  annonceImageContainer: {
    position: 'relative',
  },
  annonceImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.backgroundLight,
  },
  annonceImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  annonceRatingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  annonceRatingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
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
  annonceDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  annoncePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
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
