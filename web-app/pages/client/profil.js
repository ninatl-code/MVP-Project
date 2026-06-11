import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { 
  Mail, Phone, MapPin, Heart, Edit, Save, Calendar, Camera, LogOut, Settings,
  Bell, Shield, CreditCard, Clock, Star, MessageCircle, FileText, Eye,
  ChevronRight, User, Trash2, AlertCircle, CheckCircle, Lock, Globe
} from "lucide-react";
import Header from '../../components/HeaderParti';


const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg";

// Couleurs Shooty (aligné sur mobile)
const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  secondary: '#FFD369',
  background: '#F8F9FB',
  text: '#222222',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

function UserProfile() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [favorites, setFavorites] = useState([]);
  const [villeNom, setVilleNom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [nomEdit, setNomEdit] = useState("");
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [villesList, setVillesList] = useState([]);
  const [nbReservations, setNbReservations] = useState(0);
  const [nbCommandes, setNbCommandes] = useState(0);
  const [nbDevis, setNbDevis] = useState(0);
  const [nbAvis, setNbAvis] = useState(0);
  const [favoriteAnnonces, setFavoriteAnnonces] = useState([]);
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
  const [recentActivity, setRecentActivity] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (!authUser) {
          router.push('/login');
          return;
        }

        const uid = authUser.id;

        // Affichage immédiat depuis la session (zéro réseau)
        const sessionName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '';
        setUser({
          name: sessionName,
          avatar: authUser.user_metadata?.avatar_url || '',
          city: '', cityId: null,
          email: authUser.email || '',
          phone: '', about: ''
        });
        setEmailEdit(authUser.email || '');

        // PHASE 1 : profil uniquement — mise à jour depuis la DB
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nom, avatar_url, ville, email, telephone, description')
          .eq('id', uid)
          .maybeSingle();

        if (profileError) {
          alert('Erreur lors du chargement du profil: ' + profileError.message);
          return;
        }

        if (!profile) {
          setUser({
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
            avatar: '', city: '', cityId: null,
            email: authUser.email || '', phone: '', about: ''
          });
          setEmailEdit(authUser.email || '');
          return;
        }

        const villeLabel = profile.ville || '';
        setVilleNom(villeLabel);
        const av = profile.avatar_url || '';
        const validAvatar = av.startsWith('http') || av.startsWith('data:image') ? av : '';
        setUser({
          name: profile.nom || '',
          avatar: validAvatar,
          city: villeLabel,
          cityId: null,
          email: profile.email || authUser.email || '',
          phone: profile.telephone || '',
          about: profile.description || ''
        });
        setEmailEdit(profile.email || authUser.email || '');
        setNomEdit(profile.nom || '');
        setBioEdit(profile.description || '');
        setPhoneEdit(profile.telephone || '');
        setVilleEdit(villeLabel);
        setPhotoEdit(validAvatar);

        // PHASE 2 : stats + favoris en arrière-plan (sans bloquer l'affichage)
        Promise.all([
          supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('client_id', uid),
          supabase.from('commandes').select('id', { count: 'exact', head: true }).eq('particulier_id', uid),
          supabase.from('devis').select('id', { count: 'exact', head: true }).eq('client_id', uid),
          supabase.from('reviews_presta').select('id', { count: 'exact', head: true }).eq('reviewer_id', uid),
          supabase.from('reservations').select('id, created_at, statut').eq('client_id', uid).order('created_at', { ascending: false }).limit(3),
          supabase.from('favoris').select('id, prestataire_id').eq('client_id', uid),
        ]).then(async ([
          { count: reservationsCount },
          { count: commandesCount },
          { count: devisCount },
          { count: avisCount },
          { data: recentRes },
          { data: favorisData }
        ]) => {
          setNbReservations(reservationsCount || 0);
          setNbCommandes(commandesCount || 0);
          setNbDevis(devisCount || 0);
          setNbAvis(avisCount || 0);
          setRecentActivity((recentRes || []).map(r => ({
            id: r.id, type: 'reservation',
            title: 'Réservation',
            status: r.statut, date: r.created_at
          })));

          if (favorisData?.length) {
        const prestataireIds = favorisData
          .map(f => f.prestataire_id)
          .filter(Boolean);

        const { data: prestataires } = await supabase
          .from('profiles')
          .select(`
            id,
            nom,
            avatar_url,
            ville
          `)
          .in('id', prestataireIds);

        setFavoriteAnnonces(
          (prestataires || []).map(p => ({
            id: p.id,
            titre: p.nom || 'Prestataire',
            photo: p.avatar_url || DEFAULT_ANNONCE_IMG,
            ville: p.ville || ''
          }))
        );
      }
     });

      } catch (error) {
        console.error('Erreur chargement profil:', error);
      }
    };

    fetchUserData();
  }, [router]);

  // Charger les villes seulement à l'ouverture du mode édition
  useEffect(() => {
    if (editMode && villesList.length === 0) {
      supabase.from('villes').select('id, ville').order('ville', { ascending: true })
        .then(({ data }) => setVillesList(data || []));
    }
  }, [editMode]);

  // Gérer le scroll vers la section favoris si le hash est présent
  useEffect(() => {
    if (router.asPath.includes('#favoris')) {
      // Attendre que le DOM soit complètement chargé
      setTimeout(() => {
        const favSection = document.getElementById('favoris');
        if (favSection) {
          favSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [router.asPath, favoriteAnnonces]);

  // Conversion fichier en base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Gestion upload photo (base64, sans Supabase Storage)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    // Redimensionner à 200x200 via canvas et encoder en base64
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Centrer/rogner en carré
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoEdit(base64);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Sauvegarde des modifications
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    if (!authUser) {
      setSaveMsg("error:Session introuvable. Veuillez vous reconnecter.");
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nom: nomEdit,
          email: emailEdit,
          telephone: phoneEdit,
          ville: villeEdit,
          avatar_url: photoEdit,
          description: bioEdit,
        })
        .eq("id", authUser.id);

      if (error) {
        console.error("Erreur Supabase:", error);
        setSaveMsg("error:" + error.message);
        setSaving(false);
        return;
      }

      setUser(prev => ({
        ...prev,
        name: nomEdit,
        email: emailEdit,
        phone: phoneEdit,
        city: villeEdit,
        avatar: photoEdit,
        about: bioEdit,
      }));
      setSaveMsg("success");
      setTimeout(() => { setEditMode(false); setSaveMsg(""); }, 1500);
    } catch (err) {
      console.error("Exception handleSaveProfile:", err);
      setSaveMsg("error:" + (err.message || "Erreur inattendue"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: COLORS.primary }}></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 animate-bounce" style={{ color: COLORS.primary }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>Chargement de votre profil</h2>
          <p className="text-gray-600">Préparation de vos informations personnelles...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header/>
      <div className="min-h-screen" style={{ background: COLORS.background }}>
        {/* Header Moderne */}
        <div className="shadow-lg" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fb 100%)' }}>
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Photo de profil */}
              <div className="relative">
                {(editMode ? photoEdit : user.avatar) ? (
                  <img
                    src={editMode ? photoEdit : user.avatar}
                    alt={user.name}
                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white text-5xl font-bold" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)` }}>
                    {user.name ? user.name[0].toUpperCase() : <User className="w-12 h-12" />}
                  </div>
                )}
                {editMode && (
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white z-10" title="Changer la photo">
                    <Camera className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Informations utilisateur */}
              <div className="flex-1 text-center lg:text-left">
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {user.name || "Nouveau profil"}
                  </h1>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-600">
                    <MapPin className="w-5 h-5" style={{ color: COLORS.primary }} />
                    <span className="text-lg">{user.city || "Ville non renseignée"}</span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  {!editMode ? (
                    <button
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                      style={{ background: COLORS.primary }}
                      onMouseEnter={(e) => e.target.style.background = '#5048E5'}
                      onMouseLeave={(e) => e.target.style.background = COLORS.primary}
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="w-5 h-5" />
                      Modifier mon profil
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3">
                        <button
                          disabled={saving}
                          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white transition-all duration-200 shadow-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ background: '#10B981' }}
                          onClick={handleSaveProfile}
                        >
                          {saving ? (
                            <><span className="animate-spin inline-block">&#8635;</span> Sauvegarde...</>
                          ) : (
                            <><Save className="w-5 h-5" /> Sauvegarder</>
                          )}
                        </button>
                        <button
                          className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 font-medium"
                          onClick={() => { setEditMode(false); setSaveMsg(""); }}
                        >
                          Annuler
                        </button>
                      </div>
                      {saveMsg === "success" && (
                        <p className="text-green-600 text-sm font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Profil sauvegardé avec succès !</p>
                      )}
                      {saveMsg.startsWith("error:") && (
                        <p className="text-red-500 text-sm font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {saveMsg.replace("error:", "")}</p>
                      )}
                    </div>
                  )}
                  <button
                    className="px-6 py-3 rounded-xl bg-white transition-all duration-200 font-medium"
                    style={{ color: COLORS.primary, border: `2px solid ${COLORS.primary}20` }}
                    onMouseEnter={(e) => e.target.style.background = `${COLORS.primary}10`}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                    onClick={() => router.push('/client/menu')}
                  >
                    Accéder au menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
          {/* About Section Moderne */}
          <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.primary }}>
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                À propos de moi
              </h2>
            </div>
            {!editMode ? (
              <div className="prose prose-lg text-gray-600 leading-relaxed">
                {user.about ? (
                  <p>{user.about}</p>
                ) : (
                  <p className="text-gray-400 italic">
                    Aucune description ajoutée. Cliquez sur "Modifier mon profil" pour ajouter une description.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full text-gray-700 bg-gray-50 rounded-xl border-2 border-gray-200 p-4 transition-all resize-none"
                  style={{ focusBorderColor: COLORS.primary }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  value={bioEdit}
                  onChange={e => setBioEdit(e.target.value)}
                  rows={5}
                  placeholder="Parlez-nous de vous, vos goûts, vos inspirations, le style de prestations que vous recherchez..."
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-400">
                  {bioEdit.length}/500 caractères
                </div>
              </div>
            )}
          </section>

          {/* Informations Personnelles Modernisées */}
          <div className="grid lg:grid-cols-2 gap-8">
            <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.primary }}>
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                  Informations de contact
                </h2>
              </div>
              
              <div className="space-y-6">
                {!editMode ? (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${COLORS.primary}20` }}>
                        <Mail className="w-6 h-6" style={{ color: COLORS.primary }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Email</p>
                        <p className="text-gray-800 font-semibold">{user.email || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${COLORS.secondary}40` }}>
                        <Phone className="w-6 h-6" style={{ color: '#F59E0B' }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Téléphone</p>
                        <p className="text-gray-800 font-semibold">{user.phone || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${COLORS.accent}30` }}>
                        <MapPin className="w-6 h-6" style={{ color: COLORS.accent }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Ville</p>
                        <p className="text-gray-800 font-semibold">{user.city || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <User className="w-4 h-4" style={{ color: COLORS.primary }} /> Nom
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl transition-all"
                        onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        value={nomEdit}
                        onChange={e => setNomEdit(e.target.value)}
                        placeholder="Votre nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Mail className="w-4 h-4" style={{ color: COLORS.primary }} /> Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl transition-all"
                        onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        value={emailEdit}
                        onChange={e => setEmailEdit(e.target.value)}
                        placeholder="votre.email@exemple.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Phone className="w-4 h-4" style={{ color: '#F59E0B' }} /> Téléphone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl transition-all"
                        onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        value={phoneEdit}
                        onChange={e => setPhoneEdit(e.target.value)}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <MapPin className="w-4 h-4" style={{ color: COLORS.accent }} /> Ville
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl transition-all"
                        onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        value={villeEdit}
                        onChange={e => setVilleEdit(e.target.value)}
                      >
                        <option value="">Sélectionner une ville</option>
                        {villesList.map(v => (
                          <option key={v.id} value={v.ville}>{v.ville}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </section>
            
            {/* Card Statistiques rapides */}
            <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.secondary }}>
                  <Calendar className="w-5 h-5" style={{ color: '#92400E' }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                  Activité récente
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl" style={{ background: `${COLORS.primary}15` }}>
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>{nbReservations}</div>
                  <div className="text-sm text-gray-600 mt-1">Prestation{nbReservations > 1 ? 's' : ''} réservée{nbReservations > 1 ? 's' : ''}</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: `${COLORS.secondary}30` }}>
                  <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{nbDevis}</div>
                  <div className="text-sm text-gray-600 mt-1">Devis demandé{nbDevis > 1 ? 's' : ''}</div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  className="w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  style={{ background: COLORS.primary }}
                  onMouseEnter={(e) => e.target.style.background = '#5048E5'}
                  onMouseLeave={(e) => e.target.style.background = COLORS.primary}
                  onClick={() => router.push('/client/menu')}
                >
                  Voir tous mes éléments
                </button>
              </div>
            </section>
          </div>

          {/* Section Paramètres améliorée */}
          <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                <Settings className="w-5 h-5 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                Paramètres
              </h2>
            </div>
            
            <div className="space-y-4">
              {/* Notifications */}
              <div className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Notifications</p>
                      <p className="text-sm text-gray-500">Gérez vos préférences</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3 pl-13">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Email</span>
                    <button
                      onClick={() => setNotifications({...notifications, email: !notifications.email})}
                      className={`w-10 h-6 rounded-full transition-all ${notifications.email ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-all mx-1 mt-1 ${notifications.email ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">SMS</span>
                    <button
                      onClick={() => setNotifications({...notifications, sms: !notifications.sms})}
                      className={`w-10 h-6 rounded-full transition-all ${notifications.sms ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-all mx-1 mt-1 ${notifications.sms ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Push</span>
                    <button
                      onClick={() => setNotifications({...notifications, push: !notifications.push})}
                      className={`w-10 h-6 rounded-full transition-all ${notifications.push ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-all mx-1 mt-1 ${notifications.push ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sécurité */}
              <div 
                className="p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-all cursor-pointer"
                onClick={() => router.push('/client/securite')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Sécurité</p>
                      <p className="text-sm text-gray-500">Mot de passe, 2FA</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Confidentialité */}
              <div 
                className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
                onClick={() => router.push('/client/confidentialite')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Confidentialité</p>
                      <p className="text-sm text-gray-500">Visibilité du profil, données</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Aide & Support */}
              <div 
                className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-pointer"
                onClick={() => router.push('/support')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Aide & Support</p>
                      <p className="text-sm text-gray-500">Centre d'aide, contacter le support</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Déconnexion */}
              <button
                onClick={async () => {
                  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                    await supabase.auth.signOut();
                    router.push('/login');
                  }
                }}
                className="w-full p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-red-600">Se déconnecter</p>
                    <p className="text-sm text-gray-500">Vous pourrez vous reconnecter à tout moment</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:text-red-500 transition-colors">→</span>
              </button>
            </div>
          </section>

          {/* Activité récente */}
          {recentActivity.length > 0 && (
            <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${COLORS.primary}20` }}>
                  <Clock className="w-5 h-5" style={{ color: COLORS.primary }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                  Activité récente
                </h2>
              </div>
              
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id || index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    onClick={() => router.push(`/client/reservations/${activity.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.status === 'confirmee' || activity.status === 'confirmed' ? 'bg-green-100' :
                      activity.status === 'en_attente' || activity.status === 'pending' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        activity.status === 'confirmee' || activity.status === 'confirmed' ? 'text-green-600' :
                        activity.status === 'en_attente' || activity.status === 'pending' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section Favoris Moderne */}
          {favoriteAnnonces.length > 0 ? (
            <section id="favoris" className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 scroll-mt-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.accent }}>
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                    Mes prestataires favoris
                  </h2>
                  <p className="text-gray-500">Vos prestataires préférés pour vos projets</p>
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: `${COLORS.accent}30`, color: COLORS.accent }}>
                  {favoriteAnnonces.length} prestataire{favoriteAnnonces.length > 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteAnnonces.map(a => (
                  <a
                    key={a.id}
                    href={`/client/photographes/${a.id}`}
                    className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-100 hover:border-pink-200 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={a.photo}
                        alt={a.titre}
                        className="h-40 w-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-3 right-3">
                        <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h2 className="font-bold transition-colors duration-200 line-clamp-2" style={{ color: COLORS.text }}>
                        {a.titre}
                      </h2>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Voir les détails</span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200" style={{ background: `${COLORS.primary}20` }}>
                          <span className="text-xs" style={{ color: COLORS.primary }}>→</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a
                  href="/client/profil#favoris"
                  className="inline-flex items-center gap-2 font-semibold transition-colors"
                  style={{ color: COLORS.primary }}
                  onMouseEnter={(e) => e.target.style.color = '#5048E5'}
                  onMouseLeave={(e) => e.target.style.color = COLORS.primary}
                >
                  Voir tous mes favoris
                  <span className="text-lg">→</span>
                </a>
              </div>
            </section>
          ) : (
            <section id="favoris" className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 text-center scroll-mt-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
                Aucun prestataire favori pour le moment
              </h2>
              <p className="text-gray-500 mb-6">
                Découvrez nos prestataires talentueux et ajoutez-les à vos favoris en cliquant sur le cœur.
              </p>
              <a
                href="/annonces"
                className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                style={{ background: COLORS.primary }}
                onMouseEnter={(e) => e.target.style.background = '#5048E5'}
                onMouseLeave={(e) => e.target.style.background = COLORS.primary}
              >
                Découvrir nos prestataires
                <span>→</span>
              </a>
            </section>
          )
          }
        </div>

      </div>
    </>
  );

}
export default UserProfile;