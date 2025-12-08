import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import Constants from 'expo-constants';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 
    | 'reservation' 
    | 'message' 
    | 'reminder' 
    | 'cancellation' 
    | 'payment' 
    | 'avis'
    | 'new_demande'          // Nouvelle demande pour un photographe
    | 'new_devis'            // Nouveau devis reçu par un client
    | 'devis_lu'             // Devis lu par le client
    | 'devis_accepte'        // Devis accepté
    | 'devis_refuse'         // Devis refusé
    | 'demande_pourvue'      // Demande pourvue (un autre photographe a été choisi)
    | 'galerie_ready'        // Galerie de photos prête
    | 'tirages_expedies'     // Tirages expédiés
    | 'album_expedie';       // Album expédié
  title: string;
  body: string;
  data?: any;
}

/**
 * Enregistre le device pour recevoir les notifications push
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5C6BC0',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission notifications refusée');
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Erreur lors de la récupération du push token:', error);
    }
  } else {
    console.log('Les notifications push nécessitent un appareil physique');
  }

  return token;
}

/**
 * Sauvegarde le token de notification dans la base de données
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token, notifications_enabled: true })
      .eq('id', userId);

    if (error) throw error;
    console.log('Token de notification sauvegardé');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error);
  }
}

/**
 * Envoie une notification locale
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: trigger || null,
  });

  return id;
}

/**
 * Envoie une notification de nouvelle réservation
 */
export async function sendNewReservationNotification(
  prestataireId: string,
  reservationData: {
    num_reservation: string;
    client_nom: string;
    service: string;
    date: string;
    montant: number;
  }
): Promise<void> {
  try {
    // Récupérer le token du prestataire
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', prestataireId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) {
      console.log('Notifications désactivées pour ce prestataire');
      return;
    }

    // Envoyer la notification via Expo Push
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: '🎉 Nouvelle réservation !',
        body: `${reservationData.client_nom} a réservé ${reservationData.service} pour le ${reservationData.date}`,
        data: {
          type: 'reservation',
          reservation_id: reservationData.num_reservation,
        },
        priority: 'high',
        channelId: 'default',
      }),
    });

    console.log('Notification de réservation envoyée');
  } catch (error) {
    console.error('Erreur envoi notification réservation:', error);
  }
}

/**
 * Envoie une notification de confirmation de réservation au client
 */
export async function sendConfirmationNotification(
  clientId: string,
  reservationData: {
    num_reservation: string;
    prestataire_nom: string;
    service: string;
    date: string;
  }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', clientId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: '✅ Réservation confirmée',
        body: `Votre réservation avec ${reservationData.prestataire_nom} est confirmée pour le ${reservationData.date}`,
        data: {
          type: 'confirmation',
          reservation_id: reservationData.num_reservation,
        },
      }),
    });

    console.log('Notification de confirmation envoyée');
  } catch (error) {
    console.error('Erreur envoi notification confirmation:', error);
  }
}

/**
 * Planifie un rappel de rendez-vous
 */
export async function scheduleReminderNotification(
  userId: string,
  reservationData: {
    num_reservation: string;
    service: string;
    date: Date;
    heure: string;
  },
  hoursBefore: number = 24
): Promise<void> {
  try {
    const reminderDate = new Date(reservationData.date);
    reminderDate.setHours(reminderDate.getHours() - hoursBefore);

    // Vérifier que la date de rappel est dans le futur
    if (reminderDate < new Date()) {
      console.log('Date de rappel dans le passé, annulation');
      return;
    }

    await scheduleLocalNotification(
      '⏰ Rappel de rendez-vous',
      `N'oubliez pas votre rendez-vous ${reservationData.service} ${hoursBefore === 24 ? 'demain' : 'dans 2h'} à ${reservationData.heure}`,
      {
        type: 'reminder',
        reservation_id: reservationData.num_reservation,
      },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      }
    );

    console.log(`Rappel planifié pour ${reminderDate}`);
  } catch (error) {
    console.error('Erreur planification rappel:', error);
  }
}

/**
 * Envoie une notification d'annulation
 */
export async function sendCancellationNotification(
  userId: string,
  reservationData: {
    num_reservation: string;
    service: string;
    date: string;
  },
  isPrestataire: boolean = false
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: '❌ Réservation annulée',
        body: `La réservation ${reservationData.service} du ${reservationData.date} a été annulée`,
        data: {
          type: 'cancellation',
          reservation_id: reservationData.num_reservation,
        },
      }),
    });

    console.log('Notification d\'annulation envoyée');
  } catch (error) {
    console.error('Erreur envoi notification annulation:', error);
  }
}

/**
 * Envoie une notification de nouveau message
 */
export async function sendNewMessageNotification(
  recipientId: string,
  messageData: {
    sender_name: string;
    message_preview: string;
    conversation_id: string;
  }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', recipientId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: `💬 ${messageData.sender_name}`,
        body: messageData.message_preview,
        data: {
          type: 'message',
          conversation_id: messageData.conversation_id,
        },
      }),
    });

    console.log('Notification de message envoyée');
  } catch (error) {
    console.error('Erreur envoi notification message:', error);
  }
}

/**
 * Envoie une notification de paiement reçu
 */
export async function sendPaymentReceivedNotification(
  prestataireId: string,
  paymentData: {
    client_nom: string;
    montant: number;
    service: string;
  }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', prestataireId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: '💰 Paiement reçu',
        body: `${paymentData.client_nom} a payé ${paymentData.montant}€ pour ${paymentData.service}`,
        data: {
          type: 'payment',
        },
      }),
    });

    console.log('Notification de paiement envoyée');
  } catch (error) {
    console.error('Erreur envoi notification paiement:', error);
  }
}

/**
 * Envoie une notification de nouvel avis
 */
export async function sendNewAvisNotification(
  prestataireId: string,
  avisData: {
    client_nom: string;
    note: number;
    commentaire: string;
  }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', prestataireId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) return;

    const stars = '⭐'.repeat(avisData.note);

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: `${stars} Nouvel avis`,
        body: `${avisData.client_nom} vous a laissé un avis : "${avisData.commentaire.substring(0, 50)}..."`,
        data: {
          type: 'avis',
        },
      }),
    });

    console.log('Notification d\'avis envoyée');
  } catch (error) {
    console.error('Erreur envoi notification avis:', error);
  }
}

/**
 * Annule toutes les notifications planifiées
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Toutes les notifications planifiées ont été annulées');
}

/**
 * Obtient le nombre de notifications non lues (badge)
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Définit le nombre de notifications non lues (badge)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Incrémente le badge de notifications
 */
export async function incrementBadge(): Promise<void> {
  const current = await getBadgeCount();
  await setBadgeCount(current + 1);
}

/**
 * Réinitialise le badge de notifications
 */
export async function resetBadge(): Promise<void> {
  await setBadgeCount(0);
}

// ========================================
// NOUVELLES NOTIFICATIONS - Modèle Demandes/Devis
// ========================================

/**
 * Fonction générique pour envoyer une notification push
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: any;
  }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    if (!profile?.push_token || !profile?.notifications_enabled) {
      console.log('Notifications désactivées pour cet utilisateur');
      return;
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        priority: 'high',
        channelId: 'default',
      }),
    });

    console.log('Notification push envoyée');
  } catch (error) {
    console.error('❌ Erreur envoi notification push:', error);
  }
}

/**
 * Notifier un photographe d'une nouvelle demande correspondant à son profil
 */
export async function notifyNewDemande(
  photographeId: string,
  demandeData: {
    id: string;
    titre: string;
    categorie: string;
    lieu_ville: string;
    date_souhaitee: string;
    budget_max?: number;
  }
): Promise<void> {
  try {
    const budgetText = demandeData.budget_max ? ` - Budget: ${demandeData.budget_max}€` : '';
    
    await sendPushNotification(photographeId, {
      title: '📸 Nouvelle demande correspondant à votre profil',
      body: `${demandeData.titre} - ${demandeData.categorie} à ${demandeData.lieu_ville}${budgetText}`,
      data: {
        type: 'new_demande',
        demande_id: demandeData.id,
      },
    });

    // Créer notification dans la DB
    await supabase.from('notifications').insert({
      user_id: photographeId,
      type: 'new_demande',
      titre: 'Nouvelle demande',
      contenu: `${demandeData.titre} - ${demandeData.lieu_ville} - ${demandeData.date_souhaitee}`,
      lien: `/photographe/demandes/${demandeData.id}`,
      metadata: {
        demande_id: demandeData.id,
        categorie: demandeData.categorie,
      },
    });

    await incrementBadge();
    console.log('✅ Notification nouvelle demande envoyée');
  } catch (error) {
    console.error('❌ Erreur notification nouvelle demande:', error);
  }
}

/**
 * Notifier un client qu'il a reçu un nouveau devis
 */
export async function notifyNewDevis(
  clientId: string,
  devisData: {
    id: string;
    demande_id: string;
    demande_titre: string;
    photographe_nom: string;
    montant_total: number;
  }
): Promise<void> {
  try {
    await sendPushNotification(clientId, {
      title: '💰 Nouveau devis reçu',
      body: `${devisData.photographe_nom} vous a envoyé un devis de ${devisData.montant_total}€ pour "${devisData.demande_titre}"`,
      data: {
        type: 'new_devis',
        devis_id: devisData.id,
        demande_id: devisData.demande_id,
      },
    });

    // Créer notification dans la DB
    await supabase.from('notifications').insert({
      user_id: clientId,
      type: 'new_devis',
      titre: 'Nouveau devis',
      contenu: `${devisData.photographe_nom} - ${devisData.montant_total}€`,
      lien: `/client/devis/${devisData.id}`,
      metadata: {
        devis_id: devisData.id,
        demande_id: devisData.demande_id,
        montant: devisData.montant_total,
      },
    });

    await incrementBadge();
    console.log('✅ Notification nouveau devis envoyée');
  } catch (error) {
    console.error('❌ Erreur notification nouveau devis:', error);
  }
}

/**
 * Notifier un photographe que son devis a été lu par le client
 */
export async function notifyDevisLu(
  photographeId: string,
  devisData: {
    id: string;
    demande_titre: string;
    client_nom: string;
  }
): Promise<void> {
  try {
    await sendPushNotification(photographeId, {
      title: '👀 Devis consulté',
      body: `${devisData.client_nom} a consulté votre devis pour "${devisData.demande_titre}"`,
      data: {
        type: 'devis_lu',
        devis_id: devisData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: photographeId,
      type: 'devis_lu',
      titre: 'Devis consulté',
      contenu: `${devisData.client_nom} - ${devisData.demande_titre}`,
      lien: `/photographe/devis/${devisData.id}`,
      metadata: {
        devis_id: devisData.id,
      },
    });

    console.log('✅ Notification devis lu envoyée');
  } catch (error) {
    console.error('❌ Erreur notification devis lu:', error);
  }
}

/**
 * Notifier un photographe que son devis a été accepté
 */
export async function notifyDevisAccepte(
  photographeId: string,
  devisData: {
    id: string;
    demande_titre: string;
    client_nom: string;
    montant_total: number;
    date_prestation: string;
  }
): Promise<void> {
  try {
    await sendPushNotification(photographeId, {
      title: '🎉 Félicitations ! Devis accepté',
      body: `${devisData.client_nom} a accepté votre devis de ${devisData.montant_total}€ pour le ${devisData.date_prestation}`,
      data: {
        type: 'devis_accepte',
        devis_id: devisData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: photographeId,
      type: 'devis_accepte',
      titre: 'Devis accepté',
      contenu: `${devisData.client_nom} - ${devisData.montant_total}€ - ${devisData.date_prestation}`,
      lien: `/photographe/devis/${devisData.id}`,
      metadata: {
        devis_id: devisData.id,
        montant: devisData.montant_total,
      },
    });

    await incrementBadge();
    console.log('✅ Notification devis accepté envoyée');
  } catch (error) {
    console.error('❌ Erreur notification devis accepté:', error);
  }
}

/**
 * Notifier un photographe que son devis a été refusé
 */
export async function notifyDevisRefuse(
  photographeId: string,
  devisData: {
    id: string;
    demande_titre: string;
    client_nom: string;
  }
): Promise<void> {
  try {
    await sendPushNotification(photographeId, {
      title: 'Devis refusé',
      body: `${devisData.client_nom} a refusé votre devis pour "${devisData.demande_titre}"`,
      data: {
        type: 'devis_refuse',
        devis_id: devisData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: photographeId,
      type: 'devis_refuse',
      titre: 'Devis refusé',
      contenu: `${devisData.client_nom} - ${devisData.demande_titre}`,
      lien: `/photographe/devis/${devisData.id}`,
      metadata: {
        devis_id: devisData.id,
      },
    });

    console.log('✅ Notification devis refusé envoyée');
  } catch (error) {
    console.error('❌ Erreur notification devis refusé:', error);
  }
}

/**
 * Notifier un photographe que la demande a été pourvue par un autre photographe
 */
export async function notifyDemandePourvue(
  photographeId: string,
  demandeData: {
    id: string;
    titre: string;
  }
): Promise<void> {
  try {
    await sendPushNotification(photographeId, {
      title: 'Demande pourvue',
      body: `La demande "${demandeData.titre}" a été pourvue par un autre photographe`,
      data: {
        type: 'demande_pourvue',
        demande_id: demandeData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: photographeId,
      type: 'demande_pourvue',
      titre: 'Demande pourvue',
      contenu: demandeData.titre,
      lien: `/photographe/demandes/${demandeData.id}`,
      metadata: {
        demande_id: demandeData.id,
      },
    });

    console.log('✅ Notification demande pourvue envoyée');
  } catch (error) {
    console.error('❌ Erreur notification demande pourvue:', error);
  }
}

/**
 * Notifier un client que sa galerie de photos est prête
 */
export async function notifyGalerieReady(
  clientId: string,
  galerieData: {
    id: string;
    reservation_id: string;
    photographe_nom: string;
    nombre_photos: number;
  }
): Promise<void> {
  try {
    await sendPushNotification(clientId, {
      title: '📷 Vos photos sont prêtes !',
      body: `${galerieData.photographe_nom} a mis en ligne ${galerieData.nombre_photos} photos de votre prestation`,
      data: {
        type: 'galerie_ready',
        galerie_id: galerieData.id,
        reservation_id: galerieData.reservation_id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: clientId,
      type: 'galerie_ready',
      titre: 'Photos disponibles',
      contenu: `${galerieData.photographe_nom} - ${galerieData.nombre_photos} photos`,
      lien: `/shared/livraison/galerie/${galerieData.id}`,
      metadata: {
        galerie_id: galerieData.id,
        reservation_id: galerieData.reservation_id,
      },
    });

    await incrementBadge();
    console.log('✅ Notification galerie prête envoyée');
  } catch (error) {
    console.error('❌ Erreur notification galerie prête:', error);
  }
}

/**
 * Notifier un client que ses tirages ont été expédiés
 */
export async function notifyTiragesExpedies(
  clientId: string,
  tirageData: {
    id: string;
    numero_suivi?: string;
    quantite_total: number;
  }
): Promise<void> {
  try {
    const suiviText = tirageData.numero_suivi 
      ? ` - Suivi: ${tirageData.numero_suivi}` 
      : '';
    
    await sendPushNotification(clientId, {
      title: '📦 Tirages expédiés',
      body: `Vos ${tirageData.quantite_total} tirages ont été expédiés${suiviText}`,
      data: {
        type: 'tirages_expedies',
        tirage_id: tirageData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: clientId,
      type: 'tirages_expedies',
      titre: 'Tirages expédiés',
      contenu: `${tirageData.quantite_total} tirages${suiviText}`,
      lien: `/shared/livraison/tirages/${tirageData.id}`,
      metadata: {
        tirage_id: tirageData.id,
        numero_suivi: tirageData.numero_suivi,
      },
    });

    await incrementBadge();
    console.log('✅ Notification tirages expédiés envoyée');
  } catch (error) {
    console.error('❌ Erreur notification tirages expédiés:', error);
  }
}

/**
 * Notifier un client que son album a été expédié
 */
export async function notifyAlbumExpedie(
  clientId: string,
  albumData: {
    id: string;
    titre: string;
    numero_suivi?: string;
  }
): Promise<void> {
  try {
    const suiviText = albumData.numero_suivi 
      ? ` - Suivi: ${albumData.numero_suivi}` 
      : '';
    
    await sendPushNotification(clientId, {
      title: '📚 Album expédié',
      body: `Votre album "${albumData.titre}" a été expédié${suiviText}`,
      data: {
        type: 'album_expedie',
        album_id: albumData.id,
      },
    });

    await supabase.from('notifications').insert({
      user_id: clientId,
      type: 'album_expedie',
      titre: 'Album expédié',
      contenu: `${albumData.titre}${suiviText}`,
      lien: `/shared/livraison/albums/${albumData.id}`,
      metadata: {
        album_id: albumData.id,
        numero_suivi: albumData.numero_suivi,
      },
    });

    await incrementBadge();
    console.log('✅ Notification album expédié envoyée');
  } catch (error) {
    console.error('❌ Erreur notification album expédié:', error);
  }
}
