import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  text: '#1C1C1E',
  white: '#FFFFFF',
  error: '#EF4444',
  border: '#E5E7EB',
};

export default function FooterParti() {
  const router = useRouter();
  const { profileId, user } = useAuth();
  const [stats, setStats] = useState({
    messages: 0,
    notifications: 0
  });

  useEffect(() => {
    if (!profileId) return;

    const fetchStats = async () => {
      // Compter les messages non lus
      const { count: unreadMessages } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profileId)
        .eq('lu_client', false);

      // Compter les notifications non lues
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('lu', false);

      setStats({
        messages: unreadMessages || 0,
        notifications: unreadNotifs || 0
      });
    };

    fetchStats();

    // Real-time subscriptions
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations', filter: `client_id=eq.${profileId}` },
        () => fetchStats()
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [profileId, user?.id]);

  return (
    <View style={styles.footer}>
      <View style={styles.center}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/client/menu')}>
          <Ionicons name="grid-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Menu</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/shared/messages/messages-list')}>
          <View style={styles.tabContent}>
            <Ionicons name="chatbubble-outline" size={22} color={COLORS.accent} />
            {stats.messages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.messages}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/shared/avis/notifications')}>
          <View style={styles.tabContent}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.accent} />
            {stats.notifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.notifications}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>Notifs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/client/profil/profil')}>
          <Ionicons name="person-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 50,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
});