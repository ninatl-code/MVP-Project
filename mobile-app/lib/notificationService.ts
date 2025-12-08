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
  type: 'reservation' | 'message' | 'reminder' | 'cancellation' | 'payment' | 'avis';
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
