import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface PhotoSelection {
  uri: string;
  id: string;
  selected: boolean;
}

export default function ConfigureTiragesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [photos, setPhotos] = useState<PhotoSelection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin d\'accéder à vos photos pour créer des tirages.'
      );
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
          selected: true,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setPhotos(
      photos.map((photo) =>
        photo.id === photoId ? { ...photo, selected: !photo.selected } : photo
      )
    );
  };

  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter((photo) => photo.id !== photoId));
  };

  const getSelectedCount = () => photos.filter((p) => p.selected).length;

  const handleValider = () => {
    const selectedPhotos = photos.filter((p) => p.selected);
    
    if (selectedPhotos.length === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner au moins une photo');
      return;
    }

    // Calculer le prix total
    const quantiteParPhoto = parseInt(params.quantite as string) || 1;
    const totalPhotos = selectedPhotos.length * quantiteParPhoto;

    Alert.alert(
      'Confirmer la commande',
      `Vous allez commander ${totalPhotos} tirages (${selectedPhotos.length} photos × ${quantiteParPhoto}). Continuer vers le paiement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: () => {
            // Naviguer vers le paiement
            router.push({
              pathname: '/shared/paiement',
              params: {
                type: 'tirages',
                photosCount: selectedPhotos.length,
                ...params,
              },
            });
          },
        },
      ]
    );
  };

  const renderPhotoItem = ({ item }: { item: PhotoSelection }) => (
    <View style={styles.photoItem}>
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={() => togglePhotoSelection(item.id)}
      >
        <Image source={{ uri: item.uri }} style={styles.photoImage} />
        <View style={styles.photoOverlay}>
          <View
            style={[
              styles.checkbox,
              item.selected && styles.checkboxSelected,
            ]}
          >
            {item.selected && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removePhoto(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionner vos photos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Paramètres sélectionnés */}
        <View style={styles.paramsCard}>
          <Text style={styles.paramsTitle}>Paramètres sélectionnés</Text>
          <View style={styles.paramsGrid}>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Format</Text>
              <Text style={styles.paramValue}>{params.format}</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Finition</Text>
              <Text style={styles.paramValue}>{params.finition}</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Papier</Text>
              <Text style={styles.paramValue}>{params.papier}</Text>
            </View>
            <View style={styles.paramItem}>
              <Text style={styles.paramLabel}>Quantité/photo</Text>
              <Text style={styles.paramValue}>{params.quantite}</Text>
            </View>
          </View>
        </View>

        {/* Bouton d'ajout */}
        <TouchableOpacity style={styles.addButton} onPress={pickImages}>
          <Ionicons name="add-circle-outline" size={32} color="#5C6BC0" />
          <Text style={styles.addButtonText}>
            {photos.length === 0 ? 'Sélectionner des photos' : 'Ajouter plus de photos'}
          </Text>
        </TouchableOpacity>

        {/* Galerie de photos */}
        {photos.length > 0 && (
          <>
            <View style={styles.statsCard}>
              <Ionicons name="images-outline" size={24} color="#5C6BC0" />
              <Text style={styles.statsText}>
                {getSelectedCount()} photo(s) sélectionnée(s) sur {photos.length}
              </Text>
            </View>

            <FlatList
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.photoGrid}
            />
          </>
        )}

        {photos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>Aucune photo sélectionnée</Text>
            <Text style={styles.emptyText}>
              Appuyez sur le bouton ci-dessus pour commencer
            </Text>
          </View>
        )}
      </ScrollView>

      {photos.length > 0 && getSelectedCount() > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>
              {getSelectedCount() * (parseInt(params.quantite as string) || 1)} tirages
            </Text>
          </View>
          <TouchableOpacity style={styles.validerButton} onPress={handleValider}>
            <Text style={styles.validerButtonText}>Valider</Text>
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  paramsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  paramsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paramsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paramItem: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  paramLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  paramValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5C6BC0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6BC0',
    marginTop: 8,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 12,
  },
  photoGrid: {
    gap: 8,
  },
  photoItem: {
    width: '31.5%',
    aspectRatio: 1,
    marginBottom: 8,
    position: 'relative',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    gap: 16,
  },
  footerInfo: {
    flex: 1,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  validerButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  validerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
