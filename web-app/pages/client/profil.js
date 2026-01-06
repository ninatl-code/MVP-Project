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
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [photoCouvertureEdit, setPhotoCouvertureEdit] = useState("");
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
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Erreur d\'authentification:', authError);
          alert('Erreur d\'authentification. Veuillez vous reconnecter.');
          router.push('/login');
          return;
        }

        if (!authUser) {
          console.log('Pas d\'utilisateur authentifié');
          alert('Vous devez être connecté pour accéder à cette page.');
          router.push('/login');
          return;
        }

        console.log('✅ User ID:', authUser.id);
        console.log('✅ User Email:', authUser.email);

        // Récupération du profil
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nom, avatar_url, ville, email, telephone")
          .eq("id", authUser.id)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

        console.log('📊 Profile query result:');
        console.log('  - Data:', profile);
        console.log('  - Error:', profileError);

        if (profileError) {
          console.error('❌ Erreur lors de la récupération du profil:', profileError);
          alert('Erreur lors du chargement du profil: ' + profileError.message);
          return;
        }

        if (!profile) {
          console.log('⚠️ Aucun profil trouvé, création d\'un profil par défaut');
          // Afficher un profil vide que l'utilisateur pourra remplir
          setUser({
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || "",
            avatar: "",
            city: "",
            cityId: null,
            email: authUser.email || "",
            phone: "",
            about: ""
          });
          setEmailEdit(authUser.email || "");
          setBioEdit("");
          setPhoneEdit("");
          setVilleEdit("");
          setPhotoEdit("");
          
          // Charger la liste des villes quand même
          const { data: villesData } = await supabase
            .from("villes")
            .select("id, ville")
            .order("ville", { ascending: true });
          setVillesList(villesData || []);
          
          return;
        }

        console.log('✅ Profil trouvé:', {
          nom: profile.nom,
          email: profile.email,
          telephone: profile.telephone,
          ville: profile.ville
        });

        // Récupération de la ville
        let villeLabel = profile?.ville || "";
        setVilleNom(villeLabel);

        // Filtrer avatar_url: ignorer les chemins locaux (file://)
        const avatarUrl = profile?.avatar_url || "";
        const validAvatar = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') ? avatarUrl : "";

        // Construction de l'objet utilisateur
        const userData = {
          name: profile?.nom || "",
          avatar: validAvatar,
          city: villeLabel,
          cityId: null,
          email: profile?.email || authUser.email || "",
          phone: profile?.telephone || "",
          about: "" // bio n'existe pas dans profiles
        };

        console.log('✅ User data final:', userData);
        setUser(userData);

        // Initialisation des champs d'édition
        setBioEdit(""); // bio n'existe pas dans profiles
        setEmailEdit(profile?.email || authUser.email || "");
        setPhoneEdit(profile?.telephone || "");
        setVilleEdit(villeLabel);
        setPhotoEdit(validAvatar);

        // Récupération de la liste des villes
        console.log('🏙️ Chargement de la liste des villes...');
        const { data: villesData, error: villesError } = await supabase
          .from("villes")
          .select("id, ville")
          .order("ville", { ascending: true });
        
        if (villesError) {
          console.error('❌ Erreur chargement villes:', villesError);
        } else {
          console.log('✅ Villes chargées:', villesData?.length, 'villes');
          setVillesList(villesData || []);
        }

        // Récupère le nombre de réservations
        console.log('📊 Chargement des statistiques...');
        const { count: reservationsCount, error: resError } = await supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', authUser.id);
        
        if (resError) console.error('❌ Erreur réservations:', resError);
        else console.log('✅ Réservations:', reservationsCount);
        setNbReservations(reservationsCount || 0);

        // Récupère le nombre de commandes
        const { count: commandesCount, error: cmdError } = await supabase
          .from('commandes')
          .select('id', { count: 'exact', head: true })
          .eq('particulier_id', authUser.id);
        
        if (cmdError) console.error('❌ Erreur commandes:', cmdError);
        else console.log('✅ Commandes:', commandesCount);
        setNbCommandes(commandesCount || 0);

        // Récupère le nombre de devis
        const { count: devisCount, error: devisError } = await supabase
          .from('devis')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', authUser.id);
        
        if (devisError) console.error('❌ Erreur devis:', devisError);
        else console.log('✅ Devis:', devisCount);
        setNbDevis(devisCount || 0);

        // Récupère le nombre d'avis donnés
        const { count: avisCount, error: avisError } = await supabase
          .from('avis')
          .select('id', { count: 'exact', head: true })
          .eq('reviewer_id', authUser.id);
        
        if (avisError) console.error('❌ Erreur avis:', avisError);
        else console.log('✅ Avis:', avisCount);
        setNbAvis(avisCount || 0);

        // Récupère l'activité récente (dernières réservations/devis)
        const { data: recentRes } = await supabase
          .from('reservations')
          .select('id, created_at, statut, annonces(titre)')
          .eq('client_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(3);

        const activity = (recentRes || []).map(r => ({
          id: r.id,
          type: 'reservation',
          title: r.annonces?.titre || 'Réservation',
          status: r.statut,
          date: r.created_at
        }));
        setRecentActivity(activity);

        // Récupère les annonces favorites du particulier
        console.log('❤️ Chargement des favoris...');
        const { data: favAnnonceData, error: favError } = await supabase
          .from("favoris")
          .select("id, annonce_id")
          .eq("client_id", authUser.id);

        if (favError) {
          console.error('❌ Erreur favoris:', favError);
        } else {
          console.log('✅ Favoris trouvés:', favAnnonceData?.length);
        }

        let annoncesList = [];
        if (favAnnonceData && favAnnonceData.length > 0) {
          const annonceIds = favAnnonceData.map(f => f.annonce_id).filter(Boolean);
          if (annonceIds.length > 0) {
            const { data: annoncesData, error: annoncesError } = await supabase
              .from("annonces")
              .select("id, titre, photos")
              .in("id", annonceIds);
            
            if (annoncesError) {
              console.error('❌ Erreur annonces favorites:', annoncesError);
            } else {
              console.log('✅ Annonces favorites chargées:', annoncesData?.length);
              annoncesList = (annoncesData || []).map(a => {
                // Gérer les photos (text array en base64 ou URLs)
                let photosArray = [];
                if (a.photos && Array.isArray(a.photos)) {
                  photosArray = a.photos;
                }
                
                // Récupérer la première photo et la formater correctement
                let firstPhoto = DEFAULT_ANNONCE_IMG;
                if (photosArray.length > 0) {
                  const photoData = photosArray[0];
                  // Si la photo commence déjà par data:image, l'utiliser directement
                  if (photoData && photoData.startsWith('data:image')) {
                    firstPhoto = photoData;
                  } 
                  // Si c'est du base64 pur, ajouter le préfixe data URL
                  else if (photoData && photoData.length > 100) {
                    firstPhoto = `data:image/jpeg;base64,${photoData}`;
                  }
                  // Sinon, si c'est une URL normale
                  else if (photoData && (photoData.startsWith('http') || photoData.startsWith('/'))) {
                    firstPhoto = photoData;
                  }
                }
                
                return {
                  id: a.id,
                  titre: a.titre,
                  photo: firstPhoto
                };
              });
            }
          }
        }
        setFavoriteAnnonces(annoncesList);

        console.log('✅ Chargement terminé avec succès!');

      } catch (error) {
        console.error('❌ ERREUR FATALE:', error);
        alert('Une erreur est survenue lors du chargement de votre profil: ' + error.message);
      }
    };

    fetchUserData();
  }, [router]);

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

  // Gestion upload photo
  const handlePhotoUpload = async (e, type = 'avatar') => {
    const file = e.target.files[0];
    if (!file) return;
    
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${authUser.id}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    try {
      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      if (type === 'avatar') {
        setPhotoEdit(publicUrl);
      } else if (type === 'cover') {
        setPhotoCouvertureEdit(publicUrl);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors du téléchargement de l\'image');
    }
  };

  // Sauvegarde des modifications
  const handleSaveProfile = async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      alert("Erreur d'authentification : " + (authError?.message || "Utilisateur non trouvé"));
      return;
    }
    
    const { error } = await supabase
      .from("profiles")
      .update({
        email: emailEdit,
        telephone: phoneEdit,
        ville: villeEdit,
        avatar_url: photoEdit
      })
      .eq("id", authUser.id);

    if (error) {
      console.error("Erreur Supabase:", error);
      alert(
        "Erreur lors de la sauvegarde du profil !\n" +
        "Message : " + error.message + "\n" +
        "Code : " + error.code + "\n" +
        "Détails : " + (error.details || "Aucun détail")
      );
    } else {
      setEditMode(false);
      window.location.reload();
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
              <div className="relative group">
                {user.avatar ? (
                  <img
                    src={editMode ? photoEdit : user.avatar}
                    alt={user.name}
                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white text-5xl font-bold transition-transform group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)` }}>
                    {user.name ? user.name[0].toUpperCase() : "?"}
                  </div>
                )}
                {editMode && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
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
                    <div className="flex gap-3">
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                        style={{ background: '#10B981' }}
                        onMouseEnter={(e) => e.target.style.background = '#059669'}
                        onMouseLeave={(e) => e.target.style.background = '#10B981'}
                        onClick={handleSaveProfile}
                      >
                        <Save className="w-5 h-5" />
                        Sauvegarder
                      </button>
                      <button
                        className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 font-medium"
                        onClick={() => setEditMode(false)}
                      >
                        Annuler
                      </button>
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
                  placeholder="Parlez-nous de vous, vos goûts photographiques, vos inspirations, le style de shooting que vous recherchez..."
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
                  <div className="text-sm text-gray-600 mt-1">Shooting{nbReservations > 1 ? 's' : ''} réservé{nbReservations > 1 ? 's' : ''}</div>
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
                    Mes photographes favoris
                  </h2>
                  <p className="text-gray-500">Vos photographes préférés pour vos shootings</p>
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: `${COLORS.accent}30`, color: COLORS.accent }}>
                  {favoriteAnnonces.length} photographe{favoriteAnnonces.length > 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteAnnonces.map(a => (
                  <a
                    key={a.id}
                    href={`/annonces/${a.id}`}
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
                Aucun photographe favori pour le moment
              </h2>
              <p className="text-gray-500 mb-6">
                Découvrez nos photographes talentueux et ajoutez-les à vos favoris en cliquant sur le cœur.
              </p>
              <a
                href="/annonces"
                className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                style={{ background: COLORS.primary }}
                onMouseEnter={(e) => e.target.style.background = '#5048E5'}
                onMouseLeave={(e) => e.target.style.background = COLORS.primary}
              >
                Découvrir nos photographes
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