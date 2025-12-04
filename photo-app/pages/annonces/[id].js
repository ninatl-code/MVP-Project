import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../../lib/supabaseClient";
import { trackAnnonceView } from "../../lib/viewTracking";
import Header from "../../components/HeaderParti";
import { Star, User } from "lucide-react";
import { motion } from "framer-motion";

export default function ArtistProfilePreview() {
  const router = useRouter();
  const [annonce, setAnnonce] = useState(null);
  const [prestationType, setPrestationType] = useState("");
  const [avis, setAvis] = useState([]);
  const [totalAvis, setTotalAvis] = useState(0);
  const [favorisLoading, setFavorisLoading] = useState(false);
  const [isFavori, setIsFavori] = useState(false);
  const [favoriId, setFavoriId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [objet, setObjet] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [modeles, setModeles] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [selectedModelPhoto, setSelectedModelPhoto] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [statsPrestataire, setStatsPrestataire] = useState({ 
    totalAnnonces: 0, 
    avgRating: 0, 
    experienceYears: 0 
  });

  // Get annonce id and preview mode from URL
  const annonceId = router.query.id;
  const preview = router.query.preview;

  useEffect(() => {
    setIsPreviewMode(preview === 'true');
  }, [preview]);

  useEffect(() => {
    if (!annonceId) return;
    async function fetchAnnonceAndAvis() {
      // Fetch annonce
      const { data: annonceData, error: annonceError } = await supabase
        .from("annonces")
        .select(`
          *, 
          prix_fixe, 
          prestataire:prestataire(*)
        `)
        .eq("id", annonceId)
        .single();
      
      if (annonceError || !annonceData) {
        setError("Aucune annonce trouvée pour cet identifiant.");
        setAnnonce(null);
        return;
      }

      // Si l'annonce existe et a une ville, récupérer le nom de la ville
      if (annonceData.ville) {
        const { data: villeData, error: villeError } = await supabase
          .from("villes")
          .select("id, ville")
          .eq("id", annonceData.ville)
          .single();
        
        if (villeData) {
          annonceData.villeInfo = villeData;
        }
      }
      setAnnonce(annonceData);

      // Récupère le type de la prestation
      let prestationData = null;
      if (annonceData?.prestation) {
        const { data: prestationResponse } = await supabase
          .from("prestations")
          .select("type")
          .eq("id", annonceData.prestation)
          .single();
        prestationData = prestationResponse;
        setPrestationType(prestationData?.type || "");
      }

      // Fetch avis for this specific annonce
      const { data: avisData } = await supabase
        .from("avis")
        .select("*, particulier:particulier_id(nom, photos)")
        .eq("annonce_id", annonceId)
        .order("created_at", { ascending: false })
        .limit(3);
      setAvis(avisData || []);

      // Get total count of avis for this annonce
      const { count } = await supabase
        .from("avis")
        .select("*", { count: 'exact', head: true })
        .eq("annonce_id", annonceId);
      setTotalAvis(count || 0);

      // Fetch modeles if it's a product
      if (prestationData?.type === 'produit') {
        console.log('🔍 Récupération des modèles pour le produit:', annonceId);
        const { data: modelesData, error: modelesError } = await supabase
          .from("modeles")
          .select("*")
          .eq("annonce_id", annonceId)
          .order("created_at", { ascending: true });
        
        if (modelesError) {
          console.error('❌ Erreur lors de la récupération des modèles:', modelesError);
        } else {
          console.log('✅ Modèles récupérés:', modelesData);
          setModeles(modelesData || []);
        }
      } else {
        console.log('ℹ️ Ce n\'est pas un produit, type de prestation:', prestationData?.type);
      }

      // Fetch livraisons data
      const { data: livraisonsData } = await supabase
        .from("livraisons_annonces")
        .select("*, villes(ville)")
        .eq("annonce_id", annonceId);
      setLivraisons(livraisonsData || []);

      // Calculate average rating
      if (avisData && avisData.length > 0) {
        const total = avisData.reduce((sum, avis) => sum + avis.note, 0);
        setAvgRating((total / avisData.length).toFixed(1));
      }

      // Fetch prestataire stats
      if (annonceData?.prestataire?.id) {
        const { data: prestataireAnnonces } = await supabase
          .from("annonces")
          .select("id, created_at")
          .eq("prestataire", annonceData.prestataire.id);
        
        const { data: allAvis } = await supabase
          .from("avis")
          .select("note")
          .in("annonce_id", prestataireAnnonces?.map(a => a.id) || []);

        const totalAnnonces = prestataireAnnonces?.length || 0;
        const avgPrestataireRating = allAvis?.length > 0 
          ? (allAvis.reduce((sum, a) => sum + a.note, 0) / allAvis.length).toFixed(1)
          : 0;
        
        const firstAnnonce = prestataireAnnonces?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
        const experienceYears = firstAnnonce 
          ? Math.max(1, Math.floor((new Date() - new Date(firstAnnonce.created_at)) / (365 * 24 * 60 * 60 * 1000)))
          : 0;

        setStatsPrestataire({
          totalAnnonces,
          avgRating: avgPrestataireRating,
          experienceYears
        });
      }
    }
    fetchAnnonceAndAvis();
  }, [annonceId]);

  // Get current user id
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUser();
  }, []);

  // Track annonce view
  useEffect(() => {
    if (annonceId && annonce) {
      // Délai de 3 secondes pour s'assurer que c'est une vraie visite
      const viewTimer = setTimeout(() => {
        trackAnnonceView(annonceId, 60); // 60 minutes de throttle
        console.log(`👁️ Vue trackée pour l'annonce ${annonceId}`);
      }, 3000);

      return () => clearTimeout(viewTimer);
    }
  }, [annonceId, annonce]);

  // Check if already favori
  useEffect(() => {
    async function checkFavori() {
      if (!userId || !annonce?.prestataire?.id) return;
      const { data } = await supabase
        .from("favoris")
        .select("id")
        .eq("particulier_id", userId)
        .eq("prestataire_id", annonce.prestataire.id)
        .single();
      setIsFavori(!!data);
      setFavoriId(data?.id || null);
    }
    checkFavori();
  }, [userId, annonce]);

  // Add to favoris
  const handleAddFavori = async () => {
    if (!userId || !annonce?.prestataire?.id || !annonceId) return;
    setFavorisLoading(true);
    const { error, data } = await supabase
      .from("favoris")
      .insert({
        particulier_id: userId,
        prestataire_id: annonce.prestataire.id,
        annonce_id: annonceId // <-- Ajout de l'annonce_id ici
      })
      .select()
      .single();
    if (!error && data) {
      setIsFavori(true);
      setFavoriId(data.id);
    }
    setFavorisLoading(false);
  };

  const handleRemoveFavori = async () => {
    if (!favoriId) return;
    setFavorisLoading(true);
    const { error } = await supabase
      .from("favoris")
      .delete()
      .eq("id", favoriId);
    if (!error) {
      setIsFavori(false);
      setFavoriId(null);
    }
    setFavorisLoading(false);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendError("");
    setSendSuccess(false);
    if (!userId || !annonce?.prestataire?.id || !messageContent.trim()) {
      setSendError("Le message ne peut pas être vide.");
      return;
    }
    setSending(true);
    let imageUrl = null;
    let attachments = [];
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${userId}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage.from('messages-images').upload(fileName, imageFile);
      if (!uploadError && data) {
        const { publicUrl } = supabase.storage.from('messages-images').getPublicUrl(data.path);
        imageUrl = publicUrl;
        attachments.push(imageUrl);
      }
    }
    // Crée la conversation si elle n'existe pas
    let conversationId = null;
    // Recherche conversation existante
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('artist_id', annonce.prestataire.id)
      .eq('client_id', userId)
      .eq('annonce_id', annonceId)
      .single();
    if (existingConv && existingConv.id) {
      conversationId = existingConv.id;
      // Met à jour le last_message
      await supabase
        .from('conversations')
        .update({ last_message: messageContent })
        .eq('id', conversationId);
    } else {
      // Crée la conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          artist_id: annonce.prestataire.id,
          client_id: userId,
          last_message: messageContent,
          annonce_id: annonceId
        })
        .select()
        .single();
      if (convError || !newConv) {
        setSendError("Erreur lors de la création de la conversation.");
        setSending(false);
        return;
      }
      conversationId = newConv.id;
    }
    // Crée le message lié à la conversation
    const { error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        objet: objet,
        sender_id: userId,
        receiver_id: annonce.prestataire.id,
        contenu: messageContent,
        attachments: attachments
      });
    setSending(false);
    if (msgError) {
      setSendError("Erreur lors de l'envoi du message.");
    } else {
      setSendSuccess(true);
      setMessageContent("");
      setObjet("");
      setImageFile(null);
      setTimeout(() => {
        setShowMessageModal(false);
        setSendSuccess(false);
      }, 1200);
    }
  };

  // Functions for social sharing
  const shareOnFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(`${annonce.titre} - ${annonce.prestataire?.nom}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers !');
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  if (!annonce && !error) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <span className="text-slate-500 text-lg">Chargement...</span>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <span className="text-red-500 text-lg">{error}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{annonce?.titre} - {annonce?.prestataire?.nom} | Shooty </title>
        <meta name="description" content={annonce?.description || "Découvrez cette prestation"} />
        <meta property="og:title" content={`${annonce?.titre} - ${annonce?.prestataire?.nom}`} />
        <meta property="og:description" content={annonce?.description} />
        <meta property="og:image" content={annonce?.photos?.[0] || "https://via.placeholder.com/400x300"} />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <Header />
      
      {/* Bannière d'aperçu */}
      {isPreviewMode && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '12px 0',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontSize: 16,
            fontWeight: 600
          }}>
            👁️ MODE APERÇU - Lecture seule
            <button
              onClick={() => window.close()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ✕ Fermer
            </button>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6" style={{
        pointerEvents: isPreviewMode ? 'none' : 'auto',
        position: 'relative'
      }}>
        {/* Profil Header */}
        <div className="w-full max-w-4xl rounded-2xl shadow-md bg-white">
          <div className="p-8 flex flex-col md:flex-row items-center md:items-start md:space-x-8">
            {/* Photo de profil */}
            <img
              src={annonce.prestataire?.photos || "https://via.placeholder.com/150"}
              alt={annonce.prestataire?.nom || "Photo Artiste"}
              className="w-32 h-32 rounded-full object-cover border-4 border-slate-200"
            />
            {/* Infos Artiste */}
            <div className="mt-6 md:mt-0 text-center md:text-left flex-1">
              <h2 className="text-3xl font-bold text-slate-800">{annonce.prestataire?.nom}</h2>              {/* Affichage ville */}
              {annonce.villeInfo?.ville && (
                <p className="text-slate-500 mt-1 text-sm">📍 {annonce.villeInfo.ville}</p>
              )}
              <div className="flex items-center justify-center md:justify-start mt-3 space-x-1">
                {[...Array(Math.round(annonce.rate || 0))].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
                {annonce.rate && (
                  <span className="text-slate-600 ml-2 font-medium">{annonce.rate.toFixed(0)}/5</span>
                )}
                <span className="text-slate-500 ml-2">({totalAvis} avis)</span>
              </div>
              <p className="mt-4 text-gray-600 max-w-lg">{annonce.description}</p>
              
              {/* Statistiques du prestataire */}
              <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">{statsPrestataire.totalAnnonces}+</div>
                  <div className="text-sm text-gray-600">Annonces</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{statsPrestataire.avgRating}/5</div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-600">{statsPrestataire.experienceYears} an{statsPrestataire.experienceYears > 1 ? 's' : ''}</div>
                  <div className="text-sm text-gray-600">d'expérience</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  className="bg-slate-700 hover:bg-slate-800 text-white p-3 rounded-xl flex items-center gap-2"
                  onClick={() => setShowMessageModal(true)}
                  title="Contacter le prestataire"
                >
                  💬
                </button>
                
                {/* Bouton Voir le profil */}
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center gap-2"
                  onClick={() => router.push(`/profil/${annonce.prestataire?.id}`)}
                  title="Voir le profil"
                >
                  <User className="w-4 h-4" />
                </button>
                
                {/* Bouton dynamique selon type de prestation */}
                {prestationType === "produit" && (
                  <button
                    className="bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-xl"
                    onClick={() => router.push("/annonces/"+ annonceId +"/commandes")}
                    title="Commander votre création"
                  >
                    🛒
                  </button>
                )}
                {prestationType === "service" && annonce?.prix_fixe === true && (
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl"
                    onClick={() => router.push("/annonces/"+ annonceId + "/reservations")}
                    title="Réserver votre prestation"
                  >
                    📅
                  </button>
                )}
                {prestationType === "service" && annonce?.prix_fixe === false && (
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-xl"
                    onClick={() => router.push(`/annonces/${annonceId}/devis`)}
                    title="Faire un devis"
                  >
                    📝
                  </button>
                )}
                {isFavori ? (
                  <button
                    className="border border-pink-400 text-pink-600 p-3 rounded-xl hover:bg-pink-50"
                    onClick={handleRemoveFavori}
                    disabled={favorisLoading}
                    title="Retirer des favoris"
                  >
                    ❤️
                  </button>
                ) : (
                  <button
                    className="border border-slate-300 p-3 rounded-xl text-slate-700 hover:bg-slate-100"
                    onClick={handleAddFavori}
                    disabled={favorisLoading}
                    title="Ajouter aux favoris"
                  >
                    🤍
                  </button>
                )}
                <button
                  onClick={shareOnFacebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl"
                  title="Partager sur Facebook"
                >
                  📤
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description de l'annonce */}
        <section className="w-full max-w-4xl mt-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📝 {"Description"}
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {annonce.description}
              </p>
            </div>
          </div>
        </section>

        {/* Détails de la prestation */}
        {(annonce.nb_photos_livrees || annonce.delai_livraison || annonce.styles_photo?.length || annonce.lieu_shootings?.length) && (
          <section className="w-full max-w-4xl mt-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                📦 Détails de la prestation
              </h2>
              
              {/* Grille des détails */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {annonce.nb_photos_livrees && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">📸</div>
                    <div className="text-sm text-gray-600 mb-1">Photos livrées</div>
                    <div className="text-lg font-bold text-blue-600">{annonce.nb_photos_livrees}</div>
                  </div>
                )}
                
                {annonce.delai_livraison && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">⏱️</div>
                    <div className="text-sm text-gray-600 mb-1">Délai</div>
                    <div className="text-lg font-bold text-green-600">{annonce.delai_livraison} jours</div>
                  </div>
                )}
                
                {annonce.retouche_incluse && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-sm text-gray-600 mb-1">Retouche</div>
                    <div className="text-lg font-bold text-purple-600">Incluse</div>
                  </div>
                )}
                
                {annonce.video_disponible && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🎬</div>
                    <div className="text-sm text-gray-600 mb-1">Vidéo</div>
                    <div className="text-lg font-bold text-red-600">Disponible</div>
                  </div>
                )}
                
                {annonce.deplacement_inclus && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🚗</div>
                    <div className="text-sm text-gray-600 mb-1">Déplacement</div>
                    <div className="text-lg font-bold text-indigo-600">
                      {annonce.rayon_deplacement_km ? `${annonce.rayon_deplacement_km}km` : 'Inclus'}
                    </div>
                  </div>
                )}
              </div>

              {/* Styles de photo */}
              {annonce.styles_photo && annonce.styles_photo.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🎨 Styles proposés
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {annonce.styles_photo.map((style, index) => (
                      <span 
                        key={index} 
                        className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lieux de shooting */}
              {annonce.lieu_shootings && annonce.lieu_shootings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📍 Lieux disponibles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {annonce.lieu_shootings.map((lieu, index) => (
                      <span 
                        key={index} 
                        className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {lieu}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section tarifs / modèles */}
        {prestationType === 'produit' && modeles.length > 0 ? (
          <section className="w-full max-w-4xl mt-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                📦 Modèles disponibles ({modeles.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {modeles.map((modele, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Photo principale du modèle */}
                    <div 
                      className="relative h-48 bg-gray-100 cursor-pointer"
                      onClick={() => modele.photo_url && modele.photo_url.length > 0 && setSelectedModelPhoto({ modele, photoIndex: 0 })}
                    >
                      {modele.photo_url && modele.photo_url.length > 0 ? (
                        <img
                          src={
                            modele.photo_url[0].startsWith('data:') 
                              ? modele.photo_url[0] 
                              : `data:image/*;base64,${modele.photo_url[0]}`
                          }
                          alt={modele.titre}
                          className="w-full h-full object-cover hover:brightness-110 transition-all duration-300"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=📦+Modèle';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                          📦
                        </div>
                      )}
                      
                      {/* Badge nombre de photos */}
                      {modele.photo_url && modele.photo_url.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-lg">
                          📷 {modele.photo_url.length}
                        </div>
                      )}
                      
                      {/* Badge prix */}
                      <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-lg">
                        {modele.prix}€
                      </div>
                    </div>
                    
                    {/* Informations du modèle */}
                    <div className="p-4">
                      <h4 className="font-semibold text-slate-800 text-lg mb-2">{modele.titre}</h4>
                      {modele.description && (
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">{modele.description}</p>
                      )}
                      
                      {/* Galerie miniatures si plusieurs photos */}
                      {modele.photo_url && modele.photo_url.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {modele.photo_url.slice(1, 4).map((photo, photoIndex) => (
                            <img
                              key={photoIndex}
                              src={
                                photo.startsWith('data:') 
                                  ? photo 
                                  : `data:image/*;base64,${photo}`
                              }
                              alt={`${modele.titre} - Photo ${photoIndex + 2}`}
                              className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200 cursor-pointer hover:brightness-110 transition-all duration-300"
                              onClick={() => setSelectedModelPhoto({ modele, photoIndex: photoIndex + 1 })}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ))}
                          {modele.photo_url.length > 4 && (
                            <div 
                              className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-600 flex-shrink-0 cursor-pointer hover:bg-gray-300 transition-colors"
                              onClick={() => setSelectedModelPhoto({ modele, photoIndex: 4 })}
                            >
                              +{modele.photo_url.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{modele.prix}€</div>
                        <div className="text-xs text-gray-500">l'unité</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          /* Section tarification pour services ou produits sans modèles */
          <section className="w-full max-w-4xl mt-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                💰 Tarification
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {annonce.prix_fixe ? (
                    <div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {annonce.tarif_unit}€ 
                        <span className="text-lg text-gray-600 ml-2">{annonce.unit_tarif}</span>
                      </div>
                      <div className="text-sm text-gray-500">Prix fixe</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-blue-600 mb-2">Sur devis</div>
                      <div className="text-sm text-gray-500">Tarification personnalisée</div>
                    </div>
                  )}
                  {annonce.acompte_percent && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Acompte requis :</strong> {annonce.acompte_percent}% à la réservation
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Boutons de partage */}
                <div className="flex flex-col justify-center">
                  <div className="text-sm text-gray-600 mb-3">Partager cette annonce :</div>
                  <div className="flex gap-3">
                    <button 
                      onClick={shareOnFacebook} 
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📘 Facebook
                    </button>
                    <button 
                      onClick={copyLink} 
                      className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      🔗 Copier le lien
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section conditions et équipements */}
        <section className="w-full max-w-4xl mt-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📋 Informations pratiques
            </h2>
            
            <div className="space-y-6">
              {/* Informations de livraison pour les produits */}
              {prestationType === 'produit' && livraisons.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 text-gray-800 flex items-center gap-2">
                    🚚 Informations de livraison
                  </h4>
                  <div className="space-y-3">
                    {['standard', 'express', 'service'].map(mode => {
                      const modelivraisons = livraisons.filter(l => l.mode === mode);
                      if (modelivraisons.length === 0) return null;
                      
                      return (
                        <div key={mode} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium capitalize flex items-center gap-2">
                              {mode === 'standard' && '🚛 Livraison Standard'}
                              {mode === 'express' && '⚡ Livraison Express'}
                              {mode === 'service' && '🎯 Zone de service'}
                            </h5>
                            {mode !== 'service' && modelivraisons[0]?.prix > 0 && (
                              <div className="text-green-600 font-semibold">
                                {modelivraisons[0].prix}€
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            {modelivraisons.map((livraison, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                📍 {livraison.villes?.ville}
                              </span>
                            ))}
                          </div>
                          
                          {modelivraisons[0]?.delai && (
                            <div className="text-xs text-gray-600">
                              ⏱️ Délai : {modelivraisons[0].delai}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {annonce.conditions_annulation && (
                  <div>
                    <h4 className="font-medium mb-3 text-gray-800">Conditions d'annulation</h4>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      annonce.conditions_annulation === 'Flexible' ? 'bg-green-100 text-green-800' :
                      annonce.conditions_annulation === 'Modéré' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {annonce.conditions_annulation}
                    </span>
                    <div className="text-xs text-gray-500 mt-2">
                      {annonce.conditions_annulation === 'Flexible' && 'Annulation gratuite jusqu\'à 24h avant'}
                      {annonce.conditions_annulation === 'Modéré' && 'Annulation avec frais selon délai'}
                      {annonce.conditions_annulation === 'Strict' && 'Annulation avec frais importants'}
                    </div>
                  </div>
                )}
                
                {annonce.equipement && (
                  <div>
                    <h4 className="font-medium mb-3 text-gray-800">Équipements fournis</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{annonce.equipement}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Photos de l'annonce */}
        {annonce.photos && annonce.photos.length > 0 && (
          <section className="w-full max-w-4xl mt-12">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                📸 Photos de l'annonce ({annonce.photos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {annonce.photos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square relative cursor-pointer group"
                    onClick={() => setSelectedPhotoIndex(index)}
                  >
                    <img
                      src={photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`}
                      alt={`Photo ${index + 1} - ${annonce.titre}`}
                      className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group-hover:brightness-110 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=Image+non+disponible';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg">
                      {index + 1}/{annonce.photos.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Modal pour affichage en grand */}
        {selectedPhotoIndex !== null && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <div className="relative max-w-6xl max-h-[85vh] w-auto h-auto flex items-center justify-center">
              <button 
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
              
              <img
                src={annonce.photos?.[selectedPhotoIndex]?.startsWith('data:') 
                  ? annonce.photos[selectedPhotoIndex] 
                  : `data:image/jpeg;base64,${annonce.photos?.[selectedPhotoIndex]}`}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                style={{ maxWidth: '90vw', maxHeight: '85vh' }}
              />
              
              {/* Navigation */}
              {annonce.photos?.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex((prev) => 
                        prev === 0 ? annonce.photos.length - 1 : prev - 1
                      );
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-3xl font-bold hover:text-gray-300 bg-black bg-opacity-70 rounded-full w-12 h-12 flex items-center justify-center z-20"
                  >
                    ‹
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex((prev) => 
                        prev === annonce.photos.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-3xl font-bold hover:text-gray-300 bg-black bg-opacity-70 rounded-full w-12 h-12 flex items-center justify-center z-20"
                  >
                    ›
                  </button>
                </>
              )}
              
              {/* Indicateur */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm z-20">
                {selectedPhotoIndex + 1} / {annonce.photos?.length}
              </div>
            </div>
          </div>
        )}

        {/* Modal pour les photos de modèles */}
        {selectedModelPhoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4"
            onClick={() => setSelectedModelPhoto(null)}
          >
            <div className="relative max-w-6xl max-h-[85vh] w-auto h-auto flex items-center justify-center">
              <button 
                onClick={() => setSelectedModelPhoto(null)}
                className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
              
              <img
                src={selectedModelPhoto.modele.photo_url?.[selectedModelPhoto.photoIndex]?.startsWith('data:') 
                  ? selectedModelPhoto.modele.photo_url[selectedModelPhoto.photoIndex] 
                  : `data:image/*;base64,${selectedModelPhoto.modele.photo_url?.[selectedModelPhoto.photoIndex]}`}
                alt={`${selectedModelPhoto.modele.titre} - Photo ${selectedModelPhoto.photoIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                style={{ maxWidth: '90vw', maxHeight: '85vh' }}
              />
              
              {/* Navigation */}
              {selectedModelPhoto.modele.photo_url?.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModelPhoto(prev => ({
                        ...prev,
                        photoIndex: prev.photoIndex === 0 ? prev.modele.photo_url.length - 1 : prev.photoIndex - 1
                      }));
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-3xl font-bold hover:text-gray-300 bg-black bg-opacity-70 rounded-full w-12 h-12 flex items-center justify-center z-20"
                  >
                    ‹
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModelPhoto(prev => ({
                        ...prev,
                        photoIndex: prev.photoIndex === prev.modele.photo_url.length - 1 ? 0 : prev.photoIndex + 1
                      }));
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-3xl font-bold hover:text-gray-300 bg-black bg-opacity-70 rounded-full w-12 h-12 flex items-center justify-center z-20"
                  >
                    ›
                  </button>
                </>
              )}
              
              {/* Indicateur */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm z-20">
                {selectedModelPhoto.photoIndex + 1} / {selectedModelPhoto.modele.photo_url?.length}
              </div>
              
              {/* Titre du modèle */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm z-20">
                {selectedModelPhoto.modele.titre} - {selectedModelPhoto.modele.prix}€
              </div>
            </div>
          </div>
        )}

        {/* Avis avec statistiques détaillées */}
        <section className="w-full max-w-4xl mt-16">
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              ⭐ Avis clients {totalAvis > 0 && `(${totalAvis})`}
            </h2>
            
            {avis.length > 0 ? (
              <>
                {/* Résumé des notes */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-yellow-600">{avgRating}</div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${i < Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">sur {totalAvis} avis</div>
                    </div>
                  </div>
                  
                  {/* Distribution des notes */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = avis.filter(a => a.note === rating).length;
                      const percentage = totalAvis > 0 ? (count / totalAvis) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3 text-sm">
                          <span className="w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="w-8 text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-3">⭐</div>
                <p className="text-lg">Aucun avis pour cette annonce</p>
                <p className="text-sm mt-2">Soyez le premier à laisser un avis !</p>
              </div>
            )}
          </div>

          {/* Liste des avis */}
          <div className="space-y-6">
            {avis.map((a, i) => (
              <div key={i} className="rounded-xl shadow-sm bg-white border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {(a.particulier?.nom || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          {[...Array(5)].map((_, j) => (
                            <Star 
                              key={j} 
                              className={`w-4 h-4 ${j < a.note ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                          <span className="text-sm font-semibold text-slate-700">{a.note}/5</span>
                        </div>
                        <div className="text-sm font-medium text-slate-800">{a.particulier?.nom || "Utilisateur"}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed italic">"{a.commentaire}"</p>
                  </div>
                </div>
              </div>
            ))}
            
            {totalAvis > 3 && (
              <div className="text-center mt-8">
                <button 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
                  onClick={() => router.push(`/annonces/${annonceId}/avis`)}
                >
                  Voir tous les {totalAvis} avis →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Modal pour contacter */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-slate-800">Contacter {annonce.prestataire?.nom}</h2>
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Objet</label>
                    <input
                      type="text"
                      value={objet}
                      onChange={(e) => setObjet(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sujet de votre message"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={4}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Votre message..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Image (optionnel)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {sendError && (
                    <div className="text-red-600 text-sm">{sendError}</div>
                  )}
                  {sendSuccess && (
                    <div className="text-green-600 text-sm">Message envoyé avec succès !</div>
                  )}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowMessageModal(false)}
                      className="flex-1 border border-slate-300 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sending ? "Envoi..." : "Envoyer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Boutons d'action flottants */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {/* Bouton contact principal */}
          <button
            onClick={() => {
              if (isPreviewMode) return;
              setShowMessageModal(true);
            }}
            className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
              isPreviewMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
            }`}
            title="Contacter le prestataire"
          >
            💬
          </button>
          
          {/* Bouton favori/bookmark */}
          <button
            className={`bg-white text-red-500 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border ${
              isPreviewMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:bg-red-50'
            }`}
            title="Ajouter aux favoris"
          >
            ❤️
          </button>
          
          {/* Bouton partage rapide */}
          <button
            onClick={shareOnFacebook}
            className={`bg-white text-blue-600 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border ${
              isPreviewMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:bg-blue-50'
            }`}
            title="Partager"
          >
            📤
          </button>
          
          {/* Bouton retour en haut */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gray-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-gray-700"
            title="Retour en haut"
          >
            ⬆️
          </button>
        </div>

        {/* Overlay pour empêcher les clics en mode aperçu */}
        {isPreviewMode && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.02)',
            zIndex: 10,
            cursor: 'not-allowed',
            pointerEvents: 'auto'
          }} />
        )}
      </div>
    </>
  );
}
