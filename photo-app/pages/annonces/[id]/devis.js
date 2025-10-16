import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import Header from "../../../components/HeaderParti";

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
  const [availabilityStatus, setAvailabilityStatus] = useState(null); // 'available', 'unavailable', 'checking'
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [prestataireId, setPrestataireId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Vérifier la disponibilité quand date ou heure change
    if ((name === 'date' || name === 'heure') && prestataireId) {
      const newForm = { ...form, [name]: value };
      if (newForm.date && newForm.heure) {
        checkAvailability(newForm.date, newForm.heure, prestataireId);
      }
    }
  };

  // Récupérer l'ID du prestataire au chargement
  useEffect(() => {
    const fetchPrestataireId = async () => {
      if (annonceId) {
        const { data: annonce } = await supabase
          .from("annonces")
          .select("prestataire")
          .eq("id", annonceId)
          .single();
        if (annonce) {
          setPrestataireId(annonce.prestataire);
        }
      }
    };
    fetchPrestataireId();
  }, [annonceId]);

  // Fonction pour vérifier la disponibilité d'un créneau
  const checkAvailability = async (date, heure, prestataireId) => {
    if (!date || !heure || !prestataireId) return;

    setAvailabilityStatus('checking');
    setAlternativeSlots([]);

    try {
      const requestedDateTime = new Date(`${date}T${heure}:00`);
      const requestedDateTimeStr = requestedDateTime.toISOString();
      
      // Vérifier les réservations existantes
      const { data: existingReservations } = await supabase
        .from('reservations')
        .select('date, duree')
        .eq('prestataire_id', prestataireId)
        .neq('status', 'cancelled')
        .gte('date', requestedDateTimeStr)
        .lt('date', new Date(requestedDateTime.getTime() + 24 * 60 * 60 * 1000).toISOString());

      // Vérifier les créneaux bloqués
      const { data: blockedSlots } = await supabase
        .from('blocked_slots')
        .select('date')
        .eq('prestataire_id', prestataireId)
        .gte('date', requestedDateTimeStr)
        .lt('date', new Date(requestedDateTime.getTime() + 24 * 60 * 60 * 1000).toISOString());

      const duration = parseInt(form.duree) || 2; // Durée par défaut 2h
      const requestedEndTime = new Date(requestedDateTime.getTime() + duration * 60 * 60 * 1000);

      let isAvailable = true;

      // Vérifier les conflits avec les réservations
      if (existingReservations) {
        for (const reservation of existingReservations) {
          const resStart = new Date(reservation.date);
          const resEnd = new Date(resStart.getTime() + (reservation.duree || 120) * 60 * 1000);
          
          // Vérifier le chevauchement
          if (requestedDateTime < resEnd && requestedEndTime > resStart) {
            isAvailable = false;
            break;
          }
        }
      }

      // Vérifier les conflits avec les créneaux bloqués
      if (isAvailable && blockedSlots) {
        for (const blocked of blockedSlots) {
          const blockedTime = new Date(blocked.date);
          const blockedEnd = new Date(blockedTime.getTime() + 60 * 60 * 1000); // 1h par défaut
          
          if (requestedDateTime < blockedEnd && requestedEndTime > blockedTime) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        setAvailabilityStatus('available');
      } else {
        setAvailabilityStatus('unavailable');
        await findAlternativeSlots(date, prestataireId, duration);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      setAvailabilityStatus(null);
    }
  };

  // Fonction pour trouver des créneaux alternatifs
  const findAlternativeSlots = async (selectedDate, prestataireId, duration) => {
    try {
      const alternatives = [];
      const baseDate = new Date(selectedDate);
      
      // Chercher sur 7 jours à partir de la date sélectionnée
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(baseDate.getDate() + dayOffset);
        
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // Heures d'ouverture : 8h à 20h
        for (let hour = 8; hour <= 20 - duration; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          const dateTimeStr = `${dateStr}T${timeStr}:00`;
          const dateTime = new Date(dateTimeStr);
          const endTime = new Date(dateTime.getTime() + duration * 60 * 60 * 1000);
          
          // Vérifier si ce créneau est libre
          const { data: conflicts } = await supabase
            .from('reservations')
            .select('date, duree')
            .eq('prestataire_id', prestataireId)
            .neq('status', 'cancelled')
            .gte('date', dateTimeStr)
            .lt('date', endTime.toISOString());

          const { data: blocked } = await supabase
            .from('blocked_slots')
            .select('date')
            .eq('prestataire_id', prestataireId)
            .gte('date', dateTimeStr)
            .lt('date', endTime.toISOString());

          if ((!conflicts || conflicts.length === 0) && (!blocked || blocked.length === 0)) {
            alternatives.push({
              date: dateStr,
              heure: timeStr,
              dateTime: dateTime,
              formatted: dateTime.toLocaleString('fr-FR', {
                weekday: 'long',
                day: 'numeric', 
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })
            });
            
            if (alternatives.length >= 3) break; // Limiter à 3 suggestions
          }
        }
        
        if (alternatives.length >= 3) break;
      }
      
      setAlternativeSlots(alternatives);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'alternatives:', error);
    }
  };

  // Fonction pour sélectionner un créneau alternatif
  const selectAlternativeSlot = (slot) => {
    setForm({ ...form, date: slot.date, heure: slot.heure });
    setAvailabilityStatus('available');
    setAlternativeSlots([]);
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
    <>  
      <Header />
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

        {/* Date et heure avec vérification de disponibilité */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2">Date souhaitée</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-2">Heure souhaitée</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="time"
                  name="heure"
                  value={form.heure}
                  onChange={handleChange}
                  min="08:00"
                  max="20:00"
                  className="w-full border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Statut de disponibilité */}
          {availabilityStatus && (
            <div className="mt-4">
              {availabilityStatus === 'checking' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-blue-700 text-sm">Vérification de la disponibilité...</span>
                </div>
              )}
              
              {availabilityStatus === 'available' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">✅ Créneau disponible !</span>
                </div>
              )}
              
              {availabilityStatus === 'unavailable' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-medium">❌ Créneau non disponible</span>
                  </div>
                  
                  {alternativeSlots.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-3">💡 Créneaux alternatifs disponibles :</h4>
                      <div className="space-y-2">
                        {alternativeSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectAlternativeSlot(slot)}
                            className="w-full text-left p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50 hover:border-yellow-400 transition-colors"
                          >
                            <div className="font-medium text-gray-800">{slot.formatted}</div>
                            <div className="text-sm text-gray-600">Cliquez pour sélectionner ce créneau</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
          disabled={isUploading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking'}
          className={`px-6 py-3 rounded-lg w-full font-semibold transition-colors ${
            isUploading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking'
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-pink-600 text-white hover:bg-pink-700'
          }`}
        >
          {isUploading ? "Traitement des images..." :
           availabilityStatus === 'checking' ? "Vérification en cours..." :
           availabilityStatus === 'unavailable' ? "Créneau non disponible" :
           "Envoyer la demande de devis"}
        </button>
      </form>
    </div>
    </>
  );
}