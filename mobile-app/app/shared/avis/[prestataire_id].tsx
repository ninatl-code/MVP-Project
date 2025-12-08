import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import StarRating from '../../components/avis/StarRating';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  star: '#FCD34D'
};

interface Avis {
  id: string;
  notation: number;
  commentaire: string;
  photos?: string[];
  created_at: string;
  client: {
    nom: string;
    photos?: string[];
  };
}

interface PrestataireInfo {
  nom: string;
  photos?: string[];
  note_moyenne: number;
  nombre_avis: number;
}

export default function AvisPrestataire() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { prestataire_id } = params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [prestataire, setPrestataire] = useState<PrestataireInfo | null>(null);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  useEffect(() => {
    fetchData();
  }, [prestataire_id]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Récupérer les infos du prestataire
      const { data: prestataireData, error: prestataireError } = await supabase
        .from('profiles')
        .select('nom, photos, note_moyenne, nombre_avis')
        .eq('id', prestataire_id)
        .single();

      if (prestataireError) throw prestataireError;

      setPrestataire({
        nom: prestataireData.nom || 'Prestataire',
        photos: prestataireData.photos,
        note_moyenne: prestataireData.note_moyenne || 0,
        nombre_avis: prestataireData.nombre_avis || 0
      });

      // Récupérer les avis
      const { data: avisData, error: avisError } = await supabase
        .from('avis')
        .select(`
          id,
          note,
          commentaire,
          created_at,
          particulier_id,
          client:profiles!particulier_id(nom, photos)
        `)
        .eq('prestataire_id', prestataire_id)
        .order('created_at', { ascending: false });

      if (avisError) throw avisError;

      const formattedAvis = (avisData || []).map((a: any) => ({
        id: a.id,
        notation: a.note,
        commentaire: a.commentaire,
        created_at: a.created_at,
        client: {
          nom: a.client?.nom || 'Client',
          photos: a.client?.photos
        }
      }));

      setAvis(formattedAvis);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchData(true);
  };

  const filteredAvis = avis.filter((a) => {
    if (filter === 'all') return true;
    return a.notation === parseInt(filter);
  });

  const getStarDistribution = () => {
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avis.forEach((a) => {
      distribution[a.notation] = (distribution[a.notation] || 0) + 1;
    });
    return distribution;
  };

  const starDistribution = getStarDistribution();

  const renderAvisCard = ({ item }: { item: Avis }) => {
    return (
      <View style={styles.avisCard}>
        <View style={styles.avisHeader}>
          <View style={styles.clientInfo}>
            {item.client.photos?.[0] ? (
              <Image source={{ uri: item.client.photos[0] }} style={styles.clientPhoto} />
            ) : (
              <View style={styles.clientPhotoPlaceholder}>
                <Ionicons name="person" size={20} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>{item.client.nom}</Text>
              <Text style={styles.avisDate}>
                {new Date(item.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
          <StarRating rating={item.notation} size={16} />
        </View>

        <Text style={styles.avisCommentaire}>{item.commentaire}</Text>

        {item.photos && item.photos.length > 0 && (
          <View style={styles.avisPhotos}>
            {item.photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.avisPhoto} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbox-ellipses-outline" size={64} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Aucun avis</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Ce prestataire n\'a pas encore reçu d\'avis'
          : `Aucun avis avec ${filter} étoile(s)`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des avis...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avis et évaluations</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Info prestataire et note globale */}
      {prestataire && (
        <View style={styles.prestataireSection}>
          <View style={styles.prestataireCard}>
            {prestataire.photos?.[0] ? (
              <Image source={{ uri: prestataire.photos[0] }} style={styles.prestatairePhoto} />
            ) : (
              <View style={styles.prestatairePhotoPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.prestataireInfo}>
              <Text style={styles.prestataireName}>{prestataire.nom}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingValue}>
                  {prestataire.note_moyenne > 0 ? prestataire.note_moyenne.toFixed(1) : 'N/A'}
                </Text>
                <StarRating rating={prestataire.note_moyenne} size={20} />
                <Text style={styles.ratingCount}>({prestataire.nombre_avis})</Text>
              </View>
            </View>
          </View>

          {/* Distribution des étoiles */}
          <View style={styles.distributionCard}>
            <Text style={styles.distributionTitle}>Répartition des notes</Text>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starDistribution[star] || 0;
              const percentage = avis.length > 0 ? (count / avis.length) * 100 : 0;
              return (
                <TouchableOpacity
                  key={star}
                  style={styles.distributionRow}
                  onPress={() => setFilter(count > 0 ? (star.toString() as any) : 'all')}
                >
                  <Text style={styles.distributionStar}>{star}</Text>
                  <Ionicons name="star" size={16} color={COLORS.star} />
                  <View style={styles.distributionBarContainer}>
                    <View style={[styles.distributionBar, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.distributionCount}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtersSection}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            Tous ({avis.length})
          </Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = starDistribution[star] || 0;
          if (count === 0) return null;
          return (
            <TouchableOpacity
              key={star}
              style={[styles.filterButton, filter === star.toString() && styles.filterButtonActive]}
              onPress={() => setFilter(star.toString() as any)}
            >
              <Ionicons
                name="star"
                size={14}
                color={filter === star.toString() ? COLORS.background : COLORS.star}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  filter === star.toString() && styles.filterButtonTextActive
                ]}
              >
                {star} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des avis */}
      <FlatList
        data={filteredAvis}
        renderItem={renderAvisCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredAvis.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  prestataireSection: {
    padding: 20,
    gap: 16
  },
  prestataireCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  prestatairePhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16
  },
  prestatairePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  prestataireInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  prestataireName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary
  },
  ratingCount: {
    fontSize: 14,
    color: COLORS.textLight
  },
  distributionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  distributionStar: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 20
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  distributionBar: {
    height: '100%',
    backgroundColor: COLORS.star,
    borderRadius: 4
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 30,
    textAlign: 'right'
  },
  filtersSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
    flexWrap: 'wrap'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  filterButtonTextActive: {
    color: COLORS.background
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  listContentEmpty: {
    flexGrow: 1
  },
  avisCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  clientPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  clientPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  clientDetails: {
    flex: 1
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  avisDate: {
    fontSize: 12,
    color: COLORS.textLight
  },
  avisCommentaire: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12
  },
  avisPhotos: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  avisPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20
  }
});
