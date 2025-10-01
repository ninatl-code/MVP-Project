import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart, Edit, Save, Calendar, Camera } from "lucide-react";
import Header from '../../components/HeaderParti';

const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg";

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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nom, photos, ville_id, email, telephone, bio, event_date")
        .eq("id", authUser.id)
        .single();

      let villeLabel = "";
      let villeIdValue = null;
      if (profile?.ville_id) {
        const { data: villeData } = await supabase
          .from("villes")
          .select("id, ville")
          .eq("id", profile.ville_id)
          .single();
        villeLabel = villeData?.ville || "";
        villeIdValue = villeData?.id || null;
      }
      setVilleNom(villeLabel);

      setUser({
        name: profile?.nom || "",
        avatar: profile?.photos || "",
        city: villeLabel,
        cityId: villeIdValue,
        email: profile?.email || "",
        phone: profile?.telephone || "",
        about: profile?.bio || "",
        weddingDate: profile?.event_date
          ? new Date(profile.event_date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "",
      });

      setBioEdit(profile?.bio || "");
      setEmailEdit(profile?.email || "");
      setPhoneEdit(profile?.telephone || "");
      setVilleEdit(villeLabel);
      setPhotoEdit(profile?.photos || "");

      // Liste des villes
      const { data: villesData } = await supabase
        .from("villes")
        .select("id, ville");
      setVillesList(villesData || []);

      // Récupère le nombre de réservations
      const { count: reservationsCount } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('particulier_id', authUser.id);
      setNbReservations(reservationsCount || 0);

      // Récupère le nombre de commandes
      const { count: commandesCount } = await supabase
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .eq('particulier_id', authUser.id);
      setNbCommandes(commandesCount || 0);

      // Récupère le nombre de devis
      const { count: devisCount } = await supabase
        .from('devis')
        .select('id', { count: 'exact', head: true })
        .eq('particulier_id', authUser.id);
      setNbDevis(devisCount || 0);

      // Récupère les annonces favorites du particulier
      const { data: favAnnonceData } = await supabase
        .from("favoris")
        .select("id, annonce_id")
        .eq("particulier_id", authUser.id);

      let annoncesList = [];
      if (favAnnonceData && favAnnonceData.length > 0) {
        const annonceIds = favAnnonceData.map(f => f.annonce_id).filter(Boolean);
        if (annonceIds.length > 0) {
          const { data: annoncesData } = await supabase
            .from("annonces")
            .select("id, titre, photos")
            .in("id", annonceIds);
          annoncesList = (annoncesData || []).map(a => ({
            id: a.id,
            titre: a.titre,
            photo: Array.isArray(a.photos) && a.photos.length > 0 ? a.photos[0] : DEFAULT_ANNONCE_IMG
          }));
        }
      }
      setFavoriteAnnonces(annoncesList);

      // Récupère les favoris
      const { data: favData } = await supabase
        .from("favoris")
        .select("id, titre, ville, cover")
        .eq("user_id", authUser.id);

      setFavorites(
        (favData || []).map((fav) => ({
          id: fav.id,
          title: fav.titre,
          city: fav.ville,
          cover: fav.cover || "https://source.unsplash.com/300x200/?wedding",
        }))
      );
    };

    fetchUserData();
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-pink-500 animate-bounce" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chargement de votre profil</h2>
          <p className="text-gray-600">Préparation de vos informations personnelles...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header/>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50">
        {/* Header Moderne */}
        <div className="bg-gradient-to-br from-white via-pink-50 to-purple-50 shadow-lg">
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
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-500 text-white text-5xl font-bold transition-transform group-hover:scale-105">
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {user.name}
                  </h1>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-600">
                    <MapPin className="w-5 h-5 text-pink-500" />
                    <span className="text-lg">{user.city}</span>
                  </div>
                  {user.weddingDate && (
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-600">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <span className="text-sm bg-purple-100 px-3 py-1 rounded-full">
                        Mariage prévu : {user.weddingDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  {!editMode ? (
                    <button
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="w-5 h-5" />
                      Modifier mon profil
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
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
                    className="px-6 py-3 rounded-xl bg-white text-pink-600 border-2 border-pink-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 font-medium"
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
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
                  className="w-full text-gray-700 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 p-4 transition-all resize-none"
                  value={bioEdit}
                  onChange={e => setBioEdit(e.target.value)}
                  rows={5}
                  placeholder="Parlez-nous de vous, vos goûts, vos attentes pour votre mariage..."
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Informations de contact
                </h2>
              </div>
              
              <div className="space-y-6">
                {!editMode ? (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Email</p>
                        <p className="text-gray-800 font-semibold">{user.email || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Téléphone</p>
                        <p className="text-gray-800 font-semibold">{user.phone || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-purple-600" />
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
                        <Mail className="w-4 h-4 text-pink-500" /> Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all"
                        value={emailEdit}
                        onChange={e => setEmailEdit(e.target.value)}
                        placeholder="votre.email@exemple.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Phone className="w-4 h-4 text-green-500" /> Téléphone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all"
                        value={phoneEdit}
                        onChange={e => setPhoneEdit(e.target.value)}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <MapPin className="w-4 h-4 text-purple-500" /> Ville
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Activité récente
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-pink-50 rounded-xl">
                  <div className="text-2xl font-bold text-pink-600">{nbReservations}</div>
                  <div className="text-sm text-gray-600 mt-1">Réservation{nbReservations > 1 ? 's' : ''}</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{nbCommandes}</div>
                  <div className="text-sm text-gray-600 mt-1">Commande{nbCommandes > 1 ? 's' : ''}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl col-span-2">
                  <div className="text-2xl font-bold text-green-600">{nbDevis}</div>
                  <div className="text-sm text-gray-600 mt-1">Demande{nbDevis > 1 ? 's' : ''} de devis</div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                  onClick={() => router.push('/particuliers/menu')}
                >
                  Voir tous mes éléments
                </button>
              </div>
            </section>
          </div>



          {/* Section Favoris Moderne */}
          {favoriteAnnonces.length > 0 ? (
            <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Mes favoris
                  </h2>
                  <p className="text-gray-500">Vos prestataires préférés</p>
                </div>
                <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {favoriteAnnonces.length} favori{favoriteAnnonces.length > 1 ? 's' : ''}
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
                      <h2 className="font-bold text-gray-800 group-hover:text-pink-600 transition-colors duration-200 line-clamp-2">
                        {a.titre}
                      </h2>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500 font-medium">Voir les détails</span>
                        <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-500 transition-colors duration-200">
                          <span className="text-pink-500 group-hover:text-white text-xs">→</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a
                  href="/particuliers/favoris"
                  className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
                >
                  Voir tous mes favoris
                  <span className="text-lg">→</span>
                </a>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Aucun favori pour le moment
              </h2>
              <p className="text-gray-500 mb-6">
                Découvrez nos prestataires et ajoutez-les à vos favoris en cliquant sur le cœur.
              </p>
              <a
                href="/annonces"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
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