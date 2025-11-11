import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image, 
  ActivityIndicator,
  Dimensions,
  Animated,
  TextInput,
  RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import BottomNavBar from '../../components/BottomNavBar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "../../lib/AuthContext";

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  primary: '#FFFFFF',
  accent: '#6366F1',
  accentLight: '#E0E7FF',
  background: '#F8FAFC',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  card: '#FFFFFF',
  cardInactive: '#F3F4F6',
  border: '#E5E7EB',
  shadow: '#000000',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  gradient: {
    start: '#6366F1',
    end: '#8B5CF6'
  }
};

const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

export default function Homepage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any>({});
  const [villes, setVilles] = useState<any>({});
  const [regions, setRegions] = useState<any>({});
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Redirection automatique basée sur le rôle
  useEffect(() => {
    if (!authLoading && user && userRole) {
      if (userRole === 'prestataire') {
        router.replace('/prestataires/menu');
        return;
      } else if (userRole === 'particulier') {
        router.replace('/particuliers/menu');
        return;
      }
    }
  }, [user, userRole, authLoading]);

  // Si l'utilisateur est connecté avec un rôle, ne pas afficher le contenu
  if (user && userRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Redirection...</Text>
      </View>
    );
  }

  // Animation au chargement
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Charger les catégories depuis la table prestations
  useEffect(() => {
    const fetchCategories = async () => {
      setStepMsg("Chargement des catégories...");
      const { data, error } = await supabase.from("prestations").select("id, nom");
      if (error) {
        setStepMsg("Erreur chargement catégories : " + error.message);
        setCategories([]);
      } else {
        setStepMsg("");
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  // Charger tous les profils, villes et régions pour mapping id -> nom
  useEffect(() => {
    const fetchRefs = async () => {
      const { data: profilsData } = await supabase.from("profiles").select("id, nom");
      const { data: villesData } = await supabase.from("villes").select("id, ville");
      const { data: regionsData } = await supabase.from("regions").select("id, region");
      
      const profilsMap: any = {};
      (profilsData || []).forEach((p: any) => { profilsMap[p.id] = p.nom; });
      setProfiles(profilsMap);
      
      const villesMap: any = {};
      (villesData || []).forEach((v: any) => { villesMap[v.id] = v.ville; });
      setVilles(villesMap);
      
      const regionsMap: any = {};
      (regionsData || []).forEach((r: any) => { regionsMap[r.id] = r.region; });
      setRegions(regionsMap);
    };
    fetchRefs();
  }, []);

  // Fonction de rafraîchissement
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Recharger les catégories
      const { data, error } = await supabase.from("prestations").select("id, nom");
      if (!error) {
        setCategories(data || []);
      }
      
      // Si une catégorie est sélectionnée, recharger les résultats
      if (selectedCategory) {
        await handleCategorieClick(selectedCategory);
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    }
    setRefreshing(false);
  };

  // Recherche par catégorie avec messages de debug
  const handleCategorieClick = async (categorieId: any) => {
    setSelectedCategory(categorieId);
    setPageLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from("annonces")
        .select("*")
        .eq("actif", true)
        .eq("prestation", categorieId);

      if (error) {
        setStepMsg("Erreur Supabase : " + error.message);
        setPageLoading(false);
        return;
      }
      setSearchResults(data || []);
    } catch (err: any) {
      setStepMsg("Erreur JS : " + err.message);
    }
    setPageLoading(false);
  };

  const getCategorieNom = (id: any) => {
    const cat = categories.find((c: any) => c.id === id);
    return cat ? cat.nom : id;
  };

  function PrestationCard({ prestation, index }: any) {
    const [cardAnim] = useState(new Animated.Value(0));
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.card, 
          !prestation.actif && styles.cardInactive,
          {
            opacity: cardAnim,
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.cardTouchable}
          activeOpacity={0.9}
          onPress={() => {
            // Navigation vers le détail
            // navigation.navigate('AnnoncesDetail', { annoceId: prestation.id });
          }}
        >
          <View style={styles.cardImageContainer}>
            {prestation.photos && prestation.photos.length > 0 ? (
              <Image
                source={{ uri: prestation.photos[0] }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.noImageText}>Aucune photo</Text>
              </View>
            )}
            <View style={styles.cardImageOverlay}>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{prestation.tarification}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {prestation.titre}
            </Text>
            
            <View style={styles.cardMetaRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.accent} />
              <Text style={styles.cardMeta}>
                {villes[prestation.ville] || "-"} • {regions[prestation.region] || "-"}
              </Text>
            </View>
            
            <View style={styles.cardMetaRow}>
              <Ionicons name="person-outline" size={14} color={COLORS.accent} />
              <Text style={styles.cardMeta}>
                {profiles[prestation.prestataire] || "Photographe"}
              </Text>
            </View>
            
            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
              <Text style={styles.cardMeta}>
                {prestation.created_at ? new Date(prestation.created_at).toLocaleDateString('fr-FR') : 'Non spécifié'}
              </Text>
            </View>
            
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{getCategorieNom(prestation.prestation)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Hero Section avec animation */}
        <Animated.View 
          style={[
            styles.hero,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Trouvez votre{'\n'}
              <Text style={styles.heroTitleAccent}>photographe idéal</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Découvrez des photographes talentueux, explorez leurs portfolios et réservez en quelques clics
            </Text>
            
            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={COLORS.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher par titre, ville..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {/* Statistiques */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{categories.length}</Text>
                <Text style={styles.statLabel}>Catégories</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{searchResults.length}</Text>
                <Text style={styles.statLabel}>Annonces</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4.8★</Text>
                <Text style={styles.statLabel}>Note moyenne</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Catégories */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explorez par catégorie</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((cat: any, index: number) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard, 
                  selectedCategory === cat.id && styles.categoryCardSelected
                ]}
                onPress={() => handleCategorieClick(cat.id)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons 
                    name="camera-outline" 
                    size={24} 
                    color={selectedCategory === cat.id ? COLORS.primary : COLORS.accent} 
                  />
                </View>
                <Text style={[
                  styles.categoryTitle, 
                  selectedCategory === cat.id && styles.categoryTitleSelected
                ]}>
                  {cat.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Résultats */}
        <View style={styles.section}>
          {stepMsg ? (
            <View style={styles.messageContainer}>
              <Text style={styles.stepMsg}>{stepMsg}</Text>
            </View>
          ) : null}
          
          {pageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          )}
          
          {!pageLoading && searchResults.length === 0 && !stepMsg && selectedCategory ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Aucune annonce trouvée</Text>
              <Text style={styles.emptySubtitle}>
                Essayez une autre catégorie ou rafraîchissez la page
              </Text>
            </View>
          ) : null}
          
          {!pageLoading && searchResults.length > 0 && (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  {searchResults.length} annonce{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}
                </Text>
                <TouchableOpacity style={styles.filterButton}>
                  <Ionicons name="filter-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.filterButtonText}>Filtres</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.resultsGrid}>
                {searchResults.map((prestation: any, index: number) => (
                  <PrestationCard key={prestation.id} prestation={prestation} index={index} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingBottom: 100,
  },
  
  // Hero Section
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 12,
  },
  heroTitleAccent: {
    ...TYPOGRAPHY.h1,
    color: COLORS.accent,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 24,
    maxWidth: 280,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 320,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...TYPOGRAPHY.h3,
    color: COLORS.accent,
    marginBottom: 2,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  
  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  sectionAction: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '600',
  },
  
  // Categories
  categoriesScroll: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingRight: 20,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.05 }],
  },
  categoryIconContainer: {
    marginBottom: 8,
  },
  categoryTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: 'center',
  },
  categoryTitleSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Messages et Loading
  messageContainer: {
    padding: 16,
    backgroundColor: COLORS.accentLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  stepMsg: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  
  // Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    marginLeft: 4,
  },
  resultsGrid: {
    gap: 16,
  },
  
  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardTouchable: {
    flex: 1,
  },
  cardImageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: COLORS.cardInactive,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  priceTag: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardInactive,
  },
  noImageText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 8,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  categoryBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.accent,
    fontWeight: '600',
  },
});