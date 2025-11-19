import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import ShootyLogoSimple from './ShootyLogo';

const COLORS = {
  primary: '#fff',
  accent: '#635BFF',
  text: '#222',
  error: '#EF4444',
};

export default function FooterPresta() {
  const router = useRouter();
  const [stats, setStats] = useState({
    messages: 0,
    notifications: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compter les messages non lus
      const { data: unreadMessages } = await supabase
        .from('conversations')
        .select('id')
        .eq('artist_id', user.id)
        .eq('lu', false);

      // Compter les notifications non lues  
      const { data: unreadNotifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('lu', false);

      setStats({
        messages: unreadMessages?.length || 0,
        notifications: unreadNotifs?.length || 0
      });
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <View style={styles.footer}>
      <View style={styles.left}>
        <ShootyLogoSimple width={35} height={35} />
      </View>

      <View style={styles.center}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/messages')}>
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
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/kpis')}>
          <Ionicons name="stats-chart-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Stats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/profil')}>
          <Ionicons name="person-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Profil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/notification')}>
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
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Déconnexion</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    zIndex: 50,
  },
  left: {
    flex: 1,
    alignItems: 'flex-start',
  },
  center: {
    flex: 3,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.accent,
    marginTop: 4,
    textAlign: 'center',
  },
  logoutBtn: {
    alignItems: 'center',
    padding: 4,
  },
  logoutText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF385C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});