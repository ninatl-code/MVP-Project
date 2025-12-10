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

interface Annonce {
  id: string;
  titre: string;
  description: string;
  tarif_min: number;
  tarif_max: number;
  photos: string[];
  rate: number;
  prestataire: string;
  prestataire_nom: string;
  prestataire_ville: string;
  prestataire_photo?: string;
  prestataire_email?: string;
  prestataire_tel?: string;
  created_at: string;
}

export default function AnnonceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchAnnonce();
    checkIfFavorite();
  }, [id]);

  const fetchAnnonce = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const { data, error } = await supabase
      .from('annonces')
      .select(`
        id,
        titre,
        description,
        tarif_min,
        tarif_max,
        photos,
        rate,
        prestataire,
        created_at,
        profiles!annonces_prestataire_fkey (nom, ville_id, photos, email, telephone)
      `)
      .eq('id', id)
      .single();

    if (!error && data) {
      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      
      let villeNom = '';
      if (profile?.ville_id) {
        const { data: villeData } = await supabase
          .from('villes')
          .select('ville')
          .eq('id', profile.ville_id)
          .single();
        villeNom = villeData?.ville || '';
      }

      setAnnonce({
        id: data.id,
        titre: data.titre,
        description: data.description,
        tarif_min: data.tarif_min,
        tarif_max: data.tarif_max,
        photos: data.photos || [],
        rate: data.rate || 0,
        prestataire: data.prestataire,
        prestataire_nom: profile?.nom || 'Prestataire',
        prestataire_ville: villeNom,
        prestataire_photo: profile?.photos?.[0] || '',
        prestataire_email: profile?.email || '',
        prestataire_tel: profile?.telephone || '',
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
      .eq('annonce_id', id)
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
        .eq('annonce_id', id);
      setIsFavorite(false);
      Alert.alert('Succès', 'Retiré des favoris');
    } else {
      await supabase
        .from('favoris')
        .insert({ user_id: user.id, annonce_id: id });
      setIsFavorite(true);
      Alert.alert('Succès', 'Ajouté aux favoris');
    }
  };

  const handleReserver = () => {
    router.push(`/annonces/${id}/reserver`);
  };

  const handleContacter = () => {
    if (!annonce) return;
    Alert.alert(
      'Contacter le prestataire',
      `Email: ${annonce.prestataire_email}\nTél: ${annonce.prestataire_tel}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer un message', onPress: () => router.push('/particuliers/messages') }
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

  if (!annonce) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Annonce non trouvée</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = annonce.photos && annonce.photos.length > 0 ? annonce.photos : [DEFAULT_IMAGE];
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
            <Text style={styles.titre}>{annonce.titre}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFA500" />
              <Text style={styles.ratingText}>{annonce.rate.toFixed(1)}</Text>
            </View>
          </View>

          {/* Price section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Tarif</Text>
            <Text style={styles.priceValue}>{formatCurrency(annonce.tarif_min, annonce.tarif_max)}</Text>
          </View>

          {/* Prestataire section */}
          <View style={styles.prestataireSection}>
            <View style={styles.prestataireHeader}>
              <Image
                source={annonce.prestataire_photo ? { uri: annonce.prestataire_photo } : DEFAULT_IMAGE}
                style={styles.prestataireAvatar}
              />
              <View style={styles.prestataireInfo}>
                <Text style={styles.prestataireName}>{annonce.prestataire_nom}</Text>
                {annonce.prestataire_ville && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.locationText}>{annonce.prestataire_ville}</Text>
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
            <Text style={styles.descriptionText}>{annonce.description}</Text>
          </View>

          {/* Info rows */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.infoText}>
                Publié le {new Date(annonce.created_at).toLocaleDateString('fr-FR')}
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