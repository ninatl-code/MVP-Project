import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabaseClient';
import { ShootyLogoSimple } from '@/components/ui/ShootyLogo';
import BottomNavBar from '@/components/ui/BottomNavBar';

const COLORS = {
  primary: '#fff',
  accent: '#635BFF',
  background: '#F8F9FB',
  text: '#222',
};

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
      const { data: unreadConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("lu", false);
      setNbUnread(unreadConvs ? unreadConvs.length : 0);
    };
    checkAuth();
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <ShootyLogoSimple width={40} height={40} />
        {profile && (
          <View style={styles.profileWrap}>
            <Image source={{ uri: profile.photos?.[0] || undefined }} style={styles.avatar} />
            <Text style={styles.name}>{profile.nom}</Text>
          </View>
        )}
      </View>
      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
          <Text style={styles.logout}>Déconnexion</Text>
        </TouchableOpacity>
        {nbUnread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{nbUnread}</Text></View>
        )}
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  profileWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', marginRight: 8 },
  name: { fontWeight: '600', fontSize: 16, color: COLORS.text },
  right: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginRight: 8, padding: 8 },
  logout: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15 },
  badge: { backgroundColor: '#FF385C', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});