import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabaseClient';
import FooterPresta from '@/components/photographe/FooterPresta';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  purple: '#AF52DE',
};

interface MediaItem {
  id: string;
  user_id: string;
  media_type: 'image' | 'video' | 'document';
  file_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  description?: string;
  tags: string[];
  is_public: boolean;
  is_featured: boolean;
  metadata: any;
  created_at: string;
}

interface MediaAlbum {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  item_count: number;
}

export default function MediaLibraryScreen() {
  const routerHook = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos' | 'documents'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    requestPermissions();
    loadMediaLibrary();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and media library permissions to upload photos and videos.'
      );
    }
  };

  const loadMediaLibrary = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load delivery galleries (galeries_livraison)
      const { data: galleriesData, error: galleriesError } = await supabase
        .from('galeries_livraison')
        .select('*')
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (galleriesError) throw galleriesError;
      
      // Transform galeries_livraison data to MediaItem format
      const mediaItems = (galleriesData || []).map((gallery: any) => ({
        id: gallery.id,
        user_id: gallery.photographe_id,
        media_type: 'image' as const,
        files: gallery.photos || [],
        description: gallery.message_accompagnement,
        created_at: gallery.created_at,
      }));
      
      setMedia(mediaItems);

      // Load reservations as "albums"
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('id, client_nom, service_start_datetime')
        .eq('photographe_id', user.id)
        .order('service_start_datetime', { ascending: false })
        .limit(10);

      if (resError) throw resError;
      
      const albums = (reservations || []).map((res: any) => ({
        id: res.id,
        title: res.client_nom || 'Réservation',
        item_count: 0,
      }));
      
      setAlbums(
        albumsData?.map((a: any) => ({
          ...a,
          item_count: a.album_media?.[0]?.count || 0,
        })) || albums
      );
    } catch (error) {
      console.error('Error loading media library:', error);
      Alert.alert('Error', 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        exif: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadMedia(asset.uri, 'image', asset);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        await uploadMedia(result.assets[0].uri, 'video', result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        await uploadMedia(doc.uri, 'document', doc);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadMedia = async (uri: string, mediaType: string, asset: any) => {
    if (!userId) return;

    try {
      setUploading(true);

      const fileName = asset.fileName || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileExt = fileName.split('.').pop();
      const filePath = `${userId}/${mediaType}s/${Date.now()}_${fileName}`;

      // Upload to Supabase Storage (galeries bucket)
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('galeries')
        .upload(filePath, blob, {
          contentType: asset.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('galeries')
        .getPublicUrl(filePath);

      // Create media record in galeries_livraison (associate with recent reservation)
      // Get the latest reservation for this photographer
      const { data: latestRes } = await supabase
        .from('reservations')
        .select('id, client_id')
        .eq('photographe_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestRes) {
        const { error: insertError } = await supabase.from('galeries_livraison').insert({
          reservation_id: latestRes.id,
          photographe_id: userId,
          client_id: latestRes.client_id,
          photos: [urlData.publicUrl],
        });

        if (insertError) throw insertError;
      }

      // Create processing job for videos
      if (mediaType === 'video') {
        await supabase.from('media_processing_jobs').insert({
          media_id: uploadData.path,
          job_type: 'thumbnail',
          status: 'pending',
          input_params: {
            video_url: urlData.publicUrl,
            timestamp: 1,
          },
        });
      }

      await loadMediaLibrary();
      Alert.alert('Success', 'Media uploaded successfully!');
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete galleries
              await supabase.from('galeries_livraison').delete().in('id', selectedItems);

              setSelectedItems([]);
              setSelectionMode(false);
              await loadMediaLibrary();
              Alert.alert('Success', 'Galleries deleted successfully');
            } catch (error) {
              console.error('Error deleting media:', error);
              Alert.alert('Error', 'Failed to delete media');
            }
          },
        },
      ]
    );
  };

  const getFilteredMedia = () => {
    if (activeTab === 'all') return media;
    return media.filter((m) => {
      if (activeTab === 'images') return m.media_type === 'image';
      if (activeTab === 'videos') return m.media_type === 'video';
      if (activeTab === 'documents') return m.media_type === 'document';
      return false;
    });
  };

  const renderMediaItem = (item: MediaItem) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.mediaItem}
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item.id);
          } else {
            router.push(`/prestataires/media-detail?id=${item.id}` as any);
          }
        }}
        onLongPress={() => {
          setSelectionMode(true);
          toggleSelection(item.id);
        }}
      >
        {item.media_type === 'image' ? (
          <Image source={{ uri: item.file_url }} style={styles.mediaImage} />
        ) : item.media_type === 'video' ? (
          <View style={styles.videoContainer}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.mediaImage} />
            ) : (
              <View style={[styles.mediaImage, styles.videoPlaceholder]}>
                <Ionicons name="videocam" size={32} color={COLORS.surface} />
              </View>
            )}
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle" size={24} color={COLORS.surface} />
            </View>
          </View>
        ) : (
          <View style={[styles.mediaImage, styles.documentPlaceholder]}>
            <Ionicons name="document" size={32} color={COLORS.primary} />
            <Text style={styles.documentExt} numberOfLines={1}>
              {item.file_name.split('.').pop()?.toUpperCase()}
            </Text>
          </View>
        )}

        {selectionMode && (
          <View style={[styles.selectionCircle, isSelected && styles.selectionCircleSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.surface} />}
          </View>
        )}

        {item.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const filteredMedia = getFilteredMedia();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setSelectionMode(false);
                setSelectedItems([]);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedItems.length} selected
            </Text>
            <TouchableOpacity onPress={deleteSelected} disabled={selectedItems.length === 0}>
              <Ionicons
                name="trash"
                size={24}
                color={selectedItems.length > 0 ? COLORS.error : COLORS.border}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Media Library</Text>
            <TouchableOpacity onPress={() => router.push('/prestataires/media-albums' as any)}>
              <Ionicons name="albums-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { id: 'all', label: 'All', count: media.length },
          { id: 'images', label: 'Images', count: media.filter((m) => m.media_type === 'image').length },
          { id: 'videos', label: 'Videos', count: media.filter((m) => m.media_type === 'video').length },
          { id: 'documents', label: 'Documents', count: media.filter((m) => m.media_type === 'document').length },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Media Grid */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {filteredMedia.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Media Yet</Text>
            <Text style={styles.emptyText}>
              Upload photos, videos, and documents to your library
            </Text>
          </View>
        ) : (
          <View style={styles.mediaGrid}>{filteredMedia.map(renderMediaItem)}</View>
        )}
      </ScrollView>

      {/* Upload FAB */}
      {!selectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Alert.alert('Upload Media', 'Choose media type to upload', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Photos', onPress: pickImage },
              { text: 'Videos', onPress: pickVideo },
              { text: 'Documents', onPress: pickDocument },
            ]);
          }}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Ionicons name="add" size={28} color={COLORS.surface} />
          )}
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => routerHook.back()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  tabsScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.textSecondary,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  documentPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
  },
  documentExt: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
  selectionCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.surface,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
