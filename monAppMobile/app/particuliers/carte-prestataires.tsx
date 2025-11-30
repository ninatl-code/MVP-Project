import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Image, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import FooterParti from '../../components/FooterParti';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  star: '#FFC107'
};

interface Annonce {
  id: string;
  titre: string;
  description: string;
  tarif_unit: number;
  unit_tarif: string;
  rate: number;
  nb_avis: number;
  photos: string[];
  actif: boolean;
  prestataire: string;
  prestation: string;
  prix_fixe: boolean;
  profiles?: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    photo: string;
  };
  prestations?: {
    nom: string;
  };
  zones_intervention?: {
    ville_centre: string;
    rayon_km: number;
    latitude: number;
    longitude: number;
  }[];
  distance_km?: number;
}

type ViewMode = 'map' | 'list';
type SortBy = 'distance' | 'note' | 'prix' | 'avis';

export default function CartePrestatairesPage() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [selectedAnnonce, setSelectedAnnonce] = useState<Annonce | null>(null);
  
  // Localisation
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState({
    latitude: 48.8566, // Paris par défaut
    longitude: 2.3522,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVille, setSearchVille] = useState('');
  const [rayonKm, setRayonKm] = useState(20);
  const [noteMin, setNoteMin] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    initMap();
  }, []);

  // Recharger les annonces quand les filtres changent
  useEffect(() => {
    if (!loading) {
      loadAnnonces();
    }
  }, [sortBy]);

  const initMap = async () => {
    await getUserLocation();
    await loadAnnonces();
  };

  const getUserLocation = async () => {
    try {
      setLoadingLocation(true);
      
      // Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour trouver les prestataires près de vous');
        return;
      }

      // Obtenir la position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      setUserLocation(location);
      
      // Centrer la carte
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
      
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadAnnonces = async () => {
    try {
      setLoading(true);

      // 1. Filtrer les zones d'intervention si ville sélectionnée
      let annonceIds: string[] = [];
      if (searchVille && searchVille.trim()) {
        const { data: zonesData, error: zonesError } = await supabase
          .from("zones_intervention")
          .select("annonce_id, latitude, longitude")
          .eq("active", true)
          .eq("ville_centre", searchVille.trim());

        if (zonesError) throw zonesError;
        
        if (!zonesData || zonesData.length === 0) {
          setAnnonces([]);
          return;
        }
        
        annonceIds = zonesData.map(z => z.annonce_id);
      }

      // 2. Construire la requête annonces
      let query = supabase
        .from("annonces")
        .select(`
          *,
          profiles:prestataire(nom, email, telephone, photos),
          prestations:prestation(nom)
        `)
        .eq("actif", true);

      // Filtrer par prestation si recherche
      if (searchQuery && searchQuery.trim()) {
        const { data: prestationData } = await supabase
          .from("prestations")
          .select("id")
          .ilike("nom", `%${searchQuery}%`)
          .limit(1)
          .single();
        
        if (prestationData) {
          query = query.eq("prestation", prestationData.id);
        }
      }

      // Filtrer par note minimum
      if (noteMin > 0) {
        query = query.gte("rate", noteMin);
      }

      // Filtrer par ville (IDs d'annonces)
      if (annonceIds.length > 0) {
        query = query.in("id", annonceIds);
      }

      // Tri
      switch (sortBy) {
        case 'note':
          query = query.order("rate", { ascending: false });
          break;
        case 'prix':
          query = query.order("tarif_unit", { ascending: true });
          break;
        case 'avis':
          query = query.order("nb_avis", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query.limit(100);

      const { data: annoncesData, error: annoncesError } = await query;

      if (annoncesError) throw annoncesError;

      // 3. Enrichir avec zones_intervention (incluant coordonnées)
      const annoncesAvecZones = await Promise.all(
        (annoncesData || []).map(async (annonce) => {
          const { data: zones } = await supabase
            .from("zones_intervention")
            .select("ville_centre, rayon_km, latitude, longitude")
            .eq("annonce_id", annonce.id)
            .eq("active", true);

          // Calculer distance si userLocation disponible
          let distance_km;
          if (userLocation && zones && zones.length > 0) {
            const firstZone = zones[0];
            if (firstZone.latitude && firstZone.longitude) {
              distance_km = calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                firstZone.latitude,
                firstZone.longitude
              );
            }
          }

          return {
            ...annonce,
            zones_intervention: zones || [],
            distance_km
          };
        })
      );

      // Filtrer par rayon si localisation disponible et pas de recherche par ville
      let filtered = annoncesAvecZones;
      if (userLocation && !searchVille) {
        filtered = annoncesAvecZones.filter(a => {
          if (!a.distance_km) return false;
          return a.distance_km <= rayonKm;
        });
      }

      // Trier à nouveau si tri par distance
      if (sortBy === 'distance' && userLocation) {
        filtered.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));
      }

      // Log pour debug
      const withCoords = filtered.filter(a => 
        a.zones_intervention?.length > 0 && 
        a.zones_intervention[0]?.latitude && 
        a.zones_intervention[0]?.longitude
      );
      console.log(`📍 Annonces chargées: ${filtered.length} total, ${withCoords.length} avec coordonnées`);
      
      setAnnonces(filtered);

      // Centrer la carte sur les résultats s'il y en a
      if (withCoords.length > 0 && mapRef.current) {
        const coords = withCoords
          .map(a => a.zones_intervention[0])
          .filter(z => z.latitude && z.longitude)
          .map(z => ({
            latitude: Number(z.latitude),
            longitude: Number(z.longitude)
          }));

        if (coords.length > 0) {
          // Calculer le centre et le zoom pour afficher tous les points
          const lats = coords.map(c => c.latitude);
          const lngs = coords.map(c => c.longitude);
          
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          const deltaLat = (maxLat - minLat) * 1.5; // Ajouter une marge
          const deltaLng = (maxLng - minLng) * 1.5;
          
          const newRegion = {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: Math.max(deltaLat, 0.05), // Minimum 0.05 pour éviter un zoom trop proche
            longitudeDelta: Math.max(deltaLng, 0.05),
          };
          
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      Alert.alert('Erreur', 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };



  const loadSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('prestations')
        .select('nom')
        .ilike('nom', `%${query}%`)
        .limit(5);

      if (error) throw error;
      
      const unique = [...new Set(data?.map(d => d.nom).filter(Boolean))];
      setSuggestions(unique.slice(0, 5));
    } catch (error) {
      console.error('Erreur suggestions:', error);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(true);
    loadSuggestions(text);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    loadAnnonces();
  };

  const handleMarkerPress = (annonce: Annonce) => {
    setSelectedAnnonce(annonce);
    
    // Centrer sur la première zone d'intervention si coordonnées disponibles
    if (annonce.zones_intervention && annonce.zones_intervention.length > 0) {
      const firstZone = annonce.zones_intervention[0];
      if (firstZone.latitude && firstZone.longitude) {
        mapRef.current?.animateToRegion({
          latitude: firstZone.latitude,
          longitude: firstZone.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 500);
      }
    }
  };

  const handleVoirProfil = () => {
    if (selectedAnnonce) {
      router.push(`/prestataires/profil?prestataireId=${selectedAnnonce.prestataire}`);
    }
  };

  const handleReserver = () => {
    if (selectedAnnonce) {
      router.push(`/annonces/${selectedAnnonce.id}` as any);
    }
  };

  const getMarkerColor = (note: number) => {
    if (note >= 4.5) return '#10B981'; // Vert
    if (note >= 4.0) return '#5C6BC0'; // Bleu
    if (note >= 3.5) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  const getBadgeEmoji = (badge: string | null) => {
    switch (badge) {
      case 'elite': return '👑';
      case 'excellence': return '⭐';
      case 'confiance': return '✅';
      case 'verifie': return '✓';
      default: return '';
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadAnnonces();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchVille('');
    setRayonKm(20);
    setNoteMin(0);
    setSortBy('distance');
    loadAnnonces();
  };

  const renderAnnonceListItem = (annonce: Annonce) => (
    <TouchableOpacity
      key={annonce.id}
      style={styles.listItem}
      onPress={() => {
        setSelectedAnnonce(annonce);
        setViewMode('map');
        if (annonce.zones_intervention && annonce.zones_intervention[0]) {
          const firstZone = annonce.zones_intervention[0];
          if (firstZone.latitude && firstZone.longitude) {
            mapRef.current?.animateToRegion({
              latitude: firstZone.latitude,
              longitude: firstZone.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 500);
          }
        }
      }}
    >
      {annonce.photos && annonce.photos[0] ? (
        <Image source={{ uri: annonce.photos[0] }} style={styles.listItemPhoto} />
      ) : (
        <View style={[styles.listItemPhoto, styles.listItemPhotoPlaceholder]}>
          <Ionicons name="image" size={30} color={COLORS.textLight} />
        </View>
      )}
      
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {annonce.titre}
          </Text>
        </View>
        
        <Text style={styles.listItemSpecialite} numberOfLines={1}>
          {annonce.prestations?.nom || 'Service'} • {annonce.profiles?.nom || 'Prestataire'}
        </Text>
        
        <View style={styles.listItemMeta}>
          <View style={styles.listItemRating}>
            <Ionicons name="star" size={14} color={COLORS.star} />
            <Text style={styles.listItemNote}>{annonce.rate.toFixed(1)}</Text>
            <Text style={styles.listItemAvis}>({annonce.nb_avis})</Text>
          </View>
          
          {annonce.distance_km && (
            <View style={styles.listItemDistance}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.listItemDistanceText}>{annonce.distance_km.toFixed(1)} km</Text>
            </View>
          )}
          
          <Text style={styles.listItemPrice}>{annonce.tarif_unit}€/{annonce.unit_tarif}</Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un service..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => { setShowSuggestions(false); loadAnnonces(); }}
            onFocus={() => setShowSuggestions(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); loadAnnonces(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          >
            <Ionicons name={viewMode === 'map' ? 'list' : 'map'} size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.iconButton, loadingLocation && styles.iconButtonDisabled]}
            onPress={getUserLocation}
            disabled={loadingLocation}
          >
            <Ionicons 
              name="locate" 
              size={24} 
              color={loadingLocation ? COLORS.textLight : COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => selectSuggestion(suggestion)}
            >
              <Ionicons name="search" size={16} color={COLORS.textLight} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filtres */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Filtres & Tri</Text>
          
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Recherche par ville</Text>
            <TextInput
              style={styles.villeInput}
              placeholder="Ex: Paris, Lyon..."
              value={searchVille}
              onChangeText={setSearchVille}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Rayon: {rayonKm} km</Text>
            <View style={styles.rayonButtons}>
              {[5, 10, 20, 50].map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.rayonButton, rayonKm === km && styles.rayonButtonActive]}
                  onPress={() => setRayonKm(km)}
                >
                  <Text style={[styles.rayonButtonText, rayonKm === km && styles.rayonButtonTextActive]}>
                    {km}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Note minimale</Text>
            <View style={styles.starsFilter}>
              {[0, 3, 3.5, 4, 4.5].map((note) => (
                <TouchableOpacity
                  key={note}
                  style={[styles.noteButton, noteMin === note && styles.noteButtonActive]}
                  onPress={() => setNoteMin(note)}
                >
                  <Ionicons name="star" size={16} color={noteMin === note ? '#fff' : COLORS.star} />
                  <Text style={[styles.noteButtonText, noteMin === note && styles.noteButtonTextActive]}>
                    {note === 0 ? 'Toutes' : `${note}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Trier par</Text>
            <View style={styles.sortButtons}>
              {[
                { key: 'distance' as SortBy, label: 'Distance', icon: 'location' },
                { key: 'note' as SortBy, label: 'Note', icon: 'star' },
                { key: 'prix' as SortBy, label: 'Prix', icon: 'cash' },
                { key: 'avis' as SortBy, label: 'Avis', icon: 'chatbubbles' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[styles.sortButton, sortBy === sort.key && styles.sortButtonActive]}
                  onPress={() => setSortBy(sort.key)}
                >
                  <Ionicons 
                    name={sort.icon as any} 
                    size={16} 
                    color={sortBy === sort.key ? '#fff' : COLORS.primary} 
                  />
                  <Text style={[styles.sortButtonText, sortBy === sort.key && styles.sortButtonTextActive]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mode Carte */}
      {viewMode === 'map' && (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* Marqueurs annonces */}
            {annonces.map((annonce) => {
              if (!annonce.zones_intervention || annonce.zones_intervention.length === 0) {
                console.log('Annonce sans zone:', annonce.id);
                return null;
              }
              const firstZone = annonce.zones_intervention[0];
              if (!firstZone.latitude || !firstZone.longitude) {
                console.log('Zone sans coordonnées:', annonce.id, firstZone);
                return null;
              }
              
              console.log('Marqueur créé:', {
                id: annonce.id,
                titre: annonce.titre,
                lat: firstZone.latitude,
                lng: firstZone.longitude
              });
              
              return (
                <Marker
                  key={annonce.id}
                  coordinate={{
                    latitude: Number(firstZone.latitude),
                    longitude: Number(firstZone.longitude),
                  }}
                  onPress={() => handleMarkerPress(annonce)}
                >
                  <View style={styles.markerBullet}>
                    <View style={[styles.markerDot, { backgroundColor: getMarkerColor(annonce.rate) }]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Compteur de résultats */}
          <View style={styles.resultsCounter}>
            <Ionicons name="albums" size={16} color={COLORS.primary} />
            <Text style={styles.resultsText}>{annonces.length} annonce(s) trouvée(s)</Text>
          </View>
        </>
      )}

      {/* Mode Liste */}
      {viewMode === 'list' && (
        <ScrollView style={styles.listContainer}>
          {annonces.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateTitle}>Aucune annonce trouvée</Text>
              <Text style={styles.emptyStateText}>Essayez d'ajuster vos filtres de recherche</Text>
            </View>
          ) : (
            annonces.map(renderAnnonceListItem)
          )}
        </ScrollView>
      )}

      {/* Bouton retour flottant */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Card annonce sélectionnée */}
      {selectedAnnonce && (
        <View style={styles.prestataireCard}>
          <TouchableOpacity 
            style={styles.closeCard}
            onPress={() => setSelectedAnnonce(null)}
          >
            <Ionicons name="close" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.cardHeader}>
            {selectedAnnonce.photos && selectedAnnonce.photos[0] ? (
              <Image source={{ uri: selectedAnnonce.photos[0] }} style={styles.cardPhoto} />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
                <Ionicons name="image" size={30} color={COLORS.textLight} />
              </View>
            )}
            
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName}>{selectedAnnonce.titre}</Text>
              </View>
              <Text style={styles.cardSpecialite}>
                {selectedAnnonce.prestations?.nom} • {selectedAnnonce.profiles?.nom}
              </Text>
              <Text style={styles.cardVille}>
                <Ionicons name="location" size={12} color={COLORS.textLight} />{' '}
                {selectedAnnonce.zones_intervention?.map(z => z.ville_centre).join(', ') || 'Zones non spécifiées'}
                {selectedAnnonce.distance_km && ` • ${selectedAnnonce.distance_km.toFixed(1)} km`}
              </Text>
            </View>
          </View>

          {/* Note et Prix */}
          <View style={styles.cardRating}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={16} color={COLORS.star} />
              <Text style={styles.cardNote}>{selectedAnnonce.rate.toFixed(1)}/5</Text>
              <Text style={styles.cardAvis}>({selectedAnnonce.nb_avis} avis)</Text>
            </View>
            <Text style={styles.listItemPrice}>{selectedAnnonce.tarif_unit}€/{selectedAnnonce.unit_tarif}</Text>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.cardButtonSecondary}
              onPress={handleVoirProfil}
            >
              <Text style={styles.cardButtonSecondaryText}>Voir le prestataire</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cardButtonPrimary}
              onPress={handleReserver}
            >
              <Text style={styles.cardButtonPrimaryText}>Voir l'annonce</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bouton retour flottant */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: COLORS.text
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconButtonDisabled: {
    opacity: 0.5
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16
  },
  filterRow: {
    marginBottom: 16
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8
  },
  rayonButtons: {
    flexDirection: 'row',
    gap: 8
  },
  rayonButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  rayonButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  rayonButtonText: {
    fontSize: 14,
    color: COLORS.text
  },
  rayonButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  starsFilter: {
    flexDirection: 'row',
    gap: 8
  },
  noteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  noteButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  noteButtonText: {
    fontSize: 12,
    color: COLORS.text
  },
  noteButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  map: {
    flex: 1
  },
  customMarker: {
    alignItems: 'center'
  },
  markerContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  markerPhoto: {
    width: 34,
    height: 34,
    borderRadius: 17
  },
  markerBullet: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  markerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  markerBadgeText: {
    fontSize: 12
  },
  resultsCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 120,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  prestataireCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  cardPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  cardPhotoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardInfo: {
    flex: 1
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  },
  cardBadge: {
    fontSize: 16
  },
  cardSpecialite: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 4
  },
  cardVille: {
    fontSize: 13,
    color: COLORS.textLight
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16
  },
  cardNote: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  cardAvis: {
    fontSize: 13,
    color: COLORS.textLight
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12
  },
  cardButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center'
  },
  cardButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary
  },
  cardButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  cardButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 200
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.text
  },
  villeInput: {
    height: 44,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.text
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  sortButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500'
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listItemPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  listItemPhotoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listItemContent: {
    flex: 1
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1
  },
  disponibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E8F5E9',
    borderRadius: 12
  },
  disponibleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success
  },
  disponibleText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600'
  },
  listItemSpecialite: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 6
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  listItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  listItemNote: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  listItemAvis: {
    fontSize: 12,
    color: COLORS.textLight
  },
  listItemDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  listItemDistanceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500'
  },
  listItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center'
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100
  }
});
