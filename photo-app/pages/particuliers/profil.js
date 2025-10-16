import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart, Edit, Save, Calendar, Camera } from "lucide-react";
import Header from '../../components/HeaderParti';

const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg";

// Couleurs Shooty
const COLORS = {
  primary: '#635BFF',
  secondary: '#FFD369',
  accent: '#FF7F50',
  background: '#F8F9FB',
  text: '#1C1C1E'
};

function UserProfile() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [villeNom, setVilleNom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [villesList, setVillesList] = useState([]);
  const [nbReservations, setNbReservations] = useState(0);
  const [nbCommandes, setNbCommandes] = useState(0);
  const [nbDevis, setNbDevis] = useState(0);
  const [favoriteAnnonces, setFavoriteAnnonces] = useState([]);
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
          .select("nom, photos, ville_id, email, telephone, bio")
          .eq("id", authUser.id)
          .single();

        console.log('📊 Profile query result:');
        console.log('  - Data:', profile);
        console.log('  - Error:', profileError);

        if (profileError) {
          console.error('❌ Erreur lors de la récupération du profil:', profileError);
          
          // Si le profil n'existe pas (PGRST116), on le crée
          if (profileError.code === 'PGRST116') {
            console.log('⚠️ Profil inexistant, création d\'un nouveau profil...');
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{
                id: authUser.id,
                email: authUser.email,
                nom: authUser.user_metadata?.name || '',
                role: 'particulier'
              }]);

            if (insertError) {
              console.error('❌ Erreur lors de la création du profil:', insertError);
              alert('Erreur lors de la création de votre profil. Veuillez contacter le support.');
            } else {
              console.log('✅ Profil créé avec succès, rechargement...');
              window.location.reload();
            }
            return;
          }
          
          alert('Erreur lors du chargement du profil: ' + profileError.message);
          return;
        }

        if (!profile) {
          console.log('⚠️ Aucun profil trouvé pour cet utilisateur');
          // Créer un profil vide
          setUser({
            name: authUser.user_metadata?.name || "",
            avatar: "",
            city: "",
            cityId: null,
            email: authUser.email || "",
            phone: "",
            about: ""
          });
          setEmailEdit(authUser.email || "");
          return;
        }

        console.log('✅ Profil trouvé:', {
          nom: profile.nom,
          email: profile.email,
          telephone: profile.telephone,
          ville_id: profile.ville_id
        });

        // Récupération de la ville
        let villeLabel = "";
        let villeIdValue = null;
        if (profile?.ville_id) {
          console.log('🏙️ Récupération de la ville, ID:', profile.ville_id);
          const { data: villeData, error: villeError } = await supabase
            .from("villes")
            .select("id, ville")
            .eq("id", profile.ville_id)
            .single();
          
          if (villeError) {
            console.error('❌ Erreur récupération ville:', villeError);
          } else {
            console.log('✅ Ville trouvée:', villeData);
            villeLabel = villeData?.ville || "";
            villeIdValue = villeData?.id || null;
          }
        }
        setVilleNom(villeLabel);

        // Construction de l'objet utilisateur
        const userData = {
          name: profile?.nom || "",
          avatar: profile?.photos || "",
          city: villeLabel,
          cityId: villeIdValue,
          email: profile?.email || authUser.email || "",
          phone: profile?.telephone || "",
          about: profile?.bio || ""
        };

        console.log('✅ User data final:', userData);
        setUser(userData);

        // Initialisation des champs d'édition
        setBioEdit(profile?.bio || "");
        setEmailEdit(profile?.email || authUser.email || "");
        setPhoneEdit(profile?.telephone || "");
        setVilleEdit(villeLabel);
        setPhotoEdit(profile?.photos || "");

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
          .eq('particulier_id', authUser.id);
        
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
          .eq('particulier_id', authUser.id);
        
        if (devisError) console.error('❌ Erreur devis:', devisError);
        else console.log('✅ Devis:', devisCount);
        setNbDevis(devisCount || 0);

        // Récupère les annonces favorites du particulier
        console.log('❤️ Chargement des favoris...');
        const { data: favAnnonceData, error: favError } = await supabase
          .from("favoris")
          .select("id, annonce_id")
          .eq("particulier_id", authUser.id);

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
              annoncesList = (annoncesData || []).map(a => ({
                id: a.id,
                titre: a.titre,
                photo: Array.isArray(a.photos) && a.photos.length > 0 ? a.photos[0] : DEFAULT_ANNONCE_IMG
              }));
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
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPhotoEdit(base64);
  };

  // Sauvegarde des modifications
  const handleSaveProfile = async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      alert("Erreur d'authentification : " + (authError?.message || "Utilisateur non trouvé"));
      return;
    }
    // Récupère l'id de la ville sélectionnée
    let villeIdToSave = null;
    if (villeEdit) {
      const villeObj = villesList.find(v => v.ville === villeEdit);
      villeIdToSave = villeObj ? villeObj.id : null;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bioEdit,
        email: emailEdit,
        telephone: phoneEdit,
        ville_id: villeIdToSave,
        photos: photoEdit
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
                    onClick={() => router.push('/particuliers/menu')}
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
                  onClick={() => router.push('/particuliers/menu')}
                >
                  Voir tous mes éléments
                </button>
              </div>
            </section>
          </div>



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
                  href="/particuliers/favoris"
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