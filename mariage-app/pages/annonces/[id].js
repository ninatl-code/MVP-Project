import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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

  // Get annonce id from URL
  const annonceId = router.query.id;

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
      if (annonceData?.prestation) {
        const { data: prestationData } = await supabase
          .from("prestations")
          .select("type")
          .eq("id", annonceData.prestation)
          .single();
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
      <Header />
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6">
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
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2 rounded-xl flex items-center gap-2"
                  onClick={() => setShowMessageModal(true)}
                >
                  Contacter
                </button>
                
                {/* Bouton Voir le profil */}
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl flex items-center gap-2"
                  onClick={() => router.push(`/profil/${annonce.prestataire?.id}`)}
                >
                  <User className="w-4 h-4" />
                  Voir le profil
                </button>
                
                {/* Bouton dynamique selon type de prestation */}
                {prestationType === "produit" && (
                  <button
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl"
                    onClick={() => router.push("/annonces/"+ annonceId +"/commandes")}
                  >
                    Commander votre création
                  </button>
                )}
                {prestationType === "service" && annonce?.prix_fixe === true && (
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl"
                    onClick={() => router.push("/annonces/"+ annonceId + "/reservations")}
                  >
                    Réserver votre prestation
                  </button>
                )}
                {prestationType === "service" && annonce?.prix_fixe === false && (
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-xl"
                    onClick={() => router.push(`/annonces/${annonceId}/devis`)}
                  >
                    Faire un devis
                  </button>
                )}
                {isFavori ? (
                  <button
                    className="border border-pink-400 text-pink-600 px-6 py-2 rounded-xl hover:bg-pink-50"
                    onClick={handleRemoveFavori}
                    disabled={favorisLoading}
                  >
                    Retirer des favoris
                  </button>
                ) : (
                  <button
                    className="border border-slate-300 px-6 py-2 rounded-xl text-slate-700 hover:bg-slate-100"
                    onClick={handleAddFavori}
                    disabled={favorisLoading}
                  >
                    {favorisLoading ? "Ajout..." : "Ajouter aux favoris"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Galerie */}
        <section className="w-full max-w-4xl mt-12">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Mes créations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.isArray(annonce.photos)
              ? annonce.photos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Oeuvre ${i + 1}`}
                    className="rounded-xl shadow-md object-cover w-full h-64 cursor-pointer hover:opacity-90"
                  />
                ))
              : [
                  <img
                    key={0}
                    src="https://via.placeholder.com/400x300?text=Oeuvre+1"
                    alt="Oeuvre 1"
                    className="rounded-xl shadow-md object-cover w-full h-64 cursor-pointer hover:opacity-90"
                  />
                ]}
          </div>
        </section>

        {/* Avis */}
        <section className="w-full max-w-4xl mt-16">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Avis clients {totalAvis > 3 && `(${avis.length} sur ${totalAvis})`}</h2>
          <div className="space-y-6">
            {avis.length === 0 && (
              <div className="text-slate-400">Aucun avis pour cette annonce.</div>
            )}
            {avis.map((a, i) => (
              <div key={i} className="rounded-xl shadow-sm bg-white">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {[...Array(a.note)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-sm text-slate-600 ml-2">{a.note}/5</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">"{a.commentaire}"</p>
                  <p className="text-sm text-gray-500">— {a.particulier?.nom || "Utilisateur"}</p>
                </div>
              </div>
            ))}
            {totalAvis > 3 && (
              <div className="text-center mt-6">
                <button 
                  className="text-slate-600 hover:text-slate-800 underline"
                  onClick={() => router.push(`/annonces/${annonceId}/avis`)}
                >
                  Voir tous les {totalAvis} avis
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
      </div>
    </>
  );
}
