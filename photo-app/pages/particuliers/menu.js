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
  const [commandes, setCommandes] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [prestations, setPrestations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [prestationFilter, setPrestationFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [showDevis, setShowDevis] = useState(true)
  const [showReservations, setShowReservations] = useState(true)
  const [showCommandes, setShowCommandes] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'devis', 'reservations', 'commandes'
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [commandeQuantities, setCommandeQuantities] = useState({});
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

  // Fonction pour charger les commandes
  const fetchCommandes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: commandesData } = await supabase
      .from("commandes")
      .select("*, annonces!commandes_annonce_id_fkey(titre)")
      .eq("particulier_id", user.id);
    setCommandes(commandesData || []);

    // Récupérer les données de livraisons associées
    if (commandesData && commandesData.length > 0) {
      const commandeIds = commandesData.map(c => c.id);
      const { data: livraisonsData } = await supabase
        .from("livraisons")
        .select("*")
        .in("commande_id", commandeIds);
      setLivraisons(livraisonsData || []);
    }
  };

  // Fonction pour charger les livraisons
  const fetchLivraisons = async () => {
    if (commandes && commandes.length > 0) {
      const commandeIds = commandes.map(c => c.id);
      const { data: livraisonsData } = await supabase
        .from("livraisons")
        .select("*")
        .in("commande_id", commandeIds);
      setLivraisons(livraisonsData || []);
    }
  };

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

      // Utiliser la fonction fetchCommandes pour charger commandes et livraisons
      await fetchCommandes();
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

  // États pour l'annulation de commande
  const [showCancelCommandeModal, setShowCancelCommandeModal] = useState(false);
  const [selectedCancelCommande, setSelectedCancelCommande] = useState(null);
  const [commandeCancelReason, setCommandeCancelReason] = useState('');
  const [isCancellingCommande, setIsCancellingCommande] = useState(false);

  // Fonction pour ouvrir la modal d'annulation de commande
  const handleCancelCommande = async (commande) => {
    if (!commande) return;

    // Vérifier que la commande peut être annulée
    if (!['pending', 'paid'].includes(commande.status)) {
      alert('Cette commande ne peut plus être annulée car elle a déjà été confirmée ou expédiée.');
      return;
    }

    // Ouvrir la modal d'annulation
    setSelectedCancelCommande(commande);
    setCommandeCancelReason('');
    setShowCancelCommandeModal(true);
  };

  // Fonction pour confirmer l'annulation de commande
  const confirmCancelCommande = async () => {
    const commande = selectedCancelCommande;
    if (!commande) return;

    setIsCancellingCommande(true);
    setShowCancelCommandeModal(false);

    try {
      console.log('🚀 DÉBUT ANNULATION COMMANDE');
      console.log('📋 Commande à annuler:', commande);
      console.log('👤 User ID:', userId);
      
      // 1. Traiter le remboursement via l'API existante si la commande était payée
      if (commande.status === 'paid' && commande.montant > 0) {
        console.log('💳 Traitement du remboursement pour commande payée...');
        console.log('📦 Données envoyées à l\'API:', {
          reservationId: commande.id,
          cancelReason: commandeCancelReason || 'Annulation de commande par le client',
          userId: userId
        });
        
        const refundResponse = await fetch('/api/stripe/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reservationId: commande.id, // L'API accepte reservationId même pour les commandes
            cancelReason: commandeCancelReason || 'Annulation de commande par le client',
            userId: userId
          })
        });

        console.log('🔄 Réponse API status:', refundResponse.status);

        const refundResult = await refundResponse.json();
        console.log('📨 Réponse API complète:', refundResult);
        
        if (!refundResponse.ok) {
          console.error('❌ Erreur lors du remboursement:', refundResult);
          // Continuer même si le remboursement échoue pour permettre l'annulation
          alert(`⚠️ Commande annulée mais problème de remboursement: ${refundResult.error}\n\nVeuillez contacter le support.`);
        } else if (refundResult.success) {
          console.log('✅ Remboursement traité avec succès:', refundResult);
          alert(`✅ Remboursement de ${refundResult.montant_remboursement}€ effectué (${refundResult.pourcentage_remboursement}%)`);
        }
      }

      // 2. Mettre à jour le statut de la commande (si pas déjà fait par l'API)
      console.log('🔄 Mise à jour directe du statut de la commande...');
      const { error: updateError } = await supabase
        .from('commandes')
        .update({ 
          status: 'cancelled',
          date_annulation: new Date().toISOString(),
          motif_annulation: commandeCancelReason || 'Annulation par le client'
        })
        .eq('id', commande.id)
        .eq('particulier_id', userId); // Sécurité

      console.log('📊 Résultat mise à jour commande:', { error: updateError });

      if (updateError) {
        console.error('❌ Erreur lors de l\'annulation:', updateError);
        alert('Erreur lors de l\'annulation de la commande: ' + updateError.message);
        setIsCancellingCommande(false);
        return;
      }

      // 3. Envoyer une notification au prestataire
      console.log('🔔 Envoi notification au prestataire...');
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: commande.prestataire_id,
          type: 'commande',
          contenu: `Commande annulée par le client${commande.status === 'paid' ? ' - Remboursement en cours' : ''}`
        }]);

      console.log('📊 Résultat notification:', { error: notifError });

      if (notifError) {
        console.error('❌ Erreur notification:', notifError);
      }

      // 4. Rafraîchir les commandes
      console.log('🔄 Rafraîchissement des commandes...');
      await fetchCommandes();
      
      // Message de succès adapté selon le statut de paiement
      const successMessage = commande.status === 'paid' 
        ? '✅ Commande annulée avec succès ! Le remboursement sera traité sous 2-3 jours ouvrés.'
        : '✅ Commande annulée avec succès !';
        
      console.log('✅ FIN PROCESSUS ANNULATION - Succès complet !');
      alert(successMessage);
      
    } catch (error) {
      console.error('💥 Erreur générale dans handleCancelCommande:', error);
      alert('Erreur lors de l\'annulation: ' + error.message);
    } finally {
      console.log('🔚 Fin du processus d\'annulation');
      setIsCancellingCommande(false);
    }
  };

  // Récupérer les quantités pour chaque commande
  useEffect(() => {
    async function fetchQuantities() {
      if (commandes.length === 0) return;
      const commandeIds = commandes.map(c => c.id);
      const { data: lignes } = await supabase
        .from("commande_modeles")
        .select("commande_id, quantite")
        .in("commande_id", commandeIds);
      const quantities = {};
      commandeIds.forEach(id => {
        quantities[id] = lignes
          ? lignes.filter(l => l.commande_id === id).reduce((sum, l) => sum + (l.quantite || 0), 0)
          : 0;
      });
      setCommandeQuantities(quantities);
    }
    fetchQuantities();
  }, [commandes]);

  // Récupérer les avis existants
  useEffect(() => {
    const fetchExistingAvis = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: avisData, error } = await supabase
        .from('avis')
        .select('commande_id, reservation_id, note')
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
    if (type === 'commande') {
      return existingAvis.some(avis => avis.commande_id === id)
    } else if (type === 'reservation') {
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
      
      if (showRatingForm.type === 'commande') {
        const { data: commandeData, error: commandeError } = await supabase
          .from('commandes')
          .select('id, annonce_id, particulier_id')
          .eq('id', showRatingForm.id)
          .single();
          
        if (commandeError || !commandeData) {
          alert('Impossible de trouver la commande');
          return;
        }
        entityData = commandeData;
        
        // Récupérer l'annonce
        const { data: annonceResult, error: annonceError } = await supabase
          .from('annonces')
          .select('id, prestataire, titre')
          .eq('id', commandeData.annonce_id)
          .single();
          
        if (annonceError || !annonceResult) {
          alert('Impossible de trouver l\'annonce associée');
          return;
        }
        annonceData = annonceResult;
      } else if (showRatingForm.type === 'reservation') {
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
        commande_id: showRatingForm.type === 'commande' ? entityData.id : null,
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
          commande_id: showRatingForm.type === 'commande' ? entityData.id : null,
          reservation_id: showRatingForm.type === 'reservation' ? entityData.id : null
        }]);

      if (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification d\'avis:', notificationError);
      }

      // Rafraîchir les avis existants
      const { data: updatedAvis, error } = await supabase
        .from('avis')
        .select('commande_id, reservation_id, note')
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

  // Fonction de debug pour tester la structure de la BDD
  const debugCommandes = async () => {
    console.log('🔍 Debug: structure des commandes...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .limit(1)
    
    console.log('📊 Exemple de commande:', data?.[0])
    console.log('🔑 Colonnes disponibles:', data?.[0] ? Object.keys(data[0]) : 'Aucune')
    console.log('👤 User ID actuel:', user.id)
  }

  // Fonction pour marquer une commande comme livrée (côté particulier)
  const markCommandeAsDelivered = async (commandeId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Vous devez être connecté pour effectuer cette action')
      return
    }

    try {
      console.log(`🎯 Particulier ${user.id} marque commande ${commandeId} comme livrée`)
      
      // Vérification que la commande appartient bien à l'utilisateur
      // Essayer d'abord avec 'particulier', puis avec 'particulier_id' si échec
      let commandeCheck = null;
      let checkError = null;

      // Première tentative avec 'particulier'
      const { data: commandeCheck1, error: checkError1 } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', commandeId)
        .eq('particulier', user.id)
        .maybeSingle()

      if (checkError1) {
        console.log('⚠️ Tentative avec colonne "particulier" échouée:', checkError1)
        
        // Deuxième tentative avec 'particulier_id'
        const { data: commandeCheck2, error: checkError2 } = await supabase
          .from('commandes')
          .select('*')
          .eq('id', commandeId)
          .eq('particulier_id', user.id)
          .maybeSingle()
          
        commandeCheck = commandeCheck2
        checkError = checkError2
        
        if (checkError2) {
          console.error('❌ Les deux tentatives ont échoué:', { checkError1, checkError2 })
        } else {
          console.log('✅ Succès avec colonne "particulier_id"')
        }
      } else {
        commandeCheck = commandeCheck1
        checkError = checkError1
        console.log('✅ Succès avec colonne "particulier"')
      }

      if (checkError || !commandeCheck) {
        console.error('❌ Erreur vérification commande:', checkError)
        alert(`Cette commande ne vous appartient pas ou n'existe pas. Erreur: ${checkError?.message || 'Commande non trouvée'}`)
        return
      }
      
      console.log('📋 Commande trouvée:', commandeCheck)

      if (commandeCheck.status === 'delivered') {
        alert('Cette commande est déjà marquée comme livrée')
        return
      }

      console.log('✅ Commande vérifiée, appartient à l\'utilisateur')
      
      // 1. Mise à jour du statut de la commande
      console.log('1️⃣ Mise à jour du statut de la commande...')
      
      // Déterminer quelle colonne utiliser en fonction de la vérification précédente
      const userColumn = 'particulier' in commandeCheck ? 'particulier' : 'particulier_id'
      console.log(`🔑 Utilisation de la colonne: ${userColumn}`)
      
      const currentDateTime = new Date().toISOString()
      
      const updateQuery = supabase
        .from('commandes')
        .update({ 
          status: 'delivered',
          date_livraison: currentDateTime
        })
        .eq('id', commandeId)
        
      // Utiliser la bonne colonne pour la vérification de sécurité
      const { error: commandeError } = await updateQuery.eq(userColumn, user.id)

      if (commandeError) {
        console.error('❌ Erreur mise à jour commande:', commandeError)
        alert(`Erreur lors de la mise à jour de la commande: ${commandeError.message}`)
        return
      }
      console.log('✅ Statut commande mis à jour avec date_livraison:', currentDateTime)

      // 2. Mise à jour ou création de l'entrée livraison
      console.log('2️⃣ Mise à jour de la livraison...')
      
      // Vérifier si une livraison existe déjà
      const { data: existingLivraison, error: livraisonSelectError } = await supabase
        .from('livraisons')
        .select('id, status')
        .eq('commande_id', commandeId)
        .maybeSingle() // Utiliser maybeSingle au lieu de single pour éviter l'erreur si pas de résultat

      if (livraisonSelectError) {
        console.error('❌ Erreur lors de la recherche de livraison:', livraisonSelectError)
        alert(`Erreur lors de la recherche de livraison: ${livraisonSelectError.message}`)
        return
      }

      if (existingLivraison) {
        // Mise à jour de l'entrée existante
        console.log('📦 Mise à jour de la livraison existante...')
        const { error: updateLivraisonError } = await supabase
          .from('livraisons')
          .update({
            status: 'delivered',
            delivery_date: currentDateTime,
            update_date: currentDateTime
          })
          .eq('commande_id', commandeId)

        if (updateLivraisonError) {
          console.error('❌ Erreur mise à jour livraison:', updateLivraisonError)
          alert(`Erreur lors de la mise à jour de la livraison: ${updateLivraisonError.message}`)
          return
        }
        console.log('✅ Livraison existante mise à jour avec delivery_date:', currentDateTime)
      } else {
        // Création d'une nouvelle entrée livraison
        console.log('📦 Création d\'une nouvelle livraison...')
        const { error: insertLivraisonError } = await supabase
          .from('livraisons')
          .insert({
            commande_id: commandeId,
            status: 'delivered',
            delivery_date: currentDateTime
          })

        if (insertLivraisonError) {
          console.error('❌ Erreur création livraison:', insertLivraisonError)
          alert(`Erreur lors de la création de la livraison: ${insertLivraisonError.message}`)
          return
        }
        console.log('✅ Nouvelle livraison créée avec delivery_date:', currentDateTime)
      }

      // 3. La notification de notation sera créée automatiquement par le trigger Supabase ! ✨
      console.log('3️⃣ Notification de notation sera créée automatiquement par le trigger Supabase')

      alert('Commande marquée comme livrée ✅\nVous allez recevoir une invitation à noter cette commande.')
      
      // Recharger les données
      console.log('4️⃣ Rechargement des données...')
      await fetchCommandes()
      console.log('✅ Données rechargées')
      
    } catch (error) {
      console.error('❌ Erreur générale lors du marquage comme livré:', error)
      alert(`Erreur inattendue: ${error.message}`)
    }
  }

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
    if (status === 'pending') { color = '#e67c73'; bg = '#fbeaea'; label = 'En attente' }
    if (status === 'refused') { color = '#e67c73'; bg = '#fbeaea'; label = 'Rejetée' }
    if (status === 'cancelled') { color = '#e67c73'; bg = '#fbeaea'; label = 'Annulée' }
    if (status === 'confirmed' || status === 'accepted') { color = '#3cb371'; bg = '#eafaf1'; label = 'Confirmé' }
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

  // Pop-up pour afficher les infos de la commande - Version moderne
  function CommandeInfoModal({ commande, onClose, quantity }) {
    if (!commande) return null;
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
          minWidth: 320,
          maxWidth: 700,
          width: '100%',
          textAlign: 'left',
          position: 'relative',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px',
            borderRadius: '20px 20px 0 0',
            color: 'white'
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              🛒 Détail de la commande {commande.num_commande && <span style={{fontSize: 18, opacity: 0.9}}>#{commande.num_commande}</span>}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
              Commande du {commande.date_commande ? new Date(commande.date_commande).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
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
                  <strong>{commande.profiles?.nom || commande.prestataire_nom || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>
                  Service : {commande.annonces?.titre || 'Non renseigné'}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📦 Commande
                </h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Quantité :</strong> {quantity || 0} article{quantity > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>Mode :</strong> {commande.mode_livraison || 'Non renseigné'}
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
                <span style={{ fontSize: 14, color: '#555' }}>Montant articles :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{commande.montant || 0} MAD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Frais de livraison :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#f39c12' }}>{commande.frais_livraison || 0} MAD</span>
              </div>
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>Total :</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#6bbf7b' }}>
                  {((commande.montant || 0) + (commande.frais_livraison || 0))} MAD
                </span>
              </div>
            </div>

            {/* Adresse de livraison */}
            <div style={{
              background: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1565c0', display: 'flex', alignItems: 'center', gap: 8 }}>
                🏠 Adresse de livraison
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#1565c0' }}>
                {commande.adresse_livraison || 'Non renseignée'}
              </p>
            </div>

            {/* Commentaire */}
            {commande.commentaire && (
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
                  "{commande.commentaire}"
                </p>
              </div>
            )}

            {/* Photos */}
            {Array.isArray(commande.photos) && commande.photos.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📸 Photos jointes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
                  {commande.photos.map((b64, idx) => (
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
            {(commande.status === 'confirmed' || commande.status === 'cancelled' || commande.status === 'refused') && (
              <div style={{
                background: commande.status === 'confirmed' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${commande.status === 'confirmed' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: commande.status === 'confirmed' ? '#155724' : '#721c24' 
                }}>
                  {commande.status === 'confirmed' ? '✅ Confirmée' : commande.status === 'cancelled' ? '❌ Annulée' : '🚫 Refusée'}
                </h4>
                {commande.status === 'confirmed' && commande.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Confirmée le {new Date(commande.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {commande.status === 'cancelled' && (
                  <>
                    {commande.date_annulation && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Annulée le {new Date(commande.date_annulation).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {commande.motif_annulation && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {commande.motif_annulation}
                      </p>
                    )}
                  </>
                )}
                {commande.status === 'refused' && (
                  <>
                    {commande.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusée le {new Date(commande.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {commande.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {commande.motif_refus}
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

  // Bloc Commandes
  function CommandeCard({ r }) {
    const livraison = livraisons.find(l => l.commande_id === r.id);
    
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
              {r.annonces?.titre || 'Annonce'} {r.num_commande && <span style={{color: '#666', fontSize: 14, fontWeight: 400}}>#{r.num_commande}</span>}
            </div>
            <div style={{color:'#888', fontSize:15, marginTop:2}}>
              Date de la commande : {r.date_commande ? new Date(r.date_commande).toLocaleDateString('fr-FR') : ''}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Mode de livraison : {r.mode_livraison || 'Non renseigné'}
            </div>
          </div>
          <div style={{marginLeft: 16}}>
            <StatusBadge status={r.status} />
          </div>
        </div>
        
        {/* Affichage du suivi de livraison pour les commandes payées */}
        <LivraisonTracker commande={r} livraison={livraison} />
        
        <div style={{marginTop:16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
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
            onClick={() => setSelectedCommande(r)}
          >
            Afficher les détails
          </button>
          
          {/* Bouton d'annulation pour les commandes non expédiées */}
          <CancelCommandeButton commande={r} />
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
          <div style={{color:'#6bbf7b', fontSize:15, marginTop:6, fontWeight:600}}>
            {r.annonces?.titre ? `Annonce réservée : ${r.annonces.titre}` : ''} {r.num_reservation && <span style={{color: '#666', fontSize: 14, fontWeight: 400}}>#{r.num_reservation}</span>}
          </div>
          <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
            {r.prestation ? `Prestation : ${prestations.find(p => p.id === r.prestation)?.nom || ''}` : ''}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:18, marginTop:10, flexWrap:'wrap'}}>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#bdbdbd"/></svg>
              {r.endroit || 'Lieu inconnu'}
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#bdbdbd"/></svg>
              {r.nb_personnes ? `${r.nb_personnes} ws` : '' }
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#bdbdbd"/></svg>
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
        
        {/* Zone d'affichage des avis existants pour commandes livrées */}
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

  // Composant bouton d'annulation pour commandes
  function CancelCommandeButton({ commande }) {
    // Vérifier si la commande peut être annulée
    const canCancel = ['pending', 'paid'].includes(commande.status);
    
    if (!canCancel) return null;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCancelCommande(commande);
        }}
        disabled={isCancelling}
        style={{
          background: isCancelling ? '#f5f5f5' : '#fef2f2',
          color: isCancelling ? '#999' : '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
          cursor: isCancelling ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          marginTop: 8,
          opacity: isCancelling ? 0.6 : 1
        }}
        onMouseOver={(e) => {
          if (!isCancelling) {
            e.target.style.background = '#fee2e2';
            e.target.style.borderColor = '#fca5a5';
          }
        }}
        onMouseOut={(e) => {
          if (!isCancelling) {
            e.target.style.background = '#fef2f2';
            e.target.style.borderColor = '#fecaca';
          }
        }}
      >
        {isCancelling ? 'Annulation en cours...' : '❌ Annuler la commande'}
      </button>
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
          Annuler la commande/réservation ?
        </h2>
        <p style={{ fontSize: 16, color: '#444', marginBottom: 22 }}>
          Êtes-vous sûr de vouloir annuler cette commande/réservation ?<br />
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
  const commandesSorted = [...commandes].sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));

  // Composant de suivi de livraison
  function LivraisonTracker({ commande, livraison }) {
    if (!commande) return null;

    const getStatutLivraison = () => {
      if (!livraison) return 'paid'; // Par défaut si pas de livraison trouvée
      return livraison.status || 'paid';
    };

    const statutActuel = getStatutLivraison();
    const commandeStatus = commande.status;

    const etapes = [
      { id: 'paid', label: 'Commandé', completed: ['paid','confirmed', 'shipped', 'delivered'].includes(statutActuel) || ['paid','confirmed', 'shipped', 'delivered'].includes(commandeStatus) },
      { id: 'confirmed', label: 'Confirmé', completed: ['confirmed', 'shipped', 'delivered'].includes(statutActuel) || ['confirmed', 'shipped', 'delivered'].includes(commandeStatus) },
      { id: 'shipped', label: 'Expédié', completed: ['shipped', 'delivered'].includes(statutActuel) || ['shipped', 'delivered'].includes(commandeStatus) },
      { id: 'delivered', label: 'Livré', completed: ['delivered'].includes(statutActuel) || ['delivered'].includes(commandeStatus) }
    ];

    // Cas spécial pour annulation
    if (statutActuel === 'cancelled') {
      return (
        <div style={{ marginTop: 12, padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✕</span>
            </div>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>Annulée</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 12, padding: 16, backgroundColor: '#f8fffe', borderRadius: 8, border: '1px solid #d1fae5' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          {/* Section suivi principal */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#065f46' }}>Suivi de livraison</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {etapes.map((etape, index) => (
                <div key={etape.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      backgroundColor: etape.completed ? '#10b981' : '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 4
                    }}>
                      {etape.completed && (
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: etape.completed ? '#065f46' : '#6b7280'
                    }}>{etape.label}</span>
                    {etape.id === 'delivered' && livraison?.delivery_date && (
                      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' }}>
                        Livraison prévue le {new Date(livraison.delivery_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  {index < etapes.length - 1 && (
                    <div style={{
                      height: 2, flex: 1, backgroundColor: etapes[index + 1].completed ? '#10b981' : '#e5e7eb',
                      marginLeft: 8, marginRight: 8, marginTop: -20
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section informations de suivi et actions (à droite) */}
          <div style={{ 
            minWidth: 200, 
            paddingLeft: 16, 
            borderLeft: '1px solid #d1fae5',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {livraison?.delivery_provider && (
              <div style={{ fontSize: 12, color: '#065f46' }}>
                <span style={{ fontWeight: 600 }}>Transporteur :</span>
                <br />
                <span>{livraison.delivery_provider}</span>
              </div>
            )}
            {livraison?.tracking_number && (
              <div style={{ fontSize: 12, color: '#065f46' }}>
                <span style={{ fontWeight: 600 }}>N° de suivi :</span>
                <br />
                <span style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#f0fdf4', 
                  padding: '2px 6px', 
                  borderRadius: 4,
                  fontSize: 11
                }}>{livraison.tracking_number}</span>
              </div>
            )}
            
            {/* Bouton pour marquer comme livré (seulement si expédié mais pas encore livré) */}
            {(statutActuel === 'shipped' || commandeStatus === 'shipped') && 
             !['delivered'].includes(statutActuel) && commandeStatus !== 'delivered' && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={async () => {
                    if (confirm('Avez-vous bien reçu votre commande ? Cela marquera la commande comme livrée.')) {
                      console.log('🎯 DEBUT: Bouton marquage livraison cliqué pour commande:', commande.id)
                      console.log('📦 Info commande:', { id: commande.id, status: commande.status })
                      
                      try {
                        await markCommandeAsDelivered(commande.id)
                      } catch (error) {
                        console.error('💥 ERREUR CAPTUREE dans onClick:', error)
                        alert(`Erreur capturée: ${error.message}`)
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
                >
                  ✅ J'ai reçu ma commande
                </button>
                <div style={{
                  fontSize: 10,
                  color: '#6b7280',
                  textAlign: 'center',
                  marginTop: 4,
                  fontStyle: 'italic'
                }}>
                  Vous recevrez une invitation à noter
                </div>
              </div>
            )}
            
            {/* Zone d'affichage des avis existants pour commandes livrées */}
            {(statutActuel === 'delivered' || commandeStatus === 'delivered') && hasAvis('commande', commande.id) && (
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
                    {existingAvis.find(a => a.commande_id === commande.id)?.note || 0}⭐
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#0369a1', fontStyle: 'italic' }}>
                  Merci d'avoir partagé votre expérience !
                </div>
              </div>
            )}

            {/* Zone de notation ergonomique pour commandes livrées */}
            {(statutActuel === 'delivered' || commandeStatus === 'delivered') && !hasAvis('commande', commande.id) && (
              <div style={{ 
                marginTop:4, 
                padding: '12px', 
                backgroundColor: '#fef3cd', 
                borderRadius: 8, 
                border: '1px solid #fbbf24' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 2 
                }}>
                  <button
                    onClick={() => {
                      // Créer une pseudo-notification pour déclencher la modal d'avis
                      const pseudoNotification = {
                        id: `avis-commande-${commande.id}`,
                        type: 'avis',
                        commande_id: commande.id,
                        annonce_id: commande.annonce_id,
                        contenu: 'Félicitations ! Votre commande vient d\'être livrée. Partagez votre expérience avec la communauté en donnant votre avis sur cette prestation.',
                        user_id: userId
                      }
                      console.log('🎯 Déclenchement modal d\'avis pour commande:', commande.id)
                      setTriggerAvisNotification(pseudoNotification)
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
        </div>
      </div>
    );
  }

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
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                      Bonjour {profile?.nom ? profile.nom.split(" ")[0] : ""}!
                    </h1>
                    <p className="text-gray-600">Gérez vos commandes, réservations et devis en un coup d'œil</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5" />
                Trouver un prestataire
              </button>
              <button
                className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                onClick={() => router.push("/particuliers/favoris")}
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

            {/* Onglet Commandes */}
            <button
              onClick={() => setActiveTab('commandes')}
              className={`p-6 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                activeTab === 'commandes'
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === 'commandes' ? 'bg-purple-500' : 'bg-purple-100'
                }`}>
                  <Package className={`w-5 h-5 ${
                    activeTab === 'commandes' ? 'text-white' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    activeTab === 'commandes' ? 'text-purple-900' : 'text-gray-900'
                  }`}>Commandes</h2>
                  <p className="text-sm text-gray-500">Créations commandées</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${
                  activeTab === 'commandes' ? 'text-purple-700' : 'text-purple-600'
                }`}>
                  {commandes.length}
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

          {/* Vue d'ensemble - Section Commandes */}
          {activeTab === 'overview' && commandesSorted.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Mes commandes</h2>
                        <p className="text-sm text-gray-600">{commandesSorted.length} commandes au total</p>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
                      onClick={() => setActiveTab('commandes')}
                    >
                      <span className="text-sm font-medium">Voir tout</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {commandesSorted.slice(0, 3).map((r) => (
                      <CommandeCard key={r.id} r={r} />
                    ))}
                    {commandesSorted.length > 3 && (
                      <div className="text-center py-4">
                        <button
                          onClick={() => setActiveTab('commandes')}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                        >
                          Voir {commandesSorted.length - 3} autres commandes...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section Commandes uniquement */}
          {activeTab === 'commandes' && commandesSorted.length > 0 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Toutes mes commandes</h2>
                        <p className="text-sm text-gray-600">{commandesSorted.length} commandes au total</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {commandesSorted.map((r) => (
                      <CommandeCard key={r.id} r={r} />
                    ))}
                  </div>
                </div>
              </div>
              <CommandeInfoModal
                commande={selectedCommande}
                onClose={() => setSelectedCommande(null)}
                quantity={selectedCommande ? commandeQuantities[selectedCommande.id] : 0}
              />

              {/* Modal d'annulation de commande */}
              {showCancelCommandeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header avec icône d'alerte */}
                    <div className="relative px-6 py-5 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            Annuler la commande
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Cette action est irréversible.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowCancelCommandeModal(false);
                          setSelectedCancelCommande(null);
                          setCommandeCancelReason('');
                        }}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                        disabled={isCancellingCommande}
                      >
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="px-6 py-5 space-y-5">
                      {selectedCancelCommande && (
                        <>
                          {/* Informations de la commande avec design amélioré */}
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base mb-2">
                                  {selectedCancelCommande.titre} {selectedCancelCommande.num_commande && <span className="text-gray-500 text-sm font-normal">#{selectedCancelCommande.num_commande}</span>}
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    <span className="font-medium text-gray-700">{selectedCancelCommande.montant}€</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      selectedCancelCommande.status === 'paid' ? 'bg-green-500' : 
                                      selectedCancelCommande.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`} />
                                    <span className="text-gray-600 capitalize">{selectedCancelCommande.status}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Zone de saisie de la raison avec design amélioré */}
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Raison de l'annulation
                              <span className="text-xs font-normal text-gray-500 ml-1">(optionnel)</span>
                            </label>
                            <div className="relative">
                              <textarea
                                value={commandeCancelReason}
                                onChange={(e) => setCommandeCancelReason(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all resize-none text-sm placeholder-gray-400"
                                rows="3"
                                maxLength="300"
                                placeholder="Dites-nous pourquoi vous annulez cette commande (cela nous aide à améliorer nos services)..."
                                disabled={isCancellingCommande}
                              />
                              <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                                {commandeCancelReason.length}/300
                              </div>
                            </div>
                          </div>
                          
                          {/* Information de remboursement avec design amélioré */}
                          {selectedCancelCommande.status === 'paid' && selectedCancelCommande.montant > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-400 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-semibold text-blue-900 text-sm mb-1">
                                    Remboursement automatique
                                  </p>
                                  <p className="text-xs text-blue-700 leading-relaxed">
                                    Vous serez remboursé selon nos conditions d'annulation. Le remboursement sera effectué sous 2-3 jours ouvrés sur votre moyen de paiement.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Footer avec boutons améliorés */}
                    <div className="px-6 py-5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowCancelCommandeModal(false);
                            setSelectedCancelCommande(null);
                            setCommandeCancelReason('');
                          }}
                          className="flex-1 px-4 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isCancellingCommande}
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Garder ma commande
                        </button>
                        <button
                          onClick={confirmCancelCommande}
                          disabled={isCancellingCommande}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                          {isCancellingCommande ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Annulation en cours...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Confirmer l'annulation
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-3">
                        En confirmant, vous acceptez l'annulation définitive de cette commande
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

          {activeTab === 'commandes' && commandesSorted.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune commande passée</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Commandez des créations personnalisées auprès de nos artisans talentueux.
              </p>
              <button
                className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="w-5 h-5 inline mr-2" />
                Découvrir les créations
              </button>
            </div>
          )}

          {/* Section vide globale */}
          {activeTab === 'overview' && devisSorted.length === 0 && reservationsSorted.length === 0 && commandesSorted.length === 0 && (
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
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