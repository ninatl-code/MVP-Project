import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';

export default function FooterPresta() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            // La redirection sera gérée automatiquement par AuthContext
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/messages')}>
        <Ionicons name="chatbubble-outline" size={24} color="#635BFF" />
        <Text style={styles.label}>Messages</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/kpis')}>
        <Ionicons name="stats-chart-outline" size={24} color="#635BFF" />
        <Text style={styles.label}>Stats</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/profil')}>
        <Ionicons name="person-outline" size={24} color="#635BFF" />
        <Text style={styles.label}>Profil</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/prestataires/notification')}>
        <Ionicons name="notifications-outline" size={24} color="#635BFF" />
        <Text style={styles.label}>Notifs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#EF4444" />
        <Text style={[styles.label, { color: '#EF4444' }]}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#635BFF',
    marginTop: 4,
    textAlign: 'center',
  },
});