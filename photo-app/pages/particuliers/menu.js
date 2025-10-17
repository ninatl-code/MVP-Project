import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Header from '../../components/HeaderParti'
import RealTimeNotifications from '../../components/RealTimeNotifications'
import { 
  Search, Minus, Plus, Calendar, Package, FileText, 
  Star, Clock, CheckCircle, AlertCircle, User, 
  ArrowRight, ArrowLeft, Filter, Grid3X3, List, Eye,
  TrendingUp, Activity, Award, Heart
} from "lucide-react";

function ParticularHomeMenu() {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [devis, setDevis] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [prestations, setPrestations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [prestationFilter, setPrestationFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [showDevis, setShowDevis] = useState(true)
  const [showReservations, setShowReservations] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'devis', 'reservations'
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [loadingDevisAction, setLoadingDevisAction] = useState(false);
  const [existingAvis, setExistingAvis] = useState([]);
  const [showRatingForm, setShowRatingForm] = useState(null);
  const [triggerAvisNotification, setTriggerAvisNotification] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReservation, setSelectedCancelReservation] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationConditions, setCancellationConditions] = useState(null);
  const router = useRouter();



  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: devisData } = await supabase
        .from("devis")
        .select("*, annonces!devis_annonce_id_fkey(titre)")
        .eq("particulier_id", user.id);
      setDevis(devisData || []);

      const { data: reservationsData } = await supabase
        .from("reservations")
        .select("*, profiles!reservations_prestataire_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre)")
        .eq("particulier_id", user.id);
      setReservations(reservationsData || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchPrestations = async () => {
      const { data, error } = await supabase
        .from('prestations')
        .select('id, nom')
      if (!error) setPrestations(data)
    }
    fetchPrestations()
  }, [])

  useEffect(() => {
    const fetchReservations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('reservations')
        .select('*, profiles!reservations_prestataire_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre, conditions_annulation)')

      query = query.eq('particulier_id', user.id)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (prestationFilter !== 'all') {
        query = query.eq('prestation', prestationFilter)
      }
      if (dateFilter !== 'all') {
        query = query.eq('date', dateFilter)
      }

      const { data, error } = await query
      if (error) console.error(error)
      else setReservations(data)
    }
    fetchReservations()
  }, [statusFilter, prestationFilter, dateFilter])





  // Récupérer les avis existants
  useEffect(() => {
    const fetchExistingAvis = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: avisData, error } = await supabase
        .from('avis')
        .select('reservation_id, note')
        .eq('particulier_id', user.id)

      if (!error) {
        setExistingAvis(avisData || [])
      }
    }
    fetchExistingAvis()
  }, [userId])

  // Gérer l'ouverture automatique d'avis depuis HeaderParti.js
  useEffect(() => {
    if (router.query.openAvis && userId) {
      const openAvisId = router.query.openAvis;
      console.log('🔥 Ouverture avis depuis HeaderParti:', openAvisId);
      
      const fetchAndTriggerAvis = async () => {
        const { data: notification, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', openAvisId)
          .eq('user_id', userId)
          .eq('type', 'avis')
          .single();
          
        if (notification && !error) {
          console.log('✅ Notification avis trouvée:', notification);
          setTriggerAvisNotification(notification);
          // Nettoyer l'URL après usage
          router.replace('/particuliers/menu', undefined, { shallow: true });
        }
      };
      
      fetchAndTriggerAvis();
    }
  }, [router.query.openAvis, userId]);

  // Fonction pour vérifier si un avis existe
  const hasAvis = (type, id) => {
    if (type === 'reservation') {
      return existingAvis.some(avis => avis.reservation_id === id)
    }
    return false
  }

  // Fonction pour soumettre un avis depuis menu.js
  const submitRatingFromMenu = async () => {
    if (!showRatingForm || ratingValue === 0) {
      alert('Veuillez sélectionner une note de 1 à 5 étoiles');
      return;
    }

    setIsSubmittingRating(true);

    try {
      // Récupérer les informations de l'entité
      let entityData = null;
      let annonceData = null;
      
      if (showRatingForm.type === 'reservation') {
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('id, annonce_id, particulier_id')
          .eq('id', showRatingForm.id)
          .single();
          
        if (reservationError || !reservationData) {
          alert('Impossible de trouver la réservation');
          return;
        }
        entityData = reservationData;
        
        // Récupérer l'annonce
        const { data: annonceResult, error: annonceError } = await supabase
          .from('annonces')
          .select('id, prestataire, titre')
          .eq('id', reservationData.annonce_id)
          .single();
          
        if (annonceError || !annonceResult) {
          alert('Impossible de trouver l\'annonce associée');
          return;
        }
        annonceData = annonceResult;
      }

      // Créer l'avis
      const avisData = {
        particulier_id: userId,
        prestataire_id: annonceData.prestataire,
        reservation_id: showRatingForm.type === 'reservation' ? entityData.id : null,
        note: ratingValue,
        commentaire: ratingComment && ratingComment.trim() ? ratingComment.trim() : null,
        created_at: new Date().toISOString()
      };

      const { error: avisError } = await supabase
        .from('avis')
        .insert(avisData);

      if (avisError) {
        console.error('Erreur lors de la création de l\'avis:', avisError);
        alert('Erreur lors de l\'envoi de votre avis: ' + avisError.message);
        return;
      }

      // Envoyer notification au prestataire
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: annonceData.prestataire,
          type: 'avis',
          contenu: 'Votre annonce a reçu un avis. Vous trouverez plus de détails dans la page dédiée aux annonces',
          lu: false,
          annonce_id: annonceData.id,
          reservation_id: showRatingForm.type === 'reservation' ? entityData.id : null
        }]);

      if (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification d\'avis:', notificationError);
      }

      // Rafraîchir les avis existants
      const { data: updatedAvis, error } = await supabase
        .from('avis')
        .select('reservation_id, note')
        .eq('particulier_id', userId);

      if (!error) {
        setExistingAvis(updatedAvis || []);
      }

      // Réinitialiser et fermer
      setShowRatingForm(null);
      setRatingValue(0);
      setRatingComment('');
      
      alert(`✨ Merci pour votre avis de ${ratingValue} étoile${ratingValue > 1 ? 's' : ''} !`);

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Une erreur est survenue lors de l\'envoi de votre avis');
    } finally {
      setIsSubmittingRating(false);
    }
  };



  // Fonction pour vérifier si une réservation peut être annulée selon les conditions d'annulation
  const checkCancellationConditions = async (reservation) => {
    if (!reservation || !reservation.annonce_id || !reservation.date) {
      return { canCancel: false, reason: 'Données de réservation incomplètes' };
    }

    try {
      // Récupérer les conditions d'annulation de l'annonce
      const { data: annonceData, error } = await supabase
        .from('annonces')
        .select('conditions_annulation')
        .eq('id', reservation.annonce_id)
        .single();

      if (error || !annonceData) {
        return { canCancel: false, reason: 'Impossible de récupérer les conditions d\'annulation' };
      }

      const conditionAnnulation = annonceData.conditions_annulation;
      const reservationDate = new Date(reservation.date);
      const currentDate = new Date();
      const timeDiff = reservationDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

      switch (conditionAnnulation) {
        case 'Flexible':
          if (hoursDiff >= 24) {
            return { 
              canCancel: true, 
              refundPercentage: 100, 
              message: 'Annulation gratuite (plus de 24h avant)' 
            };
          } else {
            return { 
              canCancel: false, 
              reason: 'Annulation impossible (moins de 24h avant la prestation)' 
            };
          }

        case 'Modéré':
          if (daysDiff >= 7) {
            return { 
              canCancel: true, 
              refundPercentage: 100, 
              message: 'Annulation gratuite (plus de 7 jours avant)' 
            };
          } else if (daysDiff >= 1) {
            return { 
              canCancel: true, 
              refundPercentage: 50, 
              message: 'Annulation possible avec remboursement de 50%' 
            };
          } else {
            return { 
              canCancel: false, 
              reason: 'Annulation impossible (moins de 24h avant la prestation)' 
            };
          }

        case 'Strict':
          return { 
            canCancel: true, 
            refundPercentage: 0, 
            message: 'Annulation possible uniquement pour force majeure (aucun remboursement)',
            forceMajeure: true
          };

        default:
          // Si pas de condition définie, on applique une politique flexible par défaut
          if (hoursDiff >= 24) {
            return { 
              canCancel: true, 
              refundPercentage: 100, 
              message: 'Annulation gratuite (plus de 24h avant)' 
            };
          } else {
            return { 
              canCancel: false, 
              reason: 'Annulation impossible (moins de 24h avant la prestation)' 
            };
          }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des conditions:', error);
      return { canCancel: false, reason: 'Erreur lors de la vérification des conditions' };
    }
  };

  // Fonction pour annuler une réservation
  const handleCancelReservation = async () => {
    if (!selectedCancelReservation) return;

    setIsCancelling(true);
    try {
      const cancellationCheck = await checkCancellationConditions(selectedCancelReservation);
      
      if (!cancellationCheck.canCancel) {
        alert(cancellationCheck.reason);
        setIsCancelling(false);
        return;
      }

      // Validation pour force majeure si condition stricte
      if (cancellationCheck.forceMajeure && (!cancelReason || cancelReason.trim().length < 20)) {
        alert('Veuillez fournir une justification détaillée pour l\'annulation (minimum 20 caractères)');
        setIsCancelling(false);
        return;
      }

      // Vérification des données avant l'appel API
      if (!userId) {
        alert('Erreur: Utilisateur non identifié');
        setIsCancelling(false);
        return;
      }

      if (!selectedCancelReservation?.id) {
        alert('Erreur: Réservation non sélectionnée');
        setIsCancelling(false);
        return;
      }

      // Appeler l'API de remboursement Stripe
      console.log('🔄 Traitement du remboursement via Stripe...');
      console.log('📋 Données envoyées:', {
        reservationId: selectedCancelReservation.id,
        reservationIdType: typeof selectedCancelReservation.id,
        cancelReason: cancelReason || 'Annulation selon conditions',
        userId: userId,
        userIdType: typeof userId,
        reservationData: selectedCancelReservation
      });
      
      const refundResponse = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationId: selectedCancelReservation.id,
          cancelReason: cancelReason || 'Annulation selon conditions',
          userId: userId
        })
      });

      const refundResult = await refundResponse.json();
      
      console.log('📋 Réponse complète de l\'API:', {
        status: refundResponse.status,
        ok: refundResponse.ok,
        result: refundResult
      });
      
      if (!refundResponse.ok) {
        console.error('❌ Erreur API détaillée:', {
          status: refundResponse.status,
          error: refundResult.error,
          details: refundResult.details,
          debug: refundResult.debug,
          fullResponse: refundResult
        });
        
        // Afficher un message plus informatif
        const errorMsg = refundResult.debug ? 
          `Debug: ${JSON.stringify(refundResult.debug, null, 2)}` : 
          (refundResult.error || 'Erreur lors du remboursement');
          
        alert('Erreur détaillée:\n' + errorMsg);
        throw new Error(refundResult.error || 'Erreur lors du remboursement');
      }

      // Succès - afficher le message de confirmation
      console.log('✅ Annulation réussie:', refundResult);
      
      if (refundResult.success) {
        const successMsg = refundResult.message || 'Réservation annulée avec succès';
        alert(successMsg);
        
        // Fermer le modal d'annulation
        setShowCancelModal(false);
        setSelectedCancelReservation(null);
        setCancelReason('');
        setCancellationConditions(null);
        
        // Rafraîchir la liste des réservations
        await fetchReservations();
      }

      // Envoyer une notification au prestataire
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: selectedCancelReservation.prestataire_id,
          type: 'reservation',
          contenu: `Réservation annulée par le client${refundResult.refundPercentage < 100 ? ` (remboursement ${refundResult.refundPercentage}%)` : ''}`
        }]);

      if (notifError) {
        console.error('Erreur notification:', notifError);
      }

      // Rafraîchir les données
      const { data: updatedReservations } = await supabase
        .from('reservations')
        .select('*, profiles!reservations_prestataire_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre)')
        .eq('particulier_id', userId);
      
      setReservations(updatedReservations || []);
      
      setShowCancelModal(false);
      setSelectedCancelReservation(null);
      setCancelReason('');
      
      let message = `Réservation annulée avec succès !`;
      if (refundResult.refundAmount > 0) {
        message += `\n💰 Remboursement: ${refundResult.refundAmount} MAD (${refundResult.refundPercentage}%)`;
        message += `\n⏰ Le remboursement sera traité sous 5-10 jours ouvrés.`;
      } else if (refundResult.refundPercentage === 0) {
        message += `\n📋 Votre demande d'annulation pour force majeure a été enregistrée.`;
        message += `\nElle sera examinée par notre équipe sous 24-48h.`;
      }
      
      alert(message);
      
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors du traitement: ' + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  function MiniCalendar({ onSelect }) {
    const [calendarDate, setCalendarDate] = useState(() => {
      const today = new Date()
      return { year: today.getFullYear(), month: today.getMonth() }
    })

    const { year, month } = calendarDate
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    return (
      <div style={{
        position: 'absolute',
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: 12,
        zIndex: 1000,
        top: 40,
        left: 0,
        minWidth: 200
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <button
            style={{
              background: '#f6f6f6',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 15,
              cursor: 'pointer'
            }}
            onClick={() => setCalendarDate(d => {
              let newMonth = d.month - 1
              let newYear = d.year
              if (newMonth < 0) {
                newMonth = 11
                newYear -= 1
              }
              return { year: newYear, month: newMonth }
            })}
          >◀</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {monthNames[month]} {year}
          </span>
          <button
            style={{
              background: '#f6f6f6',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 15,
              cursor: 'pointer'
            }}
            onClick={() => setCalendarDate(d => {
              let newMonth = d.month + 1
              let newYear = d.year
              if (newMonth > 11) {
                newMonth = 0
                newYear += 1
              }
              return { year: newYear, month: newMonth }
            })}
          >▶</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
          {['L','M','M','J','V','S','D'].map(j => (
            <div key={j} style={{fontSize:11, color:'#888', textAlign:'center'}}>{j}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
            return (
              <button
                key={dateStr}
                style={{
                  border:'none',
                  background: dateFilter === dateStr ? '#6bbf7b' : '#f6f6f6',
                  color: dateFilter === dateStr ? '#fff' : '#222',
                  borderRadius:6,
                  width:24,
                  height:24,
                  fontSize:13,
                  cursor:'pointer',
                  margin:1
                }}
                onClick={() => {
                  onSelect(dateStr)
                  setShowCalendar(false)
                }}
              >{i+1}</button>
            )
          })}
        </div>
        <button
          style={{
            marginTop:8,
            background:'#eee',
            border:'none',
            borderRadius:6,
            padding:'4px 12px',
            fontSize:13,
            cursor:'pointer',
            width:'100%'
          }}
          onClick={() => {
            onSelect('all')
            setShowCalendar(false)
          }}
        >Réinitialiser</button>
      </div>
    )
  }

  function StatusBadge({ status }) {
    let color = '#b7e4c7', bg = '#eafaf1', label = 'Confirmé'
    
    // Statuts pour les réservations
    if (status === 'pending') { color = '#f59e0b'; bg = '#fef3c7'; label = 'En attente de paiement' }
    if (status === 'paid') { color = '#3b82f6'; bg = '#dbeafe'; label = 'En attente confirmation du prestataire' }
    if (status === 'confirmed') { color = '#10b981'; bg = '#d1fae5'; label = 'Confirmée' }
    if (status === 'cancelled') { color = '#ef4444'; bg = '#fee2e2'; label = 'Annulée' }
    if (status === 'finished' || status === 'delivered') { color = '#8b5cf6'; bg = '#ede9fe'; label = 'Terminé' }
    
    // Statuts pour les devis
    if (status === 'answered') { color = '#10b981'; bg = '#d1fae5'; label = 'Réponse reçue' }
    if (status === 'accepted') { color = '#059669'; bg = '#d1fae5'; label = 'Accepté' }
    if (status === 'refused') { color = '#ef4444'; bg = '#fee2e2'; label = 'Refusé' }
    
    return (
      <span style={{
        background: bg,
        color,
        borderRadius: 8,
        padding: '4px 14px',
        fontWeight: 600,
        fontSize: 15,
        marginLeft: 12
      }}>{label}</span>
    )
  }

  // Actions pour accepter/refuser un devis
  async function handleAcceptDevis(devis) {
    setLoadingDevisAction(true);
    try {
      // 1. Changer le statut du devis à "accepted"
      const { error: devisError } = await supabase
        .from('devis')
        .update({ status: 'accepted' })
        .eq('id', devis.id);

      if (devisError) {
        alert("Erreur lors de l'acceptation du devis :\n" + (devisError.message || JSON.stringify(devisError)));
        setLoadingDevisAction(false);
        return;
      }

      // 2. Créer une nouvelle réservation liée au devis avec tous les champs demandés
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          status: 'TBC',
          devis_id: devis.id,
          montant: devis.montant,
          montant_acompte: devis.montant_acompte,
          particulier_id: devis.particulier_id,
          prestataire_id: devis.prestataire_id,
          annonce_id: devis.annonce_id,
          duree: devis.duree,
          endroit: devis.endroit,
          ville: devis.ville,
          participants: devis.participants || devis.nb_personnes,
          photos: devis.photos || [],
          unit_tarif: devis.unit_tarif,
          date: devis.date,
          client_nom: devis.client_nom || "",
          client_email: devis.client_email || ""
        }])
        .select()
        .single();

      if (reservationError || !reservationData) {
        alert("Erreur lors de la création de la réservation :\n" + (reservationError?.message || "Aucune donnée retournée."));
        setLoadingDevisAction(false);
        return;
      }

      // 3. Envoyer une notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: devis.prestataire_id,
          type: 'devis',
          contenu: 'votre devis a été accepté'
        }]);

      if (notifError) {
        alert("Erreur lors de l'envoi de la notification :\n" + (notifError.message || JSON.stringify(notifError)));
        // On continue quand même la redirection
      }

      setLoadingDevisAction(false);
      setSelectedDevis(null);

      // 4. Rediriger vers la page reservations.js de l'annonce avec l'id de la réservation créée
      router.push(`/annonces/${devis.annonce_id}/reservations?reservation_id=${reservationData.id}`);
    } catch (err) {
      alert("Erreur inattendue :\n" + (err.message || JSON.stringify(err)));
      setLoadingDevisAction(false);
    }
  }

  async function handleRefuseDevis(devis) {
    setLoadingDevisAction(true);
    // 1. Changer le statut du devis à "refused"
    const { error: devisError } = await supabase
      .from('devis')
      .update({ status: 'refused' })
      .eq('id', devis.id);

    if (devisError) {
      alert("Erreur lors du refus du devis.");
      setLoadingDevisAction(false);
      return;
    }

    // 2. Envoyer une notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: devis.prestataire_id,
        type: 'devis',
        contenu: 'votre devis a été refusé'
      }]);

    setLoadingDevisAction(false);
    setSelectedDevis(null);
    // Optionnel: rafraîchir la liste des devis
  }

  // Pop-up pour afficher les infos du devis - Version moderne
  function DevisInfoModal({ devis, onClose }) {
    if (!devis) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          minWidth: 600,
          maxWidth: 900,
          width: '100%',
          textAlign: 'left',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background 0.2s'
            }}
            onClick={onClose}
            aria-label="Fermer"
            onMouseOver={(e) => e.target.style.background = '#e5e5e5'}
            onMouseOut={(e) => e.target.style.background = '#f5f5f5'}
          >×</button>
          
          {/* En-tête */}
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '32px',
            borderRadius: '20px 20px 0 0',
            color: 'white'
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              📋 Informations du devis
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
              Devis créé le {devis.created_at ? new Date(devis.created_at).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
          </div>

          {/* Contenu */}
          <div style={{ padding: '32px' }}>
            {/* Informations principales en grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 32,
              marginBottom: 32
            }}>
              {/* Section Prestataire et Service */}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  👤 Prestataire & Service
                </h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 12 }}>
                  <strong>{devis.nom_prestataire || devis.prestataire_nom || devis.prestataire || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
                  Service : {devis.annonces?.titre || devis.titre || 'Non renseigné'}
                </div>
                
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>📍 Lieu :</strong> {devis.endroit || 'Non renseigné'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>📅 Date :</strong> {devis.date ? new Date(devis.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>👥 Participants :</strong> {devis.participants || devis.nb_personnes || 'Non renseigné'}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>⏱️ Durée :</strong> {devis.duree || 'Non renseigné'} {devis.unit_tarif || ''}
                </div>
              </div>

              {/* Section Réponse du prestataire */}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💼 Réponse du prestataire
                </h2>
                
                {(devis.status === 'answered' || devis.status === 'refused' || devis.status === 'accepted') && devis.date_reponse && (
                  <div style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>
                    <strong>Répondu le :</strong> {new Date(devis.date_reponse).toLocaleDateString('fr-FR')}
                  </div>
                )}
                
                {devis.comment_presta && (
                  <div style={{
                    background: '#e3f2fd',
                    border: '1px solid #bbdefb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: 14,
                    color: '#1565c0',
                    fontStyle: 'italic'
                  }}>
                    "{devis.comment_presta}"
                  </div>
                )}
                
                {/* Montants */}
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: 12,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#555' }}>Montant total :</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{devis.montant || 'Non renseigné'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: '#555' }}>Acompte demandé :</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#f39c12' }}>{devis.montant_acompte || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Commentaire client */}
            {devis.comment_client && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💬 Votre demande
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{devis.comment_client}"
                </p>
              </div>
            )}

            {/* Informations de statut */}
            {(devis.status === 'accepted' || devis.status === 'refused') && (
              <div style={{
                background: devis.status === 'accepted' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${devis.status === 'accepted' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: devis.status === 'answered' ? 24 : 0
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: devis.status === 'accepted' ? '#155724' : '#721c24' 
                }}>
                  {devis.status === 'accepted' ? '✅ Devis accepté' : '🚫 Devis refusé'}
                </h4>
                {devis.status === 'accepted' && devis.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Accepté le {new Date(devis.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {devis.status === 'refused' && (
                  <>
                    {devis.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusé le {new Date(devis.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {devis.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {devis.motif_refus}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {/* Boutons Accepter/Refuser si status = answered */}
          {devis.status === 'answered' && (
            <div style={{marginTop:24, display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{
                  background:'#6bbf7b',
                  color:'#fff',
                  border:'none',
                  borderRadius:8,
                  padding:'10px 22px',
                  fontWeight:600,
                  fontSize:16,
                  cursor:'pointer'
                }}
                disabled={loadingDevisAction}
                onClick={() => handleAcceptDevis(devis)}
              >
                {loadingDevisAction ? "Traitement..." : "Accepter le devis"}
              </button>
              <button
                style={{
                  background:'#e67c73',
                  color:'#fff',
                  border:'none',
                  borderRadius:8,
                  padding:'10px 22px',
                  fontWeight:600,
                  fontSize:16,
                  cursor:'pointer'
                }}
                disabled={loadingDevisAction}
                onClick={() => handleRefuseDevis(devis)}
              >
                {loadingDevisAction ? "Traitement..." : "Refuser le devis"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pop-up pour afficher les infos de la réservation
  function ReservationInfoModal({ reservation, onClose }) {
    if (!reservation) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          padding: 0,
          width: '100%',
          maxWidth: 650,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header avec couleur */}
          <div style={{
            background: 'linear-gradient(135deg, #6bbf7b 0%, #5aa169 100%)',
            padding: '24px 32px',
            borderRadius: '20px 20px 0 0',
            color: '#fff',
            position: 'relative'
          }}>
            <button
              style={{
                position: 'absolute',
                top: 16,
                right: 24,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={onClose}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              aria-label="Fermer"
            >×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, margin: 0 }}>🎉 Réservation {reservation.num_reservation && <span style={{fontSize: 18, opacity: 0.9}}>#{reservation.num_reservation}</span>}</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>{reservation.annonces?.titre || 'Service'}</p>
          </div>

          {/* Contenu */}
          <div style={{ padding: '32px' }}>
            {/* Informations principales */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 24,
              marginBottom: 32
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  👤 Prestataire
                </h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>
                  <strong>{reservation.profiles?.nom || reservation.prestataire_nom || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>
                  {reservation.profiles?.email || 'Email non disponible'}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📅 Planning
                </h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Date :</strong> {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Durée :</strong> {reservation.duree || 'Non renseignée'} {reservation.unit_tarif || ''}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>Lieu :</strong> {reservation.endroit || 'Non renseigné'}
                </div>
              </div>
            </div>

            {/* Détails financiers */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                💰 Facturation
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Montant total :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{reservation.montant || 0} MAD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Acompte payé :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#6bbf7b' }}>{reservation.montant_acompte || 0} MAD</span>
              </div>
              {reservation.nb_personnes && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
                  <strong>Participants :</strong> {reservation.nb_personnes} personne{reservation.nb_personnes > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Commentaire */}
            {reservation.commentaire && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💬 Votre message
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{reservation.commentaire}"
                </p>
              </div>
            )}

            {/* Photos */}
            {Array.isArray(reservation.photos) && reservation.photos.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📸 Photos jointes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
                  {reservation.photos.map((b64, idx) => (
                    <img
                      key={idx}
                      src={`data:image/*;base64,${b64}`}
                      alt={`Photo ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
                        modal.innerHTML = `<img src="data:image/*;base64,${b64}" style="max-width:90%;max-height:90%;border-radius:8px">`;
                        modal.onclick = () => document.body.removeChild(modal);
                        document.body.appendChild(modal);
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Informations de statut */}
            {(reservation.status === 'confirmed' || reservation.status === 'cancelled' || reservation.status === 'refused') && (
              <div style={{
                background: reservation.status === 'confirmed' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${reservation.status === 'confirmed' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: reservation.status === 'confirmed' ? '#155724' : '#721c24' 
                }}>
                  {reservation.status === 'confirmed' ? '✅ Confirmée' : reservation.status === 'cancelled' ? '❌ Annulée' : '🚫 Refusée'}
                </h4>
                {reservation.status === 'confirmed' && reservation.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Confirmée le {new Date(reservation.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {reservation.status === 'cancelled' && (
                  <>
                    {reservation.date_annulation && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Annulée le {new Date(reservation.date_annulation).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {reservation.motif_annulation && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {reservation.motif_annulation}
                      </p>
                    )}
                  </>
                )}
                {reservation.status === 'refused' && (
                  <>
                    {reservation.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusée le {new Date(reservation.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {reservation.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {reservation.motif_refus}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Bloc Devis
  function DevisCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        border: '1px solid #f1f1f1',
        position: 'relative'
      }}>
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:18}}>
              {r.annonces?.titre || 'Annonce'}
            </div>
            <div style={{color:'#888', fontSize:15, marginTop:2}}>
              Date du devis : {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Endroit : {r.endroit || 'Non renseigné'}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Date : {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''}
            </div>
          </div>
          <div style={{marginLeft: 16}}>
            <StatusBadge status={r.status} />
          </div>
        </div>
        <div style={{marginTop:16, textAlign:'right'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedDevis(r)}
          >
            Afficher les informations
          </button>
        </div>
      </div>
    )
  }

  // Bloc Devis
  function DevisCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        border: '1px solid #f1f1f1',
        position: 'relative'
      }}>
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:18}}>
              {r.annonces?.titre || 'Annonce'}
            </div>
            <div style={{color:'#888', fontSize:15, marginTop:2}}>
              Date du devis : {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Endroit : {r.endroit || 'Non renseigné'}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Date : {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''}
            </div>
          </div>
          <div style={{marginLeft: 16}}>
            <StatusBadge status={r.status} />
          </div>
        </div>
        <div style={{marginTop:16, textAlign:'right'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedDevis(r)}
          >
            Afficher les informations
          </button>
        </div>
      </div>
    )
  }

  // Bloc Réservations
  function ReservationCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        border: '1px solid #f1f1f1'
      }}>
        <div>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, color: '#888'
          }}>
            {r.profiles?.nom ? r.profiles.nom.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'}
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontWeight:700, fontSize:18}}>{r.profiles?.nom || 'Nom inconnu'}</span>
            <StatusBadge status={r.status} />
          </div>
          <div style={{color:'#888', fontSize:15, marginTop:2}}>{r.profiles?.email}</div>
          <div style={{color:'#130183', fontSize:15, marginTop:6, fontWeight:600}}>
            {<span style={{color: '#130183', fontSize: 15, fontWeight: 600}}>Annonce réservée : </span>}
	          {<span style={{color: '#000000', fontSize: 15, fontWeight: 400}}>{r.annonces.titre}</span>}
            {<span style={{color: '#666', fontSize: 14, fontWeight: 400}}> #{r.num_reservation}</span>}
          </div>
          <div style={{color:'#130183', fontSize:15, marginTop:2, fontWeight:600}}>
            {r.prestation ? `Prestation : ${prestations.find(p => p.id === r.prestation)?.nom || ''}` : ''}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:18, marginTop:10, flexWrap:'wrap'}}>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#130183"/></svg>
              {r.endroit || 'Lieu inconnu'}
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#130183"/></svg>
              {r.nb_personnes ? `${r.nb_personnes} ws` : '' }
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#130183"/></svg>
              {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}, {r.heure ? `${r.heure}:00` : ''}
            </span>
          </div>
        </div>
        <div style={{marginLeft: 'auto'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedReservation(r)}
          >
            Afficher les détails
          </button>
        </div>
        {(r.status === 'pending' || r.status === 'paid') && (
          <CancelReservationButton reservation={r} />
        )}
        
        {/* Zone d'affichage des avis existants pour réservations */}
        {r.status === 'delivered' && hasAvis('reservation', r.id) && (
          <div style={{ 
            marginTop: 12, 
            padding: '12px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: 8, 
            border: '1px solid #0ea5e9' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8
            }}>
              <span style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: '#0369a1'
              }}>
                ✅ Avis déjà donné
              </span>
              <span style={{
                fontSize: 12,
                color: '#0369a1',
                backgroundColor: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 500
              }}>
                {existingAvis.find(a => a.reservation_id === r.id)?.note || 0}⭐
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#0369a1', fontStyle: 'italic' }}>
              Merci d'avoir partagé votre expérience !
            </div>
          </div>
        )}

        {/* Zone de notation ergonomique pour réservations terminées */}
        {r.status === 'delivered' && !hasAvis('reservation', r.id) && (
          <div style={{ 
            marginTop: 12, 
            padding: '12px', 
            backgroundColor: '#f0fdf4', 
            borderRadius: 8, 
            border: '1px solid #22c55e',
            width: '15%'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 8 
            }}>
              
              <button
                onClick={() => {
                  // Créer une pseudo-notification pour déclencher la modal d'avis
                  const pseudoNotification = {
                    id: `avis-reservation-${r.id}`,
                    type: 'avis',
                    reservation_id: r.id,
                    annonce_id: r.annonce_id,
                    contenu: 'Félicitations ! Votre réservation vient de se terminer. Partagez votre expérience avec la communauté en donnant votre avis sur cette prestation.',
                    user_id: userId
                  }
                  console.log('🎯 Déclenchement modal d\'avis pour réservation:', r.id)
                  setTriggerAvisNotification(pseudoNotification)
                }}
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                ⭐ Noter maintenant
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Composant bouton d'annulation intelligent
  function CancelReservationButton({ reservation }) {
    const [cancellationInfo, setCancellationInfo] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleCancelClick = async () => {
      setIsChecking(true);
      try {
        const conditions = await checkCancellationConditions(reservation);
        setCancellationInfo(conditions);
        setCancellationConditions(conditions);
        
        if (conditions.canCancel) {
          setSelectedCancelReservation(reservation);
          setShowCancelModal(true);
        } else {
          alert(conditions.reason);
        }
      } catch (error) {
        alert('Erreur lors de la vérification des conditions d\'annulation');
      } finally {
        setIsChecking(false);
      }
    };

    return (
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        <button
          onClick={handleCancelClick}
          disabled={isChecking}
          style={{
            background: isChecking ? '#f5f5f5' : '#fbe7ee', 
            color: isChecking ? '#999' : '#e67c73', 
            border:'none', 
            borderRadius:8,
            padding:'8px 18px', 
            fontWeight:600, 
            fontSize:15, 
            cursor: isChecking ? 'not-allowed' : 'pointer',
            opacity: isChecking ? 0.6 : 1
          }}
        >
          {isChecking ? 'Vérification...' : 'Annuler'}
        </button>
      </div>
    );
  }



  const ConfirmCancelModal = ({ onConfirm, onCancel }) => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.18)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
        padding: '32px 28px',
        minWidth: 320,
        maxWidth: 900,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>❗</div>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 10, color: '#e67c73' }}>
          Annuler la réservation ?
        </h2>
        <p style={{ fontSize: 16, color: '#444', marginBottom: 22 }}>
          Êtes-vous sûr de vouloir annuler cette réservation ?<br />
          Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              background: '#e67c73',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Oui, annuler
          </button>
          <button
            onClick={onCancel}
            style={{
              background: '#eee',
              color: '#222',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Non, garder
          </button>
        </div>
      </div>
    </div>
  )

  const handleUpdate = async (id, status) => {
    if (status === 'cancelled') {
      setShowConfirm(false)
      setPendingCancelId(null)
      const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
      if (error) {
        alert("Erreur lors de la mise à jour du statut.")
      } else {
        setReservations(reservations =>
          reservations.map(r =>
            r.id === id ? { ...r, status } : r
          )
        )
      }
      return
    }
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
    if (error) {
      alert("Erreur lors de la mise à jour du statut.")
    } else {
      setReservations(reservations =>
        reservations.map(r =>
          r.id === id ? { ...r, status } : r
        )
      )
    }
  }

  // Tri des listes par date décroissante (plus récent en haut)
  const devisSorted = [...devis].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const reservationsSorted = [...reservations].sort((a, b) => new Date(b.date) - new Date(a.date));




  return (
    <>
      <Header />
      {/* Système de notifications temps réel */}
      <RealTimeNotifications userId={userId} triggerNotification={triggerAvisNotification} />
      
      {/* Modal de notation compact */}
      {showRatingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full mx-4 overflow-hidden">
            {/* Header minimal - juste le bouton fermer */}
            <div className="flex justify-end p-2">
              <button
                onClick={() => {
                  setShowRatingForm(null);
                  setRatingValue(0);
                  setRatingComment('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-4 pb-4">
              {/* Étoiles compactes */}
              <div className="text-center mb-4">
                <div className="flex justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      className={`transition-all duration-200 hover:scale-110 ${
                        star <= ratingValue ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                {ratingValue > 0 && (
                  <p className="text-sm text-gray-600">
                    {ratingValue === 5 && "🌟 Excellent !"}
                    {ratingValue === 4 && "😊 Très bien"}
                    {ratingValue === 3 && "👍 Bien"}
                    {ratingValue === 2 && "😐 Moyen"}
                    {ratingValue === 1 && "😞 Décevant"}
                  </p>
                )}
              </div>
              
              {/* Commentaire compact */}
              <div className="mb-4">
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Votre commentaire (optionnel)..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {ratingComment.length}/200
                </div>
              </div>
              
              {/* Boutons compacts */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRatingForm(null);
                    setRatingValue(0);
                    setRatingComment('');
                  }}
                  disabled={isSubmittingRating}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={submitRatingFromMenu}
                  disabled={isSubmittingRating || ratingValue === 0}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    ratingValue === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isSubmittingRating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Envoi...</span>
                    </div>
                  ) : (
                    '✨ Publier'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Hero Section avec statistiques */}
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
              {/* Greeting Section */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                      Bonjour {profile?.nom ? profile.nom.split(" ")[0] : ""}!
                    </h1>
                    <p className="text-gray-600">Gérez vos réservations et devis en un coup d'œil</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                className="flex items-center gap-2 bg-gradient-to-r from-blue-800 to-blue-800 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5" />
                Trouver un prestataire
              </button>
              <button
                className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                onClick={() => router.push("/particuliers/profil#favoris")}
              >
                <Heart className="w-5 h-5" />
                Mes favoris
              </button>
              <button
                className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                onClick={() => router.push("/particuliers/messages")}
              >
                <Activity className="w-5 h-5" />
                Messages
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Onglet Vue d'ensemble */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`p-6 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                activeTab === 'overview'
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === 'overview' ? 'bg-indigo-500' : 'bg-gray-100'
                }`}>
                  <Grid3X3 className={`w-5 h-5 ${
                    activeTab === 'overview' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    activeTab === 'overview' ? 'text-indigo-900' : 'text-gray-900'
                  }`}>Vue d'ensemble</h2>
                  <p className="text-sm text-gray-500">Tous vos éléments</p>
                </div>
              </div>
            </button>

            {/* Onglet Devis */}
            <button
              onClick={() => setActiveTab('devis')}
              className={`p-6 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                activeTab === 'devis'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === 'devis' ? 'bg-blue-500' : 'bg-blue-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    activeTab === 'devis' ? 'text-white' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    activeTab === 'devis' ? 'text-blue-900' : 'text-gray-900'
                  }`}>Mes devis</h2>
                  <p className="text-sm text-gray-500">Réponses des prestataires</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${
                  activeTab === 'devis' ? 'text-blue-700' : 'text-blue-600'
                }`}>
                  {devis.length}
                </div>
              </div>
            </button>

            {/* Onglet Réservations */}
            <button
              onClick={() => setActiveTab('reservations')}
              className={`p-6 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                activeTab === 'reservations'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === 'reservations' ? 'bg-green-500' : 'bg-green-100'
                }`}>
                  <Calendar className={`w-5 h-5 ${
                    activeTab === 'reservations' ? 'text-white' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    activeTab === 'reservations' ? 'text-green-900' : 'text-gray-900'
                  }`}>Réservations</h2>
                  <p className="text-sm text-gray-500">Prestations réservées</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${
                  activeTab === 'reservations' ? 'text-green-700' : 'text-green-600'
                }`}>
                  {reservations.length}
                </div>
                
              </div>
            </button>


          </div>

          {/* Vue d'ensemble - Affiche toutes les sections */}
          {activeTab === 'overview' && (
            <>
              {/* Section Devis */}
              {devisSorted.length > 0 && (
                <section className="mb-8">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Mes devis</h2>
                            <p className="text-sm text-gray-600">{devisSorted.length} devis au total</p>
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                          onClick={() => setActiveTab('devis')}
                        >
                          <span className="text-sm font-medium">Voir tout</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid gap-4">
                        {devisSorted.slice(0, 3).map((r) => (
                          <DevisCard key={r.id} r={r} />
                        ))}
                        {devisSorted.length > 3 && (
                          <div className="text-center py-4">
                            <button
                              onClick={() => setActiveTab('devis')}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Voir {devisSorted.length - 3} autres devis...
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Section Devis uniquement */}
          {activeTab === 'devis' && devisSorted.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Tous mes devis</h2>
                        <p className="text-sm text-gray-600">{devisSorted.length} devis au total</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {devisSorted.map((r) => (
                      <DevisCard key={r.id} r={r} />
                    ))}
                  </div>
                </div>
              </div>
              <DevisInfoModal devis={selectedDevis} onClose={() => setSelectedDevis(null)} />
            </section>
          )}

          {/* Vue d'ensemble - Section Réservations */}
          {activeTab === 'overview' && reservationsSorted.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Mes réservations</h2>
                        <p className="text-sm text-gray-600">{reservationsSorted.length} réservations au total</p>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-2 text-green-600 hover:text-green-800 transition-colors"
                      onClick={() => setActiveTab('reservations')}
                    >
                      <span className="text-sm font-medium">Voir tout</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {reservationsSorted.slice(0, 3).map(r => (
                      <ReservationCard key={r.id} r={r} />
                    ))}
                    {reservationsSorted.length > 3 && (
                      <div className="text-center py-4">
                        <button
                          onClick={() => setActiveTab('reservations')}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Voir {reservationsSorted.length - 3} autres réservations...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section Réservations uniquement */}
          {activeTab === 'reservations' && reservationsSorted.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="text-green-600 hover:text-green-800 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Toutes mes réservations</h2>
                        <p className="text-sm text-gray-600">{reservationsSorted.length} réservations au total</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {/* Filtres améliorés */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Filtres</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="confirmed">✅ Confirmé</option>
                        <option value="cancelled">❌ Annulé</option>
                        <option value="refused">🚫 Rejeté</option>
                        <option value="pending">⏳ En attente</option>
                      </select>
                      <select
                        value={prestationFilter}
                        onChange={e => setPrestationFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="all">Toutes les prestations</option>
                        {prestations.map(p => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <button
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-left focus:ring-2 focus:ring-green-500 focus:border-transparent hover:bg-gray-50"
                          onClick={() => setShowCalendar(!showCalendar)}
                        >
                          <Calendar className="w-4 h-4 inline mr-2" />
                          {dateFilter === 'all' ? 'Toutes les dates' : 'Date sélectionnée'}
                        </button>
                        {showCalendar && (
                          <MiniCalendar onSelect={setDateFilter} />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Liste des réservations */}
                  <div className="grid gap-4">
                    {reservationsSorted.map(r => (
                      <ReservationCard key={r.id} r={r} />
                    ))}
                  </div>
                  <ReservationInfoModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
                  {showConfirm && (
                    <ConfirmCancelModal
                      onConfirm={() => handleUpdate(pendingCancelId, 'cancelled')}
                      onCancel={() => {
                        setShowConfirm(false)
                        setPendingCancelId(null)
                      }}
                    />
                  )}
                  
                  {/* Modal d'annulation simplifié */}
                  {showCancelModal && selectedCancelReservation && (
                    <div 
                      style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                      }}
                      onClick={() => {
                        setShowCancelModal(false);
                        setSelectedCancelReservation(null);
                        setCancelReason('');
                        setCancellationConditions(null);
                      }}
                    >
                      <div 
                        style={{
                          background: '#fff',
                          borderRadius: 20,
                          maxWidth: 600,
                          width: '100%',
                          maxHeight: '90vh',
                          overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          padding: '32px',
                          borderRadius: '20px 20px 0 0',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                            Annuler la réservation
                          </h2>
                        </div>

                        <div style={{ padding: '32px' }}>
                          {/* Informations sur la réservation */}
                          <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#334155' }}>
                              📅 Détails de la réservation
                            </h2>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 14 }}>
                              <strong style={{ color: '#475569' }}>Service :</strong>
                              <span style={{ color: '#64748b' }}>{selectedCancelReservation?.annonces?.titre || 'Service non spécifié'}</span>
                              
                              <strong style={{ color: '#475569' }}>Prestataire :</strong>
                              <span style={{ color: '#64748b' }}>{selectedCancelReservation?.profiles?.nom || 'Prestataire non spécifié'}</span>
                              
                              <strong style={{ color: '#475569' }}>Date :</strong>
                              <span style={{ color: '#64748b' }}>
                                {selectedCancelReservation?.date ? new Date(selectedCancelReservation.date).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'Date non spécifiée'}
                              </span>
                              
                              {selectedCancelReservation?.prix && (
                                <>
                                  <strong style={{ color: '#475569' }}>Montant payé :</strong>
                                  <span style={{ color: '#64748b', fontWeight: 600 }}>{selectedCancelReservation.prix}€</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Affichage des conditions d'annulation */}
                          {cancellationConditions && (
                            <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                              <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#334155' }}>
                                📋 Conditions d'annulation
                              </h2>
                              
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ 
                                  display: 'inline-block',
                                  padding: '8px 16px', 
                                  borderRadius: 20, 
                                  fontSize: 13,
                                  fontWeight: 600,
                                  background: cancellationConditions.canCancel ? '#dcfce7' : '#fecaca',
                                  color: cancellationConditions.canCancel ? '#15803d' : '#dc2626'
                                }}>
                                  {cancellationConditions.canCancel ? '✅ Annulation autorisée' : '❌ Annulation non autorisée'}
                                </div>
                              </div>

                              <div style={{ marginBottom: 12 }}>
                                <strong style={{ fontSize: 14, color: '#475569' }}>Politique :</strong>
                                <span style={{ marginLeft: 8, fontSize: 14, color: '#64748b' }}>
                                  {selectedCancelReservation?.annonces?.conditions_annulation || 'Standard'}
                                </span>
                              </div>

                              {selectedCancelReservation?.date && (
                                <div style={{ marginBottom: 12 }}>
                                  <strong style={{ fontSize: 14, color: '#475569' }}>Temps restant :</strong>
                                  <span style={{ marginLeft: 8, fontSize: 14, color: '#64748b' }}>
                                    {(() => {
                                      const reservationDate = new Date(selectedCancelReservation.date);
                                      const currentDate = new Date();
                                      const timeDiff = reservationDate.getTime() - currentDate.getTime();
                                      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                                      const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));
                                      
                                      if (daysDiff > 1) {
                                        return `${daysDiff} jours`;
                                      } else if (hoursDiff > 1) {
                                        return `${hoursDiff} heures`;
                                      } else {
                                        return 'Moins d\'une heure';
                                      }
                                    })()}
                                  </span>
                                </div>
                              )}

                              {cancellationConditions.canCancel && (
                                <>
                                  <div style={{ marginBottom: 12 }}>
                                    <strong style={{ fontSize: 14, color: '#475569' }}>Remboursement :</strong>
                                    <span style={{ 
                                      marginLeft: 8, 
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: cancellationConditions.refundPercentage === 100 ? '#059669' : 
                                             cancellationConditions.refundPercentage === 50 ? '#d97706' : '#dc2626'
                                    }}>
                                      {cancellationConditions.refundPercentage}% du montant payé
                                      {selectedCancelReservation?.prix && (
                                        <span style={{ marginLeft: 8, fontSize: 13, color: '#64748b' }}>
                                          (soit {Math.round((selectedCancelReservation.prix * cancellationConditions.refundPercentage) / 100)}€)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div style={{ 
                                    padding: 12, 
                                    background: '#f1f5f9', 
                                    borderRadius: 8, 
                                    borderLeft: '4px solid #3b82f6' 
                                  }}>
                                    <span style={{ fontSize: 13, color: '#475569' }}>
                                      {cancellationConditions.message}
                                    </span>
                                  </div>
                                </>
                              )}

                              {!cancellationConditions.canCancel && (
                                <div style={{ 
                                  padding: 12, 
                                  background: '#fef2f2', 
                                  borderRadius: 8, 
                                  borderLeft: '4px solid #ef4444' 
                                }}>
                                  <span style={{ fontSize: 13, color: '#dc2626' }}>
                                    {cancellationConditions.reason}
                                  </span>
                                </div>
                              )}

                              {cancellationConditions.forceMajeure && (
                                <div style={{ 
                                  marginTop: 12,
                                  padding: 12, 
                                  background: '#fffbeb', 
                                  borderRadius: 8, 
                                  borderLeft: '4px solid #f59e0b' 
                                }}>
                                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                                    ⚠️ Annulation pour force majeure uniquement
                                  </span>
                                  <br />
                                  <span style={{ fontSize: 12, color: '#92400e' }}>
                                    Une justification détaillée est requise (minimum 20 caractères)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Champ motif d'annulation */}
                          {cancellationConditions && cancellationConditions.canCancel && (
                            <div style={{ marginBottom: 24 }}>
                              <label style={{
                                display: 'block',
                                marginBottom: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#333'
                              }}>
                                {cancellationConditions.forceMajeure ? 'Justification détaillée (obligatoire)' : 'Motif d\'annulation'}
                                {cancellationConditions.forceMajeure && (
                                  <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                                )}
                              </label>
                              <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder={
                                  cancellationConditions.forceMajeure 
                                    ? "Veuillez expliquer en détail les circonstances exceptionnelles justifiant cette annulation..."
                                    : "Pourquoi souhaitez-vous annuler cette réservation ?"
                                }
                                style={{
                                  width: '100%',
                                  minHeight: cancellationConditions.forceMajeure ? 120 : 80,
                                  padding: '12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: 8,
                                  fontSize: 14,
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                              />
                              {cancellationConditions.forceMajeure && cancelReason && cancelReason.trim().length < 20 && (
                                <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>
                                  Justification trop courte ({cancelReason.trim().length}/20 caractères minimum)
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setShowCancelModal(false);
                                setSelectedCancelReservation(null);
                                setCancelReason('');
                                setCancellationConditions(null);
                              }}
                              style={{
                                background: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 12,
                                padding: '14px 24px',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Fermer
                            </button>
                            
                            {cancellationConditions && cancellationConditions.canCancel && (
                              <button
                                onClick={handleCancelReservation}
                                disabled={
                                  isCancelling || 
                                  (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20))
                                }
                                style={{
                                  background: (isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20)))
                                    ? '#d1d5db' : '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 12,
                                  padding: '14px 24px',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: (isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20)))
                                    ? 'not-allowed' : 'pointer',
                                  opacity: (isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20)))
                                    ? 0.7 : 1
                                }}
                              >
                                {isCancelling ? 'Annulation...' : 
                                 cancellationConditions.refundPercentage === 100 ? 'Confirmer l\'annulation (remboursement intégral)' :
                                 cancellationConditions.refundPercentage === 50 ? 'Confirmer l\'annulation (remboursement 50%)' :
                                 'Confirmer l\'annulation (aucun remboursement)'
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}







          {/* Section vide selon l'onglet actif */}
          {activeTab === 'devis' && devisSorted.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun devis pour le moment</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Recherchez des prestataires et demandez des devis personnalisés pour vos besoins.
              </p>
              <button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5 inline mr-2" />
                Trouver des prestataires
              </button>
            </div>
          )}

          {activeTab === 'reservations' && reservationsSorted.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune réservation active</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Réservez des prestations pour votre événement et organisez votre planning.
              </p>
              <button
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5 inline mr-2" />
                Rechercher des services
              </button>
            </div>
          )}



          {/* Section vide globale */}
          {activeTab === 'overview' && devisSorted.length === 0 && reservationsSorted.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Commencez votre recherche !
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Découvrez des prestataires exceptionnels pour votre mariage et commencez à créer des souvenirs inoubliables.
              </p>
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5 inline mr-2" />
                Découvrir les prestataires
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ParticularHomeMenu;