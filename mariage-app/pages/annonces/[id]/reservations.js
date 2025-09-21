import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";

export default function ReservationPage() {
  const router = useRouter();
  const annonceId = router.query.id;
  const [form, setForm] = useState({
    date: "",
    heure: "",
    duree: "",
    lieu: "",
    ville: "",
    participants: "",
    commentaire: "",
    fichier: null,
  });
  const [annonce, setAnnonce] = useState(null);
  const [tarifUnitaire, setTarifUnitaire] = useState(0);
  const [unitTarif, setUnitTarif] = useState("");
  const [prixFixe, setPrixFixe] = useState(true);
  const [devisTarif, setDevisTarif] = useState(null);
  const [acomptePercent, setAcomptePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState({ nom: "", email: "" });
  const [prestataireId, setPrestataireId] = useState("");
  const [particulierId, setParticulierId] = useState("");

  // Récupère l'annonce et le tarif
  useEffect(() => {
    async function fetchAnnonce() {
      if (!annonceId) return;
      setLoading(true);
      const { data: annonceData } = await supabase
        .from("annonces")
        .select("id, prix_fixe, tarif_unit, unit_tarif, acompte_percent, prestataire")
        .eq("id", annonceId)
        .single();
      setAnnonce(annonceData);
      setPrixFixe(!!annonceData?.prix_fixe);
      setTarifUnitaire(annonceData?.tarif_unit || 0);
      setUnitTarif(annonceData?.unit_tarif || "");
      setAcomptePercent(Number(annonceData?.acompte_percent || 0));
      setPrestataireId(annonceData?.prestataire || "");
      setLoading(false);

      // Si pas prix fixe, récupère le devis lié
      if (!annonceData?.prix_fixe) {
        const { data: devisData } = await supabase
          .from("devis")
          .select("id, tarif_unit")
          .eq("annonce_id", annonceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        setDevisTarif(devisData?.tarif_unit || 0);
        setTarifUnitaire(devisData?.tarif_unit || 0);
      }
      // Récupère infos client (particulier)
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      setParticulierId(userId || "");
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nom, prenom, email")
          .eq("id", userId)
          .single();
        setClient({
          nom: [profile?.nom, profile?.prenom].filter(Boolean).join(" ") || "",
          email: profile?.email || ""
        });
      }
    }
    fetchAnnonce();
  }, [annonceId]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "client_nom" || name === "client_email") {
      setClient({ ...client, [name === "client_nom" ? "nom" : "email"]: value });
    } else {
      setForm({
        ...form,
        [name]: files ? files[0] : value,
      });
    }
  };

  // Envoi du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Upload fichier si présent
    let fichierUrl = null;
    if (form.fichier) {
      const fileExt = form.fichier.name.split(".").pop();
      const fileName = `${Date.now()}_${annonceId}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from("reservations-fichiers")
        .upload(fileName, form.fichier);
      if (!uploadError && data) {
        const { publicUrl } = supabase.storage
          .from("reservations-fichiers")
          .getPublicUrl(data.path);
        fichierUrl = publicUrl;
      }
    }

    // Formatage date+heure en timestampz
    const dateTime = form.date && form.heure
      ? new Date(`${form.date}T${form.heure}:00`).toISOString()
      : null;

    // Assemblage adresse
    const endroit = [form.lieu, form.ville].filter(Boolean).join(", ");

    // Calcul montant total et acompte
    const montant = Number(form.duree) * Number(tarifUnitaire);
    const montant_acompte = Math.round(montant * (acomptePercent / 100));

    // Insertion dans reservations
    const { error: insertError } = await supabase
      .from("reservations")
      .insert({
        annonce_id: annonceId,
        date: dateTime,
        duree: form.duree,
        unit_tarif: unitTarif,
        endroit,
        participants: form.participants,
        commentaire: form.commentaire,
        photos: fichierUrl ? [fichierUrl] : [],
        tarif_unit: tarifUnitaire,
        client_nom: client.nom,
        client_email: client.email,
        prestataire_id: prestataireId,
        particulier_id: particulierId,
        montant,
        montant_acompte,
      });

    if (insertError) {
      setError("Erreur lors de la réservation : " + insertError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/annonces/${annonceId}`), 1500);
    }
  };

  // Calcul total et acompte
  const total = Number(form.duree) * Number(tarifUnitaire);
  const montant_acompte = Math.round(total * (acomptePercent / 100));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
        {/* Formulaire réservation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Réserver une prestation
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date et heure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  name="heure"
                  value={form.heure}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Durée */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-gray-700 mb-2">Durée (heures)</label>
                <input
                  type="number"
                  name="duree"
                  value={form.duree}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 3"
                  required
                />
              </div>
              <div className="ml-2 text-gray-500 text-sm">
                {unitTarif && <>Unité : <span className="font-semibold">{unitTarif}</span></>}
              </div>
            </div>

            {/* Lieu et ville */}
            <div>
              <label className="block text-gray-700 mb-2">Adresse du lieu</label>
              <input
                type="text"
                name="lieu"
                value={form.lieu}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ex: Rue Mohammed V"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Ville</label>
              <input
                type="text"
                name="ville"
                value={form.ville}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-gray-700 mb-2">Nombre de participants</label>
              <input
                type="number"
                name="participants"
                value={form.participants}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 mb-2">Décrivez votre demande</label>
              <textarea
                name="commentaire"
                value={form.commentaire}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
                rows="4"
                placeholder="Expliquez vos besoins pour l'artiste..."
                required
              />
            </div>

            {/* Fichier optionnel */}
            <div>
              <label className="block text-gray-700 mb-2">Fichier (optionnel)</label>
              <input
                type="file"
                name="fichier"
                onChange={handleChange}
                className="w-full"
              />
            </div>

            {/* Bouton */}
            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-lg shadow-md transition"
              disabled={loading}
            >
              Confirmer la réservation
            </button>
            {error && <div className="text-red-500 mt-2">{error}</div>}
            {success && <div className="text-green-600 mt-2">Réservation envoyée !</div>}
          </form>
        </div>

        {/* Partie informations client + tarif à droite */}
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full md:w-96 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Informations client</h2>
          {loading ? (
            <div className="text-gray-400">Chargement...</div>
          ) : (
            <>
              <div className="mb-2">
                <label className="block text-gray-700 mb-1">Nom et prénom</label>
                <input
                  type="text"
                  name="client_nom"
                  value={client.nom}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 mb-2"
                  required
                />
              </div>
              <div className="mb-2">
                <label className="block text-gray-700 mb-1">Adresse email</label>
                <input
                  type="email"
                  name="client_email"
                  value={client.email}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 mb-2"
                  required
                />
              </div>
              <hr className="my-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-4">Tarif proposé</h2>
              <div className="mb-2">
                <span className="font-semibold">Prix unitaire :</span>{" "}
                <span className="text-pink-600 font-bold">
                  {tarifUnitaire} MAD
                </span>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Durée souhaitée :</span>{" "}
                <span>{form.duree || "-"} {unitTarif}</span>
              </div>
              <div className="mb-2 font-bold">
                Total :{" "}
                <span className="text-pink-600">
                  {form.duree ? total : "-"} MAD
                </span>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Acompte à verser :</span>{" "}
                <span>{acomptePercent}%</span>
              </div>
              <div className="mb-2 font-bold">
                Montant acompte : <span className="text-pink-600">{form.duree ? montant_acompte : "-"} MAD</span>
              </div>
              {!prixFixe && (
                <div className="mt-4 text-sm text-gray-500">
                  <span>Tarif issu du devis</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}