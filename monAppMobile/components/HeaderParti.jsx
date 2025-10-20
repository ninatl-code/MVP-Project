import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from "../lib/supabaseClient";
import ShootyLogoSimple from "./ShootyLogo";

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

const IconButton = ({ children, onPress, style }) => (
  <TouchableOpacity style={[styles.iconButton, style]} onPress={onPress}>
    {children}
  </TouchableOpacity>
);

export default function Header() {
  const [profile, setProfile] = useState(null);
  const [nbUnread, setNbUnread] = useState(0);
  const navigation = useNavigation();


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation?.navigate?.('Login');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation?.navigate?.('Login');
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: unreadConvs, error: unreadError } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("lu", false);
      if (!unreadError && unreadConvs) {
        setNbUnread(unreadConvs.length);
      } else {
        setNbUnread(0);
      }
    };
    checkAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        navigation?.navigate?.('Login');
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.logoSection} onPress={() => navigation?.navigate?.('Menu')}>
        <ShootyLogoSimple width={120} height={40} />
        <Text style={styles.spacerText}>Espace client</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <IconButton onPress={() => navigation?.navigate?.('Menu')} style={{ backgroundColor: COLORS.accent }}>
          <Text style={styles.iconText}>☰</Text>
        </IconButton>

        <NotificationsPopup navigation={navigation} />

        <View style={styles.messageContainer}>
          <IconButton onPress={() => navigation?.navigate?.('Messages')} style={{ backgroundColor: COLORS.accent }}>
            <Text style={styles.iconText}>✉</Text>
          </IconButton>
          {nbUnread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{nbUnread}</Text>
            </View>
          )}
        </View>

        <IconButton onPress={handleLogout} style={{ backgroundColor: '#475569' }}>
          <Text style={styles.iconText}>⊗</Text>
        </IconButton>

        <TouchableOpacity style={styles.avatar} onPress={() => navigation?.navigate?.('Profil')}>
          {profile?.photos ? (
            <Image source={{ uri: profile.photos }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{profile?.nom ? profile.nom[0].toUpperCase() : '?'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotificationsPopup({ navigation }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      setUserId(authData?.user?.id);
      if (!authData?.user?.id) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchUserAndNotifications();
  }, []);

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('user_id', userId)
      .eq('lu', false);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data);
  };

  const unreadCount = notifications.filter((n) => !n.lu).length;

  return (
    <View style={styles.notificationContainer}>
      <TouchableOpacity
        style={[styles.notificationButton, { backgroundColor: COLORS.accent }]}
        onPress={async () => {
          setOpen(!open);
          if (!open) await markAllAsRead();
        }}
      >
        <Text style={styles.iconText}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.notificationPanel}>
          <Text style={styles.notificationTitle}>Notifications</Text>
          <ScrollView style={styles.notificationList}>
            {loading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.emptyText}>Aucune notification</Text>
            ) : (
              notifications.slice(0, 3).map((notif) => (
                <TouchableOpacity key={notif.id} style={styles.notificationItem} onPress={() => {
                  if (notif.type === 'avis') {
                    setOpen(false);
                    navigation?.navigate?.('Menu', { openAvis: notif.id });
                  } else if (notif.type === 'message') {
                    setOpen(false);
                    navigation?.navigate?.('Messages');
                  } else {
                    setOpen(false);
                    navigation?.navigate?.('Notifications');
                  }
                }}>
                  <Text style={styles.notificationItemType}>{notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}</Text>
                  <Text style={styles.notificationItemContent}>{notif.contenu}</Text>
                  <Text style={styles.notificationItemDate}>{new Date(notif.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.notificationFooter} onPress={() => { setOpen(false); navigation?.navigate?.('Notifications'); }}>
            <Text style={styles.notificationFooterText}>Voir toutes les notifications</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  logoSection: { flexDirection: 'row', alignItems: 'center' },
  spacerText: { marginLeft: 16, fontSize: 14, color: '#111', opacity: 0.6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18, fontWeight: 'bold' },
  messageContainer: { position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#DC2626', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#475569', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1e40af', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notificationContainer: { position: 'relative' },
  notificationButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationPanel: { position: 'absolute', right: 0, top: 50, width: 320, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  notificationTitle: { fontSize: 16, fontWeight: '600', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  notificationList: { maxHeight: 320 },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 32 },
  notificationItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', padding: 12 },
  notificationItemType: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  notificationItemContent: { fontSize: 12, color: '#64748b', marginTop: 4 },
  notificationItemDate: { fontSize: 10, color: '#999', marginTop: 4 },
  notificationFooter: { paddingVertical: 8, paddingHorizontal: 12, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  notificationFooterText: { color: '#1e293b', fontWeight: '600', fontSize: 12 }
});