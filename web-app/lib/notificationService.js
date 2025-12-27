import { supabase } from './supabaseClient';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  RESERVATION: 'reservation',
  MESSAGE: 'message',
  REMINDER: 'reminder',
  PAYMENT: 'payment',
  AVIS: 'avis',
  NEW_DEMANDE: 'new_demande',
  NEW_DEVIS: 'new_devis',
  DEVIS_ACCEPTED: 'devis_accepte',
  DEVIS_REJECTED: 'devis_refuse',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  SYSTEM: 'system',
};

/**
 * Create a notification
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
}) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        action_url: actionUrl,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: notification, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, limit = 50, unreadOnly = false) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { data: null, error };
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error };
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error };
  }
};

/**
 * Get unread count
 */
export const getUnreadCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return { count: 0, error };
  }
};

// ===== Notification Senders for Specific Events =====

/**
 * Notify photographer of new demande matching their profile
 */
export const notifyNewDemande = async (photographeId, demande) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.NEW_DEMANDE,
    title: 'Nouvelle demande correspondante',
    message: `Une nouvelle demande "${demande.titre}" correspond à votre profil.`,
    data: { demandeId: demande.id },
    actionUrl: `/photographe/demandes/${demande.id}`,
  });
};

/**
 * Notify client of new devis received
 */
export const notifyNewDevis = async (particulierId, devis, photographeNom) => {
  return createNotification({
    userId: particulierId,
    type: NOTIFICATION_TYPES.NEW_DEVIS,
    title: 'Nouveau devis reçu',
    message: `${photographeNom} vous a envoyé un devis de ${devis.montant_total}€.`,
    data: { devisId: devis.id },
    actionUrl: `/client/devis/${devis.id}`,
  });
};

/**
 * Notify photographer that devis was accepted
 */
export const notifyDevisAccepted = async (photographeId, devis, clientNom) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.DEVIS_ACCEPTED,
    title: 'Devis accepté !',
    message: `${clientNom} a accepté votre devis de ${devis.montant_total}€.`,
    data: { devisId: devis.id },
    actionUrl: `/photographe/devis/${devis.id}`,
  });
};

/**
 * Notify photographer that devis was rejected
 */
export const notifyDevisRejected = async (photographeId, devis, clientNom) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.DEVIS_REJECTED,
    title: 'Devis refusé',
    message: `${clientNom} a refusé votre devis.`,
    data: { devisId: devis.id },
    actionUrl: `/photographe/devis`,
  });
};

/**
 * Notify both parties of payment received
 */
export const notifyPaymentReceived = async (reservation, clientId, photographeId) => {
  // Notify client
  await createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.PAYMENT,
    title: 'Paiement confirmé',
    message: `Votre acompte de ${reservation.montant_acompte}€ a été reçu.`,
    data: { reservationId: reservation.id },
    actionUrl: `/client/reservations/${reservation.id}`,
  });

  // Notify photographer
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.PAYMENT,
    title: 'Acompte reçu',
    message: `Acompte de ${reservation.montant_acompte}€ reçu pour la réservation du ${new Date(reservation.date_prestation).toLocaleDateString('fr-FR')}.`,
    data: { reservationId: reservation.id },
    actionUrl: `/photographe/reservations/${reservation.id}`,
  });
};

/**
 * Notify client that reservation is confirmed
 */
export const notifyReservationConfirmed = async (clientId, reservation, photographeNom) => {
  return createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.RESERVATION_CONFIRMED,
    title: 'Réservation confirmée',
    message: `${photographeNom} a confirmé votre réservation du ${new Date(reservation.date_prestation).toLocaleDateString('fr-FR')}.`,
    data: { reservationId: reservation.id },
    actionUrl: `/client/reservations/${reservation.id}`,
  });
};

/**
 * Notify of reservation cancellation
 */
export const notifyReservationCancelled = async (userId, reservation, cancelledByName) => {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.RESERVATION_CANCELLED,
    title: 'Réservation annulée',
    message: `La réservation du ${new Date(reservation.date_prestation).toLocaleDateString('fr-FR')} a été annulée par ${cancelledByName}.`,
    data: { reservationId: reservation.id },
    actionUrl: `/shared/remboursements`,
  });
};

/**
 * Notify of new message
 */
export const notifyNewMessage = async (userId, senderNom, conversationId) => {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.MESSAGE,
    title: 'Nouveau message',
    message: `${senderNom} vous a envoyé un message.`,
    data: { conversationId },
    actionUrl: `/shared/messages/${conversationId}`,
  });
};

/**
 * Send reminder notification
 */
export const sendReminder = async (userId, title, message, data = {}, actionUrl = null) => {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.REMINDER,
    title,
    message,
    data,
    actionUrl,
  });
};

/**
 * Request review notification after completed reservation
 */
export const notifyRequestReview = async (clientId, reservation, photographeNom) => {
  return createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.AVIS,
    title: 'Donnez votre avis',
    message: `Comment s'est passée votre séance avec ${photographeNom} ? Laissez un avis !`,
    data: { reservationId: reservation.id },
    actionUrl: `/shared/avis/create?reservationId=${reservation.id}`,
  });
};

/**
 * Subscribe to real-time notifications (returns channel)
 */
export const subscribeToNotifications = (userId, onNotification) => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from notifications
 */
export const unsubscribeFromNotifications = (channel) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

export default {
  NOTIFICATION_TYPES,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  notifyNewDemande,
  notifyNewDevis,
  notifyDevisAccepted,
  notifyDevisRejected,
  notifyPaymentReceived,
  notifyReservationConfirmed,
  notifyReservationCancelled,
  notifyNewMessage,
  sendReminder,
  notifyRequestReview,
  subscribeToNotifications,
  unsubscribeFromNotifications,
};
