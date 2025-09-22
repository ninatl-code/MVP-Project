import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart } from "lucide-react";
import Header from '../../components/HeaderParti';

const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg";

export default function UserProfile() {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <>
      <Header/>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-10 flex items-center gap-6">
            {user.avatar ? (
              <img
                src={editMode ? photoEdit : user.avatar}
                alt={user.name}
                className="w-28 h-28 rounded-full border-4 border-pink-200 shadow object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-pink-200 shadow flex items-center justify-center bg-pink-100 text-pink-700 text-4xl font-bold">
                {user.name ? user.name[0].toUpperCase() : "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{user.name}</h1>
              <p className="text-gray-500">{user.city}</p>
              {!editMode ? (
                <button
                  className="mt-3 px-4 py-2 rounded-xl bg-pink-500 text-white hover:bg-pink-600 transition shadow"
                  onClick={() => setEditMode(true)}
                >
                  Modifier mon profil
                </button>
              ) : (
                <button
                  className="mt-3 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition shadow"
                  onClick={handleSaveProfile}
                >
                  Sauvegarder
                </button>
              )}
              {/* Input pour uploader une photo en mode édition */}
              {editMode && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Changer ma photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-gray-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
          {/* About */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              À propos de moi
            </h2>
            {!editMode ? (
              <p className="text-gray-600 bg-white rounded-2xl shadow p-4">
                {user.about}
              </p>
            ) : (
              <textarea
                className="w-full text-gray-600 bg-white rounded-2xl shadow p-4"
                value={bioEdit}
                onChange={e => setBioEdit(e.target.value)}
                rows={4}
              />
            )}
          </section>

          {/* Infos perso */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-5 space-y-2">
              <h2 className="font-semibold text-gray-800 mb-3">
                Informations personnelles
              </h2>
              {!editMode ? (
                <>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-pink-500" /> {user.email}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-pink-500" /> {user.phone}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-pink-500" /> {user.city}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-pink-500" />
                    <input
                      type="email"
                      className="border rounded px-2 py-1 w-full"
                      value={emailEdit}
                      onChange={e => setEmailEdit(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-pink-500" />
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full"
                      value={phoneEdit}
                      onChange={e => setPhoneEdit(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-pink-500" />
                    <select
                      className="border rounded px-2 py-1 w-full"
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

          {/* Statistiques */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Mes statistiques
            </h2>
            <div className="flex gap-8 mb-10">
              {nbReservations > 0 && (
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center min-w-[180px]">
                  <span className="text-4xl font-bold text-pink-600">{nbReservations}</span>
                  <span className="mt-2 text-lg text-gray-700">Réservations</span>
                </div>
              )}
              {nbCommandes > 0 && (
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center min-w-[180px]">
                  <span className="text-4xl font-bold text-blue-600">{nbCommandes}</span>
                  <span className="mt-2 text-lg text-gray-700">Commandes</span>
                </div>
              )}
              {nbDevis > 0 && (
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center min-w-[180px]">
                  <span className="text-4xl font-bold text-green-600">{nbDevis}</span>
                  <span className="mt-2 text-lg text-gray-700">Demandes de devis</span>
                </div>
              )}
            </div>
            <div className="text-center mb-8 text-gray-700">
              Pour voir vos réservations, commandes ou demandes de devis, allez dans votre menu.
            </div>
            <div className="flex justify-center">
              <button
                className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-pink-700 transition"
                onClick={() => router.push('/particuliers/menu')}
              >
                Menu
              </button>
            </div>
          </section>

          {/* Favoris */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Mes favoris
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="bg-white rounded-2xl shadow overflow-hidden"
                >
                  <img
                    src={fav.cover}
                    alt={fav.title}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-800">{fav.title}</h2>
                      <p className="text-sm text-gray-500">{fav.city}</p>
                    </div>
                    <Heart className="w-6 h-6 text-pink-500" />
                  </div>
                </div>
              ))}
              {favorites.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  Aucun favori pour le moment.
                </div>
              )}
            </div>
          </section>

          {/* Annonces favorites */}
          {favoriteAnnonces.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Annonces favorites
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {favoriteAnnonces.map(a => (
                  <a
                    key={a.id}
                    href={`/annonces/${a.id}`}
                    className="bg-white rounded-2xl shadow overflow-hidden block hover:shadow-lg transition"
                  >
                    <img
                      src={a.photo}
                      alt={a.titre}
                      className="h-32 w-full object-cover"
                    />
                    <div className="p-4">
                      <h2 className="font-semibold text-gray-800">{a.titre}</h2>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ...rest unchanged... */}
        </div>
      </div>
    </>
  );
}