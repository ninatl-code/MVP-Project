import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Modal, Dimensions, Share, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import FooterParti from '../../../components/FooterParti';

const { width } = Dimensions.get('window');

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
};

// Fonction pour normaliser les URLs de photos
function normalizePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  if (photoUrl.startsWith('data:')) return photoUrl;
  
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (photoUrl.length > 100 && base64Regex.test(photoUrl.slice(0, 100))) {
    const firstChars = photoUrl.slice(0, 20);
    let mimeType = 'image/jpeg';
    if (firstChars.startsWith('iVBOR') || firstChars.startsWith('IVBOR')) mimeType = 'image/png';
    else if (firstChars.startsWith('/9j/')) mimeType = 'image/jpeg';
    else if (firstChars.startsWith('R0lGOD')) mimeType = 'image/gif';
    return `data:${mimeType};base64,${photoUrl}`;
  }
  return null;
}

interface Annonce {
  id: string;
  titre: string;
  description: string;
  photo_couverture?: string;
  photos?: string[];
  tarif_unit: number;
  unit_tarif: string;
  prix_fixe: boolean;
  acompte_percent?: number;
  equipement?: string;
  conditions_annulation?: string;
  rate?: number;
  vues?: number;
  prestations?: { nom: string; type: string };
  prestataire?: string;
  profiles?: { nom: string; ville_id?: number; photos?: string };
  prestation?: number;
}

export default function AnnonceDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [avis, setAvis] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchAnnonceDetails();
    checkIfFavorite();
  }, [id]);

  const fetchAnnonceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select(`
          *,
          prestations(nom, type),
          profiles!annonces_prestataire_fkey(nom, ville_id, photos)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setAnnonce(data);

      // Fetch avis pour cette annonce
      const { data: avisData } = await supabase
        .from('avis')
        .select('*, particulier:particulier_id(nom, photos)')
        .eq('annonce_id', id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setAvis(avisData || []);

      // Calculate average rating
      if (avisData && avisData.length > 0) {
        const total = avisData.reduce((sum: number, avis: any) => sum + avis.note, 0);
        setAvgRating(parseFloat((total / avisData.length).toFixed(1)));
      }

    } catch (error) {
      console.error('Erreur chargement annonce:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favoris')
      .select('id')
      .eq('particulier_id', user.id)
      .eq('annonce_id', id)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter aux favoris');
      return;
    }

    if (isFavorite) {
      await supabase
        .from('favoris')
        .delete()
        .eq('particulier_id', user.id)
        .eq('annonce_id', id);
      setIsFavorite(false);
    } else {
      await supabase
        .from('favoris')
        .insert({ particulier_id: user.id, annonce_id: id });
      setIsFavorite(true);
    }
  };

  const handleContact = () => {
    if (!annonce?.prestataire) return;
    router.push(`/particuliers/messages?prestataire=${annonce.prestataire}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez cette annonce : ${annonce?.titre} par ${annonce?.profiles?.nom}`,
        title: annonce?.titre,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!annonce) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Annonce introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header avec image principale */}
        <View style={styles.imageHeader}>
          {annonce.photo_couverture || (annonce.photos && annonce.photos.length > 0) ? (
            <TouchableOpacity onPress={() => setSelectedPhotoIndex(0)}>
              <Image
                source={{ uri: normalizePhotoUrl(annonce.photo_couverture || annonce.photos?.[0]) || undefined }}
                style={styles.headerImage}
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.headerImage, styles.noImage]}>
              <Ionicons name="camera-outline" size={64} color={COLORS.textLight} />
            </View>
          )}
          <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteIconButton} onPress={toggleFavorite}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? COLORS.error : "white"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareIconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {/* Titre et prestataire */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{annonce.titre}</Text>
            {annonce.prestations && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{annonce.prestations.nom}</Text>
              </View>
            )}
          </View>

          {/* Prestataire */}
          {annonce.profiles && (
            <View style={styles.prestataireCard}>
              <View style={styles.prestataireAvatar}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.prestataireInfo}>
                <Text style={styles.prestataireName}>{annonce.profiles.nom}</Text>
                <Text style={styles.prestataireLabel}>Prestataire vérifié</Text>
              </View>
              {avgRating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FFA500" />
                  <Text style={styles.ratingText}>{avgRating}</Text>
                </View>
              )}
            </View>
          )}

          {/* Tarifs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Tarification</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceHeader}>
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>
                    {annonce.prix_fixe ? 'Prix fixe' : 'Sur devis'}
                  </Text>
                  <Text style={styles.priceValue}>
                    {annonce.tarif_unit}€{!annonce.prix_fixe ? `/${annonce.unit_tarif}` : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.shareButtonText}>Partager</Text>
                </TouchableOpacity>
              </View>
              {annonce.acompte_percent && annonce.acompte_percent > 0 && (
                <View style={styles.acompteCard}>
                  <Text style={styles.acompteText}>
                    <Text style={styles.acompteLabel}>Acompte requis : </Text>
                    {annonce.acompte_percent}% à la réservation
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {annonce.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{annonce.description}</Text>
            </View>
          )}

          {/* Informations pratiques */}
          {(annonce.conditions_annulation || annonce.equipement) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Informations pratiques</Text>
              <View style={styles.infoGrid}>
                {annonce.conditions_annulation && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>Conditions d'annulation</Text>
                    <View style={[
                      styles.conditionsBadge,
                      { backgroundColor: 
                        annonce.conditions_annulation === 'Flexible' ? '#d1fae5' :
                        annonce.conditions_annulation === 'Modéré' ? '#fef3c7' : '#fee2e2'
                      }
                    ]}>
                      <Text style={[
                        styles.conditionsText,
                        { color:
                          annonce.conditions_annulation === 'Flexible' ? '#065f46' :
                          annonce.conditions_annulation === 'Modéré' ? '#92400e' : '#991b1b'
                        }
                      ]}>
                        {annonce.conditions_annulation}
                      </Text>
                    </View>
                    <Text style={styles.conditionsSubtext}>
                      {annonce.conditions_annulation === 'Flexible' && 'Annulation gratuite jusqu\'à 24h avant'}
                      {annonce.conditions_annulation === 'Modéré' && 'Annulation avec frais selon délai'}
                      {annonce.conditions_annulation === 'Strict' && 'Annulation avec frais importants'}
                    </Text>
                  </View>
                )}
                
                {annonce.equipement && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>Équipements fournis</Text>
                    <Text style={styles.equipementText}>{annonce.equipement}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Galerie photos */}
          {annonce.photos && annonce.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📸 Photos ({annonce.photos.length})</Text>
              <FlatList
                data={annonce.photos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedPhotoIndex(index)}
                    style={styles.galleryItem}
                  >
                    <Image
                      source={{ uri: normalizePhotoUrl(item) || undefined }}
                      style={styles.galleryImage}
                    />
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>{index + 1}/{annonce.photos?.length}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Avis */}
          {avis.length > 0 && (
            <View style={styles.section}>
              <View style={styles.avisHeader}>
                <Text style={styles.sectionTitle}>⭐ Avis</Text>
                {avgRating > 0 && (
                  <View style={styles.avgRatingBadge}>
                    <Ionicons name="star" size={16} color="#FFA500" />
                    <Text style={styles.avgRatingText}>{avgRating}/5</Text>
                  </View>
                )}
              </View>
              {avis.map((avisItem, index) => (
                <View key={index} style={styles.avisCard}>
                  <View style={styles.avisCardHeader}>
                    <View style={styles.avisAvatar}>
                      <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.avisInfo}>
                      <Text style={styles.avisAuthor}>{avisItem.particulier?.nom || 'Particulier'}</Text>
                      <View style={styles.avisRating}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < avisItem.note ? 'star' : 'star-outline'}
                            size={14}
                            color="#FFA500"
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {avisItem.commentaire && (
                    <Text style={styles.avisComment}>{avisItem.commentaire}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.statText}>{annonce.vues || 0} vues</Text>
            </View>
            {avgRating > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="star" size={20} color="#FFA500" />
                <Text style={styles.statText}>{avgRating} ({avis.length} avis)</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal galerie photos */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {selectedPhotoIndex !== null && annonce.photos && (
            <>
              <Image
                source={{ uri: normalizePhotoUrl(annonce.photos[selectedPhotoIndex]) || undefined }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalNavigation}>
                {selectedPhotoIndex > 0 && (
                  <TouchableOpacity
                    style={styles.modalNavButton}
                    onPress={() => setSelectedPhotoIndex(selectedPhotoIndex - 1)}
                  >
                    <Ionicons name="chevron-back" size={30} color="white" />
                  </TouchableOpacity>
                )}
                <Text style={styles.modalCounter}>
                  {selectedPhotoIndex + 1} / {annonce.photos.length}
                </Text>
                {selectedPhotoIndex < annonce.photos.length - 1 && (
                  <TouchableOpacity
                    style={styles.modalNavButton}
                    onPress={() => setSelectedPhotoIndex(selectedPhotoIndex + 1)}
                  >
                    <Ionicons name="chevron-forward" size={30} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Bouton CTA fixe */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleContact}>
          <Ionicons name="chatbubble-outline" size={20} color="white" />
          <Text style={styles.ctaButtonText}>Contacter le prestataire</Text>
        </TouchableOpacity>
      </View>

      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 18, color: COLORS.text, marginTop: 16, marginBottom: 24 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  imageHeader: { position: 'relative', width: '100%', height: 300 },
  headerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImage: { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  backIconButton: { position: 'absolute', top: 40, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  favoriteIconButton: { position: 'absolute', top: 40, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  shareIconButton: { position: 'absolute', top: 40, right: 64, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20, backgroundColor: COLORS.background, marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },

  titleSection: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 16 },
  categoryText: { fontSize: 14, fontWeight: '600', color: 'white' },

  prestataireCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.backgroundLight, borderRadius: 12, marginBottom: 24 },
  prestataireAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prestataireInfo: { flex: 1 },
  prestataireName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  prestataireLabel: { fontSize: 13, color: COLORS.textLight },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.background, borderRadius: 12 },
  ratingText: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  description: { fontSize: 15, color: COLORS.textLight, lineHeight: 22 },

  priceCard: { padding: 16, backgroundColor: COLORS.backgroundLight, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: 4 },
  priceValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.background, borderRadius: 8 },
  shareButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  acompteCard: { marginTop: 12, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 8 },
  acompteText: { fontSize: 14, color: COLORS.text },
  acompteLabel: { fontWeight: '600' },

  infoGrid: { gap: 16 },
  infoCard: { padding: 16, backgroundColor: COLORS.backgroundLight, borderRadius: 12 },
  infoCardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  conditionsBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  conditionsText: { fontSize: 14, fontWeight: '600' },
  conditionsSubtext: { fontSize: 12, color: COLORS.textLight },
  equipementText: { fontSize: 14, color: COLORS.textLight, backgroundColor: COLORS.background, padding: 12, borderRadius: 8 },

  galleryItem: { marginRight: 12, position: 'relative' },
  galleryImage: { width: 120, height: 120, borderRadius: 12 },
  galleryBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  galleryBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  avisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  avgRatingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.backgroundLight, borderRadius: 12 },
  avgRatingText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  avisCard: { padding: 16, backgroundColor: COLORS.backgroundLight, borderRadius: 12, marginBottom: 12 },
  avisCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avisAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avisInfo: { flex: 1 },
  avisAuthor: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  avisRating: { flexDirection: 'row', gap: 2 },
  avisComment: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, color: COLORS.textLight },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: width - 40, height: '70%' },
  modalNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 20 },
  modalNavButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCounter: { color: 'white', fontSize: 16, fontWeight: '600' },

  ctaContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12 },
  ctaButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
