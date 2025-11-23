import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert, RefreshControl, Image } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterParti from '../../components/FooterParti';

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

const DEFAULT_IMAGE = require('../../assets/images/shutterstock_2502519999.jpg');

interface Favori {
  id: string;
  annonce_id: string;
  annonce_titre: string;
  annonce_description: string;
  annonce_tarif_min: number;
  annonce_tarif_max: number;
  annonce_photos: string[];
  annonce_note: number;
  prestataire_id: string;
  prestataire_nom: string;
  prestataire_ville: string;
  created_at: string;
}

export default function FavorisParticulier() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoris, setFavoris] = useState<Favori[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchFavoris();
  }, []);

  const fetchFavoris = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('favoris')
      .select(`
        id,
        annonce_id,
        created_at,
        annonces (
          id,
          titre,
          description,
          tarif_min,
          tarif_max,
          photos,
          rate,
          prestataire,
          profiles (nom, ville_id)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData: Favori[] = [];
      
      for (const fav of data) {
        const annonce = Array.isArray((fav as any).annonces) ? (fav as any).annonces[0] : (fav as any).annonces;
        if (annonce) {
          const profile = Array.isArray(annonce.profiles) ? annonce.profiles[0] : annonce.profiles;
          let villeNom = '';
          if (profile?.ville_id) {
            const { data: villeData } = await supabase
              .from('villes')
              .select('ville')
              .eq('id', profile.ville_id)
              .single();
            villeNom = villeData?.ville || '';
          }

          formattedData.push({
            id: fav.id,
            annonce_id: annonce.id,
            annonce_titre: annonce.titre || 'Annonce',
            annonce_description: annonce.description || '',
            annonce_tarif_min: annonce.tarif_min || 0,
            annonce_tarif_max: annonce.tarif_max || 0,
            annonce_photos: annonce.photos || [],
            annonce_note: annonce.rate || 0,
            prestataire_id: annonce.prestataire,
            prestataire_nom: profile?.nom || 'Prestataire',
            prestataire_ville: villeNom,
            created_at: fav.created_at
          });
        }
      }

      setFavoris(formattedData);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavoris();
  };

  const handleRemoveFavori = (favori: Favori) => {
    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${favori.annonce_titre}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('favoris')
              .delete()
              .eq('id', favori.id);

            if (error) {
              Alert.alert('Erreur', 'Impossible de retirer des favoris');
            } else {
              setFavoris(favoris.filter(f => f.id !== favori.id));
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (min: number, max: number) => {
    if (min === max) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(min || 0);
    }
    return `${min}€ - ${max}€`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterParti />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header avec gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="heart" size={32} color="white" />
            <Text style={styles.headerTitle}>Mes favoris</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {favoris.length} annonce{favoris.length > 1 ? 's' : ''} sauvegardée{favoris.length > 1 ? 's' : ''}
          </Text>
        </LinearGradient>

        {/* Liste des favoris */}
        {favoris.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Aucun favori</Text>
            <Text style={styles.emptyStateText}>
              Ajoutez des annonces à vos favoris pour les retrouver facilement
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/particuliers/search')}
            >
              <Text style={styles.emptyStateButtonText}>Explorer les annonces</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.favorisList}>
            {favoris.map((favori) => (
              <View key={favori.id} style={styles.favoriCard}>
                {/* Image */}
                <View style={styles.imageContainer}>
                  <Image 
                    source={favori.annonce_photos && favori.annonce_photos.length > 0 
                      ? { uri: favori.annonce_photos[0] }
                      : DEFAULT_IMAGE
                    }
                    style={styles.annonceImage}
                  />
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => handleRemoveFavori(favori)}
                  >
                    <Ionicons name="heart" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                  {favori.annonce_note > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#FFA500" />
                      <Text style={styles.ratingText}>{favori.annonce_note.toFixed(1)}</Text>
                    </View>
                  )}
                </View>

                {/* Contenu */}
                <View style={styles.cardContent}>
                  <Text style={styles.annonceTitle} numberOfLines={2}>
                    {favori.annonce_titre}
                  </Text>

                  <View style={styles.prestataireRow}>
                    <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.prestataireText}>{favori.prestataire_nom}</Text>
                  </View>

                  {favori.prestataire_ville && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.locationText}>{favori.prestataire_ville}</Text>
                    </View>
                  )}

                  {favori.annonce_description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {favori.annonce_description}
                    </Text>
                  )}

                  {/* Tarif */}
                  <View style={styles.pricingContainer}>
                    <Text style={styles.priceLabel}>À partir de</Text>
                    <Text style={styles.priceValue}>
                      {formatCurrency(favori.annonce_tarif_min, favori.annonce_tarif_max)}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.actionButtonPrimary}
                      onPress={() => {
                        // Navigation vers détail annonce (à créer)
                        Alert.alert('Info', 'Page détail annonce à venir');
                      }}
                    >
                      <Text style={styles.actionButtonPrimaryText}>Voir l'annonce</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionButtonSecondary}
                      onPress={() => router.push('/particuliers/messages')}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { padding: 24, paddingTop: 20, paddingBottom: 32 },
  backButton: { marginBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  emptyStateButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyStateButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },

  // Favoris
  favorisList: { paddingHorizontal: 16, gap: 16 },
  favoriCard: { backgroundColor: COLORS.background, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
  imageContainer: { position: 'relative', width: '100%', height: 200 },
  annonceImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  favoriteButton: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  ratingBadge: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  ratingText: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  cardContent: { padding: 16 },
  annonceTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  
  prestataireRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  prestataireText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontSize: 14, color: COLORS.textLight },

  description: { fontSize: 14, color: COLORS.textLight, lineHeight: 20, marginBottom: 12 },

  pricingContainer: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 12 },
  priceLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  priceValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButtonPrimary: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonPrimaryText: { color: 'white', fontSize: 15, fontWeight: '600' },
  actionButtonSecondary: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});
