import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
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
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [alternativeSlots, setAlternativeSlots] = useState([]);

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
      const newPrestataireId = annonceData?.prestataire || prestataireId;
      setPrestataireId(newPrestataireId);
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
    const { name, value, files } = e.target;
    if (name === "client_nom" || name === "client_email") {
      setClient({ ...client, [name === "client_nom" ? "nom" : "email"]: value });
    } else if (name === "fichiers") {
      setForm({
        ...form,
        fichiers: files ? Array.from(files) : [],
      });
    } else {
      const newForm = { ...form, [name]: value };
      setForm(newForm);
      
      // Vérifier la disponibilité quand date, heure ou durée change
      if ((name === 'date' || name === 'heure' || name === 'duree') && prestataireId) {
        if (newForm.date && newForm.heure && newForm.duree) {
          checkAvailability(newForm.date, newForm.heure, newForm.duree, prestataireId);
        }
      }
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
            contenu: `Nouvelle reservation reçue ${numReservation ? `${numReservation}` : ''} du client ${client.nom} pour un montant de ${montant} MAD. La reservation est en attente de votre confirmation.`,
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
                  <label className="block text-gray-700 font-semibold mb-2">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Heure</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="time"
                      name="heure"
                      value={form.heure}
                      onChange={handleChange}
                      min="08:00"
                      max="20:00"
                      className="w-full border rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Durée */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-gray-700 font-semibold mb-2">Durée</label>
                  <input
                    type="number"
                    name="duree"
                    value={form.duree}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
              className={`w-full font-semibold py-3 rounded-lg shadow-md transition ${
                loading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-pink-500 hover:bg-pink-600 text-white'
              }`}
              disabled={loading || availabilityStatus === 'unavailable' || availabilityStatus === 'checking'}
            >
              {loading ? 'Traitement...' : 
               availabilityStatus === 'checking' ? 'Vérification en cours...' :
               availabilityStatus === 'unavailable' ? 'Créneau non disponible' :
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
    </>
  );
}