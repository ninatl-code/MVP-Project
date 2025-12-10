import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS, ICON_SIZES } from '@/lib/constants';
import { Button, LoadingSpinner } from './index';

export interface ImagePickerComponentProps {
  onImageSelected: (imageUri: string, imageUrl?: string) => void;
  onImageUploaded?: (imageUrl: string) => void;
  multiple?: boolean;
  maxImages?: number;
  currentImages?: string[];
  uploadToSupabase?: boolean;
  storageBucket?: string;
  style?: any;
  placeholder?: string;
}

export default function ImagePickerComponent({
  onImageSelected,
  onImageUploaded,
  multiple = false,
  maxImages = 5,
  currentImages = [],
  uploadToSupabase = false,
  storageBucket = 'photos',
  style,
  placeholder = 'Ajouter une photo',
}: ImagePickerComponentProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(currentImages);

  // Request permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'Cette application nécessite l\'accès à l\'appareil photo et à la galerie pour fonctionner correctement.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Upload image to Supabase
  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);

      // Read file
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Le fichier n\'existe pas');
      }

      // Create unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${storageBucket}/${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Impossible d\'upload l\'image. Veuillez réessayer.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Show action sheet for image selection
  const showImagePicker = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageFromCamera();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Sélectionner une image',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Appareil photo', onPress: pickImageFromCamera },
          { text: 'Galerie', onPress: pickImageFromLibrary },
        ]
      );
    }
  };

  // Pick image from camera
  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à l\'appareil photo.');
    }
  };

  // Pick image from library
  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !multiple,
        allowsMultipleSelection: multiple,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: multiple ? maxImages : 1,
      });

      if (!result.canceled) {
        if (multiple && result.assets.length > 0) {
          for (const asset of result.assets) {
            await handleImageSelected(asset.uri);
          }
        } else if (result.assets[0]) {
          await handleImageSelected(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Library error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie.');
    }
  };

  // Handle image selection
  const handleImageSelected = async (uri: string) => {
    if (multiple && selectedImages.length >= maxImages) {
      Alert.alert('Limite atteinte', `Vous pouvez sélectionner maximum ${maxImages} images.`);
      return;
    }

    onImageSelected(uri);

    if (multiple) {
      setSelectedImages(prev => [...prev, uri]);
    }

    if (uploadToSupabase) {
      const uploadedUrl = await uploadImageToSupabase(uri);
      if (uploadedUrl) {
        onImageUploaded?.(uploadedUrl);
      }
    }
  };

  // Remove image
  const removeImage = (uri: string) => {
    setSelectedImages(prev => prev.filter(img => img !== uri));
    // You might want to call a callback here too
  };

  return (
    <View style={[styles.container, style]}>
      {uploading && <LoadingSpinner overlay text="Upload en cours..." />}
      
      {/* Image Grid */}
      {multiple && selectedImages.length > 0 && (
        <View style={styles.imageGrid}>
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(uri)}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Single Image Display */}
      {!multiple && selectedImages.length > 0 && (
        <View style={styles.singleImageContainer}>
          <Image source={{ uri: selectedImages[0] }} style={styles.selectedImageLarge} />
          <TouchableOpacity
            style={styles.removeButtonLarge}
            onPress={() => removeImage(selectedImages[0])}
          >
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Add Image Button */}
      {(!multiple || selectedImages.length < maxImages) && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={showImagePicker}
          disabled={uploading}
        >
          <Ionicons
            name="camera-outline"
            size={ICON_SIZES.xl}
            color={COLORS.text.tertiary}
          />
          <Text style={styles.addButtonText}>{placeholder}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
  },
  singleImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  selectedImageLarge: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray[200],
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  removeButtonLarge: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addButton: {
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    backgroundColor: COLORS.surface.secondary,
  },
  addButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500' as any,
    color: COLORS.text.tertiary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});