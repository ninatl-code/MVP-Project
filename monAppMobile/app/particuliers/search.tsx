import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Image, RefreshControl } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

// Fonction pour normaliser les URLs de photos
function normalizePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  
  // Si c'est déjà une URL complète, la retourner
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Si c'est déjà un data URI, le retourner
  if (photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  
  // Si c'est une chaîne base64 brute, ajouter le préfixe
  // Vérifier si ça ressemble à du base64
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (photoUrl.length > 100 && base64Regex.test(photoUrl.slice(0, 100))) {
    // Détecter le type d'image à partir des premiers caractères
    const firstChars = photoUrl.slice(0, 20);
    let mimeType = 'image/jpeg'; // Par défaut
    
    if (firstChars.startsWith('iVBOR') || firstChars.startsWith('IVBOR')) {
      mimeType = 'image/png';
    } else if (firstChars.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    } else if (firstChars.startsWith('R0lGOD')) {
      mimeType = 'image/gif';
    }
    
    return `data:${mimeType};base64,${photoUrl}`;
  }
  
  return null;
}

interface Annonce {
  id: string;
  titre: string;
  description: string;
  photo_couverture?: string;
  tarif_min: number;
  tarif_max: number;
  rate: number;
  prestataire: string;
  prestation?: string;
  prestataire_nom?: string;
  zones_intervention?: string[]; // Villes d'intervention
}

export default function SearchProviders() {
  const [prestations, setPrestations] = useState<any[]>([]);
  const [villes, setVilles] = useState<any[]>([]);
  const [selectedPrestation, setSelectedPrestation] = useState("all");
  const [selectedVille, setSelectedVille] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Annonce[]>([]);
  const [allAnnonces, setAllAnnonces] = useState<Annonce[]>([]); // Cache de toutes les annonces
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterTimeout, setFilterTimeout] = useState<any>(null);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();

  // Chargement initial : récupère TOUTES les annonces UNE SEULE FOIS
  useEffect(() => {
    fetchAllAnnonces();
  }, []);

  // Filtrage avec debounce de 500ms
  useEffect(() => {
    // Clear le timeout précédent
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }

    // Si on a déjà les annonces en cache, filtrer immédiatement
    if (allAnnonces.length > 0) {
      const timeout = setTimeout(() => {
        applyFilters();
      }, 500);
      setFilterTimeout(timeout);
    }

    return () => {
      if (filterTimeout) clearTimeout(filterTimeout);
    };
  }, [selectedPrestation, selectedVille, priceRange, searchQuery, allAnnonces]);

  // Récupère TOUTES les annonces UNE SEULE FOIS (cache)
  const fetchAllAnnonces = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 Chargement initial optimisé...');
      
      // OPTIMISATION: Charger les données en PARALLÈLE sans photos
      const [annoncesResult, prestationsResult] = await Promise.all([
        // Annonces sans photos (ultra rapide)
        supabase
          .from("annonces")
          .select(`
            id,
            titre,
            description,
            photo_couverture,
            tarif_unit,
            rate,
            prestataire,
            prestation,
            profiles!annonces_prestataire_fkey (nom)
          `)
          .eq('actif', true)
          .order('created_at', { ascending: false })
          .limit(50), // Limiter à 50 annonces max
        
        // Prestations en parallèle
        supabase
          .from("prestations")
          .select("id, nom")
          .order("nom", { ascending: true })
      ]);

      const annoncesData = annoncesResult.data;
      const prestationsData = prestationsResult.data;

      if (!annoncesData || annoncesData.length === 0) {
        console.log('⚠️ Aucune annonce trouvée');
        setAllAnnonces([]);
        setResults([]);
        setPrestations([]);
        setLoading(false);
        return;
      }

      // Charger zones d'intervention en parallèle
      const annonceIds = annoncesData.map((a: any) => a.id);
      const { data: zonesData } = await supabase
        .from('zones_intervention')
        .select('annonce_id, ville_centre')
        .in('annonce_id', annonceIds)
        .eq('active', true);
      
      // Map annonce_id -> villes
      const zonesMap: { [key: string]: string[] } = {};
      (zonesData || []).forEach((zone: any) => {
        if (!zonesMap[zone.annonce_id]) {
          zonesMap[zone.annonce_id] = [];
        }
        zonesMap[zone.annonce_id].push(zone.ville_centre);
      });

      console.log(`✅ ${annoncesData.length} annonces chargées`);
      setPrestations(prestationsData || []);

      // Extraire les villes uniques depuis zones_intervention
      const allVilles = Object.values(zonesMap).flat();
      const uniqueVilles = [...new Set(allVilles)].sort();
      setVilles(uniqueVilles.map((ville, idx) => ({ id: idx, ville })));

      // Formatter et stocker en cache (avec photo de couverture)
      const formattedAnnonces: Annonce[] = annoncesData.map((annonce: any) => ({
        id: annonce.id,
        titre: annonce.titre,
        description: annonce.description || '',
        photo_couverture: annonce.photo_couverture,
        tarif_min: annonce.tarif_unit || 0,
        tarif_max: annonce.tarif_unit || 0,
        rate: annonce.rate || 0,
        prestataire: annonce.prestataire,
        prestataire_nom: annonce.profiles?.nom || 'Prestataire',
        zones_intervention: zonesMap[annonce.id] || [],
        prestation: annonce.prestation
      }));

      setAllAnnonces(formattedAnnonces);
      setResults(formattedAnnonces.slice(0, ITEMS_PER_PAGE)); // Première page
      setCurrentPage(1);
      
      console.log('✅ Cache créé avec succès');
    } catch (error) {
      console.error('❌ Erreur chargement annonces:', error);
      setAllAnnonces([]);
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtre les annonces du CACHE (instantané, pas de requête backend)
  const applyFilters = () => {
    console.log('🔍 Application des filtres...', { selectedPrestation, selectedVille, priceRange, searchQuery });
    
    let filtered = [...allAnnonces];

    // Filtre par prestation
    if (selectedPrestation && selectedPrestation !== "all") {
      filtered = filtered.filter(a => a.prestation === selectedPrestation);
    }

    // Filtre par ville (zones d'intervention)
    if (selectedVille && selectedVille !== "all") {
      filtered = filtered.filter(a => 
        a.zones_intervention && a.zones_intervention.includes(selectedVille)
      );
    }

    // Filtre par prix
    if (priceRange.min) {
      const minPrice = parseInt(priceRange.min);
      filtered = filtered.filter(a => a.tarif_min >= minPrice);
    }

    if (priceRange.max) {
      const maxPrice = parseInt(priceRange.max);
      filtered = filtered.filter(a => a.tarif_max <= maxPrice);
    }

    // Filtre par recherche texte
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.titre.toLowerCase().includes(query) || 
        a.description.toLowerCase().includes(query)
      );
    }

    console.log(`✅ ${filtered.length} résultats après filtrage`);
    
    // Appliquer la pagination
    setResults(filtered.slice(0, ITEMS_PER_PAGE));
    setCurrentPage(1);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllAnnonces();
  };

  const loadMoreAnnonces = () => {
    const filtered = getFilteredAnnonces();
    const nextPage = currentPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    
    setResults(filtered.slice(startIndex, endIndex));
    setCurrentPage(nextPage);
  };

  const getFilteredAnnonces = () => {
    let filtered = [...allAnnonces];

    if (selectedPrestation && selectedPrestation !== "all") {
      filtered = filtered.filter(a => a.prestation === selectedPrestation);
    }

    if (selectedVille && selectedVille !== "all") {
      filtered = filtered.filter(a => 
        a.zones_intervention && a.zones_intervention.includes(selectedVille)
      );
    }

    if (priceRange.min) {
      filtered = filtered.filter(a => a.tarif_min >= parseInt(priceRange.min));
    }

    if (priceRange.max) {
      filtered = filtered.filter(a => a.tarif_max <= parseInt(priceRange.max));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.titre.toLowerCase().includes(query) || 
        a.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleAddToFavoris = async (annonceId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favoris')
      .insert({ particulier_id: user.id, annonce_id: annonceId });

    if (!error) {
      // Show success feedback
    }
  };

  const formatCurrency = (min: number, max: number) => {
    if (min === max) {
      return `${min}€`;
    }
    return `${min}€ - ${max}€`;
  };

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
          <Text style={styles.headerTitle}>Explorer les annonces</Text>
          <Text style={styles.headerSubtitle}>Trouvez le photographe idéal</Text>
        </LinearGradient>

        {/* Barre de recherche */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={applyFilters}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); applyFilters(); }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={20} color={showFilters ? 'white' : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Prestations */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type de prestation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedPrestation === "all" && styles.filterChipActive]}
                  onPress={() => setSelectedPrestation("all")}
                >
                  <Text style={[styles.filterChipText, selectedPrestation === "all" && styles.filterChipTextActive]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {prestations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.filterChip, selectedPrestation === item.id && styles.filterChipActive]}
                    onPress={() => setSelectedPrestation(item.id)}
                  >
                    <Text style={[styles.filterChipText, selectedPrestation === item.id && styles.filterChipTextActive]}>
                      {item.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Villes */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Ville</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedVille === "all" && styles.filterChipActive]}
                  onPress={() => setSelectedVille("all")}
                >
                  <Text style={[styles.filterChipText, selectedVille === "all" && styles.filterChipTextActive]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {villes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.filterChip, selectedVille === item.ville && styles.filterChipActive]}
                    onPress={() => setSelectedVille(item.ville)}
                  >
                    <Text style={[styles.filterChipText, selectedVille === item.ville && styles.filterChipTextActive]}>
                      {item.ville}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Prix */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Budget</Text>
              <View style={styles.priceInputs}>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min"
                    placeholderTextColor={COLORS.textLight}
                    value={priceRange.min}
                    onChangeText={min => setPriceRange({ ...priceRange, min })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencySymbol}>€</Text>
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max"
                    placeholderTextColor={COLORS.textLight}
                    value={priceRange.max}
                    onChangeText={max => setPriceRange({ ...priceRange, max })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencySymbol}>€</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Compteur résultats */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{results.length} résultat{results.length > 1 ? 's' : ''}</Text>
        </View>

        {/* Liste des annonces */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Aucun résultat</Text>
            <Text style={styles.emptyStateText}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {results.map((annonce) => (
              <View key={annonce.id} style={styles.annonceCard}>
                {/* Photo de couverture */}
                <View style={styles.imageContainer}>
                  {annonce.photo_couverture ? (
                    <Image
                      source={{ uri: normalizePhotoUrl(annonce.photo_couverture) || undefined }}
                      style={styles.annonceImage}
                    />
                  ) : (
                    <View style={[styles.annonceImage, styles.noPhotoPlaceholder]}>
                      <Ionicons name="camera-outline" size={48} color={COLORS.textLight} />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => handleAddToFavoris(annonce.id)}
                  >
                    <Ionicons name="heart-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                  {annonce.rate > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#FFA500" />
                      <Text style={styles.ratingText}>{annonce.rate.toFixed(1)}</Text>
                    </View>
                  )}
                </View>

                {/* Contenu */}
                <View style={styles.cardContent}>
                  <Text style={styles.annonceTitle} numberOfLines={2}>
                    {annonce.titre}
                  </Text>

                  <View style={styles.prestataireRow}>
                    <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.prestataireText}>{annonce.prestataire_nom}</Text>
                  </View>

                  {annonce.zones_intervention && annonce.zones_intervention.length > 0 && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.locationText}>{annonce.zones_intervention.join(', ')}</Text>
                    </View>
                  )}

                  {annonce.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {annonce.description}
                    </Text>
                  )}

                  {/* Tarif */}
                  <View style={styles.pricingContainer}>
                    <Text style={styles.priceLabel}>À partir de</Text>
                    <Text style={styles.priceValue}>
                      {formatCurrency(annonce.tarif_min, annonce.tarif_max)}
                    </Text>
                  </View>

                  {/* Actions */}
                  <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => router.push(`/particuliers/annonces/${annonce.id}` as any)}
                  >
                    <Text style={styles.viewButtonText}>Voir l'annonce</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {/* Bouton Charger Plus */}
            {results.length < getFilteredAnnonces().length && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={loadMoreAnnonces}
              >
                <Text style={styles.loadMoreText}>
                  Charger plus ({results.length} / {getFilteredAnnonces().length})
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {/* Info pagination */}
            {results.length > 0 && (
              <Text style={styles.paginationInfo}>
                Affichage de {results.length} sur {getFilteredAnnonces().length} résultats
              </Text>
            )}
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { padding: 24, paddingTop: 20, paddingBottom: 32 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },

  // Search
  searchSection: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 12 },
  filterButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  // Filtres
  filtersContainer: { backgroundColor: COLORS.background, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  filterScroll: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  filterChipTextActive: { color: 'white' },
  
  loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 24, backgroundColor: COLORS.backgroundLight, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
  loadMoreText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  paginationInfo: { textAlign: 'center', fontSize: 13, color: COLORS.textLight, marginTop: 16, fontStyle: 'italic' },

  priceInputs: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  priceInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  currencySymbol: { fontSize: 15, color: COLORS.textLight, marginLeft: 4 },
  priceSeparator: { fontSize: 16, color: COLORS.textLight },

  // Résultats
  resultsHeader: { paddingHorizontal: 16, paddingVertical: 16 },
  resultsCount: { fontSize: 16, fontWeight: '600', color: COLORS.text },

  loadingContainer: { paddingVertical: 40, alignItems: 'center' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 15, color: COLORS.textLight, textAlign: 'center' },

  // Annonces
  resultsList: { paddingHorizontal: 16, gap: 16 },
  annonceCard: { backgroundColor: COLORS.background, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
  imageContainer: { position: 'relative', width: '100%', height: 200 },
  annonceImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noPhotoPlaceholder: { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
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

  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8 },
  viewButtonText: { color: 'white', fontSize: 15, fontWeight: '600' }
});
