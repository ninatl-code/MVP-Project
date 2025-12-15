import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert, Image, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const DEFAULT_IMAGE = require('../../../assets/images/shutterstock_2502519999.jpg');

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
  error: '#EF4444',
  info: '#3B82F6'
};

interface Package {
  id: string;
  titre: string;
  description: string;
  prix_fixe: number;
  photos_exemple: string[];
  photographe_id: string;
  photographe_nom: string;
  photographe_ville: string;
  photographe_photo?: string;
  photographe_email?: string;
  photographe_tel?: string;
  created_at: string;
}

export default function PackageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchPackage();
    checkIfFavorite();
  }, [id]);

  const fetchPackage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const { data, error } = await supabase
      .from('packages_types')
      .select(`
        id,
        titre,
        description,
        prix_fixe,
        photos_exemple,
        photographe_id,
        created_at,
        profiles!packages_types_photographe_id_fkey (nom, ville, avatar_url, email, telephone)
      `)
      .eq('id', id)
      .eq('actif', true)
      .eq('visible', true)
      .single();

    if (!error && data) {
      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;

      setPackageData({
        id: data.id,
        titre: data.titre,
        description: data.description,
        prix_fixe: data.prix_fixe,
        photos_exemple: data.photos_exemple || [],
        photographe_id: data.photographe_id,
        photographe_nom: profile?.nom || 'Photographe',
        photographe_ville: profile?.ville || '',
        photographe_photo: profile?.avatar_url || '',
        photographe_email: profile?.email || '',
        photographe_tel: profile?.telephone || '',
        created_at: data.created_at
      });
    }

    setLoading(false);
  };

  const checkIfFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favoris')
      .select('id')
      .eq('user_id', user.id)
      .eq('package_id', id)
      .single();

    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFavorite) {
      await supabase
        .from('favoris')
        .delete()
        .eq('user_id', user.id)
        .eq('package_id', id);
      setIsFavorite(false);
      Alert.alert('Succès', 'Retiré des favoris');
    } else {
      await supabase
        .from('favoris')
        .insert({ user_id: user.id, package_id: id });
      setIsFavorite(true);
      Alert.alert('Succès', 'Ajouté aux favoris');
    }
  };

  const handleReserver = async () => {
    // Vérifier que l'utilisateur ne réserve pas chez lui-même
    const { data: { user } } = await supabase.auth.getUser();
    if (user && packageData && user.id === packageData.photographe_id) {
      Alert.alert(
        'Réservation impossible',
        'Vous ne pouvez pas réserver vos propres services. Veuillez vous connecter avec un autre compte client.'
      );
      return;
    }
    router.push(`/packages/${id}/reserver` as any);
  };

  const handleContacter = () => {
    if (!packageData) return;
    Alert.alert(
      'Contacter le photographe',
      `Email: ${packageData.photographe_email}\nTél: ${packageData.photographe_tel}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer un message', onPress: () => router.push('/shared/messages/messages-list' as any) }
      ]
    );
  };

  const formatCurrency = (min: number, max: number) => {
    if (min === max) return `${min}€`;
    return `${min}€ - ${max}€`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  if (!packageData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Package non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = packageData.photos_exemple && packageData.photos_exemple.length > 0 ? packageData.photos_exemple : [DEFAULT_IMAGE];
  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Image carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / screenWidth);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, idx) => (
              <Image
                key={idx}
                source={typeof img === 'string' ? { uri: img } : img}
                style={[styles.image, { width: screenWidth }]}
              />
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.paginationDot,
                    idx === currentImageIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity style={styles.favoriteBtn} onPress={toggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={28}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header section */}
          <View style={styles.headerSection}>
            <Text style={styles.titre}>{packageData.titre}</Text>
          </View>

          {/* Price section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Tarif</Text>
            <Text style={styles.priceValue}>{packageData.prix_fixe}€</Text>
          </View>

          {/* Prestataire section */}
          <View style={styles.prestataireSection}>
            <View style={styles.prestataireHeader}>
              <Image
                source={packageData.photographe_photo ? { uri: packageData.photographe_photo } : DEFAULT_IMAGE}
                style={styles.prestataireAvatar}
              />
              <View style={styles.prestataireInfo}>
                <Text style={styles.prestataireName}>{packageData.photographe_nom}</Text>
                {packageData.photographe_ville && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.locationText}>{packageData.photographe_ville}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.contactBtn} onPress={handleContacter}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>Contacter</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{packageData.description}</Text>
          </View>

          {/* Info rows */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.infoText}>
                Publié le {new Date(packageData.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleContacter}>
          <Text style={styles.actionBtnSecondaryText}>Contacter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleReserver}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.actionBtnPrimaryText}>Réserver</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  image: {
    height: 300,
    resizeMode: 'cover',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titre: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceSection: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  prestataireSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  prestataireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prestataireAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  prestataireInfo: {
    flex: 1,
  },
  prestataireName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionBtnPrimary: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});