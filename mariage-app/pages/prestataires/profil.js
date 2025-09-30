import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart, Calendar, Star, Award, TrendingUp, Users, Eye, ShoppingCart, DollarSign, Briefcase, Clock, CheckCircle } from "lucide-react";
import Header from '../../components/HeaderPresta';
import { useRouter } from "next/router";

const DEFAULT_ANNONCE_IMG = "/shutterstock_2502519999.jpg"; // Place l'image PJ dans public/

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [villeNom, setVilleNom] = useState("");
  const [villeId, setVilleId] = useState(null);
  const [stats, setStats] = useState({
    totalAnnonces: 0,
    totalCommandes: 0,
    totalReservations: 0,
    chiffreAffaires: 0,
    noteMoyenne: 0,
    totalVues: 0
  });
  const [recentAnnonces, setRecentAnnonces] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [villesList, setVillesList] = useState([]);
  const [stripeAccountId, setStripeAccountId] = useState(null); // Ajouté
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nom, photos, ville_id, email, telephone, bio, stripe_account_id")
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
      setVilleId(villeIdValue);

      setUser({
        name: profile?.nom || "",
        avatar: profile?.photos || "",
        city: villeLabel,
        cityId: villeIdValue,
        email: profile?.email || "",
        phone: profile?.telephone || "",
        about: profile?.bio || "",
      });

      setBioEdit(profile?.bio || "");
      setEmailEdit(profile?.email || "");
      setPhoneEdit(profile?.telephone || "");
      setVilleEdit(villeLabel);
      setPhotoEdit(profile?.photos || "");
      setStripeAccountId(profile?.stripe_account_id || null); // Ajouté

      // Récupère la liste des villes
      const { data: villesData } = await supabase
        .from("villes")
        .select("id, ville");
      setVillesList(villesData || []);

      // Charger les statistiques du prestataire
      await loadPrestataireStats(authUser.id);
      
      // Charger les prestations disponibles
      const { data: prestationsData } = await supabase
        .from("prestations")
        .select("id, type, nom")
        .order('nom');
      setPrestations(prestationsData || []);

      // Charger les annonces récentes du prestataire
      const { data: recentAnnoncesData } = await supabase
        .from("annonces")
        .select("id, titre, photos, created_at, rate, vues, prestation, prestations!inner(type)")
        .eq("prestataire", authUser.id)
        .order('created_at', { ascending: false })
        .limit(6);
        
      setRecentAnnonces((recentAnnoncesData || []).map(annonce => ({
        id: annonce.id,
        titre: annonce.titre,
        photo: annonce.photos && annonce.photos.length > 0 ? annonce.photos[0] : DEFAULT_ANNONCE_IMG,
        dateCreation: new Date(annonce.created_at).toLocaleDateString("fr-FR"),
        note: annonce.rate || 0,
        vues: annonce.vues || 0,
        prestation: annonce.prestations?.type || 'Non défini'
      })));

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
    calculateAndUpdatePrestataireRate();
  }, []);

  // Charger les statistiques du prestataire
  const loadPrestataireStats = async (prestataireId) => {
    try {
      // 1. Annonces
      const { data: annonces } = await supabase
        .from('annonces')
        .select('id, rate, vues')
        .eq('prestataire', prestataireId);

      // 2. Commandes
      const { data: commandes } = await supabase
        .from('commandes')
        .select('id, montant, status')
        .eq('prestataire_id', prestataireId);

      // 3. Réservations
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, montant, status')
        .eq('prestataire_id', prestataireId);

      // Calculs
      const totalAnnonces = annonces?.length || 0;
      const totalCommandes = commandes?.length || 0;
      const totalReservations = reservations?.length || 0;
      const totalVues = annonces?.reduce((sum, a) => sum + (a.vues || 0), 0) || 0;
      
      const commandesPayees = commandes?.filter(c => 
        c.status === 'completed' || c.status === 'delivered'
      ) || [];
      const reservationsPayees = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'confirmed'
      ) || [];
      
      const caCommandes = commandesPayees.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
      const caReservations = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
      const chiffreAffaires = caCommandes + caReservations;
      
      const annonceAvecRate = annonces?.filter(a => a.rate && a.rate > 0) || [];
      const noteMoyenne = annonceAvecRate.length > 0 ? 
        annonceAvecRate.reduce((sum, a) => sum + a.rate, 0) / annonceAvecRate.length : 0;

      setStats({
        totalAnnonces,
        totalCommandes,
        totalReservations,
        chiffreAffaires,
        noteMoyenne: Math.round(noteMoyenne * 10) / 10,
        totalVues
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // Calculer et mettre à jour la note moyenne du prestataire
  const calculateAndUpdatePrestataireRate = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    try {
      // 1. Récupérer toutes les annonces du prestataire
      const { data: annonces, error: annoncesError } = await supabase
        .from('annonces')
        .select('id, rate')
        .eq('prestataire', authUser.id);

      if (annoncesError) {
        console.error('Erreur récupération annonces:', annoncesError);
        return;
      }

      if (!annonces || annonces.length === 0) {
        console.log('Aucune annonce trouvée pour ce prestataire');
        return;
      }

      // 2. Filtrer les annonces qui ont un rate (note) valide
      const annoncesAvecRate = annonces.filter(annonce => 
        annonce.rate !== null && annonce.rate !== undefined && annonce.rate > 0
      );

      if (annoncesAvecRate.length === 0) {
        console.log('Aucune annonce avec note trouvée');
        return;
      }

      // 3. Calculer la moyenne des rates
      const sommeRates = annoncesAvecRate.reduce((sum, annonce) => sum + annonce.rate, 0);
      const moyenneRate = sommeRates / annoncesAvecRate.length;

      console.log(`📊 Calcul moyenne prestataire:`, {
        totalAnnonces: annonces.length,
        annoncesAvecNote: annoncesAvecRate.length,
        somme: sommeRates,
        moyenne: moyenneRate
      });

      // 4. Mettre à jour la colonne rate dans profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ rate: Math.round(moyenneRate * 10) / 10 }) // Arrondi à 1 décimale
        .eq('id', authUser.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour rate prestataire:', updateError);
      } else {
        console.log(`✅ Rate prestataire mis à jour: ${Math.round(moyenneRate * 10) / 10}`);
      }

    } catch (error) {
      console.error('❌ Erreur calcul moyenne prestataire:', error);
    }
  };

  // Formater les devises
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

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
    let villeIdToSave = villeId;
    if (villeEdit) {
      const villeObj = villesList.find(v => v.ville === villeEdit);
      villeIdToSave = villeObj ? villeObj.id : villeId;
    }

    const { data, error, status, statusText } = await supabase
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
      // Affiche plus de détails sur l'erreur
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

  // Fonction pour configurer les paiements Stripe
  const handleStripeSetup = async () => {
    try {
      // Récupère l'id et l'email du prestataire depuis le profil
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", authUser.id)
        .single();
      const email = profile?.email || "";

      // Appel API avec les deux champs
      const res = await fetch("/api/stripe/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prestataire_id: authUser.id,
          email: email
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur lors de la configuration Stripe.");
      }
    } catch (err) {
      alert("Erreur réseau lors de la configuration Stripe.");
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
        <div className="bg-gradient-to-r from-slate-700 to-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center gap-8">
              <div className="relative">
                {user.avatar ? (
                  <img
                    src={editMode ? photoEdit : user.avatar}
                    alt={user.name}
                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center bg-white text-slate-700 text-4xl font-bold">
                    {user.name ? user.name[0].toUpperCase() : "?"}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">{user.name}</h1>
                  <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    Prestataire
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-white/90 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {user.city || 'Ville non renseignée'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {stats.noteMoyenne}/5
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {stats.totalVues} vues
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {!editMode ? (
                    <button
                      className="bg-white text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2"
                      onClick={() => setEditMode(true)}
                    >
                      <Users className="w-4 h-4" />
                      Modifier mon profil
                    </button>
                  ) : (
                    <button
                      className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-lg flex items-center gap-2"
                      onClick={handleSaveProfile}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Sauvegarder
                    </button>
                  )}
                  
                  <button
                    onClick={() => router.push('/prestataires/kpis')}
                    className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors border border-white/20 flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Mes KPIs
                  </button>
                </div>
              </div>
            </div>
            
            {/* Input pour uploader une photo en mode édition */}
            {editMode && (
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <label className="block text-sm font-medium text-white mb-2">Changer ma photo de profil</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-white bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
          
          {/* Statistiques rapides */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-slate-600" />
              Mes performances
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <Briefcase className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Annonces</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalAnnonces}</p>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">CA Total</span>
                </div>
                <p className="text-lg font-bold text-emerald-800">{formatCurrency(stats.chiffreAffaires)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Commandes</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{stats.totalCommandes}</p>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-700">Réservations</span>
                </div>
                <p className="text-2xl font-bold text-indigo-800">{stats.totalReservations}</p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">Note</span>
                </div>
                <p className="text-2xl font-bold text-amber-800">{stats.noteMoyenne}/5</p>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Vues</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalVues}</p>
              </div>
            </div>
          </section>

          {/* Infos perso + Infos bancaires */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                Informations personnelles
              </h2>
              {!editMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-800">{user.email || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-500">Téléphone</p>
                      <p className="font-medium text-slate-800">{user.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-gray-500">Ville</p>
                      <p className="font-medium text-gray-800">{user.city || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Informations bancaires
              </h2>
              <div className="text-center">
                {stripeAccountId ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">Compte configuré</p>
                        <p className="text-sm text-green-600">Vous pouvez recevoir des paiements</p>
                      </div>
                    </div>
                    <button
                      className="bg-slate-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-2 mx-auto"
                      onClick={handleStripeSetup}
                    >
                      <DollarSign className="w-4 h-4" />
                      Modifier mon compte
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-amber-800 font-medium mb-1">Configuration requise</p>
                      <p className="text-sm text-amber-600">Configurez vos paiements pour recevoir des commandes</p>
                    </div>
                    <button
                      className="bg-slate-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-2 mx-auto"
                      onClick={handleStripeSetup}
                    >
                      <DollarSign className="w-4 h-4" />
                      Configurer mes paiements
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Heart className="w-6 h-6 text-slate-600" />
              À propos de moi
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {!editMode ? (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {user.about || "Aucune description disponible. Cliquez sur 'Modifier mon profil' pour ajouter une présentation."}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Présentez-vous à vos futurs clients
                  </label>
                  <textarea
                    className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                    value={bioEdit}
                    onChange={e => setBioEdit(e.target.value)}
                    rows={6}
                    placeholder="Parlez de votre expérience, votre passion, ce qui vous différencie..."
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Une bonne présentation aide les clients à mieux vous connaître et augmente vos chances d'être choisi.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}