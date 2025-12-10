import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { ShootyLogoSimple } from '@/components/ui/ShootyLogo';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  text: '#1C1C1E',
  white: '#FFFFFF',
  error: '#EF4444',
  border: '#E5E7EB',
};

export default function FooterParti() {
  const [profile, setProfile] = useState(null);
  const [nbUnread, setNbUnread] = useState(0);
  const [nbNotifications, setNbNotifications] = useState(0);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);
      
      // Messages non lus
      const { data: unreadConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("lu", false);
      setNbUnread(unreadConvs ? unreadConvs.length : 0);

      // Notifications non lues
      const { data: unreadNotifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("lu", false);
      setNbNotifications(unreadNotifs ? unreadNotifs.length : 0);
    };
    checkAuth();
  }, []);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  return (
    <View style={styles.footer}>
      <View style={styles.center}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/particuliers/menu')}>
          <Ionicons name="grid-outline" size={22} color={COLORS.accent} />
          <Text style={styles.label}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => router.push('/particuliers/messages')}>
          <View style={styles.tabContent}>
            <Ionicons name="chatbubble-outline" size={22} color={COLORS.accent} />
            {nbUnread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{nbUnread}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/particuliers/notification')}>
          <View style={styles.tabContent}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.accent} />
            {nbNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{nbNotifications}</Text>
              </View>
            )}
          </View>
          <Text style={styles.label}>Notifs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/particuliers/profil')}>
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