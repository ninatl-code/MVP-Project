import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from "../lib/supabaseClient";
import ShootyLogoSimple from "./ShootyLogo";
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#fff',
  accent: '#635BFF',
  background: '#F8F9FB',
  text: '#222',
};

export default function FooterParti() {
  const [profile, setProfile] = useState(null);
  const [nbUnread, setNbUnread] = useState(0);
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
    <View style={styles.footer}>
      <View style={styles.left}>
        <ShootyLogoSimple width={30} height={30} />
        {profile && (
          <View style={styles.profileWrap}>
            <Image source={{ uri: profile.photos?.[0] || undefined }} style={styles.avatar} />
            <Text style={styles.name} numberOfLines={1}>{profile.nom}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.center}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/dashboard')}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/payments')}>
          <Ionicons name="card-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
          <Text style={styles.logout}>Déconnexion</Text>
        </TouchableOpacity>
        {nbUnread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{nbUnread}</Text></View>
        )}
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
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  center: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  avatar: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#eee', 
    marginRight: 6 
  },
  name: { 
    fontWeight: '600', 
    fontSize: 12, 
    color: COLORS.text,
    maxWidth: 60,
  },
  right: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconBtn: { marginRight: 8, padding: 8 },
  logout: { color: COLORS.accent, fontWeight: 'bold', fontSize: 15 },
  badge: { backgroundColor: '#FF385C', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});