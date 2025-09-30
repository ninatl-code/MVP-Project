import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function RealTimeNotifications({ userId, triggerNotification }) {
  const [notifications, setNotifications] = useState([])
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [currentRatingRequest, setCurrentRatingRequest] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fonction pour convertir la durée en heures selon l'unité
  const convertDurationToHours = (duree, unit_tarif) => {
    if (!duree || !unit_tarif) return 0;
    
    switch (unit_tarif) {
      case 'heure':
        return duree;
      case 'demi_journee':
        return duree * 4;
      case 'journee':
        return duree * 8;
      case 'seance':
        return duree * 24;
      case 'forfait':
        return duree * 24;
      default:
        return duree; // Par défaut, on considère que c'est en heures
    }
  };

  // Fonction pour vérifier et mettre à jour les réservations expirées
  const checkAndUpdateExpiredReservations = async () => {
    try {
      console.log('🕐 Vérification des réservations expirées...');
      
      // Récupérer toutes les réservations confirmées qui ne sont pas encore terminées
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, date, duree, unit_tarif, status, particulier_id')
        .in('status', ['confirmed', 'paid'])
        .not('date', 'is', null)
        .not('duree', 'is', null);

      if (error) {
        console.error('❌ Erreur lors de la récupération des réservations:', error);
        return;
      }

      if (!reservations || reservations.length === 0) {
        console.log('📝 Aucune réservation à vérifier');
        return;
      }

      const now = new Date();
      const expiredReservations = [];

      reservations.forEach(reservation => {
        const startDate = new Date(reservation.date);
        const durationInHours = convertDurationToHours(reservation.duree, reservation.unit_tarif);
        const endDate = new Date(startDate.getTime() + (durationInHours * 60 * 60 * 1000));

        console.log(`🔍 Réservation ${reservation.id}:`, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          now: now.toISOString(),
          durationInHours,
          isExpired: now >= endDate
        });

        if (now >= endDate) {
          expiredReservations.push(reservation);
        }
      });

      if (expiredReservations.length > 0) {
        console.log(`✅ ${expiredReservations.length} réservation(s) à marquer comme terminée(s):`, expiredReservations.map(r => r.id));
        
        // Mettre à jour le statut des réservations expirées
        const { data: updatedReservations, error: updateError } = await supabase
          .from('reservations')
          .update({ status: 'finished' })
          .in('id', expiredReservations.map(r => r.id))
          .select('id, particulier_id');

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour des réservations:', updateError);
        } else {
          console.log('🎉 Réservations mises à jour avec succès:', updatedReservations);
          
          // Créer des notifications pour informer les particuliers que leurs réservations sont terminées
          if (updatedReservations && updatedReservations.length > 0) {
            // Récupérer les informations complètes des réservations pour la notification
            const { data: fullReservations } = await supabase
              .from('reservations')
              .select('id, particulier_id, annonce_id')
              .in('id', updatedReservations.map(r => r.id));

            const notifications = fullReservations.map(reservation => ({
              user_id: reservation.particulier_id,
              type: 'avis',
              contenu: 'Félicitations ! Votre réservation vient de se terminer. Partagez votre expérience avec la communauté en donnant votre avis sur cette prestation.',
              lu: false,
              reservation_id: reservation.id,
              annonce_id: reservation.annonce_id,
              created_at: new Date().toISOString()
            }));

            const { error: notificationError } = await supabase
              .from('notifications')
              .insert(notifications);

            if (notificationError) {
              console.error('❌ Erreur lors de la création des notifications:', notificationError);
            } else {
              console.log('📬 Notifications d\'avis créées pour les réservations terminées');
            }
          }
        }
      } else {
        console.log('📝 Aucune réservation expirée trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur dans checkAndUpdateExpiredReservations:', error);
    }
  };

  // 1. Charger les notifications existantes et vérifier les réservations expirées
  useEffect(() => {
    if (!userId) return

    const fetchNotifications = async () => {
      // Vérifier les réservations expirées avant de charger les notifications
      await checkAndUpdateExpiredReservations();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        console.log('🔔 Notifications récupérées:', data.length)
        setNotifications(data)
        
        // Les modals d'avis ne s'affichent plus automatiquement
        // Elles s'ouvrent uniquement via un clic utilisateur
        console.log('✅ Notifications chargées, pas d\'affichage automatique de modal')
      } else if (error) {
        console.error('❌ Erreur lors du chargement des notifications:', error)
      }
    }

    fetchNotifications()
  }, [userId])

  // Vérification périodique des réservations expirées (toutes les 5 minutes)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      console.log('⏰ Vérification périodique des réservations expirées...');
      checkAndUpdateExpiredReservations();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [userId])

  // 2. Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    if (!userId) return

    console.log('🔔 Activation des notifications temps réel pour userId:', userId)

    const subscription = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('🆕 Nouvelle notification reçue:', payload.new)
        
        const newNotification = payload.new
        setNotifications(prev => [newNotification, ...prev])

        // Les nouvelles notifications d'avis ne déclenchent plus automatiquement de modal
        // Un highlight sera affiché pour attirer l'attention
        if (newNotification.type === 'avis') {
          console.log('⭐ Nouvelle notification d\'avis reçue (pas d\'ouverture auto):', newNotification.id)
        }
      })
      .subscribe()

    return () => {
      console.log('🔌 Déconnexion des notifications temps réel')
      subscription.unsubscribe()
    }
  }, [userId, showRatingModal])

  // 3. Déclenchement manuel du modal d'avis (appelé depuis notification.js)
  useEffect(() => {
    if (triggerNotification) {
      console.log('🎯 Déclenchement manuel du modal d\'avis:', triggerNotification)
      setCurrentRatingRequest(triggerNotification)
      setShowRatingModal(true)
      setRating(0)
      setComment('')
    }
  }, [triggerNotification])

  // 4. Soumettre la notation avec logique améliorée utilisant les IDs directs
  const submitRating = async () => {
    if (!currentRatingRequest || rating === 0) {
      alert('Veuillez sélectionner une note de 1 à 5 étoiles')
      return
    }

    setIsSubmitting(true)

    try {
      // Utiliser directement les IDs de la notification plutôt que de chercher
      const notification = currentRatingRequest
      let annonceId = null
      let entityType = null
      let entityId = null

      // 1. Priorité aux IDs directs de la notification
      if (notification.annonce_id) {
        annonceId = notification.annonce_id
        console.log('🎯 Annonce ID trouvé directement dans la notification:', annonceId)
      }

      if (notification.commande_id) {
        entityType = 'commande'
        entityId = notification.commande_id
        console.log('🎯 Commande ID trouvé:', entityId)
      } else if (notification.reservation_id) {
        entityType = 'reservation'
        entityId = notification.reservation_id
        console.log('🎯 Réservation ID trouvé:', entityId)
      }

      // 2. Si pas d'annonce_id direct, chercher via l'entité
      if (!annonceId && entityType && entityId) {
        console.log(`🔍 Recherche de l'annonce via ${entityType}:`, entityId)
        
        const { data: entityData, error: entityError } = await supabase
          .from(entityType === 'commande' ? 'commandes' : 'reservations')
          .select('annonce_id')
          .eq('id', entityId)
          .single()

        if (entityError) {
          console.error(`❌ Erreur lors de la recherche de l'annonce via ${entityType}:`, entityError)
          throw new Error(`Impossible de trouver l'annonce associée à la ${entityType}`)
        }

        if (!entityData?.annonce_id) {
          console.error(`❌ Aucune annonce trouvée pour ${entityType} ID:`, entityId)
          throw new Error(`Aucune annonce associée à cette ${entityType}`)
        }

        annonceId = entityData.annonce_id
        console.log('✅ Annonce ID trouvé via entité:', annonceId)
      }

      // 3. Validation finale
      if (!annonceId) {
        console.error('❌ Impossible de déterminer l\'ID de l\'annonce:', notification)
        throw new Error('Impossible de trouver l\'annonce pour cet avis')
      }

      // 4. Soumission de l'avis
      console.log('📝 Soumission avis - Annonce ID:', annonceId, 'Note:', rating)

      const { error: avisError } = await supabase
        .from('avis')
        .insert({
          annonce_id: annonceId,
          user_id: userId,
          rating: rating,
          comment: comment.trim() || null,
          commande_id: notification.commande_id || null,
          reservation_id: notification.reservation_id || null
        })

      if (avisError) {
        console.error('❌ Erreur lors de la soumission de l\'avis:', avisError)
        throw avisError
      }

      // 5. Marquer la notification comme lue
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id)

      if (updateError) {
        console.warn('⚠️ Erreur lors de la mise à jour de la notification:', updateError)
      }

      console.log('✅ Avis soumis avec succès!')
      alert('Merci pour votre avis !')

      // Reset du modal
      setShowRatingModal(false)
      setCurrentRatingRequest(null)
      setRating(0)
      setComment('')

      // Actualiser les notifications
      const { data: updatedNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (updatedNotifications) {
        setNotifications(updatedNotifications)
      }

    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 5. Fermer la modal (reporter à plus tard)
  const closeModal = async () => {
    if (currentRatingRequest) {
      console.log('🔄 Reporter à plus tard - marquage notification comme lue:', currentRatingRequest.id)
      // Marquer comme lue mais sans rating
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', currentRatingRequest.id)
      
      if (error) {
        console.error('❌ Erreur lors du marquage comme lue:', error)
      } else {
        console.log('✅ Notification reportée avec succès')
      }
      
      setNotifications(prev => prev.filter(n => n.id !== currentRatingRequest.id))
    }
    
    console.log('🚪 Fermeture de la modal (reporter)')
    setShowRatingModal(false)
    setCurrentRatingRequest(null)
    setRating(0)
    setComment('')
  }

  // 6. Composant Star Rating amélioré
  const StarRating = ({ rating, onRatingChange }) => {
    const [hoverRating, setHoverRating] = useState(0)
    
    return (
      <div className="flex gap-2 justify-center py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className={`
              text-4xl transition-all duration-200 transform hover:scale-110 
              ${star <= (hoverRating || rating) 
                ? 'text-yellow-400 drop-shadow-lg' 
                : 'text-gray-300 hover:text-yellow-300'
              }
            `}
          >
            {star <= (hoverRating || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Modal de notation améliorée */}
      {showRatingModal && currentRatingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop transparent avec flou */}
          <div 
            className="fixed inset-0 bg-white bg-opacity-40 backdrop-blur-md transition-opacity"
            onClick={closeModal}
          ></div>
          
          {/* Conteneur modal centré */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all">
              
              {/* Header avec icône */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl p-6 text-white text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {currentRatingRequest.reservation_id ? 'Réservation terminée !' : 'Commande livrée !'}
                </h2>
                <p className="text-blue-100 text-sm">
                  Aidez la communauté en partageant votre expérience
                </p>
              </div>

              {/* Contenu principal */}
              <div className="p-6">
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-gray-700 text-center leading-relaxed">
                    {currentRatingRequest.contenu}
                  </p>
                </div>

                {/* Section notation */}
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Quelle note donnez-vous à cette prestation ?
                  </h2>
                  
                  <div className="bg-white rounded-xl border-2 border-gray-100 p-4 mb-2">
                    <StarRating rating={rating} onRatingChange={setRating} />
                  </div>
                  
                  {rating > 0 && (
                    <p className="text-sm text-gray-500 animate-fade-in">
                      {rating === 5 && "⭐ Excellent !"}
                      {rating === 4 && "😊 Très bien !"}
                      {rating === 3 && "👍 Bien"}
                      {rating === 2 && "😐 Moyen"}
                      {rating === 1 && "😞 Décevant"}
                    </p>
                  )}
                </div>

                {/* Zone de commentaire */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Décrivez votre expérience, ce qui vous a plu ou moins plu..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none h-28 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                    maxLength={500}
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {comment.length}/500
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors font-medium"
                  >
                    Reporter à plus tard
                  </button>
                  
                  <button
                    onClick={submitRating}
                    disabled={isSubmitting || rating === 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Envoi en cours...
                      </div>
                    ) : (
                      '✨ Publier mon avis'
                    )}
                  </button>
                </div>

                {/* Note de confidentialité */}
                <p className="text-xs text-gray-400 text-center mt-4">
                  🔒 Votre avis sera publié de manière anonyme
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}