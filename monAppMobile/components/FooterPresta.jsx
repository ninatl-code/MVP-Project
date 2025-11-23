import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import ShootyLogoSimple from './ShootyLogo';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  text: '#1C1C1E',
  white: '#FFFFFF',
  error: '#EF4444',
  border: '#E5E7EB',
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
      <View style={styles.center}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/menu')}>
          <Ionicons name="grid-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Menu</Text>
        </TouchableOpacity>
        
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
    paddingHorizontal: 20,
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
    flex: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  right: {
    flex: 1.5,
    alignItems: 'flex-end',
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
  logoutBtn: {
    alignItems: 'center',
    padding: 6,
  },
  logoutText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '600',
    marginTop: 2,
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