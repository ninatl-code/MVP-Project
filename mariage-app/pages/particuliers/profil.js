import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart, Calendar } from "lucide-react";
import Header from '../../components/HeaderParti';

const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg";

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [villeNom, setVilleNom] = useState("");
  const [annonceTitles, setAnnonceTitles] = useState({});
  const [prestataireNames, setPrestataireNames] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [villesList, setVillesList] = useState([]);

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

      // Récupère les réservations
      const { data: resaData } = await supabase
        .from("reservations")
        .select("id, annonce_id, prestataire_id, date, status, montant_acompte, date_confirmation, date_annulation, motif_annulation, date_refus, motif_refus")
        .eq("particulier_id", authUser.id);

      // Récupère les titres des annonces et noms des prestataires + photos
      const annonceIds = [...new Set((resaData || []).map(r => r.annonce_id).filter(Boolean))];
      const prestataireIds = [...new Set((resaData || []).map(r => r.prestataire_id).filter(Boolean))];

      let annonceTitleMap = {};
      let annoncePhotoMap = {};
      if (annonceIds.length > 0) {
        const { data: annoncesData } = await supabase
          .from("annonces")
          .select("id, titre, photos")
          .in("id", annonceIds);
        annoncesData?.forEach(a => {
          annonceTitleMap[a.id] = a.titre;
          annoncePhotoMap[a.id] = a.photos && a.photos.length > 0 ? a.photos[0] : DEFAULT_ANNONCE_IMG;
        });
      }
      setAnnonceTitles(annonceTitleMap);

      let prestataireNameMap = {};
      if (prestataireIds.length > 0) {
        const { data: prestatairesData } = await supabase
          .from("profiles")
          .select("id, nom")
          .in("id", prestataireIds);
        prestatairesData?.forEach(p => { prestataireNameMap[p.id] = p.nom; });
      }
      setPrestataireNames(prestataireNameMap);

      setReservations(
        (resaData || []).map((resa) => ({
          id: resa.id,
          title: annonceTitleMap[resa.annonce_id] || "Annonce",
          provider: prestataireNameMap[resa.prestataire_id] || "Prestataire",
          date: resa.date
            ? new Date(resa.date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "",
          city: villeLabel,
          cover: annoncePhotoMap[resa.annonce_id] || DEFAULT_ANNONCE_IMG,
          statut: resa.status || "Statut inconnu",
          montant_acompte: resa.montant_acompte || null,
          date_confirmation: resa.date_confirmation
            ? new Date(resa.date_confirmation).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          date_annulation: resa.date_annulation
            ? new Date(resa.date_annulation).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          motif_annulation: resa.motif_annulation || null,
          date_refus: resa.date_refus
            ? new Date(resa.date_refus).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          motif_refus: resa.motif_refus || null,
        }))
      );

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
              <h3 className="font-semibold text-gray-800 mb-3">
                Informations personnelles
              </h3>
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

          {/* Reservations */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Mes réservations
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {reservations.map((resa) => (
                <div
                  key={resa.id}
                  className="bg-white rounded-2xl shadow overflow-hidden"
                >
                  <img
                    src={resa.cover}
                    alt={resa.title}
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">{resa.title}</h3>
                    <p className="text-sm text-gray-500">
                      {resa.provider} – {resa.city}
                    </p>
                    <p className="text-sm text-gray-500">{resa.date}</p>
                    <p className="text-sm font-semibold mt-2">
                      Statut : <span className={
                        resa.statut === "confirmed" ? "text-green-600" :
                        resa.statut === "cancelled" ? "text-red-600" :
                        resa.statut === "refused" ? "text-orange-600" :
                        resa.statut === "pending" ? "text-orange-600" :
                        "text-gray-600"
                      }>
                        {resa.statut === "confirmed"
                          ? "Confirmée"
                          : resa.statut === "cancelled"
                          ? "Annulée"
                          : resa.statut === "refused"
                          ? "Refusée"
                          : resa.statut === "pending"
                          ? "En attente"
                          : resa.statut}
                      </span>
                    </p>
                    {resa.montant_acompte && (
                      <p className="text-sm text-black-700">
                        <span className="font-bold"> Acompte : </span> {resa.montant_acompte !== null ? resa.montant_acompte : 0} MAD
                      </p>
                    )}
                    {resa.statut === "confirmed" && resa.date_confirmation && (
                      <p className="text-sm text-black-700">
                       <span className="font-bold"> Confirmée le : </span> {resa.date_confirmation}
                      </p>
                    )}
                    {resa.statut === "cancelled" && (
                      <>
                        {resa.date_annulation && (
                          <p className="text-sm text-black-700">
                            <span className="font-bold"> Annulée le : </span>{resa.date_annulation}
                          </p>
                        )}
                        {resa.motif_annulation && (
                          <p className="text-sm text-black-700">
                           <span className="font-bold"> Motif : </span>{resa.motif_annulation}
                          </p>
                        )}
                      </>
                    )}
                    {resa.statut === "refused" && (
                      <>
                        {resa.date_refus && (
                          <p className="text-sm text-gray-700">
                            <span className="font-bold"> Refusée le : </span>{resa.date_refus}
                          </p>
                        )}
                        {resa.motif_refus && (
                          <p className="text-sm text-gray-700">
                            <span className="font-bold"> Motif : </span>{resa.motif_refus}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {reservations.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  Aucune réservation pour le moment.
                </div>
              )}
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
                      <h3 className="font-semibold text-gray-800">{fav.title}</h3>
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
        </div>
      </div>
    </>
  );
}