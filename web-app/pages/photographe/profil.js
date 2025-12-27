import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  User, Camera, MapPin, Instagram, Globe, Phone, Mail,
  Save, Plus, X, Image, Star, Eye, Upload, Check
} from 'lucide-react';

const SPECIALITES = [
  'Portrait', 'Mariage', 'Événement', 'Corporate', 'Produit',
  'Immobilier', 'Mode', 'Famille', 'Grossesse', 'Nouveau-né',
  'Sport', 'Concert', 'Culinaire', 'Architecture', 'Lifestyle'
];

export default function PhotographeProfilPage() {
  const router = useRouter();
  const { user, photographeProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [portfolioImages, setPortfolioImages] = useState([]);
  const fileInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchFullProfile();
    }
  }, [photographeProfile]);

  const fetchFullProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profils_photographe')
        .select('*')
        .eq('id', photographeProfile.id)
        .single();

      if (error) throw error;
      setProfile(data);

      // Fetch portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('photographe_id', photographeProfile.id)
        .order('ordre', { ascending: true });

      if (!portfolioError) {
        setPortfolioImages(portfolio || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profils_photographe')
        .update({
          nom_entreprise: profile.nom_entreprise,
          bio: profile.bio,
          localisation: profile.localisation,
          rayon_deplacement: profile.rayon_deplacement,
          tarif_horaire: profile.tarif_horaire,
          specialites: profile.specialites,
          instagram: profile.instagram,
          site_web: profile.site_web,
          telephone: profile.telephone,
        })
        .eq('id', photographeProfile.id);

      if (error) throw error;
      await refreshProfile();
      alert('Profil mis à jour !');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${photographeProfile.id}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile
      const field = type === 'avatar' ? 'photo_profil' : 'photo_couverture';
      const { error: updateError } = await supabase
        .from('profils_photographe')
        .update({ [field]: publicUrl })
        .eq('id', photographeProfile.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, [field]: publicUrl }));
      await refreshProfile();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${photographeProfile.id}-portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `portfolio/${fileName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('portfolio_images')
          .insert({
            photographe_id: photographeProfile.id,
            url: publicUrl,
            ordre: portfolioImages.length,
          });

        if (insertError) throw insertError;

        setPortfolioImages(prev => [...prev, { url: publicUrl, ordre: prev.length }]);
      } catch (error) {
        console.error('Error uploading portfolio image:', error);
      }
    }
  };

  const handleDeletePortfolioImage = async (imageId, imageUrl) => {
    try {
      const { error } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setPortfolioImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const toggleSpecialite = (spec) => {
    const currentSpecs = profile.specialites || [];
    if (currentSpecs.includes(spec)) {
      handleProfileChange('specialites', currentSpecs.filter(s => s !== spec));
    } else {
      handleProfileChange('specialites', [...currentSpecs, spec]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'general', label: 'Général' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'tarifs', label: 'Tarifs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Photo */}
        <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl overflow-hidden">
          {profile?.photo_couverture && (
            <img 
              src={profile.photo_couverture} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          )}
          <label className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 rounded-lg cursor-pointer hover:bg-white transition-all flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm">Modifier</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e, 'cover')}
              className="hidden"
            />
          </label>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 px-6 pb-6">
          <div className="flex items-end gap-6 -mt-12">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-gray-200 border-4 border-white shadow-lg overflow-hidden">
                {profile?.photo_profil ? (
                  <img 
                    src={profile.photo_profil} 
                    alt={profile.nom_entreprise} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700 transition-all">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'avatar')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 pt-16">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.nom_entreprise || 'Mon profil photographe'}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                {profile?.localisation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.localisation}
                  </span>
                )}
                {profile?.note_moyenne && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {profile.note_moyenne.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => router.push(`/photographes/${photographeProfile.id}`)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Aperçu public
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'entreprise / Nom artistique
                </label>
                <input
                  type="text"
                  value={profile?.nom_entreprise || ''}
                  onChange={(e) => handleProfileChange('nom_entreprise', e.target.value)}
                  placeholder="Studio Photo Paris"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio / Présentation
                </label>
                <textarea
                  value={profile?.bio || ''}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  placeholder="Présentez-vous et votre style de photographie..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localisation
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.localisation || ''}
                      onChange={(e) => handleProfileChange('localisation', e.target.value)}
                      placeholder="Paris, France"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rayon de déplacement (km)
                  </label>
                  <input
                    type="number"
                    value={profile?.rayon_deplacement || ''}
                    onChange={(e) => handleProfileChange('rayon_deplacement', parseInt(e.target.value))}
                    placeholder="50"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spécialités
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALITES.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialite(spec.toLowerCase())}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        (profile?.specialites || []).includes(spec.toLowerCase())
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.instagram || ''}
                      onChange={(e) => handleProfileChange('instagram', e.target.value)}
                      placeholder="@username"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site web
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={profile?.site_web || ''}
                      onChange={(e) => handleProfileChange('site_web', e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profile?.telephone || ''}
                    onChange={(e) => handleProfileChange('telephone', e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Portfolio</h3>
                  <p className="text-sm text-gray-500">{portfolioImages.length} photo(s)</p>
                </div>
                <label className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer hover:bg-indigo-700 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Ajouter des photos
                  <input
                    ref={portfolioInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {portfolioImages.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Aucune photo dans votre portfolio</p>
                  <p className="text-sm text-gray-400">
                    Ajoutez vos meilleures photos pour attirer des clients
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {portfolioImages.map((image) => (
                    <div key={image.id} className="relative group aspect-square rounded-xl overflow-hidden">
                      <img 
                        src={image.url} 
                        alt="Portfolio" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeletePortfolioImage(image.id, image.url)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tarifs' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif horaire de base (€)
                </label>
                <input
                  type="number"
                  value={profile?.tarif_horaire || ''}
                  onChange={(e) => handleProfileChange('tarif_horaire', parseFloat(e.target.value))}
                  placeholder="80"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ce tarif sera affiché sur votre profil public
                </p>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4">
                <h4 className="font-medium text-indigo-900 mb-2">Forfaits personnalisés</h4>
                <p className="text-sm text-indigo-700 mb-3">
                  Créez des forfaits détaillés pour présenter vos différentes offres
                </p>
                <button
                  onClick={() => router.push('/photographe/packages')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  Gérer mes forfaits
                </button>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
