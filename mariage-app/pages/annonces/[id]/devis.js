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
    photos: [], // Array pour stocker les photos en base64
  });
  
  const [photoPreviews, setPhotoPreviews] = useState([]); // Pour prévisualiser les photos
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    try {
      const base64Photos = [];
      const previews = [];
      
      for (const file of files) {
        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
          alert(`Le fichier ${file.name} n'est pas une image valide.`);
          continue;
        }
        
        // Vérifier la taille (max 5MB par image)
        if (file.size > 5 * 1024 * 1024) {
          alert(`L'image ${file.name} est trop volumineuse (max 5MB).`);
          continue;
        }
        
        // Convertir en base64
        const base64 = await convertToBase64(file);
        base64Photos.push(base64);
        
        // Créer une preview
        previews.push({
          name: file.name,
          url: URL.createObjectURL(file),
          base64: base64
        });
      }
      
      // Ajouter aux photos existantes (maximum 10 photos)
      const currentPhotos = form.photos || [];
      const newPhotos = [...currentPhotos, ...base64Photos];
      
      if (newPhotos.length > 10) {
        alert('Vous ne pouvez pas ajouter plus de 10 photos au total.');
        const allowedPhotos = base64Photos.slice(0, 10 - currentPhotos.length);
        const allowedPreviews = previews.slice(0, 10 - currentPhotos.length);
        
        setForm({ ...form, photos: [...currentPhotos, ...allowedPhotos] });
        setPhotoPreviews([...photoPreviews, ...allowedPreviews]);
      } else {
        setForm({ ...form, photos: newPhotos });
        setPhotoPreviews([...photoPreviews, ...previews]);
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement des images:', error);
      alert('Erreur lors du traitement des images.');
    } finally {
      setIsUploading(false);
      // Réinitialiser l'input file
      e.target.value = '';
    }
  };
  
  // Fonction pour convertir un fichier en base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Enlever le préfixe data:image/...;base64,
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };
  
  // Fonction pour supprimer une photo
  const removePhoto = (index) => {
    const newPhotos = form.photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    
    setForm({ ...form, photos: newPhotos });
    setPhotoPreviews(newPreviews);
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

    // Récupérer l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Vous devez être connecté pour envoyer un devis.");
      return;
    }

    // Envoi à la table devis
    const { error, data: devisData } = await supabase.from("devis").insert({
      annonce_id: annonceId,
      particulier_id: user.id,
      titre: form.titre,
      date: dateTime,
      duree: form.duree,
      endroit,
      participants: form.participants,
      comment_client: form.description,
      photos: form.photos.length > 0 ? form.photos : null, // Envoyer les photos en base64
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

        {/* Upload photos */}
        <div>
          <label className="block font-semibold mb-2">
            Ajouter des photos (inspirations, références) - Maximum 10 photos
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading || form.photos.length >= 10}
            className="w-full border rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 disabled:opacity-50"
          />
          {isUploading && (
            <p className="text-sm text-gray-500 mt-1">Traitement des images en cours...</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Formats acceptés: JPG, PNG, GIF • Taille max: 5MB par image • {form.photos.length}/10 photos
          </p>
        </div>

        {/* Prévisualisation des photos */}
        {photoPreviews.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Photos ajoutées ({photoPreviews.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview.url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-pink-300 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    title="Supprimer cette photo"
                  >
                    ×
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate" title={preview.name}>
                    {preview.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton */}
        <button
          type="submit"
          disabled={isUploading}
          className="bg-pink-600 text-white px-6 py-2 rounded-lg w-full hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-wait transition-colors"
        >
          {isUploading ? "Traitement des images..." : "Envoyer la demande"}
        </button>
      </form>
    </div>
  );
}