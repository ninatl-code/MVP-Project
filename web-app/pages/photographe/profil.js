import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  User, Camera, MapPin, Instagram, Globe, Phone, Mail,
  Save, Plus, X, Image, Star, Eye, Upload, Check, 
  Shield, FileText, CreditCard, Building, AlertCircle,
  CheckCircle, Clock, XCircle, Loader2, LogOut,
  Facebook, Linkedin, Briefcase, TrendingUp,
  Layers, Home, Users, Sunset, Mountain, Palette,
  Sparkles, Video, Aperture, Sun, Moon, Car, Euro, Lock
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

const DOCUMENT_TYPES = [
  { type: 'identity_card', label: "Carte d'identité", icon: CreditCard, description: 'Recto et verso de votre CNI', required: true },
  { type: 'siret', label: "Numéro SIRET", icon: Building, description: 'Justificatif SIRET ou Kbis', required: true },
  { type: 'insurance', label: "Assurance professionnelle", icon: Shield, description: 'Attestation RC Pro en cours', required: false },
  { type: 'rib', label: "RIB", icon: FileText, description: 'Coordonnées bancaires pour les paiements', required: true },
];

const SPECIALITES = [
  'Portrait', 'Mariage', 'Événement', 'Corporate', 'Produit',
  'Immobilier', 'Mode', 'Famille', 'Grossesse', 'Nouveau-né',
  'Sport', 'Concert', 'Culinaire', 'Architecture', 'Lifestyle'
];

const STYLES_PHOTO = [
  { id: 'naturel', label: 'Naturel / Lifestyle', icon: Sunset },
  { id: 'studio', label: 'Studio / Éclairé', icon: Sun },
  { id: 'artistique', label: 'Artistique / Créatif', icon: Palette },
  { id: 'documentaire', label: 'Documentaire / Reportage', icon: Camera },
  { id: 'minimaliste', label: 'Minimaliste / Épuré', icon: Mountain },
  { id: 'vintage', label: 'Vintage / Rétro', icon: Aperture },
];

const EQUIPEMENT = [
  { id: 'drone', label: 'Drone', icon: Video },
  { id: 'eclairage_studio', label: 'Éclairage studio', icon: Sun },
  { id: 'studio_mobile', label: 'Studio mobile', icon: Home },
  { id: 'reflecteurs', label: 'Réflecteurs', icon: Sparkles },
  { id: 'stabilisateur', label: 'Stabilisateur vidéo', icon: Video },
  { id: 'fond_studio', label: 'Fonds studio', icon: Layers },
];

const EQUIPE = [
  { id: 'solo', label: 'Je travaille seul(e)', icon: User },
  { id: 'assistant', label: 'Avec assistant(e)', icon: Users },
  { id: 'maquilleur', label: 'Maquilleuse disponible', icon: Sparkles },
  { id: 'styliste', label: 'Styliste disponible', icon: Palette },
  { id: 'videaste', label: 'Vidéaste disponible', icon: Video },
];

const TARIFS_CATEGORIES = [
  { id: 'portrait', label: 'Portrait', icon: User },
  { id: 'mariage', label: 'Mariage', icon: Star },
  { id: 'evenement', label: 'Événement', icon: Camera },
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'produit', label: 'Produit', icon: Image },
  { id: 'immobilier', label: 'Immobilier', icon: Home },
];

export default function PhotographeProfilPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [villeNom, setVilleNom] = useState('');
  const [portfolioImages, setPortfolioImages] = useState([]);
  const fileInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  
  // Nouveaux états pour vérification, stats, etc.
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [stats, setStats] = useState({
    totalAnnonces: 0,
    totalReservations: 0,
    chiffreAffaires: 0,
    noteMoyenne: 0,
    totalVues: 0
  });
  
  // États pour la modification du mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        console.log('User check:', currentUser?.email, error);
        
        if (currentUser) {
          await fetchFullProfile(currentUser.id);
          await fetchVerificationStatus(currentUser.id);
          await loadStats(currentUser.id);
        } else {
          console.log('No user found, redirecting to login');
          setLoading(false);
          router.push('/login');
        }
      } catch (err) {
        console.error('Init error:', err);
        setLoading(false);
      }
    };
    initProfile();
  }, []);

  const fetchVerificationStatus = async (userId) => {
    try {
      if (!userId) return;

      // Fetch verification status
      const { data: statusData } = await supabase
        .from('user_verification_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statusData) {
        setVerificationStatus(statusData);
      }

      // Fetch verification documents
      const { data: docsData } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (docsData) {
        setDocuments(docsData);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const loadStats = async (userId) => {
    try {
      if (!userId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        userId = currentUser?.id;
      }
      if (!userId) return;

      // Annonces
      const { data: annonces } = await supabase
        .from('annonces')
        .select('id, rate, vues')
        .eq('prestataire', userId);

      // Réservations - essayer les deux colonnes possibles
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, montant, status')
        .eq('prestataire_id', userId);

      const totalAnnonces = annonces?.length || 0;
      const totalReservations = reservations?.length || 0;
      const totalVues = annonces?.reduce((sum, a) => sum + (a.vues || 0), 0) || 0;

      const reservationsPayees = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'confirmed'
      ) || [];
      
      const chiffreAffaires = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
      
      const annonceAvecRate = annonces?.filter(a => a.rate && a.rate > 0) || [];
      const noteMoyenne = annonceAvecRate.length > 0 ? 
        annonceAvecRate.reduce((sum, a) => sum + a.rate, 0) / annonceAvecRate.length : 0;

      setStats({
        totalAnnonces,
        totalReservations,
        chiffreAffaires,
        noteMoyenne: Math.round(noteMoyenne * 10) / 10,
        totalVues
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleDocumentUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${docType}-${Date.now()}.${fileExt}`;
      const filePath = `verification/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert or update document record
      const { error: insertError } = await supabase
        .from('verification_documents')
        .upsert({
          user_id: user.id,
          document_type: docType,
          document_url: publicUrl,
          verification_status: 'pending'
        }, {
          onConflict: 'user_id,document_type'
        });

      if (insertError) throw insertError;

      await fetchVerificationStatus();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setUploading(null);
    }
  };

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const fetchFullProfile = async (userId) => {
    setLoading(true);
    try {
      if (!userId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        userId = currentUser?.id;
      }
      if (!userId) {
        setLoading(false);
        return;
      }

      // 1. Récupérer le profil de base depuis profiles
      const { data: baseProfile, error: baseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('🔍 profiles - data:', baseProfile, 'error:', baseError);

      // 2. Récupérer le profil photographe depuis profils_photographe
      const { data: photoProfile, error: photoError } = await supabase
        .from('profils_photographe')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('🔍 profils_photographe - data:', photoProfile, 'error:', photoError);

      if (!baseError && baseProfile) {
        // Fusionner les deux sources de données
        const mergedProfile = {
          ...baseProfile,
          bio: photoProfile?.bio || '',
          instagram: photoProfile?.instagram || '',
          facebook: photoProfile?.facebook || '',
          linkedin: photoProfile?.linkedin || '',
          website: photoProfile?.site_web || '',
          specialites: photoProfile?.specialisations || photoProfile?.categories || [],
          tarif_horaire: photoProfile?.tarif_horaire || '',
          // Autres champs de profils_photographe si nécessaire
        };
        
        console.log('✅ Profil fusionné:', mergedProfile);
        setProfile(mergedProfile);

        // Récupérer le nom de la ville si ville existe
        if (baseProfile.ville) {
          setVilleNom(baseProfile.ville);
        }
      } else {
        console.log('⚠️ Profil non trouvé');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setProfile({ 
          id: userId, 
          email: currentUser?.email || '', 
          nom: currentUser?.user_metadata?.nom || ''
        });
      }

      // Fetch portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('photographe_id', userId)
        .order('ordre', { ascending: true });

      if (!portfolioError) {
        setPortfolioImages(portfolio || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // En cas d'erreur, on affiche quand même le formulaire
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setProfile({ 
          id: currentUser.id, 
          email: currentUser.email || '', 
          nom: currentUser.user_metadata?.nom || ''
        });
      }
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // 1. Sauvegarder dans profiles (données de base)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: profile.nom,
          email: profile.email,
          telephone: profile.telephone,
        })
        .eq('id', currentUser.id);

      if (profileError) console.error('Erreur profiles:', profileError);

      // 2. Sauvegarder dans profils_photographe (données étendues)
      const { error: photoError } = await supabase
        .from('profils_photographe')
        .update({
          bio: profile.bio,
          instagram: profile.instagram,
          facebook: profile.facebook,
          linkedin: profile.linkedin,
          site_web: profile.website,
        })
        .eq('id', currentUser.id);

      if (photoError) console.error('Erreur profils_photographe:', photoError);

      if (profileError || photoError) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      alert('Profil mis à jour !');
      await fetchFullProfile(currentUser.id);
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

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${type}-${Date.now()}.${fileExt}`;
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

      // Update profile - utiliser 'avatar_url' comme dans la table profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
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
            photographe_id: currentUser.id,
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

  // Fonction pour changer le mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      setPasswordError(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // Si pas de profil après chargement
  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profil non trouvé</h2>
            <p className="text-gray-500 mb-6">Veuillez vous connecter pour accéder à votre profil.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'general', label: 'Général', icon: User },
    { key: 'specialites', label: 'Spécialités', icon: Layers },
    { key: 'localisation', label: 'Localisation', icon: MapPin },
    { key: 'verification', label: 'Vérification', icon: Shield },
    { key: 'portfolio', label: 'Portfolio', icon: Image },
    { key: 'tarifs', label: 'Tarifs', icon: Euro },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Photo */}
        <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl overflow-hidden">
          <label className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 rounded-lg cursor-pointer hover:bg-white transition-all flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-sm">Photo de profil</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e, 'avatar')}
              className="hidden"
            />
          </label>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 px-6 pb-6">
          <div className="flex items-end gap-6 -mt-12">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-gray-200 border-4 border-white shadow-lg overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.nom || 'Avatar'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                    <span className="text-2xl font-bold text-indigo-600">
                      {profile?.nom?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </span>
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
                {profile?.nom || profile?.nom_entreprise || 'Mon profil photographe'}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                {(villeNom || profile?.localisation) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {villeNom || profile.localisation}
                  </span>
                )}
                {stats.noteMoyenne > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {stats.noteMoyenne}/5
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={async () => {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser) router.push(`/photographes/${currentUser.id}`);
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Aperçu public
            </button>
          </div>

          {/* Stats compactes (aligné sur mobile) */}
          <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Briefcase className="w-5 h-5" style={{ color: COLORS.accent }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalAnnonces}</p>
              <p className="text-xs text-gray-500">Annonces</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" style={{ color: COLORS.success }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{formatCurrency(stats.chiffreAffaires)}</p>
              <p className="text-xs text-gray-500">CA Total</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalReservations}</p>
              <p className="text-xs text-gray-500">Réservations</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.noteMoyenne}/5</p>
              <p className="text-xs text-gray-500">Note</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Eye className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{stats.totalVues}</p>
              <p className="text-xs text-gray-500">Vues</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-6 flex-wrap">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === tab.key ? { background: COLORS.accent } : {}}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Onglet Vérification */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              {/* Trust Score */}
              {verificationStatus && (
                <div className="p-6 rounded-2xl" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm">Score de confiance</p>
                        <p className="text-4xl font-bold text-white">{verificationStatus.trust_score || 0}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Niveau</p>
                      <p className="text-xl font-semibold text-white capitalize">
                        {verificationStatus.trust_level || 'Non vérifié'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  {verificationStatus.badges?.length > 0 && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {verificationStatus.badges.map((badge, i) => (
                        <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Statuts rapides */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border-2 ${verificationStatus?.email_verified ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.email_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Email</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {verificationStatus?.email_verified ? 'Vérifié' : 'Non vérifié'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border-2 ${verificationStatus?.phone_verified ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.phone_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Téléphone</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {verificationStatus?.phone_verified ? 'Vérifié' : 'Non vérifié'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border-2 ${verificationStatus?.identity_verified ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.identity_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Identité</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {verificationStatus?.identity_verified ? 'Vérifiée' : 'Non vérifiée'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border-2 ${verificationStatus?.business_verified ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.business_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Entreprise</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {verificationStatus?.business_verified ? 'Vérifiée' : 'Non vérifiée'}
                  </p>
                </div>
              </div>

              {/* Documents à soumettre */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Documents à soumettre</h3>
                <div className="space-y-4">
                  {DOCUMENT_TYPES.map(docType => {
                    const existingDoc = documents.find(d => d.document_type === docType.type);
                    const IconComponent = docType.icon;
                    
                    return (
                      <div key={docType.type} className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              existingDoc?.verification_status === 'approved' ? 'bg-green-100' :
                              existingDoc?.verification_status === 'pending' ? 'bg-yellow-100' :
                              existingDoc?.verification_status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <IconComponent className={`w-6 h-6 ${
                                existingDoc?.verification_status === 'approved' ? 'text-green-600' :
                                existingDoc?.verification_status === 'pending' ? 'text-yellow-600' :
                                existingDoc?.verification_status === 'rejected' ? 'text-red-600' : 'text-gray-500'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{docType.label}</h4>
                                {docType.required && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Requis</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{docType.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {existingDoc ? (
                              <div className="flex items-center gap-2">
                                {existingDoc.verification_status === 'approved' && (
                                  <span className="flex items-center gap-1 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" /> Approuvé
                                  </span>
                                )}
                                {existingDoc.verification_status === 'pending' && (
                                  <span className="flex items-center gap-1 text-yellow-600 text-sm">
                                    <Clock className="w-4 h-4" /> En attente
                                  </span>
                                )}
                                {existingDoc.verification_status === 'rejected' && (
                                  <span className="flex items-center gap-1 text-red-600 text-sm">
                                    <XCircle className="w-4 h-4" /> Refusé
                                  </span>
                                )}
                              </div>
                            ) : null}

                            <label className={`px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-2 ${
                              uploading === docType.type ? 'opacity-50 cursor-wait' : ''
                            }`} style={{ 
                              background: existingDoc ? '#F3F4F6' : COLORS.accent,
                              color: existingDoc ? COLORS.text : 'white'
                            }}>
                              {uploading === docType.type ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">
                                {existingDoc ? 'Remplacer' : 'Ajouter'}
                              </span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleDocumentUpload(e, docType.type)}
                                disabled={uploading === docType.type}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {existingDoc?.verification_status === 'rejected' && existingDoc.rejection_reason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>Raison du refus :</strong> {existingDoc.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Sécurité - Mot de passe */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" style={{ color: COLORS.accent }} />
                  Sécurité
                </h3>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Modifier le mot de passe</p>
                      <p className="text-sm text-gray-500">Changez votre mot de passe de connexion</p>
                    </div>
                  </div>
                  <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">→</span>
                </button>
              </div>

              {/* Section Déconnexion */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-red-600">Se déconnecter</p>
                      <p className="text-sm text-gray-500">Vous pourrez vous reconnecter à tout moment</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={profile?.nom || ''}
                  onChange={(e) => handleProfileChange('nom', e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profile?.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={villeNom || ''}
                    disabled
                    placeholder="Ville non renseignée"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">La ville est définie lors de l'inscription</p>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 pt-4 border-t">Réseaux sociaux</h3>

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
                    Facebook
                  </label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.facebook || ''}
                      onChange={(e) => handleProfileChange('facebook', e.target.value)}
                      placeholder="URL ou nom de page"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.linkedin || ''}
                      onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                      placeholder="URL profil LinkedIn"
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
                      value={profile?.website || ''}
                      onChange={(e) => handleProfileChange('website', e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
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

          {/* Onglet Spécialités (aligné sur mobile) */}
          {activeTab === 'specialites' && (
            <div className="space-y-8">
              {/* Catégories de photographie */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Catégories de photographie</h3>
                <p className="text-sm text-gray-500 mb-4">Sélectionnez vos domaines d'expertise</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALITES.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialite(spec.toLowerCase())}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                        (profile?.specialites || []).includes(spec.toLowerCase())
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles photographiques */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Styles photographiques</h3>
                <p className="text-sm text-gray-500 mb-4">Décrivez votre approche artistique</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STYLES_PHOTO.map(style => {
                    const IconComponent = style.icon;
                    const isSelected = (profile?.styles || []).includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          const currentStyles = profile?.styles || [];
                          if (currentStyles.includes(style.id)) {
                            handleProfileChange('styles', currentStyles.filter(s => s !== style.id));
                          } else {
                            handleProfileChange('styles', [...currentStyles, style.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {style.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuration équipe */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Configuration équipe</h3>
                <p className="text-sm text-gray-500 mb-4">Comment travaillez-vous ?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EQUIPE.map(item => {
                    const IconComponent = item.icon;
                    const isSelected = (profile?.equipe || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const currentEquipe = profile?.equipe || [];
                          if (currentEquipe.includes(item.id)) {
                            handleProfileChange('equipe', currentEquipe.filter(e => e !== item.id));
                          } else {
                            handleProfileChange('equipe', [...currentEquipe, item.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-green-500' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Équipement disponible */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Équipement disponible</h3>
                <p className="text-sm text-gray-500 mb-4">Matériel supplémentaire que vous proposez</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EQUIPEMENT.map(item => {
                    const IconComponent = item.icon;
                    const isSelected = (profile?.equipement || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const currentEquipement = profile?.equipement || [];
                          if (currentEquipement.includes(item.id)) {
                            handleProfileChange('equipement', currentEquipement.filter(e => e !== item.id));
                          } else {
                            handleProfileChange('equipement', [...currentEquipement, item.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
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
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}

          {/* Onglet Localisation (aligné sur mobile) */}
          {activeTab === 'localisation' && (
            <div className="space-y-8">
              {/* Mode de travail */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Mode de travail</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mobile */}
                  <div 
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.mode_mobile ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => handleProfileChange('mode_mobile', !profile?.mode_mobile)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        profile?.mode_mobile ? 'bg-indigo-600' : 'bg-gray-100'
                      }`}>
                        <Car className={`w-6 h-6 ${profile?.mode_mobile ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Je me déplace</h4>
                        <p className="text-sm text-gray-500">Shooting à domicile ou en extérieur</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all ${
                      profile?.mode_mobile ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${
                        profile?.mode_mobile ? 'translate-x-6' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>

                  {/* Studio */}
                  <div 
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.mode_studio ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => handleProfileChange('mode_studio', !profile?.mode_studio)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        profile?.mode_studio ? 'bg-purple-600' : 'bg-gray-100'
                      }`}>
                        <Home className={`w-6 h-6 ${profile?.mode_studio ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">J'ai un studio</h4>
                        <p className="text-sm text-gray-500">Recevez vos clients</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all ${
                      profile?.mode_studio ? 'bg-purple-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${
                        profile?.mode_studio ? 'translate-x-6' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adresse studio (si mode studio activé) */}
              {profile?.mode_studio && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse du studio
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.adresse_studio || ''}
                      onChange={(e) => handleProfileChange('adresse_studio', e.target.value)}
                      placeholder="123 Rue de la Photo, 75001 Paris"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Rayon de déplacement */}
              {profile?.mode_mobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rayon de déplacement (km)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={profile?.rayon_deplacement || 50}
                      onChange={(e) => handleProfileChange('rayon_deplacement', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="w-20 px-3 py-2 bg-indigo-100 rounded-lg text-center">
                      <span className="font-bold text-indigo-700">{profile?.rayon_deplacement || 50} km</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Frais de déplacement */}
              {profile?.mode_mobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frais de déplacement (€/km)
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={profile?.frais_deplacement || ''}
                      onChange={(e) => handleProfileChange('frais_deplacement', parseFloat(e.target.value))}
                      placeholder="0.50"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour inclure les frais dans vos tarifs</p>
                </div>
              )}

              {/* Préférences horaires */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Préférences horaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekend */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.accepte_weekend ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => handleProfileChange('accepte_weekend', !profile?.accepte_weekend)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sun className={`w-6 h-6 ${profile?.accepte_weekend ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">Weekend</h4>
                          <p className="text-xs text-gray-500">Samedi & Dimanche</p>
                        </div>
                      </div>
                      {profile?.accepte_weekend && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                  </div>

                  {/* Soirée */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.accepte_soiree ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleProfileChange('accepte_soiree', !profile?.accepte_soiree)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Moon className={`w-6 h-6 ${profile?.accepte_soiree ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">Soirée</h4>
                          <p className="text-xs text-gray-500">Après 18h</p>
                        </div>
                      </div>
                      {profile?.accepte_soiree && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                  </div>
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
                    Enregistrer
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

      {/* Modal de changement de mot de passe */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Modifier le mot de passe</h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mot de passe modifié !</h3>
                <p className="text-gray-500">Votre mot de passe a été mis à jour avec succès.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Confirmer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
