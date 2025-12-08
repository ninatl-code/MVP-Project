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
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
      Alert.alert('Erreur', 'Impossible de charger les photographes');
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
      <View style={styles.header}>
        <Text style={styles.title}>Trouver un photographe</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un photographe..."
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

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'filter' : 'filter-outline'}
            size={20}
            color={showFilters ? '#5C6BC0' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Catégorie :</Text>
            <View style={styles.filterChips}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.filterChip,
                    selectedCategorie === cat.value && styles.filterChipSelected,
                  ]}
                  onPress={() => setSelectedCategorie(cat.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategorie === cat.value && styles.filterChipTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Trier par :</Text>
            <View style={styles.filterChips}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, sortBy === option.value && styles.filterChipSelected]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sortBy === option.value && styles.filterChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Budget max (€) :</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="Ex: 800"
              value={budgetMax}
              onChangeText={setBudgetMax}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>
      )}

      <Text style={styles.resultCount}>
        {photographes.length} photographe{photographes.length > 1 ? 's' : ''} disponible{photographes.length > 1 ? 's' : ''}
      </Text>

      {photographes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucun photographe trouvé</Text>
          <Text style={styles.emptyText}>
            Essayez de modifier vos critères de recherche
          </Text>
        </View>
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
    marginLeft: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersContainer: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  budgetInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: 150,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    height: 200,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: '#5C6BC0',
    padding: 12,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
