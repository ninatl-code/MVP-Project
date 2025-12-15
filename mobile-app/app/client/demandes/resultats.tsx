import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import { COLORS } from '../../../constants/Colors';

interface PhotographerCard {
  id: string;
  nom: string;
  avatar: string;
  rating: number;
  reviews: number;
  specialities: string[];
  price_range: { min: number; max: number };
  match_score: number;
  match_reasons: string[];
  distance?: number;
  bio: string;
}

export default function RésultatsRecherche() {
  const insets = useSafeAreaInsets();
  const [photographers, setPhotographers] = useState<PhotographerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'price' | 'rating'>('score');
  const [demandeId, setDemandeId] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Récupérer l'ID de la dernière demande créée
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: demandes } = await supabase
        .from('demandes_client')
        .select('id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!demandes || demandes.length === 0) {
        Alert.alert('Erreur', 'Demande non trouvée');
        return;
      }

      setDemandeId(demandes[0].id);

      // Récupérer les matchings pour cette demande
      const { data: matchings } = await supabase
        .from('matchings')
        .select(`
          id,
          photographer_id,
          match_score,
          match_reasons
        `)
        .eq('demande_id', demandes[0].id)
        .eq('status', 'pending')
        .order('match_score', { ascending: false });

      // Récupérer les infos photographe pour chaque matching
      const photographerIds = matchings?.map(m => m.photographer_id) || [];
      
      let photographersData: any[] = [];
      if (photographerIds.length > 0) {
        const { data: photographers } = await supabase
          .from('profils_photographe')
          .select(`
            id,
            bio,
            specialisations,
            tarifs_indicatifs,
            rating_moyen,
            nombre_avis
          `)
          .in('id', photographerIds);
        
        photographersData = photographers || [];
      }

      // Récupérer les profils pour les données de nom et avatar
      let profilesData: any = {};
      if (photographerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`
            id,
            nom,
            avatar_url
          `)
          .in('id', photographerIds);
        
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesData[p.id] = p;
          });
        }
      }

      if (!matchings) return;

      const formatted: PhotographerCard[] = matchings?.map(match => {
        const photo = photographersData.find((p: any) => p.id === match.photographer_id);
        const profile = profilesData[match.photographer_id];
        
        return {
          id: match.photographer_id,
          nom: profile?.nom || 'Photographe',
          avatar: profile?.avatar_url || '',
          rating: photo?.rating_moyen || 0,
          reviews: photo?.nombre_avis || 0,
          specialities: photo?.specialisations || [],
          price_range: photo?.tarifs_indicatifs || { min: 0, max: 0 },
          match_score: match.match_score || 0,
          match_reasons: match.match_reasons || [],
          bio: photo?.bio || '',
        };
      }) || [];

      setPhotographers(formatted);
    } catch (error) {
      console.error('Erreur chargement résultats:', error);
      Alert.alert('Erreur', 'Impossible de charger les résultats');
    } finally {
      setLoading(false);
    }
  };

  const sortedPhotographers = [...photographers].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.price_range.min || 0) - (b.price_range.min || 0);
      case 'rating':
        return b.rating - a.rating;
      case 'score':
      default:
        return b.match_score - a.match_score;
    }
  });

  const renderPhotographerCard = (photographer: PhotographerCard) => (
    <View key={photographer.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: photographer.avatar || 'https://via.placeholder.com/80' }}
          style={styles.avatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{photographer.nom}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {photographer.rating.toFixed(1)}</Text>
            <Text style={styles.reviews}>({photographer.reviews} avis)</Text>
          </View>
          <Text style={styles.bio} numberOfLines={2}>{photographer.bio}</Text>
        </View>

        {/* Score de matching */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>{photographer.match_score}%</Text>
          <Text style={styles.scoreLabel}>Match</Text>
        </View>
      </View>

      {/* Raisons du matching */}
      {photographer.match_reasons.length > 0 && (
        <View style={styles.reasonsContainer}>
          {photographer.match_reasons.slice(0, 3).map((reason, idx) => (
            <Text key={idx} style={styles.reason}>
              ✓ {reason}
            </Text>
          ))}
          {photographer.match_reasons.length > 3 && (
            <Text style={styles.moreReasons}>
              +{photographer.match_reasons.length - 3} raisons supplémentaires
            </Text>
          )}
        </View>
      )}

      {/* Spécialités & Prix */}
      <View style={styles.tagsRow}>
        {photographer.specialities.slice(0, 2).map(spec => (
          <View key={spec} style={styles.tag}>
            <Text style={styles.tagText}>{spec}</Text>
          </View>
        ))}
        {photographer.specialities.length > 2 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>+{photographer.specialities.length - 2}</Text>
          </View>
        )}
      </View>

      {/* Prix estimé */}
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Tarif estimé:</Text>
        <Text style={styles.price}>
          €{photographer.price_range.min || '?'} - €{photographer.price_range.max || '?'}
        </Text>
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push(`/photographe/${photographer.id}` as any)}
        >
          <Text style={styles.buttonSecondaryText}>Voir profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => {
            // TODO: Implémenter messaging/devis
            Alert.alert('Succès', 'Demande de devis envoyée!');
          }}
        >
          <Text style={styles.buttonPrimaryText}>Demander un devis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Résultats ({photographers.length})</Text>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'score' && styles.sortButtonActive]}
          onPress={() => setSortBy('score')}
        >
          <Text style={[
            styles.sortButtonText,
            sortBy === 'score' && styles.sortButtonTextActive,
          ]}>
            Meilleur match
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
          onPress={() => setSortBy('rating')}
        >
          <Text style={[
            styles.sortButtonText,
            sortBy === 'rating' && styles.sortButtonTextActive,
          ]}>
            Top notés
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
          onPress={() => setSortBy('price')}
        >
          <Text style={[
            styles.sortButtonText,
            sortBy === 'price' && styles.sortButtonTextActive,
          ]}>
            Prix bas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photographers List */}
      {photographers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucun photographe trouvé</Text>
          <Text style={styles.emptySubtext}>Essayez d'ajuster vos critères</Text>
        </View>
      ) : (
        <FlatList
          data={sortedPhotographers}
          renderItem={({ item }) => renderPhotographerCard(item)}
          keyExtractor={item => item.id}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sortButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
    marginRight: 6,
  },
  reviews: {
    fontSize: 12,
    color: '#888',
  },
  bio: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  scoreBox: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#FFF',
    marginTop: 2,
  },
  reasonsContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  reason: {
    fontSize: 12,
    color: '#10B981',
    marginBottom: 4,
    fontWeight: '500',
  },
  moreReasons: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F5FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  buttonSecondaryText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
});
