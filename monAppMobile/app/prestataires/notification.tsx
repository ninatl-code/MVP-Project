import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, FlatList } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '../../components/FooterPresta';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  unread: '#DC2626',
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500'
};

interface Notification {
  id: string;
  type: string;
  contenu: string;
  created_at: string;
  lu: boolean;
}

export default function NotificationsPrestataire() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    let query = supabase.from('notification').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (filter === 'unread') query = query.eq('lu', false);

    const { data } = await query;
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notification').update({ lu: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notification').update({ lu: true }).eq('user_id', user.id).eq('lu', false);
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    if (type === 'reservation') return 'calendar';
    if (type === 'message') return 'chatbubble';
    if (type === 'review') return 'star';
    if (type === 'alert') return 'warning';
    return 'notifications';
  };

  const getIconColor = (type: string) => {
    if (type === 'reservation') return COLORS.green;
    if (type === 'message') return COLORS.blue;
    if (type === 'review') return COLORS.orange;
    if (type === 'alert') return COLORS.primary;
    return COLORS.textLight;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.lu).length;

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 60 }} />}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Toutes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>Non lues</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>Vos notifications apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notificationItem, !item.lu && styles.notificationItemUnread]}
              onPress={() => !item.lu && markAsRead(item.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '15' }]}>
                <Ionicons name={getIcon(item.type) as any} size={24} color={getIconColor(item.type)} />
              </View>
              <View style={styles.notificationContent}>
                <Text style={[styles.notificationText, !item.lu && styles.boldText]}>{item.contenu}</Text>
                <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
              </View>
              {!item.lu && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  markAllButton: { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.backgroundLight },
  filterButtonActive: { backgroundColor: COLORS.text },
  filterText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  filterTextActive: { color: 'white' },
  badge: { marginLeft: 6, backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  listContent: { paddingVertical: 8 },
  notificationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  notificationItemUnread: { backgroundColor: COLORS.backgroundLight },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationText: { fontSize: 15, color: COLORS.text, lineHeight: 20, marginBottom: 4 },
  boldText: { fontWeight: '600' },
  timeText: { fontSize: 13, color: COLORS.textLight },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.unread, marginLeft: 8 }
});
