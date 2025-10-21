import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { trackAnnonceView } from '../../lib/viewTracking';
import Header from '../../components/HeaderParti';

const { width } = Dimensions.get('window');

export default function AnnonceDetailPage() {
  const { id: annonceId, preview } = useLocalSearchParams();
  const navigation = useNavigation();
  
  const [annonce, setAnnonce] = useState<any>(null);
  const [prestationType, setPrestationType] = useState('');
  const [avis, setAvis] = useState<any[]>([]);
  const [totalAvis, setTotalAvis] = useState(0);
  const [favorisLoading, setFavorisLoading] = useState(false);
  const [isFavori, setIsFavori] = useState(false);
  const [favoriId, setFavoriId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [modeles, setModeles] = useState<any[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedModelPhoto, setSelectedModelPhoto] = useState<any>(null);
  const [livraisons, setLivraisons] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [statsPrestataire, setStatsPrestataire] = useState({
    totalAnnonces: 0,
    avgRating: 0,
    experienceYears: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsPreviewMode(preview === 'true');
  }, [preview]);

  useEffect(() => {
    if (!annonceId) return;
    
    async function fetchAnnonceAndAvis() {
      setLoading(true);
      
      try {
        // Fetch annonce
        const { data: annonceData, error: annonceError } = await supabase
          .from('annonces')
          .select(`
            *, 
            prix_fixe, 
            prestataire:prestataire(*)
          `)
          .eq('id', annonceId)
          .single();
        
        if (annonceError || !annonceData) {
          setError('Aucune annonce trouvée pour cet identifiant.');
          setAnnonce(null);
          setLoading(false);
          return;
        }

        // Fetch ville
        if (annonceData.ville) {
          const { data: villeData } = await supabase
            .from('villes')
            .select('id, ville')
            .eq('id', annonceData.ville)
            .single();
          
          if (villeData) {
            annonceData.villeInfo = villeData;
          }
        }
        setAnnonce(annonceData);

        // Fetch type prestation
        let prestationData = null;
        if (annonceData?.prestation) {
          const { data: prestationResponse } = await supabase
            .from('prestations')
            .select('type')
            .eq('id', annonceData.prestation)
            .single();
          prestationData = prestationResponse;
          setPrestationType(prestationData?.type || '');
        }

        // Fetch avis
        const { data: avisData } = await supabase
          .from('avis')
          .select('*, particulier:particulier_id(nom, photos)')
          .eq('annonce_id', annonceId)
          .order('created_at', { ascending: false })
          .limit(3);
        setAvis(avisData || []);

        // Count total avis
        const { count } = await supabase
          .from('avis')
          .select('*', { count: 'exact', head: true })
          .eq('annonce_id', annonceId);
        setTotalAvis(count || 0);

        // Fetch modeles if product
        if (prestationData?.type === 'produit') {
          const { data: modelesData } = await supabase
            .from('modeles')
            .select('*')
            .eq('annonce_id', annonceId)
            .order('created_at', { ascending: true });
          setModeles(modelesData || []);
        }

        // Fetch livraisons
        const { data: livraisonsData } = await supabase
          .from('livraisons_annonces')
          .select('*, villes(ville)')
          .eq('annonce_id', annonceId);
        setLivraisons(livraisonsData || []);

        // Calculate average rating
        if (avisData && avisData.length > 0) {
          const total = avisData.reduce((sum, avis) => sum + avis.note, 0);
          setAvgRating(parseFloat((total / avisData.length).toFixed(1)));
        }

        // Fetch prestataire stats
        if (annonceData?.prestataire?.id) {
          const { data: prestataireAnnonces } = await supabase
            .from('annonces')
            .select('id, created_at')
            .eq('prestataire', annonceData.prestataire.id);
          
          const { data: allAvis } = await supabase
            .from('avis')
            .select('note')
            .in('annonce_id', prestataireAnnonces?.map((a: any) => a.id) || []);

          const totalAnnonces = prestataireAnnonces?.length || 0;
          const avgPrestataireRating = allAvis && allAvis.length > 0 
            ? parseFloat((allAvis.reduce((sum, a) => sum + a.note, 0) / allAvis.length).toFixed(1))
            : 0;
          
          const firstAnnonce = prestataireAnnonces?.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          const experienceYears = firstAnnonce 
            ? Math.max(1, Math.floor((new Date().getTime() - new Date(firstAnnonce.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)))
            : 0;

          setStatsPrestataire({
            totalAnnonces,
            avgRating: avgPrestataireRating,
            experienceYears
          });
        }
      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnnonceAndAvis();
  }, [annonceId]);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUser();
  }, []);

  // Track view
  useEffect(() => {
    if (annonceId && annonce && typeof annonceId === 'string') {
      const viewTimer = setTimeout(() => {
        const numericId = parseInt(annonceId, 10);
        if (!isNaN(numericId)) {
          trackAnnonceView(numericId, 60);
        }
      }, 3000);
      return () => clearTimeout(viewTimer);
    }
  }, [annonceId, annonce]);

  // Check if favori
  useEffect(() => {
    async function checkFavori() {
      if (!userId || !annonce?.prestataire?.id) return;
      const { data } = await supabase
        .from('favoris')
        .select('id')
        .eq('particulier_id', userId)
        .eq('prestataire_id', annonce.prestataire.id)
        .single();
      setIsFavori(!!data);
      setFavoriId(data?.id || null);
    }
    checkFavori();
  }, [userId, annonce]);

  const handleAddFavori = async () => {
    if (!userId || !annonce?.prestataire?.id || !annonceId) return;
    setFavorisLoading(true);
    const { error, data } = await supabase
      .from('favoris')
      .insert({
        particulier_id: userId,
        prestataire_id: annonce.prestataire.id,
        annonce_id: annonceId
      })
      .select()
      .single();
    if (!error && data) {
      setIsFavori(true);
      setFavoriId(data.id);
    }
    setFavorisLoading(false);
  };

  const handleRemoveFavori = async () => {
    if (!favoriId) return;
    setFavorisLoading(true);
    const { error } = await supabase
      .from('favoris')
      .delete()
      .eq('id', favoriId);
    if (!error) {
      setIsFavori(false);
      setFavoriId(null);
    }
    setFavorisLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => (
          <Text key={i} style={styles.star}>
            {i < Math.round(rating) ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  if (!annonce) return null;

  return (
    <>
      <Header />
      
      {isPreviewMode && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>👁️ MODE APERÇU - Lecture seule</Text>
        </View>
      )}
      
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: annonce.prestataire?.photos || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{annonce.prestataire?.nom}</Text>
            {annonce.villeInfo?.ville && (
              <Text style={styles.profileLocation}>📍 {annonce.villeInfo.ville}</Text>
            )}
            <View style={styles.ratingRow}>
              {renderStars(annonce.rate || 0)}
              {annonce.rate && (
                <Text style={styles.ratingText}>{annonce.rate.toFixed(0)}/5</Text>
              )}
              <Text style={styles.avisCount}>({totalAvis} avis)</Text>
            </View>
            <Text style={styles.description}>{annonce.description}</Text>
            
            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{statsPrestataire.totalAnnonces}+</Text>
                <Text style={styles.statLabel}>Annonces</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{statsPrestataire.avgRating}/5</Text>
                <Text style={styles.statLabel}>Satisfaction</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
                  {statsPrestataire.experienceYears} an{statsPrestataire.experienceYears > 1 ? 's' : ''}
                </Text>
                <Text style={styles.statLabel}>d'expérience</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
                <Text style={styles.iconButtonText}>💬</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: '#6366F1' }]} 
                onPress={() => (navigation as any).navigate(`profil/${annonce.prestataire?.id}`)}
              >
                <Text style={styles.iconButtonText}>👤</Text>
              </TouchableOpacity>
              
              {prestationType === 'produit' && (
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: '#EC4899' }]}
                  onPress={() => (navigation as any).navigate(`annonces/${annonceId}/commandes`)}
                >
                  <Text style={styles.iconButtonText}>🛒</Text>
                </TouchableOpacity>
              )}
              
              {prestationType === 'service' && annonce?.prix_fixe === true && (
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => (navigation as any).navigate(`annonces/${annonceId}/reservations`)}
                >
                  <Text style={styles.iconButtonText}>📅</Text>
                </TouchableOpacity>
              )}
              
              {prestationType === 'service' && annonce?.prix_fixe === false && (
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: '#EAB308' }]}
                  onPress={() => (navigation as any).navigate(`annonces/${annonceId}/devis`)}
                >
                  <Text style={styles.iconButtonText}>📝</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.iconButton, isFavori ? styles.favoriActive : styles.favoriInactive]}
                onPress={isFavori ? handleRemoveFavori : handleAddFavori}
                disabled={favorisLoading}
              >
                <Text style={styles.iconButtonText}>{isFavori ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.sectionText}>{annonce.description}</Text>
        </View>

        {/* Modeles Section */}
        {prestationType === 'produit' && modeles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Modèles disponibles ({modeles.length})</Text>
            {modeles.map((modele, index) => (
              <View key={index} style={styles.modeleCard}>
                <TouchableOpacity 
                  style={styles.modeleImageContainer}
                  onPress={() => modele.photo_url && modele.photo_url.length > 0 && setSelectedModelPhoto({ modele, photoIndex: 0 })}
                >
                  {modele.photo_url && modele.photo_url.length > 0 ? (
                    <Image
                      source={{ 
                        uri: modele.photo_url[0].startsWith('data:') 
                          ? modele.photo_url[0] 
                          : `data:image/*;base64,${modele.photo_url[0]}`
                      }}
                      style={styles.modeleImage}
                    />
                  ) : (
                    <View style={styles.modelePlaceholder}>
                      <Text style={styles.modelePlaceholderText}>📦</Text>
                    </View>
                  )}
                  <View style={styles.modelePriceBadge}>
                    <Text style={styles.modelePriceText}>{modele.prix}€</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.modeleInfo}>
                  <Text style={styles.modeleTitle}>{modele.titre}</Text>
                  {modele.description && (
                    <Text style={styles.modeleDescription} numberOfLines={2}>{modele.description}</Text>
                  )}
                  <Text style={styles.modelePrice}>{modele.prix}€</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarification</Text>
          {annonce.prix_fixe ? (
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>{annonce.tarif_unit}€</Text>
              <Text style={styles.priceUnit}>{annonce.unit_tarif}</Text>
              <Text style={styles.priceLabel}>Prix fixe</Text>
            </View>
          ) : (
            <View style={styles.priceBox}>
              <Text style={styles.priceDevis}>Sur devis</Text>
              <Text style={styles.priceLabel}>Tarification personnalisée</Text>
            </View>
          )}
          {annonce.acompte_percent && (
            <View style={styles.acompteBox}>
              <Text style={styles.acompteText}>
                Acompte requis : {annonce.acompte_percent}% à la réservation
              </Text>
            </View>
          )}
        </View>

        {/* Photos Section */}
        {annonce.photos && annonce.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Photos de l'annonce ({annonce.photos.length})</Text>
            <View style={styles.photosGrid}>
              {annonce.photos.map((photo: string, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.photoContainer}
                  onPress={() => setSelectedPhotoIndex(index)}
                >
                  <Image
                    source={{ 
                      uri: photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`
                    }}
                    style={styles.photoThumbnail}
                  />
                  <View style={styles.photoIndexBadge}>
                    <Text style={styles.photoIndexText}>{index + 1}/{annonce.photos.length}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Avis Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => (navigation as any).navigate(`annonces/${annonceId}/avis`)}
          >
            <Text style={styles.sectionTitle}>⭐ Avis clients {totalAvis > 0 && `(${totalAvis})`}</Text>
            <Text style={styles.seeAllLink}>Voir tout →</Text>
          </TouchableOpacity>
          
          {avis.length > 0 ? (
            <View style={styles.avisContainer}>
              <View style={styles.avgRatingBox}>
                <Text style={styles.avgRatingScore}>{avgRating}</Text>
                {renderStars(avgRating)}
                <Text style={styles.avgRatingText}>sur {totalAvis} avis</Text>
              </View>
              {avis.slice(0, 3).map((avisItem, index) => (
                <View key={index} style={styles.avisCard}>
                  <View style={styles.avisHeader}>
                    <View style={styles.avisUserAvatar}>
                      <Text style={styles.avisUserAvatarText}>👤</Text>
                    </View>
                    <View style={styles.avisUserInfo}>
                      <Text style={styles.avisUserName}>{avisItem.particulier?.nom || 'Client anonyme'}</Text>
                      {renderStars(avisItem.note)}
                    </View>
                  </View>
                  {avisItem.commentaire && (
                    <Text style={styles.avisComment} numberOfLines={3}>"{avisItem.commentaire}"</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noAvisText}>Aucun avis pour le moment</Text>
          )}
        </View>
      </ScrollView>

      {/* Photo Modal */}
      <Modal visible={selectedPhotoIndex !== null} transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhotoIndex !== null && annonce.photos && (
            <Image
              source={{ 
                uri: annonce.photos[selectedPhotoIndex]?.startsWith('data:') 
                  ? annonce.photos[selectedPhotoIndex] 
                  : `data:image/jpeg;base64,${annonce.photos[selectedPhotoIndex]}`
              }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 18
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18
  },
  previewBanner: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 32,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center'
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#E2E8F0'
  },
  profileInfo: {
    marginTop: 24,
    alignItems: 'center',
    width: '100%'
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8
  },
  profileLocation: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 12
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4
  },
  star: {
    fontSize: 20
  },
  ratingText: {
    color: '#475569',
    fontWeight: '500'
  },
  avisCount: {
    color: '#64748B'
  },
  description: {
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    gap: 16
  },
  statBox: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6'
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B'
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center'
  },
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonText: {
    fontSize: 24
  },
  favoriActive: {
    borderWidth: 2,
    borderColor: '#EC4899',
    backgroundColor: '#fff'
  },
  favoriInactive: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff'
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16
  },
  sectionText: {
    color: '#475569',
    lineHeight: 24
  },
  seeAllLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500'
  },
  modeleCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC'
  },
  modeleImageContainer: {
    height: 200,
    position: 'relative'
  },
  modeleImage: {
    width: '100%',
    height: '100%'
  },
  modelePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0'
  },
  modelePlaceholderText: {
    fontSize: 64
  },
  modelePriceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8
  },
  modelePriceText: {
    color: '#fff',
    fontWeight: '600'
  },
  modeleInfo: {
    padding: 16
  },
  modeleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8
  },
  modeleDescription: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8
  },
  modelePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'right'
  },
  priceBox: {
    alignItems: 'center',
    padding: 16
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981'
  },
  priceUnit: {
    fontSize: 18,
    color: '#64748B',
    marginTop: 4
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8
  },
  priceDevis: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6'
  },
  acompteBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8
  },
  acompteText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500'
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  photoContainer: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    position: 'relative'
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8
  },
  photoIndexBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  photoIndexText: {
    color: '#fff',
    fontSize: 10
  },
  avisContainer: {
    gap: 16
  },
  avgRatingBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8
  },
  avgRatingScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#EAB308',
    marginBottom: 8
  },
  avgRatingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8
  },
  avisCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8
  },
  avisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  avisUserAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avisUserAvatarText: {
    fontSize: 20
  },
  avisUserInfo: {
    flex: 1
  },
  avisUserName: {
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4
  },
  avisComment: {
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20
  },
  noAvisText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    paddingVertical: 32
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 24
  },
  modalImage: {
    width: width * 0.9,
    height: width * 0.9
  }
});
