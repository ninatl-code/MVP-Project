import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { 
  registerForPushNotificationsAsync, 
  savePushToken,
  resetBadge 
} from '../../lib/notificationService';
import FooterPresta from '../../components/FooterPresta';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#5C6BC0',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  success: '#10B981'
};

interface NotificationSettings {
  all_enabled: boolean;
  new_reservation: boolean;
  reservation_confirmed: boolean;
  reminder_24h: boolean;
  reminder_2h: boolean;
  cancellation: boolean;
  new_message: boolean;
  payment_received: boolean;
  new_avis: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    all_enabled: true,
    new_reservation: true,
    reservation_confirmed: true,
    reminder_24h: true,
    reminder_2h: true,
    cancellation: true,
    new_message: true,
    payment_received: true,
    new_avis: true
  });
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await savePushToken(user.id, token);
        }
      }
    } catch (error) {
      console.error('Erreur initialisation push:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.notification_settings) {
        setSettings({ ...settings, ...data.notification_settings });
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_settings: newSettings,
          notifications_enabled: newSettings.all_enabled
        })
        .eq('id', user.id);

      if (error) throw error;

      setSettings(newSettings);
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    }
  };

  const toggleAllNotifications = async (value: boolean) => {
    const newSettings = {
      ...settings,
      all_enabled: value
    };
    await saveSettings(newSettings);
  };

  const toggleSetting = async (key: keyof NotificationSettings) => {
    if (key === 'all_enabled') {
      await toggleAllNotifications(!settings.all_enabled);
    } else {
      const newSettings = {
        ...settings,
        [key]: !settings[key]
      };
      await saveSettings(newSettings);
    }
  };

  const handleResetBadge = async () => {
    await resetBadge();
    Alert.alert('✅', 'Badge réinitialisé');
  };

  const handleTestNotification = () => {
    Alert.alert(
      '🔔 Notification de test',
      'Voici un exemple de notification push que vous recevrez sur cet appareil.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="notifications" size={40} color={COLORS.primary} />
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Gérez vos préférences de notifications</Text>
        </View>

        {/* Activer/Désactiver toutes les notifications */}
        <View style={styles.section}>
          <View style={styles.mainToggle}>
            <View style={styles.toggleLeft}>
              <Ionicons 
                name={settings.all_enabled ? "notifications" : "notifications-off"} 
                size={24} 
                color={settings.all_enabled ? COLORS.primary : COLORS.textLight} 
              />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Toutes les notifications</Text>
                <Text style={styles.toggleSubtitle}>
                  {settings.all_enabled ? 'Activées' : 'Désactivées'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.all_enabled}
              onValueChange={() => toggleSetting('all_enabled')}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Paramètres détaillés */}
        {settings.all_enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Réservations</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Nouvelle réservation</Text>
                  <Text style={styles.settingDescription}>
                    Quand un client réserve un service
                  </Text>
                </View>
                <Switch
                  value={settings.new_reservation}
                  onValueChange={() => toggleSetting('new_reservation')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Confirmation de réservation</Text>
                  <Text style={styles.settingDescription}>
                    Quand vous confirmez une réservation
                  </Text>
                </View>
                <Switch
                  value={settings.reservation_confirmed}
                  onValueChange={() => toggleSetting('reservation_confirmed')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Annulation</Text>
                  <Text style={styles.settingDescription}>
                    Quand une réservation est annulée
                  </Text>
                </View>
                <Switch
                  value={settings.cancellation}
                  onValueChange={() => toggleSetting('cancellation')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Rappels</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Rappel 24h avant</Text>
                  <Text style={styles.settingDescription}>
                    La veille du rendez-vous
                  </Text>
                </View>
                <Switch
                  value={settings.reminder_24h}
                  onValueChange={() => toggleSetting('reminder_24h')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Rappel 2h avant</Text>
                  <Text style={styles.settingDescription}>
                    2 heures avant le rendez-vous
                  </Text>
                </View>
                <Switch
                  value={settings.reminder_2h}
                  onValueChange={() => toggleSetting('reminder_2h')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💬 Messages & Paiements</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Nouveaux messages</Text>
                  <Text style={styles.settingDescription}>
                    Quand vous recevez un message
                  </Text>
                </View>
                <Switch
                  value={settings.new_message}
                  onValueChange={() => toggleSetting('new_message')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Paiement reçu</Text>
                  <Text style={styles.settingDescription}>
                    Quand vous recevez un paiement
                  </Text>
                </View>
                <Switch
                  value={settings.payment_received}
                  onValueChange={() => toggleSetting('payment_received')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Nouvel avis</Text>
                  <Text style={styles.settingDescription}>
                    Quand vous recevez un avis client
                  </Text>
                </View>
                <Switch
                  value={settings.new_avis}
                  onValueChange={() => toggleSetting('new_avis')}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleResetBadge}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Réinitialiser le badge</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleTestNotification}>
            <Ionicons name="send" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Tester une notification</Text>
          </TouchableOpacity>
        </View>

        {/* Informations */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>À propos des notifications</Text>
            <Text style={styles.infoDescription}>
              Les notifications vous permettent de rester informé en temps réel de votre activité. 
              Vous pouvez les désactiver à tout moment dans les paramètres de votre appareil.
            </Text>
            {pushToken && Platform.OS === 'android' && (
              <Text style={styles.infoMeta}>
                Token: {pushToken.substring(0, 20)}...
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8
  },
  mainToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  toggleText: {
    flex: 1
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2
  },
  toggleSubtitle: {
    fontSize: 12,
    color: COLORS.textLight
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  settingLeft: {
    flex: 1,
    marginRight: 12
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  actionButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12
  },
  infoText: {
    flex: 1
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  infoDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18
  },
  infoMeta: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  }
});
