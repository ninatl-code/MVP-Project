import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";
import { Calendar, Clock, AlertTriangle, CheckCircle, MapPin } from "lucide-react";
import Header from "../../../components/HeaderParti";

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
    photos: [], // Array pour stocker les photos en base64
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
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState([]); // Pour prévisualiser les photos
  const [isUploading, setIsUploading] = useState(false);
  const [zonesIntervention, setZonesIntervention] = useState([]); // Zones d'intervention de l'annonce
  const [addressValidation, setAddressValidation] = useState(null); // 'valid', 'invalid', null

  // Pour garder les valeurs initiales du client
  const initialClient = useRef({ nom: "", email: "" });
  const addressInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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
        .select("id, prix_fixe, tarif_unit, unit_tarif, acompte_percent, prestataire, nb_heure")
        .eq("id", annonceId)
        .single();
      setAnnonce(annonceData);
      setPrixFixe(!!annonceData?.prix_fixe);
      setTarifUnitaire(annonceData?.tarif_unit || tarifUnitaire);
      setUnitTarif(annonceData?.unit_tarif || unitTarif);
      setAcomptePercent(Number(annonceData?.acompte_percent || acomptePercent));
      const newPrestataireId = annonceData?.prestataire || prestataireId;
      setPrestataireId(newPrestataireId);
      
      // Initialiser automatiquement la durée selon l'unité tarifaire
      if (annonceData?.unit_tarif && !reservationId) {
        const unit = annonceData.unit_tarif;
        if (unit === 'seance' || unit === 'forfait') {
          // Pour séance/forfait, utiliser nb_heure de l'annonce
          setForm(prev => ({ ...prev, duree: annonceData.nb_heure?.toString() || "1" }));
        } else if (unit === 'demi_journee') {
          // Pour demi-journée, 4 heures
          setForm(prev => ({ ...prev, duree: "4" }));
        } else if (unit === 'jour') {
          // Pour jour, 8 heures
          setForm(prev => ({ ...prev, duree: "8" }));
        }
      }
      
      // Charger les zones d'intervention de l'annonce
      const { data: zonesData } = await supabase
        .from("zones_intervention")
        .select("ville_centre, rayon_km, active")
        .eq("annonce_id", annonceId)
        .eq("active", true);
      setZonesIntervention(zonesData || []);
      
      setLoading(false);
      
      // Vérifier la disponibilité si on a déjà une date/heure (cas modification)
      if (form.date && form.heure && form.duree && newPrestataireId) {
        checkAvailability(form.date, form.heure, form.duree, newPrestataireId);
      }

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
    const { name, value } = e.target;
    if (name === "client_nom" || name === "client_email") {
      setClient({ ...client, [name === "client_nom" ? "nom" : "email"]: value });
    } else {
      const newForm = { ...form, [name]: value };
      setForm(newForm);
      
      // Vérifier la disponibilité quand date, heure ou durée change
      if ((name === 'date' || name === 'heure' || name === 'duree') && prestataireId) {
        if (newForm.date && newForm.heure && newForm.duree) {
          checkAvailability(newForm.date, newForm.heure, newForm.duree, prestataireId);
        }
      }

      // Recherche d'adresse instantanée dès la première lettre (style Airbnb)
      if (name === 'lieu') {
        // Annuler la recherche précédente
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        if (value.length >= 1) {
          // Afficher immédiatement le loader
          setIsLoadingAddress(true);
          setShowSuggestions(true);
          setAddressValidation(null); // Reset validation
          
          // Délai très court (200ms) pour éviter trop de requêtes tout en restant réactif
          searchTimeoutRef.current = setTimeout(() => {
            searchAddress(value);
          }, 200);
        } else {
          setShowSuggestions(false);
          setAddressSuggestions([]);
          setIsLoadingAddress(false);
          setAddressValidation(null);
        }
      }
    }
  };

  // Fonction pour rechercher des adresses via notre API route
  const searchAddress = async (query) => {
    if (!query || query.length < 1) return;
    
    setIsLoadingAddress(true);
    try {
      // Appeler notre API route Next.js pour éviter les problèmes CORS
      const response = await fetch(
        `/api/search-address?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }
      
      const data = await response.json();
      setAddressSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      // Fallback silencieux : désactiver les suggestions sans perturber l'utilisateur
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Sélectionner une adresse suggérée
  const selectAddress = (place) => {
    const address = place.address || {};
    
    // Construire l'adresse sans la ville
    const addressParts = [];
    if (address.road) addressParts.push(address.road);
    if (address.house_number) addressParts.unshift(address.house_number);
    if (address.suburb) addressParts.push(address.suburb);
    
    const streetAddress = addressParts.join(' ') || place.display_name.split(',')[0];
    
    // Extraire la ville
    const city = address.city || address.town || address.village || address.municipality || '';
    
    setForm({
      ...form,
      lieu: streetAddress,
      ville: city
    });
    
    setShowSuggestions(false);
    setAddressSuggestions([]);
    
    // Vérifier si la ville est dans les zones d'intervention
    checkAddressInZones(city);
  };

  // Fonction pour vérifier si l'adresse est dans les zones d'intervention
  const checkAddressInZones = (selectedCity) => {
    if (!selectedCity || zonesIntervention.length === 0) {
      setAddressValidation(null);
      return;
    }

    // Normaliser la ville sélectionnée (enlever accents, minuscules)
    const normalizeString = (str) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    const normalizedSelectedCity = normalizeString(selectedCity);

    // Vérifier si la ville correspond à une zone d'intervention
    const isInZone = zonesIntervention.some(zone => {
      const normalizedZoneCity = normalizeString(zone.ville_centre);
      return normalizedZoneCity === normalizedSelectedCity;
    });

    if (isInZone) {
      setAddressValidation('valid');
    } else {
      setAddressValidation('invalid');
    }
  };

  // Fonction pour vérifier la disponibilité d'un créneau
  const checkAvailability = async (date, heure, duree, prestataireId) => {
    if (!date || !heure || !duree || !prestataireId) return;

    setAvailabilityStatus('checking');
    setAlternativeSlots([]);

    try {
      const requestedDateTime = new Date(`${date}T${heure}:00`);
      const requestedDateTimeStr = requestedDateTime.toISOString();
      const duration = parseInt(duree) || 2;
      const requestedEndTime = new Date(requestedDateTime.getTime() + duration * 60 * 60 * 1000);
      
      // Vérifier les réservations existantes (exclure la réservation actuelle si modification)
      let query = supabase
        .from('reservations')
        .select('date, duree')
        .eq('prestataire_id', prestataireId)
        .neq('status', 'cancelled')
        .gte('date', requestedDateTimeStr)
        .lt('date', new Date(requestedDateTime.getTime() + 24 * 60 * 60 * 1000).toISOString());
      
      if (reservationId) {
        query = query.neq('id', reservationId);
      }
      
      const { data: existingReservations } = await query;

      // Vérifier les créneaux bloqués
      const { data: blockedSlots } = await supabase
        .from('blocked_slots')
        .select('date')
        .eq('prestataire_id', prestataireId)
        .gte('date', requestedDateTimeStr)
        .lt('date', new Date(requestedDateTime.getTime() + 24 * 60 * 60 * 1000).toISOString());

      let isAvailable = true;

      // Vérifier les conflits avec les réservations
      if (existingReservations) {
        for (const reservation of existingReservations) {
          const resStart = new Date(reservation.date);
          const resEnd = new Date(resStart.getTime() + (reservation.duree || 120) * 60 * 1000);
          
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
          const blockedEnd = new Date(blockedTime.getTime() + 60 * 60 * 1000);
          
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
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(baseDate.getDate() + dayOffset);
        
        const dateStr = checkDate.toISOString().split('T')[0];
        
        for (let hour = 8; hour <= 20 - duration; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          const dateTimeStr = `${dateStr}T${timeStr}:00`;
          const dateTime = new Date(dateTimeStr);
          const endTime = new Date(dateTime.getTime() + duration * 60 * 60 * 1000);
          
          let query = supabase
            .from('reservations')
            .select('date, duree')
            .eq('prestataire_id', prestataireId)
            .neq('status', 'cancelled')
            .gte('date', dateTimeStr)
            .lt('date', endTime.toISOString());
          
          if (reservationId) {
            query = query.neq('id', reservationId);
          }
          
          const { data: conflicts } = await query;
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
              duree: duration,
              dateTime: dateTime,
              formatted: dateTime.toLocaleString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })
            });
            
            if (alternatives.length >= 3) break;
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
    setForm({ ...form, date: slot.date, heure: slot.heure, duree: slot.duree.toString() });
    setAvailabilityStatus('available');
    setAlternativeSlots([]);
  };

  // Vérifier la disponibilité au chargement si on modifie une réservation
  useEffect(() => {
    if (form.date && form.heure && form.duree && prestataireId && reservationId) {
      checkAvailability(form.date, form.heure, form.duree, prestataireId);
    }
  }, [form.date, form.heure, form.duree, prestataireId, reservationId]);

  // Gestion des photos
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

  // Nouvelle fonction pour paiement Stripe (réservations)
  const handleStripeCheckout = async (reservationId, montantAcompte) => {
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annonce_id: annonceId,
          montant_acompte: montantAcompte,
          user_id: particulierId,
          email: client.email,
          reservation_id: reservationId, // ✅ AJOUT : passer l'ID de la réservation
        }),
      });
      const data = await res.json();
      if (data.session && data.session.url) {
        window.location.href = data.session.url;
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Erreur lors de la création du paiement Stripe.");
      }
    } catch (err) {
      setError("Erreur réseau lors de la création du paiement Stripe.");
    }
  };

  // Envoi du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation des champs obligatoires avec messages spécifiques
    if (!displayedNom || displayedNom.trim() === '') {
      setError("❌ Le nom et prénom sont obligatoires");
      return;
    }

    if (!displayedEmail || displayedEmail.trim() === '') {
      setError("❌ L'adresse email est obligatoire");
      return;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(displayedEmail)) {
      setError("❌ L'adresse email n'est pas valide");
      return;
    }

    if (!form.date) {
      setError("❌ La date est obligatoire");
      return;
    }

    if (!form.heure) {
      setError("❌ L'heure est obligatoire");
      return;
    }

    // Validation de la durée : pour les unités spéciales, utiliser les valeurs par défaut
    let effectiveDuree = form.duree;
    if (unitTarif && ['seance', 'forfait', 'demi_journee', 'jour'].includes(unitTarif)) {
      // Pour ces unités, utiliser les valeurs appropriées si duree n'est pas remplie
      if (!effectiveDuree || effectiveDuree <= 0) {
        if (unitTarif === 'seance' || unitTarif === 'forfait') {
          effectiveDuree = annonce?.nb_heure?.toString() || "1";
        } else if (unitTarif === 'demi_journee') {
          effectiveDuree = "4";
        } else if (unitTarif === 'jour') {
          effectiveDuree = "8";
        }
        // Mettre à jour le form avec la durée calculée
        setForm(prev => ({ ...prev, duree: effectiveDuree }));
      }
    } else {
      // Pour les autres unités (heure), vérifier que la durée est bien renseignée
      if (!form.duree || form.duree <= 0) {
        setError("❌ La durée doit être supérieure à 0");
        return;
      }
    }

    if (!form.lieu || form.lieu.trim() === '') {
      setError("❌ L'adresse du lieu est obligatoire");
      return;
    }

    if (!form.ville || form.ville.trim() === '') {
      setError("❌ La ville est obligatoire");
      return;
    }

    if (!form.participants || form.participants <= 0) {
      setError("❌ Le nombre de participants doit être supérieur à 0");
      return;
    }

    if (!form.commentaire || form.commentaire.trim() === '') {
      setError("❌ La description de votre demande est obligatoire");
      return;
    }

    // Vérification de l'adresse dans les zones d'intervention
    if (addressValidation === 'invalid') {
      setError("❌ L'adresse sélectionnée n'est pas dans les zones d'intervention du prestataire.");
      return;
    }

    // Vérification de la disponibilité
    if (availabilityStatus === 'unavailable') {
      setError("❌ Le créneau sélectionné n'est pas disponible. Veuillez choisir un autre créneau.");
      return;
    }

    // Les photos sont déjà en base64 dans form.photos

    // Formatage date+heure en timestampz
    const dateTime = form.date && form.heure
      ? new Date(`${form.date}T${form.heure}:00`).toISOString()
      : null;

    // Assemblage adresse
    const endroit = [form.lieu, form.ville].filter(Boolean).join(", ");

    // Calculer duree et duree_heure selon l'unité tarifaire
    let duree = form.duree;
    let dureeHeure = null;
    
    if (unitTarif) {
      if (unitTarif === 'seance' || unitTarif === 'forfait') {
        duree = 1; // Toujours 1 pour séance/forfait
        dureeHeure = annonce?.nb_heure || null; // Utiliser la valeur de nb_heure de l'annonce
      } else if (unitTarif === 'demi_journee') {
        duree = 1; // Toujours 1
        dureeHeure = 4; // 4 heures pour une demi-journée
      } else if (unitTarif === 'jour') {
        duree = 1; // Toujours 1
        dureeHeure = 8; // 8 heures pour un jour
      }
      // Sinon (heure), garder la durée saisie et dureeHeure reste null
    }

    // Calcul montant total et acompte (si prix fixe)
    const montant = prixFixe
      ? Number(duree) * Number(tarifUnitaire)
      : reservationMontant !== null
        ? reservationMontant
        : 0;
    const montant_acompte = prixFixe
      ? Math.round(montant * (acomptePercent / 100))
      : reservationAcompte !== null
        ? reservationAcompte
        : 0;

    // Déterminer le statut selon l'acompte
    const status = montant_acompte === 0 ? 'paid' : 'pending';

    // La vérification de disponibilité se fera avec le système existant de blocked_slots

    // Mise à jour de la réservation existante si reservationId présent
    let insertError = null;
    if (reservationId) {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          annonce_id: annonceId,
          date: dateTime,
          duree: duree,
          duree_heure: dureeHeure,
          unit_tarif: unitTarif,
          endroit,
          participants: form.participants,
          commentaire: form.commentaire,
          photos: form.photos.length > 0 ? form.photos : null, // <-- tableau base64
          tarif_unit: tarifUnitaire,
          client_nom: client.nom,
          client_email: client.email,
          prestataire_id: prestataireId,
          particulier_id: particulierId,
          montant,
          montant_acompte,
          status: status,
        })
        .eq("id", reservationId);
      insertError = updateError;
    } else {
      // 1. Générer le numéro de réservation
      let numReservation = null;
      try {
        const numberResponse = await fetch('/api/reservations/generate-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (numberResponse.ok) {
          const numberResult = await numberResponse.json();
          numReservation = numberResult.num_reservation;
          console.log('✅ Numéro de réservation généré:', numReservation);
        } else {
          console.error('❌ Erreur génération numéro de réservation');
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'appel API numéro réservation:', error);
      }

      // 2. Insertion dans reservations si pas d'id et récupérer l'ID
      const { data: reservationData, error: newInsertError } = await supabase
        .from("reservations")
        .insert({
          annonce_id: annonceId,
          date: dateTime,
          duree: duree,
          duree_heure: dureeHeure,
          unit_tarif: unitTarif,
          endroit,
          participants: form.participants,
          commentaire: form.commentaire,
          photos: form.photos.length > 0 ? form.photos : null, // <-- tableau base64
          tarif_unit: tarifUnitaire,
          client_nom: client.nom,
          client_email: client.email,
          prestataire_id: prestataireId,
          particulier_id: particulierId,
          montant,
          montant_acompte,
          status: status,
          num_reservation: numReservation, // <-- Numéro de réservation généré automatiquement
        })
        .select();
      
      insertError = newInsertError;
      
      // 3. Si création réussie, utiliser le système existant pour bloquer les créneaux
      if (!newInsertError && reservationData && reservationData[0]?.id) {
        // Le système existant de blocked_slots se charge automatiquement via les triggers/fonctions existantes
        console.log('✅ Réservation créée avec succès');
        
        // Envoyer notification au prestataire
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: prestataireId,
            type: 'reservation',
            contenu: `Nouvelle reservation reçue ${numReservation ? `${numReservation}` : ''} du client ${client.nom} pour un montant de ${montant} EUR. La reservation est en attente de votre confirmation.`,
            lu: false,
            reservation_id: reservationData[0].id,
            annonce_id: annonceId
          }]);
        
        if (notificationError) {
          console.error('Erreur lors de l\'envoi de la notification:', notificationError);
        }
      }
      
      // Si création réussie et qu'il y a un acompte à payer, rediriger vers Stripe
      if (!newInsertError && reservationData && reservationData[0]?.id && montant_acompte > 0) {
        const newReservationId = reservationData[0].id;
        setSuccess(true);
        // Appel Stripe checkout pour l'acompte
        await handleStripeCheckout(newReservationId, montant_acompte);
        return; // Stripe prend le relais pour la redirection
      }
    }

    if (insertError) {
      setError("Erreur lors de la réservation : " + insertError.message);
    } else {
      setSuccess(true);
      // Si pas de paiement (acompte = 0), redirection normale
      if (montant_acompte === 0) {
        setTimeout(() => router.push(`/annonces/${annonceId}`), 1500);
      }
    }
  };

  // Calcul de la durée effective selon l'unité tarifaire
  const getDureeForCalculation = () => {
    if (unitTarif === 'seance' || unitTarif === 'forfait' || unitTarif === 'demi_journee' || unitTarif === 'jour') {
      return 1; // Toujours 1 pour ces unités
    }
    return Number(form.duree) || 0;
  };

  // Calcul total et acompte pour affichage
  const total = prixFixe
    ? getDureeForCalculation() * Number(tarifUnitaire)
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
    <>  
    <Header />
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
        {/* Formulaire réservation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Réserver une prestation
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date, heure et durée avec vérification de disponibilité */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Heure <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="time"
                      name="heure"
                      value={form.heure}
                      onChange={handleChange}
                      min="08:00"
                      max="20:00"
                      className="w-full border rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Durée - Masqué pour séance, forfait, demi_journee, jour */}
              {unitTarif && !['seance', 'forfait', 'demi_journee', 'jour'].includes(unitTarif) && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-gray-700 font-semibold mb-2">
                      Durée <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="duree"
                      value={form.duree}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 3"
                      min="1"
                      max="12"
                      required
                    />
                  </div>
                  <div className="text-gray-500 text-sm mt-8">
                    {unitTarif && <>Unité : <span className="font-semibold">{unitTarif}</span></>}
                  </div>
                </div>
              )}

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
                                <div className="text-sm text-gray-600">Durée: {slot.duree}h - Cliquez pour sélectionner</div>
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

            {/* Lieu avec autocomplétion */}
            <div className="relative">
              <label className="block text-gray-700 font-semibold mb-2">
                Adresse du lieu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={addressInputRef}
                  type="text"
                  name="lieu"
                  value={form.lieu}
                  onChange={handleChange}
                  placeholder="Commencez à taper une adresse..."
                  className="w-full border rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoComplete="off"
                  required
                />
                {isLoadingAddress && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
              
              {/* Suggestions d'adresses - Style Airbnb */}
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
                  {isLoadingAddress && addressSuggestions.length === 0 ? (
                    <div className="p-4 flex items-center justify-center gap-3 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                      <span className="text-sm">Recherche en cours...</span>
                    </div>
                  ) : addressSuggestions.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {addressSuggestions.map((place, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(place)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 border-b border-gray-50 last:border-b-0 group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 bg-gray-100 rounded-lg group-hover:bg-purple-100 transition-colors">
                              <MapPin className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate group-hover:text-purple-600 transition-colors">
                                {place.display_name.split(',')[0]}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {place.display_name.split(',').slice(1).join(',')}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Aucune adresse trouvée
                    </div>
                  )}
                </div>
              )}
              
              <style jsx>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(-10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.2s ease-out;
                }
              `}</style>
              
              {/* Validation de l'adresse */}
              {addressValidation && (
                <div className="mt-2">
                  {addressValidation === 'valid' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 text-sm font-medium">✅ Cette adresse est dans la zone d'intervention du prestataire</span>
                    </div>
                  )}
                  
                  {addressValidation === 'invalid' && (
                    <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-red-700 text-sm font-medium">❌ Cette adresse n'est pas dans la zone d'intervention</span>
                      </div>
                      {zonesIntervention.length > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          <strong>Zones disponibles :</strong> {zonesIntervention.map(z => `${z.ville_centre} (${z.rayon_km}km)`).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Ville / Région <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ville"
                value={form.ville}
                onChange={handleChange}
                placeholder="Ex : Paris"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Nombre de participants <span className="text-red-500">*</span>
              </label>
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
              <label className="block text-gray-700 font-semibold mb-2">
                Décrivez votre demande <span className="text-red-500">*</span>
              </label>
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

            {/* Upload photos */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Ajouter des photos (inspirations, références) - Maximum 10 photos <span className="text-gray-400 text-sm">(optionnel)</span>
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading || form.photos.length >= 10}
                className="w-full border rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
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
                <h3 className="font-semibold text-gray-700 mb-3">Photos ajoutées ({photoPreviews.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
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
              className={`w-full font-semibold py-3 rounded-lg shadow-md transition ${
                loading || isUploading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking' || addressValidation === 'invalid'
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-blue-900 hover:bg-blue-900 text-white'
              }`}
              disabled={loading || isUploading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking' || addressValidation === 'invalid'}
            >
              {loading ? 'Traitement...' : 
               isUploading ? "Traitement des images..." :
               availabilityStatus === 'checking' ? 'Vérification en cours...' :
               availabilityStatus === 'unavailable' ? 'Créneau non disponible' :
               addressValidation === 'invalid' ? "Adresse hors zone d'intervention" :
               'Confirmer la réservation'}
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
                <label className="block text-gray-700 font-semibold mb-1">
                  Nom et prénom <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-gray-700 font-semibold mb-1">
                  Adresse email <span className="text-red-500">*</span>
                </label>
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
                    <span className="text-blue-900 font-bold">
                      {tarifUnitaire} EUR
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Durée souhaitée :</span>{" "}
                    <span>{form.duree || "-"} {unitTarif}</span>
                  </div>
                  <div className="mb-2 font-bold">
                    Total :{" "}
                    <span className="text-blue-900">
                      {total} EUR
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Acompte à verser :</span>{" "}
                    <span>{acomptePercent}%</span>
                  </div>
                  <div className="mb-2 font-bold">
                    Montant acompte : <span className="text-blue-900">{montant_acompte_affichage} EUR</span>
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
                    <span className="text-blue-600">
                      {total} EUR
                    </span>
                  </div>
                  <div className="mb-2 font-bold">
                    Montant acompte : <span className="text-blue-600">{montant_acompte_affichage} EUR</span>
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
    </>
  );
}