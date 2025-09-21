import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";

export default function ReservationPage() {
  const router = useRouter();
  const annonceId = router.query.id;
  const reservationId = router.query.reservation_id;
  const [form, setForm] = useState({
    date: "",
    heure: "",
    duree: "",
    lieu: "",
    ville: "",
    participants: "",
    commentaire: "",
    fichiers: [], // <-- tableau de fichiers
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
  const [reservationMontant, setReservationMontant] = useState(null);
  const [reservationAcompte, setReservationAcompte] = useState(null);

  // Pour garder les valeurs initiales du client
  const initialClient = useRef({ nom: "", email: "" });

  // Si reservationId présent, charge la réservation existante
  useEffect(() => {
    async function fetchReservation() {
      if (!reservationId) return;
      setLoading(true);
      const { data: reservationData, error: reservationError } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();
      if (reservationData) {
        setForm({
          date: reservationData.date ? reservationData.date.split("T")[0] : "",
          heure: reservationData.date ? reservationData.date.split("T")[1]?.slice(0,5) : "",
          duree: reservationData.duree || "",
          lieu: reservationData.endroit?.split(",")[0] || "",
          ville: reservationData.endroit?.split(",")[1] || "",
          participants: reservationData.participants || "",
          commentaire: reservationData.commentaire || "",
          fichiers: [],
        });
        setTarifUnitaire(reservationData.tarif_unit || 0);
        setUnitTarif(reservationData.unit_tarif || "");
        setPrestataireId(reservationData.prestataire_id || "");
        setParticulierId(reservationData.particulier_id || "");
        // On garde les valeurs initiales
        initialClient.current = {
          nom: reservationData.client_nom || "",
          email: reservationData.client_email || ""
        };
        setClient({
          nom: reservationData.client_nom || "",
          email: reservationData.client_email || ""
        });
        setReservationMontant(reservationData.montant || null);
        setReservationAcompte(reservationData.montant_acompte || null);
      }
      setLoading(false);
    }
    fetchReservation();
  }, [reservationId]);

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
      setTarifUnitaire(annonceData?.tarif_unit || tarifUnitaire);
      setUnitTarif(annonceData?.unit_tarif || unitTarif);
      setAcomptePercent(Number(annonceData?.acompte_percent || acomptePercent));
      setPrestataireId(annonceData?.prestataire || prestataireId);
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
        setTarifUnitaire(devisData?.tarif_unit || tarifUnitaire);
      }
      // Récupère infos client (particulier) si pas déjà chargé
      if (!initialClient.current.nom || !initialClient.current.email) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        setParticulierId(userId || particulierId);
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("nom, prenom, email")
            .eq("id", userId)
            .single();
          initialClient.current = {
            nom: [profile?.nom, profile?.prenom].filter(Boolean).join(" ") || "",
            email: profile?.email || ""
          };
          setClient({
            nom: [profile?.nom, profile?.prenom].filter(Boolean).join(" ") || "",
            email: profile?.email || ""
          });
        }
      }
    }
    fetchAnnonce();
  }, [annonceId]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "client_nom" || name === "client_email") {
      setClient({ ...client, [name === "client_nom" ? "nom" : "email"]: value });
    } else if (name === "fichiers") {
      setForm({
        ...form,
        fichiers: files ? Array.from(files) : [],
      });
    } else {
      setForm({
        ...form,
        [name]: value,
      });
    }
  };

  // Envoi du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Encodage des fichiers en base64 si présents
    let photosArray = [];
    if (form.fichiers && form.fichiers.length > 0) {
      const toBase64 = file =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = error => reject(error);
        });
      try {
        photosArray = await Promise.all(form.fichiers.map(file => toBase64(file)));
      } catch (err) {
        setError("Erreur lors de l'encodage des fichiers : " + err.message);
        return;
      }
    }

    // Formatage date+heure en timestampz
    const dateTime = form.date && form.heure
      ? new Date(`${form.date}T${form.heure}:00`).toISOString()
      : null;

    // Assemblage adresse
    const endroit = [form.lieu, form.ville].filter(Boolean).join(", ");

    // Calcul montant total et acompte (si prix fixe)
    const montant = prixFixe
      ? Number(form.duree) * Number(tarifUnitaire)
      : reservationMontant !== null
        ? reservationMontant
        : 0;
    const montant_acompte = prixFixe
      ? Math.round(montant * (acomptePercent / 100))
      : reservationAcompte !== null
        ? reservationAcompte
        : 0;

    // Mise à jour de la réservation existante si reservationId présent
    let insertError = null;
    if (reservationId) {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          annonce_id: annonceId,
          date: dateTime,
          duree: form.duree,
          unit_tarif: unitTarif,
          endroit,
          participants: form.participants,
          commentaire: form.commentaire,
          photos: photosArray, // <-- tableau base64
          tarif_unit: tarifUnitaire,
          client_nom: client.nom,
          client_email: client.email,
          prestataire_id: prestataireId,
          particulier_id: particulierId,
          montant,
          montant_acompte,
        })
        .eq("id", reservationId);
      insertError = updateError;
    } else {
      // Insertion dans reservations si pas d'id
      const { error: newInsertError } = await supabase
        .from("reservations")
        .insert({
          annonce_id: annonceId,
          date: dateTime,
          duree: form.duree,
          unit_tarif: unitTarif,
          endroit,
          participants: form.participants,
          commentaire: form.commentaire,
          photos: photosArray, // <-- tableau base64
          tarif_unit: tarifUnitaire,
          client_nom: client.nom,
          client_email: client.email,
          prestataire_id: prestataireId,
          particulier_id: particulierId,
          montant,
          montant_acompte,
        });
      insertError = newInsertError;
    }

    if (insertError) {
      setError("Erreur lors de la réservation : " + insertError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/annonces/${annonceId}`), 1500);
    }
  };

  // Calcul total et acompte pour affichage
  const total = prixFixe
    ? Number(form.duree) * Number(tarifUnitaire)
    : reservationMontant !== null
      ? reservationMontant
      : "-";
  const montant_acompte_affichage = prixFixe
    ? Math.round(total * (acomptePercent / 100))
    : reservationAcompte !== null
      ? reservationAcompte
      : "-";

  // Correction : garder le nom/email affichés même si pas modifiés
  const displayedNom = client.nom || initialClient.current.nom;
  const displayedEmail = client.email || initialClient.current.email;

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
                <label className="block text-gray-700 mb-2">Durée </label>
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
              <label className="block text-gray-700 mb-2">Fichiers (optionnel, plusieurs possibles)</label>
              <input
                type="file"
                name="fichiers"
                multiple
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
                  value={displayedNom}
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
                  value={displayedEmail}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 mb-2"
                  required
                />
              </div>
              <hr className="my-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-4">Tarif proposé</h2>
              {prixFixe ? (
                <>
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
                      {total} MAD
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Acompte à verser :</span>{" "}
                    <span>{acomptePercent}%</span>
                  </div>
                  <div className="mb-2 font-bold">
                    Montant acompte : <span className="text-pink-600">{montant_acompte_affichage} MAD</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="font-semibold">Durée souhaitée :</span>{" "}
                    <span>{form.duree || "-"} {unitTarif}</span>
                  </div>
                  <div className="mb-2 font-bold">
                    Total :{" "}
                    <span className="text-pink-600">
                      {total} MAD
                    </span>
                  </div>
                  <div className="mb-2 font-bold">
                    Montant acompte : <span className="text-pink-600">{montant_acompte_affichage} MAD</span>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    <span>Tarif issu du devis</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}