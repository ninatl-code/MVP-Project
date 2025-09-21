import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";

export default function DemandeDevisForm() {
  const router = useRouter();
  const annonceId = router.query.id;

  const [form, setForm] = useState({
    titre: "",
    description: "",
    date: "",
    heure: "",
    duree: "",
    lieu: "",
    ville: "",
    participants: "",
    fichiers: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, fichiers: [...e.target.files] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Formatage date+heure en timestampz
    const dateTime =
      form.date && form.heure
        ? new Date(`${form.date}T${form.heure}:00`).toISOString()
        : null;

    // Assemblage adresse
    const endroit = [form.lieu, form.ville].filter(Boolean).join(", ");

    // Récupérer le prestataire_id depuis l'annonce
    const { data: annonce } = await supabase
      .from("annonces")
      .select("prestataire")
      .eq("id", annonceId)
      .single();

    // Envoi à la table devis
    const { error, data: devisData } = await supabase.from("devis").insert({
      annonce_id: annonceId,
      titre: form.titre,
      date: dateTime,
      duree: form.duree,
      endroit,
      participants: form.participants,
      comment_client: form.description,
      // fichiers: à gérer si upload
      prestataire_id: annonce?.prestataire,
    });

    // Notification au prestataire
    if (annonce?.prestataire) {
      await supabase
        .from("notifications")
        .insert([{
          user_id: annonce.prestataire,
          type: "devis",
          contenu: "Vous avez reçu une nouvelle demande de devis",
          lu: false
        }]);
    }

    if (error) {
      alert("Erreur lors de l'envoi du devis : " + error.message);
    } else {
      alert("Votre demande de devis a été envoyée !");
      router.push(`/annonces/${annonceId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-2xl p-6 mt-10">
      <h1 className="text-2xl font-bold mb-4">Demander un devis</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titre */}
        <div>
          <label className="block font-semibold">Titre</label>
          <input
            type="text"
            name="titre"
            value={form.titre}
            onChange={handleChange}
            placeholder="Ex : Portrait personnalisé"
            className="w-full border rounded-lg p-2"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold">Décrivez votre demande</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Décrivez votre demande en détail..."
            className="w-full border rounded-lg p-2 h-24"
            required
          />
        </div>

        {/* Date et heure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold">Date souhaitée</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block font-semibold">Heure souhaitée</label>
            <input
              type="time"
              name="heure"
              value={form.heure}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        {/* Durée */}
        <div>
          <label className="block font-semibold">Durée (heures)</label>
          <input
            type="number"
            name="duree"
            value={form.duree}
            min="1"
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Lieu et ville */}
        <div>
          <label className="block font-semibold">Adresse du lieu</label>
          <input
            type="text"
            name="lieu"
            value={form.lieu}
            onChange={handleChange}
            placeholder="Ex : Rue Mohammed V"
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block font-semibold">Ville / Région</label>
          <input
            type="text"
            name="ville"
            value={form.ville}
            onChange={handleChange}
            placeholder="Ex : Casablanca"
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Participants */}
        <div>
          <label className="block font-semibold">Nombre de participants</label>
          <input
            type="number"
            name="participants"
            value={form.participants}
            min="1"
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Upload fichiers */}
        <div>
          <label className="block font-semibold">Ajouter des fichiers (photos, inspirations)</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full"
          />
        </div>

        {/* Bouton */}
        <button
          type="submit"
          className="bg-pink-600 text-white px-6 py-2 rounded-lg w-full"
        >
          Envoyer la demande
        </button>
      </form>
    </div>
  );
}