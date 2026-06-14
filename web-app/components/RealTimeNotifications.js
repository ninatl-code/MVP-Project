import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { notifyRequestReview } from '../lib/notificationService'
import * as avisService from '../lib/avisService'
import * as reservationService from  '../lib/reservationService';

export default function RealTimeNotifications({ userId, triggerNotification }) {
  const [notifications, setNotifications] = useState([])
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [currentRatingRequest, setCurrentRatingRequest] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -----------------------------
  // 1. EXPIRATION LOGIC (OPTIMISÉE)
  // -----------------------------
  const checkAndUpdateExpiredReservations = useCallback(async () => {
    try {
      const now = new Date()

      const { data: reservations, error } = await reservationService.getPhotographerReservations(photographeId, 'confirmed')
      if (error || !reservations) return

      const expiredIds = []

      for (const r of reservations) {
        const start = new Date(r.date)
        if (isNaN(start.getTime())) continue

        const end = new Date(
          start.getTime() + r.duree_heures * 3600 * 1000
        )

        if (now >= end) {
          expiredIds.push(r.id)
        }
      }

      if (expiredIds.length === 0) return

      for (const id of expiredIds) {
        const { data: updated, error: updateError } = await reservationService.completeReservation(id)
      }
      if (updateError || !updated) return

      // Notifications avis
      for (const r of updated) {
        await notifyRequestReview(r.client_id, r.id, r.demande_id)
      }
    } catch (err) {
      console.error('checkAndUpdateExpiredReservations error:', err)
    }
  }, [])

  // -----------------------------
  // 2. FETCH INITIAL NOTIFICATIONS
  // -----------------------------
  const fetchNotifications = useCallback(async () => {
    await checkAndUpdateExpiredReservations()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setNotifications(data)
    }
  }, [userId, checkAndUpdateExpiredReservations])

  useEffect(() => {
    if (!userId) return
    fetchNotifications()
  }, [userId, fetchNotifications])

  // -----------------------------
  // 3. POLLING EXPIRATION (CLEAN)
  // -----------------------------
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      checkAndUpdateExpiredReservations()
    }, 60 * 60 * 1000) // 1h (plus logique que 4h)

    return () => clearInterval(interval)
  }, [userId, checkAndUpdateExpiredReservations])

  // -----------------------------
  // 4. REALTIME NOTIFICATIONS
  // -----------------------------
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // -----------------------------
  // 5. TRIGGER MODAL EXTERNE
  // -----------------------------
  useEffect(() => {
    if (!triggerNotification) return

    setCurrentRatingRequest(triggerNotification)
    setShowRatingModal(true)
    setRating(0)
    setComment('')
  }, [triggerNotification])

  // -----------------------------
  // 6. SUBMIT AVIS
  // -----------------------------
  const submitRating = async () => {
    if (!currentRatingRequest || rating === 0) return

    setIsSubmitting(true)

    try {
      const n = currentRatingRequest

      const demandeId = n.demande_id
      if (!demandeId) throw new Error('demande_id introuvable')

      const { error } = await avisService.createReview({reviewerId: userId, revieweeId: n.prestataire_id, reservationId: n.reservation_id, note: rating, commentaire: comment.trim() || null, demandeId: demandeId})

      if (error) throw error

      await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', n.id)

      setShowRatingModal(false)
      setCurrentRatingRequest(null)
      setRating(0)
      setComment('')

      fetchNotifications()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // -----------------------------
  // 7. CLOSE MODAL
  // -----------------------------
  const closeModal = async () => {
    if (currentRatingRequest) {
      await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', currentRatingRequest.id)

      setNotifications(prev =>
        prev.filter(n => n.id !== currentRatingRequest.id)
      )
    }

    setShowRatingModal(false)
    setCurrentRatingRequest(null)
    setRating(0)
    setComment('')
  }

  // -----------------------------
  // 8. UI STAR RATING (memo simple)
  // -----------------------------
  const StarRating = ({ value, onChange }) => {
    const [hover, setHover] = useState(0)

    return (
      <div className="flex gap-2 justify-center py-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="text-4xl"
          >
            {s <= (hover || value) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    )
  }

  // -----------------------------
  // 9. RENDER
  // -----------------------------
  return (
    <>
      {showRatingModal && currentRatingRequest && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
              
              <div className="p-6 text-center">
                <h2 className="text-xl font-bold mb-2">
                  Laisser un avis
                </h2>

                <p className="text-gray-600 mb-4">
                  {currentRatingRequest.contenu}
                </p>

                <StarRating value={rating} onChange={setRating} />

                <textarea
                  className="w-full border p-3 rounded mt-4"
                  placeholder="Commentaire..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />

                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 border p-2">
                    Plus tard
                  </button>

                  <button
                    onClick={submitRating}
                    disabled={isSubmitting || rating === 0}
                    className="flex-1 bg-blue-600 text-white p-2 rounded"
                  >
                    {isSubmitting ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}