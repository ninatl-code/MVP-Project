import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Image, Upload, Trash2, Grid, List, Search, Filter,
  Plus, X, Check, Download, Eye, Star, Tag, FolderPlus,
  Video, FileText, ImageIcon, MoreVertical, Edit2, Copy,
  ChevronDown, Loader2
} from 'lucide-react';

const COLORS = {
  primary: '#F8F9FB',
  accent: '#130183',
  secondary: '#5C6BC0',
  background: '#FFFFFF',
  text: '#222222',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

const MEDIA_TYPES = [
  { key: 'all', label: 'Tout', icon: Grid },
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Vidéos', icon: Video },
  { key: 'document', label: 'Documents', icon: FileText },
];

export default function MediathequePage() {
  const router = useRouter();
  const { user, photographeProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [stats, setStats] = useState({
    totalImages: 0,
    totalVideos: 0,
    totalDocuments: 0,
    totalSize: 0
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadMediaLibrary();
    }
  }, [user]);

  const loadMediaLibrary = async () => {
    try {
      setLoading(true);
      
      // Load media items
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);

      // Calculate stats
      const images = mediaData?.filter(m => m.media_type === 'image') || [];
      const videos = mediaData?.filter(m => m.media_type === 'video') || [];
      const documents = mediaData?.filter(m => m.media_type === 'document') || [];
      const totalSize = mediaData?.reduce((acc, m) => acc + (m.file_size || 0), 0) || 0;

      setStats({
        totalImages: images.length,
        totalVideos: videos.length,
        totalDocuments: documents.length,
        totalSize
      });

      // Load albums
      const { data: albumsData, error: albumsError } = await supabase
        .from('media_albums')
        .select('*, album_media(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!albumsError) {
        setAlbums(albumsData?.map(a => ({
          ...a,
          item_count: a.album_media?.[0]?.count || 0
        })) || []);
      }

    } catch (error) {
      console.error('Error loading media library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length || !user?.id) return;

    setUploading(true);
    setShowUploadModal(false);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Determine media type
        let mediaType = 'document';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('media_library')
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media_library')
          .getPublicUrl(filePath);

        // Create media record
        await supabase.from('media_library').insert({
          user_id: user.id,
          media_type: mediaType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          is_public: false,
          is_featured: false,
          tags: [],
          metadata: { uploaded_from: 'web' }
        });
      }

      await loadMediaLibrary();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Erreur lors de l\'upload des fichiers');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`Supprimer ${selectedItems.length} élément(s) ?`)) return;

    try {
      // Delete from storage
      const itemsToDelete = media.filter(m => selectedItems.includes(m.id));
      const filePaths = itemsToDelete.map(m => {
        const url = new URL(m.file_url);
        return url.pathname.split('/').slice(-2).join('/');
      });

      await supabase.storage.from('media_library').remove(filePaths);

      // Delete from database
      await supabase.from('media_library').delete().in('id', selectedItems);

      setSelectedItems([]);
      setSelectionMode(false);
      await loadMediaLibrary();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !user?.id) return;

    try {
      await supabase.from('media_albums').insert({
        user_id: user.id,
        title: newAlbumName.trim(),
        description: ''
      });

      setNewAlbumName('');
      setShowAlbumModal(false);
      await loadMediaLibrary();
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Erreur lors de la création de l\'album');
    }
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleFeatured = async (item) => {
    try {
      await supabase
        .from('media_library')
        .update({ is_featured: !item.is_featured })
        .eq('id', item.id);
      await loadMediaLibrary();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const getFilteredMedia = () => {
    let filtered = media;
    
    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(m => m.media_type === activeTab);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.accent }} />
        </div>
      </div>
    );
  }

  const filteredMedia = getFilteredMedia();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>Médiathèque</h1>
            <p className="text-gray-500 mt-1">Gérez toutes vos photos, vidéos et documents</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAlbumModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              <FolderPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouvel album</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl transition-all"
              style={{ background: COLORS.accent }}
            >
              <Upload className="w-5 h-5" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalImages}</p>
                <p className="text-sm text-gray-500">Images</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalVideos}</p>
                <p className="text-sm text-gray-500">Vidéos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalDocuments}</p>
                <p className="text-sm text-gray-500">Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{formatFileSize(stats.totalSize)}</p>
                <p className="text-sm text-gray-500">Espace utilisé</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {MEDIA_TYPES.map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.key}
                    onClick={() => setActiveTab(type.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === type.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search + Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-48"
                />
              </div>

              <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {selectedItems.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Supprimer ({selectedItems.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Albums */}
        {albums.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.text }}>Albums</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {albums.map(album => (
                <div
                  key={album.id}
                  className="flex-shrink-0 w-40 bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {album.cover_image_url ? (
                      <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <FolderPlus className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate" style={{ color: COLORS.text }}>{album.title}</p>
                    <p className="text-xs text-gray-500">{album.item_count} éléments</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Grid/List */}
        {filteredMedia.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun média</h3>
            <p className="text-gray-500 mb-6">
              Commencez par ajouter des photos, vidéos ou documents
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl transition-all"
              style={{ background: COLORS.accent }}
            >
              <Upload className="w-5 h-5" />
              Ajouter des fichiers
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMedia.map(item => (
              <div
                key={item.id}
                className={`relative group bg-white rounded-xl border overflow-hidden cursor-pointer transition-all ${
                  selectedItems.includes(item.id) ? 'ring-2 ring-indigo-500' : 'border-gray-100 hover:shadow-md'
                }`}
                onClick={() => selectionMode ? toggleSelection(item.id) : null}
              >
                <div className="aspect-square relative">
                  {item.media_type === 'image' ? (
                    <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                  ) : item.media_type === 'video' ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-12 h-12 text-white" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Selection checkbox */}
                  <div className={`absolute top-2 left-2 transition-opacity ${selectionMode || selectedItems.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); setSelectionMode(true); }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedItems.includes(item.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white/80 border-gray-300'
                      }`}
                    >
                      {selectedItems.includes(item.id) && <Check className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Featured star */}
                  {item.is_featured && (
                    <div className="absolute top-2 right-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(item.file_url, '_blank'); }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFeatured(item); }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <Star className={`w-4 h-4 ${item.is_featured ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    </button>
                    <a
                      href={item.file_url}
                      download={item.file_name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: COLORS.text }}>{item.file_name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(item.file_size)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
            {filteredMedia.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-all ${
                  selectedItems.includes(item.id) ? 'bg-indigo-50' : ''
                }`}
              >
                <button
                  onClick={() => { toggleSelection(item.id); setSelectionMode(true); }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedItems.includes(item.id)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedItems.includes(item.id) && <Check className="w-3 h-3" />}
                </button>

                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {item.media_type === 'image' ? (
                    <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                  ) : item.media_type === 'video' ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: COLORS.text }}>{item.file_name}</p>
                  <p className="text-sm text-gray-500">
                    {item.media_type === 'image' ? 'Image' : item.media_type === 'video' ? 'Vidéo' : 'Document'}
                    {' • '}{formatFileSize(item.file_size)}
                    {' • '}{new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                  <button
                    onClick={() => window.open(item.file_url, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                  <a
                    href={item.file_url}
                    download={item.file_name}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Ajouter des fichiers</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              <p className="text-gray-600 font-medium mb-1">
                {uploading ? 'Upload en cours...' : 'Cliquez ou glissez vos fichiers ici'}
              </p>
              <p className="text-sm text-gray-400">Images, vidéos, PDF (max 50MB)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 px-4 py-2 text-white rounded-xl transition-all disabled:opacity-50"
                style={{ background: COLORS.accent }}
              >
                {uploading ? 'Upload...' : 'Parcourir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Album Modal */}
      {showAlbumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Nouvel album</h3>
              <button onClick={() => setShowAlbumModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'album</label>
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Ex: Mariage Dupont"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAlbumModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateAlbum}
                disabled={!newAlbumName.trim()}
                className="flex-1 px-4 py-2 text-white rounded-xl transition-all disabled:opacity-50"
                style={{ background: COLORS.accent }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
