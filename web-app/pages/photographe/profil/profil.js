import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Phone, MapPin, Heart, Calendar, Star, Award, TrendingUp, Users, Eye, ShoppingCart, DollarSign, Briefcase, Clock, CheckCircle, Instagram, Facebook, Linkedin, Globe, Upload, FileText, AlertTriangle, Shield } from "lucide-react";
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
  const [stripeAccountId, setStripeAccountId] = useState(null);
  // États pour les réseaux sociaux
  const [socialMedia, setSocialMedia] = useState({
    instagram: '',
    facebook: '',
    linkedin: '',
    website: ''
  });
  const [socialMediaEdit, setSocialMediaEdit] = useState({
    instagram: '',
    facebook: '',
    linkedin: '',
    website: ''
  });
  
  // États pour les documents professionnels
  const [documents, setDocuments] = useState({
    siret: null,
    assurance: null,
    kbis: null
  });
  const [statutValidation, setStatutValidation] = useState('pending');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  
  // États pour les zones d'intervention
  const [zonesIntervention, setZonesIntervention] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZone, setNewZone] = useState({ ville_centre: '', rayon_km: 50 });
  const [savingZone, setSavingZone] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nom, photos, ville_id, email, telephone, bio, stripe_account_id, instagram, facebook, linkedin, website, documents_siret, documents_assurance, documents_kbis, statut_validation")
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

      // Traiter le numéro de téléphone pour préserver le 0 initial
      const phoneNumber = profile?.telephone ? String(profile.telephone) : "";

      setUser({
        name: profile?.nom || "",
        avatar: profile?.photos || "",
        city: villeLabel,
        cityId: villeIdValue,
        email: profile?.email || "",
        phone: phoneNumber,
        about: profile?.bio || "",
      });

      setBioEdit(profile?.bio || "");
      setEmailEdit(profile?.email || "");
      setPhoneEdit(phoneNumber);
      setVilleEdit(villeLabel);
      setPhotoEdit(profile?.photos || "");
      setStripeAccountId(profile?.stripe_account_id || null);
      
      // Initialiser les réseaux sociaux
      const socialData = {
        instagram: profile?.instagram || '',
        facebook: profile?.facebook || '',
        linkedin: profile?.linkedin || '',
        website: profile?.website || ''
      };
      setSocialMedia(socialData);
      setSocialMediaEdit(socialData);

      // Initialiser les documents professionnels
      setDocuments({
        siret: profile?.documents_siret || null,
        assurance: profile?.documents_assurance || null,
        kbis: profile?.documents_kbis || null
      });
      setStatutValidation(profile?.statut_validation || 'pending');

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

      // Charger les zones d'intervention
      await loadZonesIntervention(authUser.id);
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

     

      // 3. Réservations
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, montant, status')
        .eq('prestataire_id', prestataireId);

      // Calculs
      const totalAnnonces = annonces?.length || 0;
      const totalReservations = reservations?.length || 0;
      const totalVues = annonces?.reduce((sum, a) => sum + (a.vues || 0), 0) || 0;
      
      const reservationsPayees = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'confirmed'
      ) || [];
      
      const caReservations = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
      const chiffreAffaires = caReservations;
      
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

  // Fonction pour formater et valider le numéro de téléphone
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    
    // Supprimer tous les caractères non numériques sauf le + initial
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par +212, le garder tel quel
    if (cleaned.startsWith('+212')) {
      return cleaned;
    }
    
    // Si le numéro commence par 0212, le remplacer par +212
    if (cleaned.startsWith('0212')) {
      return '+212' + cleaned.substring(4);
    }
    
    // Si le numéro commence par 212, ajouter le +
    if (cleaned.startsWith('212')) {
      return '+' + cleaned;
    }
    
    // Si le numéro commence par 0 et fait 10 chiffres (format marocain local)
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return cleaned; // Garder le format local avec le 0
    }
    
    // Sinon, retourner le numéro nettoyé tel quel
    return cleaned;
  };

  // Gestionnaire de changement pour le numéro de téléphone
  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhoneEdit(formattedPhone);
  };

  // Gestion upload photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPhotoEdit(base64);
  };

  // Fonction pour téléverser un document
  const handleDocumentUpload = async (documentType, file) => {
    if (!file) return;
    
    setUploadingDoc(documentType);
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Utilisateur non authentifié");

      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload du fichier vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Mettre à jour le profil avec l'URL du document
      const columnName = `documents_${documentType}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          [columnName]: publicUrl,
          statut_validation: 'pending' // Remettre en attente après un nouvel upload
        })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // Mettre à jour l'état local
      setDocuments(prev => ({
        ...prev,
        [documentType]: publicUrl
      }));
      setStatutValidation('pending');

      alert(`Document ${documentType.toUpperCase()} téléversé avec succès !`);

    } catch (error) {
      console.error('Erreur upload document:', error);
      alert('Erreur lors du téléversement: ' + error.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Charger les zones d'intervention
  const loadZonesIntervention = async (prestataireId) => {
    try {
      const { data: zonesData, error } = await supabase
        .from('zones_intervention')
        .select('*')
        .eq('prestataire_id', prestataireId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des zones:', error);
      } else {
        setZonesIntervention(zonesData || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Ajouter une nouvelle zone d'intervention
  const handleAddZone = async () => {
    if (!newZone.ville_centre.trim()) {
      alert('Veuillez saisir une ville centre');
      return;
    }

    if (newZone.rayon_km < 1 || newZone.rayon_km > 200) {
      alert('Le rayon doit être entre 1 et 200 km');
      return;
    }

    try {
      setSavingZone(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Utilisateur non authentifié");

      const { error } = await supabase
        .from('zones_intervention')
        .insert({
          prestataire_id: authUser.id,
          ville_centre: newZone.ville_centre.trim(),
          rayon_km: parseInt(newZone.rayon_km),
          active: true
        });

      if (error) throw error;

      // Recharger les zones
      await loadZonesIntervention(authUser.id);
      
      // Réinitialiser le formulaire
      setNewZone({ ville_centre: '', rayon_km: 50 });
      setShowZoneModal(false);
      
      alert('Zone d\'intervention ajoutée avec succès !');

    } catch (error) {
      console.error('Erreur lors de l\'ajout de la zone:', error);
      alert('Erreur lors de l\'ajout: ' + error.message);
    } finally {
      setSavingZone(false);
    }
  };

  // Supprimer une zone d'intervention
  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone d\'intervention ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('zones_intervention')
        .update({ active: false })
        .eq('id', zoneId);

      if (error) throw error;

      // Recharger les zones
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadZonesIntervention(authUser.id);
      }
      
      alert('Zone d\'intervention supprimée');

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
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

    // S'assurer que le numéro de téléphone est bien traité comme une chaîne
    const phoneToSave = phoneEdit ? String(phoneEdit) : null;

    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .update({
        bio: bioEdit,
        email: emailEdit,
        telephone: phoneToSave,
        ville_id: villeIdToSave,
        photos: photoEdit,
        instagram: socialMediaEdit.instagram,
        facebook: socialMediaEdit.facebook,
        linkedin: socialMediaEdit.linkedin,
        website: socialMediaEdit.website
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
        <div style={{background: 'linear-gradient(to right, var(--primary), var(--accent))'}}>
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
                  <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center bg-white text-4xl font-bold" style={{color: 'var(--text)'}}>
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
                      className="bg-white px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2"
                      style={{color: 'var(--text)'}}
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <TrendingUp className="w-6 h-6" style={{color: 'var(--primary)'}} />
              Mes performances
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="rounded-lg p-4" style={{background: 'linear-gradient(to right, var(--background), #f9fafb)', border: '1px solid var(--primary)'}}>
                <div className="flex items-center justify-between mb-2">
                  <Briefcase className="w-5 h-5" style={{color: 'var(--primary)'}} />
                  <span className="text-sm font-medium" style={{color: 'var(--text)'}}>Annonces</span>
                </div>
                <p className="text-2xl font-bold" style={{color: 'var(--text)'}}>{stats.totalAnnonces}</p>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">CA Total</span>
                </div>
                <p className="text-lg font-bold text-emerald-800">{formatCurrency(stats.chiffreAffaires)}</p>
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
              
              <div className="rounded-lg p-4" style={{background: 'linear-gradient(to right, #f9fafb, var(--background))', border: '1px solid #d1d5db'}}>
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
                <Users className="w-5 h-5" style={{color: 'var(--primary)'}} />
                Informations personnelles
              </h2>
              {!editMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--background)'}}>
                    <Mail className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <div>
                      <p className="text-sm" style={{color: 'var(--primary)'}}>Email</p>
                      <p className="font-medium" style={{color: 'var(--text)'}}>{user.email || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--background)'}}>
                    <Phone className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <div>
                      <p className="text-sm" style={{color: 'var(--primary)'}}>Téléphone</p>
                      <p className="font-medium" style={{color: 'var(--text)'}}>
                        {user.phone ? String(user.phone) : 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--background)'}}>
                    <MapPin className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <div>
                      <p className="text-sm" style={{color: 'var(--primary)'}}>Ville</p>
                      <p className="font-medium" style={{color: 'var(--text)'}}>{user.city || 'Non renseigné'}</p>
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
                      type="tel"
                      className="border rounded px-2 py-1 w-full"
                      value={phoneEdit}
                      onChange={handlePhoneChange}
                      placeholder="Ex: 0652647890 ou +212652647890"
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
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
                      className="text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 mx-auto"
                      style={{backgroundColor: 'var(--primary)'}}
                      onMouseEnter={e => e.target.style.backgroundColor = 'var(--accent)'}
                      onMouseLeave={e => e.target.style.backgroundColor = 'var(--primary)'}
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
                      <p className="text-sm text-amber-600">Configurez vos paiements pour recevoir des reservations</p>
                    </div>
                    <button
                      className="text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 mx-auto"
                      style={{backgroundColor: 'var(--primary)'}}
                      onMouseEnter={e => e.target.style.backgroundColor = 'var(--accent)'}
                      onMouseLeave={e => e.target.style.backgroundColor = 'var(--primary)'}
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <Heart className="w-6 h-6" style={{color: 'var(--primary)'}} />
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
                    className="w-full p-4 border rounded-lg resize-none"
                    style={{borderColor: 'var(--primary)', '--tw-ring-color': 'var(--primary)'}}
                    onFocus={e => e.target.style.outline = 'none'}
                    onBlur={e => e.target.style.outline = 'none'}
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

          {/* Réseaux sociaux */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <Globe className="w-6 h-6" style={{color: 'var(--primary)'}} />
              Mes réseaux sociaux
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {!editMode ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {socialMedia.instagram && (
                    <a
                      href={socialMedia.instagram.startsWith('http') ? socialMedia.instagram : `https://instagram.com/${socialMedia.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 hover:shadow-md transition-all duration-200 group"
                    >
                      <Instagram className="w-6 h-6 text-pink-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-semibold text-pink-800">Instagram</p>
                        <p className="text-sm text-pink-600">@{socialMedia.instagram.replace(/.*instagram\.com\//, '').replace(/.*@/, '')}</p>
                      </div>
                    </a>
                  )}
                  
                  {socialMedia.facebook && (
                    <a
                      href={socialMedia.facebook.startsWith('http') ? socialMedia.facebook : `https://facebook.com/${socialMedia.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200 group"
                    >
                      <Facebook className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-semibold text-blue-800">Facebook</p>
                        <p className="text-sm text-blue-600 truncate">{socialMedia.facebook.replace(/.*facebook\.com\//, '').replace(/.*@/, '')}</p>
                      </div>
                    </a>
                  )}
                
                  
                  {socialMedia.linkedin && (
                    <a
                      href={socialMedia.linkedin.startsWith('http') ? socialMedia.linkedin : `https://linkedin.com/in/${socialMedia.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200 group"
                    >
                      <Linkedin className="w-6 h-6 text-blue-700 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-semibold text-blue-800">LinkedIn</p>
                        <p className="text-sm text-blue-600 truncate">{socialMedia.linkedin.replace(/.*linkedin\.com\/in\//, '').replace(/.*@/, '')}</p>
                      </div>
                    </a>
                  )}
                  
                  {socialMedia.website && (
                    <a
                      href={socialMedia.website.startsWith('http') ? socialMedia.website : `https://${socialMedia.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 group"
                      style={{background: 'linear-gradient(to right, #f9fafb, var(--background))'}}
                    >
                      <Globe className="w-6 h-6 text-gray-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-semibold text-gray-800">Site Web</p>
                        <p className="text-sm text-gray-600 truncate">{socialMedia.website.replace(/^https?:\/\//, '')}</p>
                      </div>
                    </a>
                  )}
                  
                  {!socialMedia.instagram && !socialMedia.facebook && !socialMedia.linkedin && !socialMedia.website && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium mb-1">Aucun réseau social renseigné</p>
                      <p className="text-sm">Cliquez sur "Modifier mon profil" pour ajouter vos réseaux sociaux</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-6">Ajoutez vos réseaux sociaux pour permettre à vos clients de mieux vous découvrir</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        Instagram
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        value={socialMediaEdit.instagram}
                        onChange={e => setSocialMediaEdit({...socialMediaEdit, instagram: e.target.value})}
                        placeholder="votre_compte ou https://instagram.com/votre_compte"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Facebook className="w-4 h-4 text-blue-600" />
                        Facebook
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={socialMediaEdit.facebook}
                        onChange={e => setSocialMediaEdit({...socialMediaEdit, facebook: e.target.value})}
                        placeholder="votre_page ou https://facebook.com/votre_page"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Linkedin className="w-4 h-4 text-blue-700" />
                        LinkedIn
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={socialMediaEdit.linkedin}
                        onChange={e => setSocialMediaEdit({...socialMediaEdit, linkedin: e.target.value})}
                        placeholder="votre_profil ou https://linkedin.com/in/votre_profil"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Globe className="w-4 h-4 text-gray-600" />
                        Site Web
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        value={socialMediaEdit.website}
                        onChange={e => setSocialMediaEdit({...socialMediaEdit, website: e.target.value})}
                        placeholder="https://votre-site.com"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-blue-800 mb-2">💡 Conseils pour vos réseaux sociaux :</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Vous pouvez saisir juste le nom d'utilisateur (ex: mon_compte) ou l'URL complète</li>
                      <li>• Assurez-vous que vos profils soient professionnels et à jour</li>
                      <li>• Vos réseaux sociaux aident à établir la confiance avec vos clients</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Documents professionnels */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <Shield className="w-6 h-6" style={{color: 'var(--primary)'}} />
              Documents professionnels
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* Statut de validation */}
              <div className="mb-6 p-4 rounded-lg border" style={{
                backgroundColor: statutValidation === 'validated' ? '#f0f9ff' : 
                                statutValidation === 'rejected' ? '#fef2f2' : '#fffbeb',
                borderColor: statutValidation === 'validated' ? '#3b82f6' : 
                            statutValidation === 'rejected' ? '#ef4444' : '#f59e0b'
              }}>
                <div className="flex items-center gap-2">
                  {statutValidation === 'validated' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : statutValidation === 'rejected' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-medium" style={{
                    color: statutValidation === 'validated' ? '#059669' : 
                           statutValidation === 'rejected' ? '#dc2626' : '#d97706'
                  }}>
                    {statutValidation === 'validated' ? 'Documents validés' : 
                     statutValidation === 'rejected' ? 'Documents refusés' : 
                     'En attente de validation'}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{
                  color: statutValidation === 'validated' ? '#059669' : 
                         statutValidation === 'rejected' ? '#dc2626' : '#d97706'
                }}>
                  {statutValidation === 'validated' ? 'Vos documents ont été validés par notre équipe.' : 
                   statutValidation === 'rejected' ? 'Veuillez téléverser des documents conformes.' : 
                   'Vos documents sont en cours de vérification.'}
                </p>
              </div>

              {/* Liste des documents */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* SIRET */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <h3 className="font-semibold" style={{color: 'var(--text)'}}>SIRET</h3>
                  </div>
                  {documents.siret ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Document téléversé
                      </div>
                      <button
                        onClick={() => window.open(documents.siret, '_blank')}
                        className="text-sm underline text-blue-600 hover:text-blue-800"
                      >
                        Voir le document
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">Aucun document</p>
                  )}
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('siret', e.target.files[0])}
                      className="hidden"
                      disabled={uploadingDoc === 'siret'}
                    />
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                      {uploadingDoc === 'siret' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Téléversement...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Téléverser SIRET
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Assurance */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <h3 className="font-semibold" style={{color: 'var(--text)'}}>Assurance</h3>
                  </div>
                  {documents.assurance ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Document téléversé
                      </div>
                      <button
                        onClick={() => window.open(documents.assurance, '_blank')}
                        className="text-sm underline text-blue-600 hover:text-blue-800"
                      >
                        Voir le document
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">Aucun document</p>
                  )}
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('assurance', e.target.files[0])}
                      className="hidden"
                      disabled={uploadingDoc === 'assurance'}
                    />
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                      {uploadingDoc === 'assurance' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Téléversement...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Téléverser Assurance
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* KBIS */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-5 h-5" style={{color: 'var(--primary)'}} />
                    <h3 className="font-semibold" style={{color: 'var(--text)'}}>KBIS</h3>
                  </div>
                  {documents.kbis ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Document téléversé
                      </div>
                      <button
                        onClick={() => window.open(documents.kbis, '_blank')}
                        className="text-sm underline text-blue-600 hover:text-blue-800"
                      >
                        Voir le document
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">Aucun document</p>
                  )}
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('kbis', e.target.files[0])}
                      className="hidden"
                      disabled={uploadingDoc === 'kbis'}
                    />
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                      {uploadingDoc === 'kbis' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Téléversement...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Téléverser KBIS
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📋 Informations importantes :</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Les documents sont obligatoires pour valider votre profil prestataire</li>
                  <li>• Formats acceptés : PDF, JPG, PNG (max 5MB par fichier)</li>
                  <li>• La validation peut prendre 24-48h après téléversement</li>
                  <li>• Assurez-vous que les documents soient lisibles et à jour</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Zones d'intervention */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <MapPin className="w-6 h-6" style={{color: 'var(--primary)'}} />
              Zones d'intervention
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  Définissez les zones géographiques où vous acceptez d'intervenir
                </p>
                <button
                  onClick={() => setShowZoneModal(true)}
                  className="px-4 py-2 text-white rounded-lg shadow transition"
                  style={{backgroundColor: 'var(--primary)'}}
                  onMouseEnter={e => e.target.style.backgroundColor = 'var(--accent)'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'var(--primary)'}
                >
                  Ajouter une zone
                </button>
              </div>

              {zonesIntervention.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Aucune zone définie</h3>
                  <p className="text-gray-500 mb-4">
                    Ajoutez vos zones d'intervention pour que les clients sachent où vous pouvez vous déplacer
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zonesIntervention.map((zone) => (
                    <div key={zone.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4" style={{color: 'var(--primary)'}} />
                            <h3 className="font-semibold" style={{color: 'var(--text)'}}>{zone.ville_centre}</h3>
                          </div>
                          <p className="text-sm text-gray-600">
                            Rayon : <span className="font-medium">{zone.rayon_km} km</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">💡 Conseils pour vos zones d'intervention :</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Définissez des zones réalistes selon vos possibilités de déplacement</li>
                  <li>• Un rayon de 50 km est généralement recommandé pour commencer</li>
                  <li>• Vous pouvez ajouter plusieurs zones centrées sur différentes villes</li>
                  <li>• Les clients verront ces informations sur votre profil</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modal d'ajout de zone d'intervention */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{color: 'var(--text)'}}>
                  Ajouter une zone d'intervention
                </h3>
                <button
                  onClick={() => setShowZoneModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville centre
                  </label>
                  <input
                    type="text"
                    value={newZone.ville_centre}
                    onChange={(e) => setNewZone({...newZone, ville_centre: e.target.value})}
                    placeholder="Ex: Casablanca, Rabat, Marrakech..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rayon d'intervention (km)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="200"
                      value={newZone.rayon_km}
                      onChange={(e) => setNewZone({...newZone, rayon_km: parseInt(e.target.value)})}
                      className="flex-1"
                    />
                    <div className="text-lg font-semibold min-w-[60px]" style={{color: 'var(--primary)'}}>
                      {newZone.rayon_km} km
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Distance maximale depuis la ville centre où vous acceptez d'intervenir
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowZoneModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddZone}
                  disabled={savingZone}
                  className="flex-1 px-4 py-2 text-white rounded-lg shadow transition"
                  style={{backgroundColor: 'var(--primary)'}}
                  onMouseEnter={e => !savingZone && (e.target.style.backgroundColor = 'var(--accent)')}
                  onMouseLeave={e => !savingZone && (e.target.style.backgroundColor = 'var(--primary)')}
                >
                  {savingZone ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}