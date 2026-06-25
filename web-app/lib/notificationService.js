import { supabase } from './supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Canonical notification types
 */
export const NOTIFICATION_TYPES = {
  DEVIS_RECU:             'devis_recu',
  RESERVATION_CONFIRMEE:  'reservation_confirmee',
  RESERVATION_ANNULEE:    'reservation_annulee',
  PRESTATION_TERMINEE:    'prestation_terminee',
  MISSION_SUGGEREE:       'mission_suggeree',
  DEVIS_ACCEPTE:          'devis_accepte',
  DEVIS_REFUSE:           'devis_refuse',
  NOUVEL_AVIS:            'nouvel_avis',
  MESSAGE:                'nouveau_message',
  // Moderation
  PROFIL_APPROUVE:        'profil_approuve',
  PROFIL_REFUSE:          'profil_refuse',
  COMPTE_SUSPENDU:        'compte_suspendu',
  COMPTE_REACTIVE:        'compte_reactive',
  DEMANDE_MASQUEE:        'demande_masquee',
  AVIS_MASQUE:            'avis_masque',
  AVERTISSEMENT:          'avertissement',
  SIGNALEMENT_CLOTURE:    'signalement_cloture',
};

/**
 * Create a notification
 * Accepts both (titre/contenu) and (title/message) aliases
 */
export const createNotification = async ({
  userId,
  type,
  titre,
  contenu,
  title,   // alias
  message, // alias
  reservationId = null,
  devisId = null,
  demandeId = null,
  prestataireId = null,
  avisId = null,
  avertissementId = null,
  signalementId = null,
}) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        titre: titre || title,
        contenu: contenu || message,
        lu: false,
        ...(reservationId ? { reservation_id: reservationId } : {}),
        ...(devisId ? { devis_id: devisId } : {}),
        ...(demandeId ? { demande_id: demandeId } : {}),
        ...(prestataireId ? { prestataire_id: prestataireId } : {}),
        ...(avisId ? { avis_id: avisId } : {}),
        ...(avertissementId ? { avertissement_id: avertissementId } : {}),
        ...(signalementId ? { signalement_id: signalementId } : {}),
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
      query = query.eq('lu', false);
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
        lu: true,
        lu_at: new Date().toISOString(),
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
        lu: true,
        lu_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('lu', false);

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
      .eq('lu', false);

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
export const notifyNewDemande = async (photographeId, demandeId) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.MISSION_SUGGEREE,
    titre: 'Nouvelle demande qualifiée',
    contenu: `Une nouvelle demande correspond à votre profil. Consultez-la et envoyez votre devis rapidement.`,
    demandeId: demandeId ,
    prestataireId: photographeId,
  });
};

/**
 * Notify client of new devis received
 */
export const notifyNewDevis = async (particulierId, devisId, photographeId, demandeId) => {
  return createNotification({
    userId: particulierId,
    type: NOTIFICATION_TYPES.DEVIS_RECU,
    titre: '📄 Nouveau devis reçu',
    contenu: `Un prestataire vous a envoyé un devis pour votre demande. Consultez-le et confirmez votre réservation si cela vous convient.`,
    devisId: devisId,
    demandeId: demandeId,
    prestataireId: photographeId,
  });
};

/**
 * Notify photographer that devis was accepted
 */
export const notifyDevisAccepted = async (photographeId, devisId, demandeId) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.DEVIS_ACCEPTE,
    titre: '🎉 Devis accepté !',
    contenu: `Bonne nouvelle ! Votre devis a été accepté. Confirmer la réservation rapidement ici !`,
    devisId: devisId,
    demandeId: demandeId,
    prestataireId: photographeId,
  });
};

/**
 * Notify photographer that devis was rejected
 */
export const notifyDevisRejected = async (photographeId, devisId, demandeId) => {
  return createNotification({
    userId: photographeId,
    type: NOTIFICATION_TYPES.DEVIS_REFUSE,
    titre: '📌Devis non retenu',
    contenu: `Votre devis n'a pas été accepté cette fois-ci. D'autres opportunités vous attendent.`,
    data: { devisId: devisId },
    demandeId: demandeId,
    prestataireId: photographeId,
  });
};

/**
 * Notify client that reservation is confirmed
 */
export const notifyReservationConfirmed = async (clientId, datePrestation, reservationId, demandeId, prestataireId) => {
  return createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.RESERVATION_CONFIRMEE,
    titre: '✅ Réservation confirmée',
    contenu: `Votre réservation du ${new Date(datePrestation).toLocaleDateString('fr-FR')} a été confirmée. Retrouvez tous les détails dans votre espace client`,
    reservationId: reservationId,
    demandeId: demandeId, 
    prestataireId: prestataireId,
  });
};

/**
 * Notify of reservation cancellation
 */
export const notifyReservationCancelled = async ({userId,role, reservationId, cancelledByName,demandeId}) => { 
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.RESERVATION_ANNULEE,
    titre: '❌ Réservation annulée',
    contenu: `La réservation du ${new Date(reservation.date_prestation).toLocaleDateString('fr-FR')} a été annulée par ${cancelledByName}. Consultez les détails ou contactez le prestataire pour plus d'informations`,
    reservation_id : reservationId,
    demande_id: demandeId,
  });
};


/**
 * Request review notification after completed reservation
 */
export const notifyRequestReview = async (clientId, reservationId,demandeId) => {
  return createNotification({
    userId: clientId,
    type: NOTIFICATION_TYPES.PRESTATION_TERMINEE,
    titre: 'Donnez votre avis',
    contenu: `Comment s'est passée votre dernière prestation ? Laissez un avis !`,
    reservation_id : reservationId,
    demandeId : demandeId,
  });
};


/**
 * Request review notification after completed reservation
 */
export const notifyPrestaReview = async (reservation_id, demande_id, prestaId ) => {
  console.log("=== notifyPrestaReview CALLED ===");
  console.log("reservation_id:", reservation_id);
  console.log("demande_id:", demande_id);
  console.log("prestaId:", prestaId);
  return createNotification({
    userId: prestaId,
    type: NOTIFICATION_TYPES.NOUVEL_AVIS,
    titre: 'Nouvel avis reçu',
    contenu: `Vous avez reçu un nouvel avis de la part d'un client. Consultez-le dès maintenant.`,
    reservationId: reservation_id,
    demandeId: demande_id,
    prestataireId: prestaId,
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

  export const notifyProfilApprouve = async (photographeId) => {
	  return createNotification({
		userId: photographeId,
		type: NOTIFICATION_TYPES.PROFIL_APPROUVE,
		titre: 'Votre profil a été approuvé',
		contenu: `Votre profil a été approuvé par nos modérateurs et est désormais visible.`,
		prestataireId: photographeId,
	  });
	};
	
	  export const notifyProfilRefuse = async (photographeId, motif) => {
	  return createNotification({
		userId: photographeId,
		type: NOTIFICATION_TYPES.PROFIL_REFUSE,
		titre: 'Votre profil a été refusé',
		contenu: `Votre profil n’a pas été validé. Vous pouvez le modifier et le soumettre à nouveau.`+ motif,
		prestataireId: photographeId,
	  });
	};
	
	 export const notifyCompteSuspendu = async (user_id, motif) => {
	  return createNotification({
		userId: user_id,
		type: NOTIFICATION_TYPES.COMPTE_SUSPENDU,
		titre: 'Votre Compte a été suspendu',
		contenu: `Votre compte a été temporairement suspendu suite à une violation des règles.` + motif,
	  });
	};
	
	export const notifyCompteReactive = async (user_id) => {
	  return createNotification({
		userId: user_id,
		type: NOTIFICATION_TYPES.COMPTE_REACTIVE,
		titre: 'Votre Compte a été réactivé',
		contenu: `Votre compte a été réactivé. Vous pouvez à nouveau utiliser la plateforme.`,
	  });
	};
	
	export const notifyDemandeMasquee = async (client_id, demande_id, motif) => {
	  return createNotification({
		userId: client_id,
		type: NOTIFICATION_TYPES.DEMANDE_MASQUEE,
		titre: 'Votre demande a été masquée',
		contenu: `Votre demande a été masquée et n’est plus visible publiquement.` + motif,
		demandeId : demande_id,
	  });
	};
	
  	
	export const notifyDemandeReactive = async (client_id, demande_id) => {
	  return createNotification({
		userId: client_id,
		type: NOTIFICATION_TYPES.DEMANDE_ACTIVEE,
		titre: 'Votre demande a été réactivée',
		contenu: `Votre demande a été réactivée et est à nouveau visible publiquement.`,
		demandeId : demande_id,
	  });
	};
	export const notifyAvisMasquePresta = async (photographeId, avis_id, motif) => {
	  return createNotification({
		userId: photographeId,
		type: NOTIFICATION_TYPES.AVIS_MASQUE,
		titre: 'Avis masqué',
		contenu: `Un avis reçu a été masqué.` + motif,
		avisId : avis_id,
		prestataireId: photographeId,
	  });
	};

  export const notifyAvisMasqueClient = async (clientId, avis_id, motif) => {
	  return createNotification({
		userId: clientId,
		type: NOTIFICATION_TYPES.AVIS_MASQUE,
		titre: 'Votre avis a été masqué',
		contenu: `Votre avis a été masqué par notre équipe.` + motif,
		avisId : avis_id,
		prestataireId: photographeId,
	  });
	};
	
	export const notifyAvertissement = async (user_id, reason,avertissement_id) => {
	  return createNotification({
		userId: user_id,
		type: NOTIFICATION_TYPES.AVERTISSEMENT,
		titre: `⚠️ Avertissement'}`,
		contenu: `Vous avez reçu un avertissement concernant le respect des règles de la plateforme.` + reason,
		avertissementId: avertissement_id,
	  });
	};
	
	export const notifySignalementCloture = async (user_id, signalement_id) => {
	  return createNotification({
		userId: user_id,
		type: NOTIFICATION_TYPES.SIGNALEMENT_CLOTURE,
		titre: 'Votre signalement a été traité',
		contenu: `Merci pour votre signalement. Des actions ont été prises et le dossier a été clôturé par notre équipe.`,
		signalementId : signalement_id,
	  });
	};
	

export const getNotificationLink = (notification, activeRole) => {
    const { type } = notification;
    const demande_id = notification.demande_id;
    const devis_id = notification.devis_id;
    const reservation_id = notification.reservation_id;
    const isPhotographe = activeRole === 'photographe';

    switch (type) {
      case 'mission_suggeree':
        return demande_id ? `/photographe/demandes/${demande_id}` : '/photographe/demandes?tab=plateforme';
      case 'devis_recu':
        return devis_id ? `/client/devis/${devis_id}` : '/client/devis/devis-list';
      case 'devis_accepte':
        return reservation_id ? `/photographe/reservations/${reservation_id}` : `/photographe/devis/${devis_id}`;
      case 'devis_refuse':
        return !devis_id ? '/photographe/devis' : `/photographe/devis/${devis_id}` ;
      case 'reservation_confirmee':
        return reservation_id ? `/client/reservations/${reservation_id}` : '/client/reservations';
      case 'reservation_annulee':
        return isPhotographe
          ? (reservation_id ? `/photographe/reservations/${reservation_id}` : '/photographe/reservations')
          : (reservation_id ? `/client/reservations/${reservation_id}` : '/client/reservations');
      case 'prestation_terminee':
        return reservation_id ? `/client/reservations/${reservation_id}` : '/client/reservations';
      case 'nouvel_avis':
        return '/photographe/avis-dashboard';
      case 'nouveau_message':
        return '/messages';
      case 'profil_approuve':
        return '/photographe/profil';
      case 'profil_refuse':
        return '/photographe/profil';
      case 'compte_suspendu':
        return isPhotographe? '/photographe/profil' : '/client/profil';
      case 'compte_reactive':
        return '/photographe/profil';
      case 'demande_masquee':
        return '/client/demandes/index';
      case 'avis_masque':
        return '/photographe/avis-dashboard';
      default:
        return '#';
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
  notifyReservationConfirmed,
  notifyReservationCancelled,
  notifyRequestReview,
  notifyPrestaReview,
  subscribeToNotifications,
  unsubscribeFromNotifications,
};
