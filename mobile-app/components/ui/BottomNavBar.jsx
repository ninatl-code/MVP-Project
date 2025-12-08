import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function BottomNavBar() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/')}>
        <Ionicons name="home-outline" size={26} color="#635BFF" />
        <Text style={styles.label}>Accueil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/login')}>
        <MaterialIcons name="login" size={26} color="#635BFF" />
        <Text style={styles.label}>Connexion</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/signup')}>
        <MaterialIcons name="person-add-alt" size={26} color="#635BFF" />
        <Text style={styles.label}>Inscription</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => router.push('/profil')}>
        <Ionicons name="person-outline" size={26} color="#635BFF" />
        <Text style={styles.label}>Profil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#635BFF',
    marginTop: 2,
    fontWeight: '600',
  },
});
