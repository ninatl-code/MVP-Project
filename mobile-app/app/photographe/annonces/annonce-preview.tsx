import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
  info: '#3B82F6'
};

interface Annonce {
  id: string;
  titre: string;
  description: string;
  tarif_unit?: number;
  unit_tarif?: string;
  prix_fixe?: number;
  photos: string[];
  actif: boolean;
  prestataire: string;
  equipement?: string;
  conditions_annulation?: string;
  acompte_percent?: number;
  rate?: number;
  vues?: number;
  prestations?: {
    nom: string;
    type: string;
  };
  zones_intervention?: Array<{
    id: string;
    ville_centre: string;
    rayon_km: number;
    active: boolean;
  }>;
}

export default function AnnoncePreviewPrestataire() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (id) fetchAnnonce();
  }, [id]);

  const fetchAnnonce = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('annonces')
        .select(`
          *,
          prestations(nom, type),
          zones_intervention(id, ville_centre, rayon_km, active)
        `)
        .eq('id', id)
        .eq('prestataire', user.id)
        .single();

      if (error || !data) {
        setError('Annonce non trouvée');
        setLoading(false);
        return;
      }

      setAnnonce({
        ...data,
        photos: data.photos || [],
        prestations: Array.isArray(data.prestations) ? data.prestations[0] : data.prestations,
        zones_intervention: data.zones_intervention || []
      });
    } catch (err) {
      console.error('Erreur chargement annonce:', err);
      setError('Erreur lors du chargement de l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de l'aperçu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !annonce) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aperçu</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>{error || 'Annonce non trouvée'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aperçu de l'annonce</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: annonce.actif ? COLORS.success : COLORS.textLight }]}>
            <Text style={styles.statusBadgeText}>
              {annonce.actif ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewBanner}>
          <Ionicons name="eye-outline" size={20} color={COLORS.info} />
          <Text style={styles.previewBannerText}>
            Mode aperçu - Voici comment vos clients verront votre annonce
          </Text>
        </View>

        {annonce.photos.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {annonce.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View style={styles.paginationContainer}>
              {annonce.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.noImageText}>Aucune photo</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.title}>{annonce.titre}</Text>
          
          {annonce.prestations && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{annonce.prestations.nom}</Text>
              <Text style={styles.categoryType}>• {annonce.prestations.type}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{annonce.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarifs</Text>
          {annonce.prix_fixe ? (
            <>
              <View style={styles.priceCard}>
                <Ionicons name="pricetag-outline" size={24} color={COLORS.success} />
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>Prix de la prestation</Text>
                  <Text style={styles.priceValue}>{annonce.prix_fixe} MAD</Text>
                </View>
              </View>
            </>
          ) : annonce.tarif_unit ? (
            <View style={styles.priceCard}>
              <Ionicons name="cash-outline" size={24} color={COLORS.success} />
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Tarif unitaire</Text>
                <Text style={styles.priceValue}>
                  {annonce.tarif_unit} MAD/{annonce.unit_tarif === 'demi_journee' ? 'demi-journée' : 
                   annonce.unit_tarif === 'seance' ? 'séance' : annonce.unit_tarif}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>Tarif sur devis</Text>
          )}

          {annonce.acompte_percent && annonce.acompte_percent > 0 && (
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={20} color={COLORS.info} />
              <Text style={styles.infoText}>
                Acompte requis à la réservation : {annonce.acompte_percent}%
              </Text>
            </View>
          )}
        </View>

        {annonce.equipement && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Équipement fourni</Text>
            <View style={styles.infoCard}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{annonce.equipement}</Text>
            </View>
          </View>
        )}

        {annonce.conditions_annulation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions d'annulation</Text>
            <View style={[
              styles.conditionCard,
              {
                backgroundColor: annonce.conditions_annulation === 'Flexible' ? '#d1fae5' :
                               annonce.conditions_annulation === 'Modéré' ? '#fef3c7' : '#fee2e2',
                borderColor: annonce.conditions_annulation === 'Flexible' ? '#a5d6a7' :
                            annonce.conditions_annulation === 'Modéré' ? '#fde68a' : '#fecaca'
              }
            ]}>
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color={
                  annonce.conditions_annulation === 'Flexible' ? '#065f46' :
                  annonce.conditions_annulation === 'Modéré' ? '#92400e' : '#991b1b'
                } 
              />
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.conditionText,
                  {
                    color: annonce.conditions_annulation === 'Flexible' ? '#065f46' :
                           annonce.conditions_annulation === 'Modéré' ? '#92400e' : '#991b1b'
                  }
                ]}>
                  {annonce.conditions_annulation}
                </Text>
                <Text style={styles.conditionDescription}>
                  {annonce.conditions_annulation === 'Flexible' 
                    ? "Annulation gratuite jusqu'à 24h avant le début de la prestation. Remboursement intégral."
                    : annonce.conditions_annulation === 'Modéré'
                    ? "Annulation gratuite jusqu'à 7 jours avant. Entre 7 jours et 24h : remboursement de 50%. Moins de 24h : pas de remboursement."
                    : "Annulation gratuite jusqu'à 14 jours avant. Après ce délai : pas de remboursement."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Zones d'intervention */}
        {annonce.zones_intervention && annonce.zones_intervention.filter(z => z.active !== false).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zones d'intervention</Text>
            <View style={styles.zonesContainer}>
              {annonce.zones_intervention.filter(z => z.active !== false).map((zone) => (
                <View key={zone.id} style={styles.zoneBadge}>
                  <Ionicons name="location-outline" size={14} color="#2e7d32" />
                  <Text style={styles.zoneText}>
                    {zone.ville_centre} ({zone.rayon_km} km)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Statistiques */}
        {annonce.rate !== undefined && annonce.rate > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Évaluation</Text>
            <View style={styles.statCard}>
              <Ionicons name="star" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{annonce.rate.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: 16,
    textAlign: 'center'
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8
  },
  errorButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.info
  },
  previewBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    fontWeight: '500'
  },
  carouselContainer: {
    height: 300,
    backgroundColor: COLORS.backgroundLight
  },
  carouselImage: {
    width: width,
    height: 300
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)'
  },
  paginationDotActive: {
    backgroundColor: COLORS.background,
    width: 20
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.background,
    marginTop: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  },
  categoryType: {
    fontSize: 14,
    color: COLORS.textLight
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textLight
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  priceInfo: {
    flex: 1
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.success
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic'
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  conditionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    opacity: 0.8
  },
  zonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a5d6a7'
  },
  zoneText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2e7d32'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4
  }
});
