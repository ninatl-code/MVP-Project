import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface PhotoPortfolio {
  id: string;
  url: string;
  description?: string;
  categorie?: string;
  ordre: number;
  created_at: string;
}

export default function PortfolioScreen() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoPortfolio | null>(null);
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('');

  const categories = [
    'Mariage',
    'Portrait',
    'Événementiel',
    'Corporate',
    'Produit',
    'Architecture',
    'Nature',
    'Sport',
    'Autre',
  ];

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);

      const { data: profil, error: profilError } = await supabase
        .from('profils_photographe')
        .select('photos_portfolio')
        .eq('user_id', user?.id)
        .single();

      if (profilError) throw profilError;

      if (profil?.photos_portfolio) {
        setPhotos(profil.photos_portfolio);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement portfolio:', error);
      Alert.alert('Erreur', 'Impossible de charger le portfolio');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadPhoto(asset.uri);
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploading(true);

      // Créer un nom de fichier unique
      const fileName = `portfolio_${user?.id}_${Date.now()}.jpg`;
      const filePath = `portfolios/${user?.id}/${fileName}`;

      // Convertir l'URI en blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Ajouter la photo au portfolio
      const newPhoto: PhotoPortfolio = {
        id: Date.now().toString(),
        url: urlData.publicUrl,
        ordre: photos.length,
        created_at: new Date().toISOString(),
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);

      // Sauvegarder dans la DB
      await supabase
        .from('profils_photographe')
        .update({ photos_portfolio: updatedPhotos })
        .eq('user_id', user?.id);

      Alert.alert('Succès', 'Photo ajoutée au portfolio');
    } catch (error: any) {
      console.error('❌ Erreur upload photo:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader la photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous supprimer cette photo du portfolio ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPhotos = photos.filter((p) => p.id !== photoId);
              setPhotos(updatedPhotos);

              await supabase
                .from('profils_photographe')
                .update({ photos_portfolio: updatedPhotos })
                .eq('user_id', user?.id);

              Alert.alert('Succès', 'Photo supprimée');
            } catch (error: any) {
              console.error('❌ Erreur suppression photo:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la photo');
            }
          },
        },
      ]
    );
  };

  const updatePhotoDetails = async () => {
    if (!selectedPhoto) return;

    try {
      const updatedPhotos = photos.map((p) =>
        p.id === selectedPhoto.id
          ? { ...p, description, categorie }
          : p
      );

      setPhotos(updatedPhotos);

      await supabase
        .from('profils_photographe')
        .update({ photos_portfolio: updatedPhotos })
        .eq('user_id', user?.id);

      setModalVisible(false);
      Alert.alert('Succès', 'Photo mise à jour');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour photo:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    }
  };

  const openPhotoModal = (photo: PhotoPortfolio) => {
    setSelectedPhoto(photo);
    setDescription(photo.description || '');
    setCategorie(photo.categorie || '');
    setModalVisible(true);
  };

  const reorderPhotos = async (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    const reorderedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      ordre: index,
    }));

    setPhotos(reorderedPhotos);

    await supabase
      .from('profils_photographe')
      .update({ photos_portfolio: reorderedPhotos })
      .eq('user_id', user?.id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Portfolio</Text>
          <Text style={styles.subtitle}>
            {photos.length} photo{photos.length > 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={pickImage}
          disabled={uploading}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.addButtonText}>
            {uploading ? 'Upload en cours...' : 'Ajouter des photos'}
          </Text>
        </TouchableOpacity>

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>
              Aucune photo dans votre portfolio
            </Text>
            <Text style={styles.emptySubtext}>
              Ajoutez vos meilleures photos pour attirer les clients
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoCard}
                onPress={() => openPhotoModal(photo)}
                onLongPress={() => deletePhoto(photo.id)}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
                {photo.categorie && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{photo.categorie}</Text>
                  </View>
                )}
                {photo.description && (
                  <View style={styles.descriptionOverlay}>
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {photo.description}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deletePhoto(photo.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de détails photo */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Détails de la photo</Text>

            {selectedPhoto && (
              <Image source={{ uri: selectedPhoto.url }} style={styles.modalPhoto} />
            )}

            <Text style={styles.label}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      categorie === cat && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategorie(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        categorie === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Description (optionnelle)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez cette photo..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={updatePhotoDetails}
              >
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#5C6BC0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(92, 107, 192, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#5C6BC0',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#5C6BC0',
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
