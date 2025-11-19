import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  Alert,
  TextInput,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import SearchBar from '../components/ui/SearchBar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { InlineLoadingSpinner } from '../components/ui/LoadingSpinner';
import { COLORS, TYPOGRAPHY, SPACING } from '../lib/constants';

const { width } = Dimensions.get('window');

interface Prestation {
  id: string;
  nom: string;
}

interface Ville {
  id: string;
  ville: string;
}

interface SearchResult {
  id: string;
  titre: string;
  description: string;
  tarif_unit: number;
  unit_tarif: string;
  rate: number;
  nb_avis: number;
  photos: string[];
  prestataire: string;
  profiles: {
    nom: string;
    email: string;
    photos: string;
  };
  prestations: {
    nom: string;
  };
  zones_intervention: Array<{
    ville_centre: string;
    rayon_km: number;
  }>;
}

interface PriceRange {
  min: string;
  max: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [selectedPrestation, setSelectedPrestation] = useState<string>('all');
  const [selectedVille, setSelectedVille] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: '', max: '' });
  const [sortBy, setSortBy] = useState<string>('rating');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Load prestations and villes from Supabase
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const { data: prestationsData } = await supabase
        .from('prestations')
        .select('id, nom')
        .order('nom', { ascending: true });
      setPrestations(prestationsData || []);

      const { data: zonesData } = await supabase
        .from('zones_intervention')
        .select('ville_centre')
        .eq('active', true);
      
      const uniqueVilles = Array.from(new Set((zonesData || []).map((z: any) => z.ville_centre)));
      setVilles(uniqueVilles.map((ville, idx) => ({ id: idx.toString(), ville: ville as string })));
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  // Search for annonces based on filters
  useEffect(() => {
    if (searchTerm.length > 2 || selectedPrestation !== 'all' || selectedVille !== 'all') {
      searchAnnonces();
    } else {
      setResults([]);
      setTotalResults(0);
    }
  }, [searchTerm, selectedPrestation, selectedVille, priceRange, sortBy]);

  const searchAnnonces = async () => {
    setLoading(true);

    try {
      // 1. Get active zones for selected city
      let zonesQuery = supabase
        .from('zones_intervention')
        .select('annonce_id, ville_centre, active')
        .eq('active', true);
      
      if (selectedVille && selectedVille !== 'all') {
        zonesQuery = zonesQuery.eq('ville_centre', selectedVille);
      }
      
      const { data: zonesData, error: zonesError } = await zonesQuery;
      if (zonesError) {
        setResults([]);
        setLoading(false);
        return;
      }
      const annonceIds = zonesData.map((z: any) => z.annonce_id);

      // 2. Get active annonces
      let annoncesQuery = supabase
        .from('annonces')
        .select(`
          *,
          profiles:prestataire(nom, email, telephone, photos),
          prestations:prestation(nom)
        `)
        .eq('actif', true);
      
      if (selectedPrestation && selectedPrestation !== 'all') {
        annoncesQuery = annoncesQuery.eq('prestation', selectedPrestation);
      }
      
      if (searchTerm) {
        annoncesQuery = annoncesQuery.or(`titre.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      if (priceRange.min) {
        annoncesQuery = annoncesQuery.gte('tarif_unit', parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        annoncesQuery = annoncesQuery.lte('tarif_unit', parseFloat(priceRange.max));
      }
      
      if (selectedVille && selectedVille !== 'all') {
        if (annonceIds.length > 0) {
          annoncesQuery = annoncesQuery.in('id', annonceIds);
        } else {
          setResults([]);
          setLoading(false);
          return;
        }
      }

      // Sorting
      switch(sortBy) {
        case 'price_asc':
          annoncesQuery = annoncesQuery.order('tarif_unit', { ascending: true });
          break;
        case 'price_desc':
          annoncesQuery = annoncesQuery.order('tarif_unit', { ascending: false });
          break;
        case 'recent':
          annoncesQuery = annoncesQuery.order('created_at', { ascending: false });
          break;
        default:
          annoncesQuery = annoncesQuery.order('rate', { ascending: false });
      }

      const { data: annoncesData, error: annoncesError } = await annoncesQuery;
      if (annoncesError) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 3. Enrich each annonce with its intervention zones
      const annoncesAvecZones = await Promise.all(
        annoncesData.map(async (annonce: any) => {
          const { data: zones } = await supabase
            .from('zones_intervention')
            .select('ville_centre, rayon_km')
            .eq('annonce_id', annonce.id)
            .eq('active', true);
          return {
            ...annonce,
            zones_intervention: zones || []
          };
        })
      );

      setResults(annoncesAvecZones);
      setTotalResults(annoncesAvecZones.length);
    } catch (error) {
      console.error('Error searching:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedPrestation('all');
    setSelectedVille('all');
    setPriceRange({ min: '', max: '' });
    setSortBy('rating');
    setSearchTerm('');
  };

  const handleServicePress = (serviceId: string) => {
    router.push(`/annonces/${serviceId}`);
  };

  const getImageSource = (photos: string[]) => {
    if (photos && photos.length > 0) {
      const photo = photos[0];
      if (photo.startsWith('data:image')) {
        return { uri: photo };
      } else if (photo.length > 100) {
        return { uri: `data:image/jpeg;base64,${photo}` };
      } else if (photo.startsWith('http')) {
        return { uri: photo };
      }
    }
    return require('../assets/images/shutterstock_2502519999.jpg');
  };

  const renderServiceCard = (annonce: SearchResult) => {
    const prestaName = annonce.profiles?.nom || 'Photographe';
    const prestaType = annonce.prestations?.nom || 'Service photo';
    const villesZones = annonce.zones_intervention?.map(z => `${z.ville_centre} (${z.rayon_km}km)`).join(', ') || 'Non spécifié';
    
    return (
      <TouchableOpacity
        key={annonce.id}
        onPress={() => handleServicePress(annonce.id)}
        style={styles.serviceCard}
        activeOpacity={0.8}
      >
        <Card style={styles.cardContainer}>
          <View style={styles.imageContainer}>
            <Image 
              source={getImageSource(annonce.photos)} 
              style={styles.serviceImage}
              resizeMode="cover"
            />
            {annonce.photos?.length > 1 && (
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>+{annonce.photos.length - 1}</Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {annonce.rate || 5}/5</Text>
              {annonce.nb_avis > 0 && (
                <Text style={styles.reviewCount}>({annonce.nb_avis})</Text>
              )}
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.serviceTitle}>{annonce.titre}</Text>
            
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{prestaType}</Text>
              </View>
            </View>
            
            <Text style={styles.description} numberOfLines={2}>
              {annonce.description || 'Aucune description disponible'}
            </Text>
            
            <View style={styles.infoContainer}>
              <Text style={styles.providerName}>👤 {prestaName}</Text>
              <Text style={styles.location}>📍 {villesZones}</Text>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {annonce.tarif_unit > 0 ? 
                  `${annonce.tarif_unit}€/${annonce.unit_tarif || 'unité'}` : 
                  'Sur devis'
                }
              </Text>
              <Text style={styles.seeDetails}>Voir détails →</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <SearchBar
            placeholder="Rechercher un service..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFilterPress={() => setShowFilters(!showFilters)}
            showFilterButton
          />
        </View>

        {/* Quick Filters */}
        <View style={styles.quickFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.quickFilter, selectedPrestation === 'all' && styles.activeFilter]}
              onPress={() => setSelectedPrestation('all')}
            >
              <Text style={[styles.quickFilterText, selectedPrestation === 'all' && styles.activeFilterText]}>
                Tous
              </Text>
            </TouchableOpacity>
            {prestations.slice(0, 5).map((prestation) => (
              <TouchableOpacity
                key={prestation.id}
                style={[styles.quickFilter, selectedPrestation === prestation.id && styles.activeFilter]}
                onPress={() => setSelectedPrestation(prestation.id)}
              >
                <Text style={[styles.quickFilterText, selectedPrestation === prestation.id && styles.activeFilterText]}>
                  {prestation.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filtres avancés</Text>
            
            {/* Price Range */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Prix (€)</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  value={priceRange.min}
                  onChangeText={(text) => setPriceRange(prev => ({...prev, min: text}))}
                  placeholder="Min"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.priceInput}
                  value={priceRange.max}
                  onChangeText={(text) => setPriceRange(prev => ({...prev, max: text}))}
                  placeholder="Max"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Trier par</Text>
              <View style={styles.sortOptions}>
                {[
                  { value: 'rating', label: '⭐ Mieux notés' },
                  { value: 'price_asc', label: '💰 Prix croissant' },
                  { value: 'price_desc', label: '💎 Prix décroissant' },
                  { value: 'recent', label: '🆕 Plus récents' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.sortOption, sortBy === option.value && styles.activeSortOption]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[styles.sortOptionText, sortBy === option.value && styles.activeSortOptionText]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button 
              title="🔄 Réinitialiser les filtres" 
              variant="outline" 
              onPress={resetFilters}
              style={styles.resetButton}
            />
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <InlineLoadingSpinner />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          ) : results.length === 0 && (searchTerm.length > 2 || selectedPrestation !== 'all' || selectedVille !== 'all') ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Aucune annonce trouvée</Text>
              <Text style={styles.emptySubtitle}>Essayez de modifier vos critères de recherche</Text>
            </View>
          ) : results.length > 0 ? (
            <>
              <Text style={styles.resultsCount}>
                {totalResults} annonce{totalResults > 1 ? 's' : ''} trouvée{totalResults > 1 ? 's' : ''}
              </Text>
              {results.map(renderServiceCard)}
            </>
          ) : (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>🔍 Trouvez votre prestataire</Text>
              <Text style={styles.welcomeSubtitle}>Recherchez parmi nos services photo professionnels</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface Styles {
  container: ViewStyle;
  searchHeader: ViewStyle;
  quickFilters: ViewStyle;
  quickFilter: ViewStyle;
  activeFilter: ViewStyle;
  quickFilterText: TextStyle;
  activeFilterText: TextStyle;
  filtersContainer: ViewStyle;
  filtersTitle: TextStyle;
  filterRow: ViewStyle;
  filterLabel: TextStyle;
  priceInputs: ViewStyle;
  priceInput: TextStyle;
  sortOptions: ViewStyle;
  sortOption: ViewStyle;
  activeSortOption: ViewStyle;
  sortOptionText: TextStyle;
  activeSortOptionText: TextStyle;
  resetButton: ViewStyle;
  resultsContainer: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  emptyContainer: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
  welcomeContainer: ViewStyle;
  welcomeTitle: TextStyle;
  welcomeSubtitle: TextStyle;
  resultsCount: TextStyle;
  serviceCard: ViewStyle;
  cardContainer: ViewStyle;
  imageContainer: ViewStyle;
  serviceImage: ImageStyle;
  photoCount: ViewStyle;
  photoCountText: TextStyle;
  ratingBadge: ViewStyle;
  ratingText: TextStyle;
  reviewCount: TextStyle;
  cardContent: ViewStyle;
  serviceTitle: TextStyle;
  badgeContainer: ViewStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
  description: TextStyle;
  infoContainer: ViewStyle;
  providerName: TextStyle;
  location: TextStyle;
  priceContainer: ViewStyle;
  price: TextStyle;
  seeDetails: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  quickFilters: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
  },
  quickFilter: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  activeFilter: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  quickFilterText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  filtersContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filtersTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  filterRow: {
    marginBottom: SPACING.md,
  },
  filterLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  priceInputs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  } as TextStyle,
  sortOptions: {
    gap: SPACING.xs,
  },
  sortOption: {
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  activeSortOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
  },
  sortOptionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  },
  activeSortOptionText: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: SPACING.sm,
  },
  resultsContainer: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  welcomeTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  resultsCount: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  serviceCard: {
    marginBottom: SPACING.md,
  },
  cardContainer: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  photoCount: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  photoCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewCount: {
    color: COLORS.white,
    fontSize: 10,
    marginLeft: 4,
  },
  cardContent: {
    padding: SPACING.md,
  },
  serviceTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  infoContainer: {
    marginBottom: SPACING.md,
  },
  providerName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  location: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: SPACING.sm,
  },
  price: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
    fontWeight: '700' as any,
  },
  seeDetails: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.secondary,
    fontWeight: '600',
  } as TextStyle,
});