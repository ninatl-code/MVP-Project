import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Wedding', value: 'Mariage' },
  { label: 'Events', value: 'Événementiel' },
  { label: 'Catering', value: 'Traiteur' },
  { label: 'DJ & Music', value: 'DJ & Musique' },
  { label: 'Photography', value: 'Photographie' },
  { label: 'Videography', value: 'Vidéographie' },
  { label: 'Cleaning', value: 'Ménage' },
  { label: 'Plumbing', value: 'Plomberie' },
  { label: 'Electrical', value: 'Électricité' },
  { label: 'Gardening', value: 'Jardinage' },
  { label: 'Painting', value: 'Peinture' },
  { label: 'Masonry', value: 'Maçonnerie' },
  { label: 'Carpentry', value: 'Menuiserie' },
  { label: 'Renovation', value: 'Rénovation' },
  { label: 'Hairdressing', value: 'Coiffure' },
  { label: 'Makeup', value: 'Maquillage' },
  { label: 'Web Development', value: 'Développement web' },
  { label: 'Design', value: 'Design' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Moving', value: 'Déménagement' },
  { label: 'Delivery', value: 'Livraison' },
  { label: 'Private Tutoring', value: 'Cours particuliers' },
  { label: 'Coaching', value: 'Coaching' },
];

const SORT_OPTIONS = [
  { label: 'Rating', value: 'note' },
  { label: 'Price', value: 'tarif' },
  { label: 'Newest', value: 'recent' },
];

interface Photographe {
  id: string;
  bio: string;
  specialisations: string[];
  rayon_deplacement_km: number;
  note_moyenne: number;
  tarif_horaire_min: number; 
  nb_avis: number;
  statut_validation: 'suspendu' | 'en_attente' | 'valide' | 'refuse';
  portfolio_photos: any[];
  photographe_profile?: {
    nom: string;
    prenom: string;
    ville: string;
    avatar_url: string; 
    suspendu: boolean;
  };
}

export default function SearchPhotographes() {
  const router = useRouter();
  const [photographes, setPhotographes] = useState<Photographe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [sortBy, setSortBy] = useState('note');
  const [showFilters, setShowFilters] = useState(false);
  const [budgetMax, setBudgetMax] = useState('');
  const [villeFilter, setVilleFilter] = useState('');
  const [noteMin, setNoteMin] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 10;

  const loadPhotographes = async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const from = append ? page * PAGE_SIZE : 0;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('profiles')
        .select(`
          id,
          nom,
          prenom,
          ville,
          avatar_url,
          profils_prestataire (
            bio,
            specialisations,
            rayon_deplacement_km,
            tarif_horaire_min,
            note_moyenne,
            nb_avis,
            statut_validation,
            portfolio_photos
          )
        `, { count: 'exact' })
        .eq('role', 'photographe')
        .range(from, to);

      if (error) throw error;

      // Only keep providers who have completed their profile and are not suspended
      let formattedData = (data || [])
        .map((p: any) => {
          const presta = Array.isArray(p.profils_prestataire) ? p.profils_prestataire[0] : p.profils_prestataire;
          if (!presta) return null;
          return {
            id: p.id,
            bio: presta.bio,
            specialisations: presta.specialisations || [],
            rayon_deplacement_km: presta.rayon_deplacement_km,
            tarif_horaire_min: presta.tarif_horaire_min,
            note_moyenne: presta.note_moyenne || 0,
            nb_avis: presta.nb_avis || 0,
            statut_validation: presta.statut_validation,
            portfolio_photos: presta.portfolio_photos || [],
            photographe_profile: {
              nom: p.nom,
              prenom: p.prenom,
              ville: p.ville,
              avatar_url: p.avatar_url,
            },
          };
        })
        .filter((p: any): p is NonNullable<typeof p> => !!p && p.statut_validation !== 'suspendu');

      // Filter by category
      if (selectedCategorie) {
        formattedData = formattedData.filter((p) => p.specialisations?.includes(selectedCategorie));
      }

      // Filter by budget
      if (budgetMax) {
        formattedData = formattedData.filter((p) => (p.tarif_horaire_min || 0) <= parseFloat(budgetMax));
      }

      // Filter by city
      if (villeFilter) {
        formattedData = formattedData.filter((p) =>
          p.photographe_profile?.ville?.toLowerCase().includes(villeFilter.toLowerCase())
        );
      }

      // Filter by minimum rating
      if (noteMin) {
        formattedData = formattedData.filter((p) => (p.note_moyenne || 0) >= parseFloat(noteMin));
      }

      // Sort
      let sortedData = [...formattedData];
      switch (sortBy) {
        case 'note':
          sortedData.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
          break;
        case 'tarif':
          sortedData.sort((a, b) => (a.tarif_horaire_min || 0) - (b.tarif_horaire_min || 0));
          break;
        case 'recent':
          sortedData.reverse();
          break;
      }

      // Text search
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        sortedData = sortedData.filter(
          (p) =>
            `${p.photographe_profile?.prenom || ''} ${p.photographe_profile?.nom || ''}`.toLowerCase().includes(search) ||
            p.bio?.toLowerCase().includes(search) ||
            p.specialisations?.some((s: string) => s.toLowerCase().includes(search))
        );
      }

      if (append) {
        setPhotographes(prev => [...prev, ...sortedData]);
        setPage(prev => prev + 1);
      } else {
        setPhotographes(sortedData);
        setPage(1);
      }
      setHasMore(sortedData.length >= PAGE_SIZE && (count || 0) > (append ? (page + 1) * PAGE_SIZE : PAGE_SIZE));
    } catch (error: any) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadPhotographes(false);
  }, [selectedCategorie, sortBy, budgetMax, villeFilter, noteMin, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    loadPhotographes(false);
  }, [selectedCategorie, sortBy, budgetMax, villeFilter, noteMin, searchQuery]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPhotographes(true);
    }
  };

  const getCategoryIcon = (category: string): any => {
    const icons: { [key: string]: any } = {
      'Mariage': 'heart',
      'Portrait': 'person',
      'Événementiel': 'calendar',
      'Corporate': 'business',
      'Produit': 'cube',
      'Architecture': 'business',
      'Nature': 'leaf',
      'Sport': 'football',
      'Mode': 'shirt',
      'Culinaire': 'restaurant',
    };
    return icons[category] || 'camera';
  };

  const handleContactPhotographe = async (photographeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login' as any);
        return;
      }

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)
        .eq('prestataire_id', photographeId)
        .maybeSingle();

      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: created, error } = await supabase
          .from('conversations')
          .insert({ client_id: user.id, prestataire_id: photographeId })
          .select('id')
          .single();
        if (error) throw error;
        conversationId = created?.id;
      }

      router.push(`/shared/messages/chat-conversation?id=${conversationId}` as any);
    } catch (error) {
      console.error('Error creating conversation:', error);
      router.push('/shared/messages/messages-list' as any);
    }
  };

  const renderPhotographeCard = ({ item }: { item: Photographe }) => {
    const portfolioPhoto = item.portfolio_photos?.[0]?.url;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/client/photographes/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Image
            source={
              item.photographe_profile?.avatar_url
                ? { uri: item.photographe_profile.avatar_url }
                : require('@/assets/images/shutterstock_2502519999.jpg')
            }
            style={styles.avatar}
          />
          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {item.photographe_profile?.prenom || ''} {item.photographe_profile?.nom || 'Provider'}
              </Text>
              {item.statut_validation === 'valide' && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
            </View>
            {item.note_moyenne > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFB300" />
                <Text style={styles.ratingText}>
                  {item.note_moyenne.toFixed(1)} ({item.nb_avis})
                </Text>
              </View>
            )}
          </View>
        </View>

        {portfolioPhoto && (
          <Image source={{ uri: portfolioPhoto }} style={styles.portfolioImage} />
        )}

        {item.bio && <Text style={styles.bio} numberOfLines={3}>{item.bio}</Text>}

        <View style={styles.specialisationsContainer}>
          {item.specialisations?.slice(0, 3).map((spec: string, index: number) => (
            <View key={index} style={styles.specialisationChip}>
              <Text style={styles.specialisationText}>{spec}</Text>
            </View>
          ))}
          {item.specialisations?.length > 3 && (
            <View style={styles.specialisationChip}>
              <Text style={styles.specialisationText}>+{item.specialisations.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              From {item.tarif_horaire_min} MAD
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.rayon_deplacement_km} km
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={(e) => {
            e.stopPropagation();
            handleContactPhotographe(item.id);
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonTextGroup}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonRating} />
        </View>
      </View>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonBio} />
      <View style={styles.skeletonChips}>
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#130183', '#5C6BC0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContentWrapper}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.welcomeText}>Welcome</Text>
                <Text style={styles.title}>Find your provider</Text>
              </View>
            </View>
            <View style={styles.searchBarHeader}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput style={styles.searchInput} placeholder="Search by name or specialty..." placeholderTextColor="#999" />
            </View>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.skeletonContainer}>
          {[1, 2, 3].map(i => <View key={i}>{renderSkeleton()}</View>)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#130183', '#5C6BC0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContentWrapper}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.title}>Find your provider</Text>
            </View>
          </View>

          {/* Search bar in header */}
          <View style={styles.searchBarHeader}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or specialty..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Quick categories */}
      <View style={styles.quickCategoriesSection}>
        <Text style={styles.sectionTitle}>Popular categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickCategoriesScroll}
        >
          {CATEGORIES.filter(c => c.value !== '').slice(0, 6).map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.quickCategoryCard,
                selectedCategorie === cat.value && styles.quickCategoryCardSelected,
              ]}
              onPress={() => setSelectedCategorie(cat.value)}
            >
              <View style={styles.categoryIcon}>
                <Ionicons 
                  name={getCategoryIcon(cat.value)} 
                  size={28} 
                  color={selectedCategorie === cat.value ? '#fff' : '#5C6BC0'} 
                />
              </View>
              <Text style={[
                styles.quickCategoryText,
                selectedCategorie === cat.value && styles.quickCategoryTextSelected,
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Advanced filters */}
      <View style={styles.filtersBar}>
        <TouchableOpacity
          style={styles.filterButtonNew}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortOptionsScroll}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortChip, sortBy === option.value && styles.sortChipSelected]}
              onPress={() => setSortBy(option.value)}
            >
              <Text style={[styles.sortChipText, sortBy === option.value && styles.sortChipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showFilters && (
        <View style={styles.advancedFilters}>
          <Text style={styles.filterLabel}>City</Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="Ex: Casablanca"
            value={villeFilter}
            onChangeText={setVilleFilter}
            placeholderTextColor="#999"
          />

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Max budget (MAD)</Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="Ex: 800"
            value={budgetMax}
            onChangeText={setBudgetMax}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Minimum rating</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['', '3', '4', '4.5'].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.sortChip, noteMin === val && styles.sortChipSelected]}
                onPress={() => setNoteMin(val)}
              >
                <Text style={[styles.sortChipText, noteMin === val && styles.sortChipTextSelected]}>
                  {val === '' ? 'All' : `${val}+ ⭐`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.resultCount}>
        {photographes.length} provider{photographes.length > 1 ? 's' : ''} available
      </Text>

      {photographes.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <Ionicons name="camera-outline" size={80} color="#E8EAF6" />
          </View>
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptyText}>
            {selectedCategorie 
              ? `No providers available for the "${selectedCategorie}" category`
              : "Try modifying your search criteria"
            }
          </Text>
          
          {selectedCategorie && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setSelectedCategorie('')}
            >
              <Text style={styles.resetButtonText}>Show all providers</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={photographes}
          renderItem={renderPhotographeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5C6BC0']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 70,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContentWrapper: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  quickCategoriesSection: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quickCategoriesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickCategoryCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  quickCategoryCardSelected: {
    backgroundColor: '#130183',
    borderColor: '#130183',
  },
  categoryIcon: {
    marginBottom: 8,
  },
  quickCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quickCategoryTextSelected: {
    color: '#fff',
  },
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  filterButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#130183',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sortOptionsScroll: {
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  sortChipSelected: {
    backgroundColor: '#E8EAF6',
  },
  sortChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  sortChipTextSelected: {
    color: '#130183',
    fontWeight: '700',
  },
  advancedFilters: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  budgetInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  portfolioImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  specialisationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  specialisationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    marginRight: 6,
    marginBottom: 6,
  },
  specialisationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#130183',
    padding: 14,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#130183',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIllustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  guideSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  guideSteps: {
    gap: 16,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  guideStepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#130183',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  guideStepText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#130183',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#130183',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
  },
  skeletonTextGroup: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonName: {
    width: '60%',
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  skeletonRating: {
    width: '40%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  skeletonImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  skeletonBio: {
    width: '90%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  skeletonChips: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonChip: {
    width: 80,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
  },
});