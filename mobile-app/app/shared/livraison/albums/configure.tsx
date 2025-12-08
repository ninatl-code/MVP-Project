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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

interface PhotoAlbum {
  uri: string;
  id: string;
  ordre: number;
}

export default function ConfigureAlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const nombrePages = parseInt(params.nombrePages as string) || 20;
  const maxPhotos = nombrePages * 2; // 2 photos par page

  const [photos, setPhotos] = useState<PhotoAlbum[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin d\'accéder à vos photos pour créer votre album.'
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
          ordre: photos.length + index,
        }));

        const updatedPhotos = [...photos, ...newPhotos];
        if (updatedPhotos.length > maxPhotos) {
          Alert.alert(
            'Limite atteinte',
            `Votre album peut contenir maximum ${maxPhotos} photos (${nombrePages} pages × 2 photos).`
          );
          setPhotos(updatedPhotos.slice(0, maxPhotos));
        } else {
          setPhotos(updatedPhotos);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter((photo) => photo.id !== photoId).map((p, i) => ({ ...p, ordre: i })));
  };

  const handleReorder = (data: PhotoAlbum[]) => {
    setPhotos(data.map((p, i) => ({ ...p, ordre: i })));
  };

  const handleContinuer = () => {
    if (photos.length === 0) {
      Alert.alert('Attention', 'Veuillez ajouter au moins une photo');
      return;
    }

    router.push({
      pathname: '/shared/livraison/albums/commander',
      params: {
        ...params,
        photosCount: photos.length.toString(),
      },
    });
  };

  const renderPhotoItem = ({ item }: { item: PhotoAlbum }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removePhoto(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#F44336" />
      </TouchableOpacity>
      <View style={styles.dragHandle}>
        <Ionicons name="menu" size={20} color="#FFF" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organiser vos photos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info album */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Album:</Text>
            <Text style={styles.infoValue}>{params.titre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pages:</Text>
            <Text style={styles.infoValue}>{nombrePages} pages</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Capacité:</Text>
            <Text style={styles.infoValue}>
              {photos.length}/{maxPhotos} photos
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#5C6BC0" />
          <View style={styles.instructionsText}>
            <Text style={styles.instructionTitle}>Organisation des photos</Text>
            <Text style={styles.instructionItem}>
              • Maintenez et glissez pour réorganiser
            </Text>
            <Text style={styles.instructionItem}>
              • Les photos seront disposées dans l'ordre affiché
            </Text>
            <Text style={styles.instructionItem}>
              • 2 photos par page, recto-verso
            </Text>
          </View>
        </View>

        {/* Bouton d'ajout */}
        <TouchableOpacity 
          style={[
            styles.addButton,
            photos.length >= maxPhotos && styles.addButtonDisabled,
          ]}
          onPress={pickImages}
          disabled={photos.length >= maxPhotos}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={32} 
            color={photos.length >= maxPhotos ? '#CCC' : '#5C6BC0'} 
          />
          <Text style={[
            styles.addButtonText,
            photos.length >= maxPhotos && styles.addButtonTextDisabled,
          ]}>
            {photos.length === 0 
              ? 'Sélectionner des photos' 
              : photos.length >= maxPhotos
                ? 'Album complet'
                : 'Ajouter plus de photos'}
          </Text>
        </TouchableOpacity>

        {/* Galerie de photos */}
        {photos.length > 0 && (
          <View style={styles.galleryContainer}>
            <Text style={styles.galleryTitle}>
              Vos photos ({photos.length})
            </Text>
            <FlatList
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.photoGrid}
            />
          </View>
        )}

        {photos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>Aucune photo ajoutée</Text>
            <Text style={styles.emptyText}>
              Commencez par ajouter vos photos ci-dessus
            </Text>
          </View>
        )}
      </ScrollView>

      {photos.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount}>{photos.length} photo(s)</Text>
            <Text style={styles.footerPages}>
              ≈ {Math.ceil(photos.length / 2)} pages utilisées
            </Text>
          </View>
          <TouchableOpacity style={styles.continuerButton} onPress={handleContinuer}>
            <Text style={styles.continuerButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 4,
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
  addButtonDisabled: {
    borderColor: '#CCC',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6BC0',
    marginTop: 8,
  },
  addButtonTextDisabled: {
    color: '#CCC',
  },
  galleryContainer: {
    marginBottom: 100,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photoGrid: {
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    marginBottom: 8,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  footerCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footerPages: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  continuerButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  continuerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
