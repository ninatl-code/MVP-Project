import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";

export default function PasserCommande() {
  const [villes, setVilles] = useState([]);
  const [selectedVille, setSelectedVille] = useState("");
  const [modesLivraison, setModesLivraison] = useState([]);
  const [selectedModeLivraison, setSelectedModeLivraison] = useState("");
  const [fraisLivraison, setFraisLivraison] = useState(0);
  const [delaiLivraison, setDelaiLivraison] = useState("");
  const [modeles, setModeles] = useState([]);
  const [commandeModeles, setCommandeModeles] = useState([
    { modeleId: "", quantite: 1, prix: 0, commentaire: "", imageFile: null }
  ]);
  const [adresse, setAdresse] = useState("");
  const [user, setUser] = useState(null);
  const [prestataireId, setPrestataireId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [status] = useState("pending");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const annonceId = router.query.id;

  // Récupère la liste des villes
  useEffect(() => {
    async function fetchVilles() {
      const { data } = await supabase.from("villes").select("id, ville");
      setVilles(data || []);
    }
    fetchVilles();
  }, []);

  // Récupère les modèles liés à l'annonce
  useEffect(() => {
    async function fetchModeles() {
      if (!annonceId) return;
      const { data } = await supabase
        .from("modeles")
        .select("id, titre")
        .eq("annonce_id", annonceId);
      setModeles(data || []);
    }
    fetchModeles();
  }, [annonceId]);

  // Met à jour le prix pour chaque modèle sélectionné
  useEffect(() => {
    async function updatePrixModeles() {
      const updated = await Promise.all(
        commandeModeles.map(async (cm) => {
          if (!cm.modeleId) return { ...cm, prix: 0 };
          const { data } = await supabase
            .from("modeles")
            .select("prix")
            .eq("id", cm.modeleId)
            .single();
          return { ...cm, prix: data?.prix || 0 };
        })
      );
      setCommandeModeles(updated);
    }
    updatePrixModeles();
    // eslint-disable-next-line
  }, [commandeModeles.map((cm) => cm.modeleId).join(",")]);

  // Récupère les modes de livraison selon ville et annonce
  useEffect(() => {
    async function fetchModesLivraison() {
      if (!selectedVille || !annonceId) {
        setModesLivraison([]);
        return;
      }
      const { data } = await supabase
        .from("livraisons_annonces")
        .select("mode")
        .eq("annonce_id", annonceId)
        .eq("ville_id", selectedVille);
      setModesLivraison(data ? data.map((l) => l.mode) : []);
    }
    fetchModesLivraison();
  }, [selectedVille, annonceId]);

  // Récupère frais et délai selon mode et ville
  useEffect(() => {
    async function fetchFraisDelai() {
      if (!selectedVille || !selectedModeLivraison) {
        setFraisLivraison(0);
        setDelaiLivraison("");
        return;
      }
      const { data } = await supabase
        .from("livraisons_annonces")
        .select("prix, delai")
        .eq("ville_id", selectedVille)
        .eq("mode", selectedModeLivraison)
        .single();
      setFraisLivraison(data?.prix || 0);
      setDelaiLivraison(data?.delai || "");
    }
    fetchFraisDelai();
  }, [selectedVille, selectedModeLivraison]);

  // Récupère infos utilisateur et prestataire
  useEffect(() => {
    async function fetchUserAndAnnonce() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setClientNom(user?.user_metadata?.nom || "");
      setClientEmail(user?.email || "");
      if (annonceId) {
        const { data: annonce } = await supabase
          .from("annonces")
          .select("prestataire")
          .eq("id", annonceId)
          .single();
        setPrestataireId(annonce?.prestataire || "");
      }
    }
    fetchUserAndAnnonce();
  }, [annonceId]);

  // Upload image pour chaque modèle
  const handleImageUpload = async (imageFile, idx) => {
    if (!imageFile) return "";
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}_${user.id}_${idx}.${fileExt}`;
    const { data, error: uploadError } = await supabase.storage
      .from("commandes-images")
      .upload(fileName, imageFile);
    if (!uploadError && data) {
      const { publicUrl } = supabase.storage
        .from("commandes-images")
        .getPublicUrl(data.path);
      return publicUrl;
    }
    return "";
  };

  // Nouvelle fonction pour paiement Stripe
  const handleStripeCheckout = async (commandeId, montantTotal) => {
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annonce_id: annonceId,
          montant_acompte: montantTotal, // ou le montant de l'acompte si tu en as un
          user_id: user.id,
          email: clientEmail,
          commande_id: commandeId, // ✅ AJOUT : passer l'ID de la commande
        }),
      });
      const data = await res.json();
      if (data.session && data.session.url) {
        window.location.href = data.session.url;
      } else if (data.error) {
        setError(data.error); // Affiche le message explicite renvoyé par l'API
      } else {
        setError("Erreur lors de la création du paiement Stripe.");
      }
    } catch (err) {
      setError("Erreur réseau lors de la création du paiement Stripe.");
    }
  };

  // Envoi commande multi-modèles
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess(false);

    const uploads = await Promise.all(
      commandeModeles.map((cm, idx) => handleImageUpload(cm.imageFile, idx))
    );

    const montantTotal =
      commandeModeles.reduce((sum, cm) => sum + cm.prix * cm.quantite, 0) +
      fraisLivraison;

    const modelesCommande = commandeModeles.map((cm, idx) => ({
      modele_id: cm.modeleId,
      quantite: cm.quantite,
      prix: cm.prix,
      commentaire: cm.commentaire,
      photo: uploads[idx]
    }));

    // 1. Créer la commande et récupérer son id
    const { data: commandeData, error: insertError } = await supabase
      .from("commandes")
      .insert({
        particulier_id: user?.id,
        prestataire_id: prestataireId,
        montant: montantTotal,
        status,
        client_nom: clientNom,
        client_email: clientEmail,
        annonce_id: annonceId,
        adresse_livraison: adresse + selectedVille,
        mode_livraison: selectedModeLivraison,
        frais_livraison: fraisLivraison
      })
      .select();

    if (insertError || !commandeData || !commandeData[0]?.id) {
      setSending(false);
      setError(
        "Erreur lors de la commande : " +
          (insertError?.message || JSON.stringify(insertError))
      );
      return;
    }
    const commandeId = commandeData[0].id;

    // 2. Insérer chaque modèle dans commande_modeles
    const modelesRows = commandeModeles.map((cm, idx) => ({
      commande_id: commandeId,
      modele_id: cm.modeleId,
      quantite: cm.quantite,
      prix_unitaire: cm.prix,
      message_client: cm.commentaire,
      photo_client: uploads[idx]
    }));
    const { error: modelesError } = await supabase
      .from("commande_modeles")
      .insert(modelesRows);

    setSending(false);
    if (modelesError) {
      setError(
        "Erreur lors de l'ajout des modèles : " +
          (modelesError.message || JSON.stringify(modelesError))
      );
      return;
    }
    setSuccess(true);

    // Appel Stripe checkout et redirection
    await handleStripeCheckout(commandeId, montantTotal);
    // Ne pas faire de setTimeout/redirect ici, la redirection Stripe prend le relais
  };

  const getModeleTitre = (id) =>
    modeles.find((m) => m.id === id)?.titre || "-";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6">
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Formulaire commande */}
        <form
          className="bg-white rounded-2xl shadow-md p-8 flex-1"
          onSubmit={handleSubmit}
        >
          <h2 className="text-2xl font-bold mb-6">Vos modèles</h2>
          {commandeModeles.map((cm, idx) => (
            <div key={idx} className="mb-6 p-4 rounded-xl border bg-slate-50">
              <div className="mb-2 font-semibold">Modèle {idx + 1}</div>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={1}
                  className="w-1/3 border rounded-xl px-4 py-2 text-sm"
                  value={cm.quantite}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setCommandeModeles((arr) =>
                      arr.map((m, i) =>
                        i === idx ? { ...m, quantite: val } : m
                      )
                    );
                  }}
                  required
                  placeholder="Quantité"
                />
                <select
                  className="w-2/3 border rounded-xl px-4 py-2 text-sm"
                  value={cm.modeleId}
                  onChange={(e) => {
                    setCommandeModeles((arr) =>
                      arr.map((m, i) =>
                        i === idx ? { ...m, modeleId: e.target.value } : m
                      )
                    );
                  }}
                  required
                >
                  <option value="">-- Sélectionner --</option>
                  {modeles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  className="w-1/3 border rounded-xl px-4 py-2 text-sm"
                  value={cm.prix}
                  readOnly
                  placeholder="Prix"
                />
              </div>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-2 text-sm mb-2"
                placeholder="Message au vendeur"
                value={cm.commentaire}
                onChange={(e) =>
                  setCommandeModeles((arr) =>
                    arr.map((m, i) =>
                      i === idx ? { ...m, commentaire: e.target.value } : m
                    )
                  )
                }
              />
              <input
                type="file"
                className="text-sm text-slate-500 mb-2"
                onChange={(e) =>
                  setCommandeModeles((arr) =>
                    arr.map((m, i) =>
                      i === idx
                        ? { ...m, imageFile: e.target.files[0] }
                        : m
                    )
                  )
                }
              />
              {commandeModeles.length > 1 && (
                <button
                  type="button"
                  className="text-red-500 text-lg"
                  onClick={() =>
                    setCommandeModeles((arr) =>
                      arr.filter((_, i) => i !== idx)
                    )
                  }
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-xl mb-6"
            onClick={() =>
              setCommandeModeles((arr) => [
                ...arr,
                {
                  modeleId: "",
                  quantite: 1,
                  prix: 0,
                  commentaire: "",
                  imageFile: null
                }
              ])
            }
          >
            + Ajouter un modèle
          </button>

          {/* Livraison */}
          <h2 className="text-xl font-bold mb-4">Livraison</h2>
          <input
            type="text"
            className="w-full border rounded-xl px-4 py-2 text-sm mb-4"
            placeholder="Adresse de livraison"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            required
          />
          <div className="flex gap-4 mb-4">
            <select
              className="w-1/2 border rounded-xl px-4 py-2 text-sm"
              value={selectedVille}
              onChange={(e) => {
                setSelectedVille(e.target.value);
                setSelectedModeLivraison("");
              }}
              required
            >
              <option value="">Ville</option>
              {villes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ville}
                </option>
              ))}
            </select>
            <select
              className="w-1/2 border rounded-xl px-4 py-2 text-sm"
              value={selectedModeLivraison}
              onChange={(e) => setSelectedModeLivraison(e.target.value)}
              required
              disabled={!selectedVille}
            >
              <option value="">Mode de livraison</option>
              {modesLivraison.map((mode, i) => (
                <option key={i} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
          {success && (
            <div className="text-green-600 mb-2 text-sm">
              Commande envoyée !
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl mt-4"
            disabled={sending}
          >
            {sending ? "Envoi..." : "Confirmer ma commande"}
          </button>
        </form>

        {/* Aperçu commande */}
        <div className="bg-white rounded-2xl shadow-md p-8 w-full md:w-96">
          <h2 className="text-xl font-bold mb-6">Récapitulatif</h2>
          {commandeModeles.map((cm, idx) => (
            <div key={idx} className="mb-2">
              {cm.quantite} × {getModeleTitre(cm.modeleId)} →{" "}
              {cm.quantite * cm.prix} MAD
            </div>
          ))}
          <div className="mb-2">
            Frais de livraison :{" "}
            <span className="font-semibold">{fraisLivraison} MAD</span>
          </div>
          <div className="mb-2 font-bold">
            Total :{" "}
            {commandeModeles.reduce(
              (sum, cm) => sum + cm.prix * cm.quantite,
              0
            ) + fraisLivraison}{" "}
            MAD
          </div>
          <div className="mb-2">
            Adresse : <span className="font-semibold">{adresse || "-"}</span>
          </div>
          <div className="mb-2">
            Ville :{" "}
            <span className="font-semibold">
              {villes.find((v) => v.id === selectedVille)?.ville || "-"}
            </span>
          </div>
          <div className="mb-2">
            Mode de livraison :{" "}
            <span className="font-semibold">
              {selectedModeLivraison || "-"}
            </span>
          </div>
          <div className="mb-2">
            Délais de livraison :{" "}
            <span className="font-semibold">
              {delaiLivraison || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
