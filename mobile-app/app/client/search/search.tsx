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
  { label: 'Toutes', value: '' },
  { label: 'Mariage', value: 'Mariage' },
  { label: 'Portrait', value: 'Portrait' },
  { label: 'Événementiel', value: 'Événementiel' },
  { label: 'Corporate', value: 'Corporate' },
  { label: 'Produit', value: 'Produit' },
  { label: 'Architecture', value: 'Architecture' },
  { label: 'Nature', value: 'Nature' },
  { label: 'Sport', value: 'Sport' },
  { label: 'Mode', value: 'Mode' },
  { label: 'Culinaire', value: 'Culinaire' },
];

const SORT_OPTIONS = [
  { label: 'Note', value: 'note' },
  { label: 'Tarif', value: 'tarif' },
  { label: 'Nouveaux', value: 'recent' },
];

interface Photographe {
  id: string;
  user_id: string;
  nom: string;
  bio: string;
  photo_profil: string | null;
  specialisations: string[];
  rayon_deplacement_km: number;
  budget_min_prestation: number;
  note_moyenne: number;
  nombre_avis: number;
  statut_verification: 'non_verifie' | 'en_attente' | 'verifie' | 'refuse';
  disponibilite_generale: boolean;
  photos_portfolio: any[];
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

  const loadPhotographes = async () => {
    try {
      let query = supabase
        .from('profils_photographe')
        .select(`
          id,
          user_id,
          bio,
          photo_profil,
          specialisations,
          rayon_deplacement_km,
          budget_min_prestation,
          note_moyenne,
          nombre_avis,
          statut_verification,
          disponibilite_generale,
          photos_portfolio,
          profiles!profils_photographe_user_id_fkey (nom)
        `)
        .eq('disponibilite_generale', true);

      // Filtre par catégorie
      if (selectedCategorie) {
        query = query.contains('specialisations', [selectedCategorie]);
      }

      // Filtre par budget
      if (budgetMax) {
        query = query.lte('budget_min_prestation', parseFloat(budgetMax));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Formater les données
      const formattedData = (data || []).map((p: any) => ({
        ...p,
        nom: p.profiles?.nom || 'Photographe',
      }));

      // Tri
      let sortedData = [...formattedData];
      switch (sortBy) {
        case 'note':
          sortedData.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
          break;
        case 'tarif':
          sortedData.sort((a, b) => (a.budget_min_prestation || 0) - (b.budget_min_prestation || 0));
          break;
        case 'recent':
          sortedData.reverse();
          break;
      }

      // Recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        sortedData = sortedData.filter(
          (p) =>
            p.nom.toLowerCase().includes(query) ||
            p.bio?.toLowerCase().includes(query) ||
            p.specialisations?.some((s: string) => s.toLowerCase().includes(query))
        );
      }

      setPhotographes(sortedData);
    } catch (error: any) {
      console.error('❌ Erreur chargement photographes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPhotographes();
  }, [selectedCategorie, sortBy, budgetMax, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPhotographes();
  }, [selectedCategorie, sortBy, budgetMax, searchQuery]);

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

  const handleContactPhotographe = (photographeId: string) => {
    // Navigation vers la conversation
    router.push(`/client/messages/conversation?photographe=${photographeId}` as any);
  };

  const renderPhotographeCard = ({ item }: { item: Photographe }) => {
    const portfolioPhoto = item.photos_portfolio?.[0]?.url;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/client/particuliers/photographe-profile?id=${item.user_id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Image
            source={
              item.photo_profil
                ? { uri: item.photo_profil }
                : require('@/assets/images/shutterstock_2502519999.jpg')
            }
            style={styles.avatar}
          />
          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.nom}</Text>
              {item.statut_verification === 'verifie' && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
            </View>
            {item.note_moyenne > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFB300" />
                <Text style={styles.ratingText}>
                  {item.note_moyenne.toFixed(1)} ({item.nombre_avis})
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
              À partir de {item.budget_min_prestation}€
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
            handleContactPhotographe(item.user_id);
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.contactButtonText}>Contacter</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#130183', '#5C6BC0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContentWrapper}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Bienvenue</Text>
              <Text style={styles.title}>Trouvez votre photographe</Text>
            </View>
          </View>

          {/* Barre de recherche dans le header */}
          <View style={styles.searchBarHeader}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom ou spécialité..."
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

      {/* Catégories rapides */}
      <View style={styles.quickCategoriesSection}>
        <Text style={styles.sectionTitle}>Catégories populaires</Text>
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

      {/* Filtres avancés */}
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
          <Text style={styles.filterButtonText}>Filtres</Text>
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
          <Text style={styles.filterLabel}>Budget max (€)</Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="Ex: 800"
            value={budgetMax}
            onChangeText={setBudgetMax}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <Text style={styles.resultCount}>
        {photographes.length} photographe{photographes.length > 1 ? 's' : ''} disponible{photographes.length > 1 ? 's' : ''}
      </Text>

      {photographes.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <Ionicons name="camera-outline" size={80} color="#E8EAF6" />
          </View>
          <Text style={styles.emptyTitle}>Aucun photographe trouvé</Text>
          <Text style={styles.emptyText}>
            {selectedCategorie 
              ? `Aucun photographe disponible pour la catégorie "${selectedCategorie}"`
              : "Essayez de modifier vos critères de recherche"
            }
          </Text>
          
          {/* Guide rapide */}
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Comment ça marche ?</Text>
            <View style={styles.guideSteps}>
              <View style={styles.guideStep}>
                <View style={styles.guideStepNumber}>
                  <Text style={styles.guideStepNumberText}>1</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={styles.guideStepTitle}>Recherchez</Text>
                  <Text style={styles.guideStepText}>Parcourez les profils de photographes</Text>
                </View>
              </View>
              <View style={styles.guideStep}>
                <View style={styles.guideStepNumber}>
                  <Text style={styles.guideStepNumberText}>2</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={styles.guideStepTitle}>Contactez</Text>
                  <Text style={styles.guideStepText}>Discutez de votre projet</Text>
                </View>
              </View>
              <View style={styles.guideStep}>
                <View style={styles.guideStepNumber}>
                  <Text style={styles.guideStepNumberText}>3</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={styles.guideStepTitle}>Réservez</Text>
                  <Text style={styles.guideStepText}>Confirmez votre prestation</Text>
                </View>
              </View>
            </View>
          </View>
          
          {selectedCategorie && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setSelectedCategorie('')}
            >
              <Text style={styles.resetButtonText}>Afficher tous les photographes</Text>
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
  
  // Header avec gradient
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
  
  // Catégories rapides
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
  
  // Filtres
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
  
  // Liste
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
  
  // Empty state amélioré
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
  
  // Guide
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
});
