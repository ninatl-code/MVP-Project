import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ShootyLogoSimple from './ShootyLogo';

export default function Headerhomepage() {
  const navigation = useNavigation();

  const openAnchor = (anchor) => {
    if (!anchor) return;
    Linking.openURL(anchor).catch(() => {});
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation?.navigate?.('Home')} style={styles.logoWrap}>
        <ShootyLogoSimple width={140} height={45} />
      </TouchableOpacity>

      <View style={styles.nav}>
        <TouchableOpacity onPress={() => openAnchor('#how')}>
          <Text style={styles.link}>Comment ça marche</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openAnchor('#categories')}>
          <Text style={styles.link}>Prestations</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openAnchor('#faq')}>
          <Text style={styles.link}>Aide</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineButton} onPress={() => navigation?.navigate?.('Login')}>
          <Text style={styles.outlineButtonText}>Connexion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation?.navigate?.('Signup')}>
          <Text style={styles.primaryButtonText}>Inscription</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomColor: '#eee'
  },
  logoWrap: { padding: 4 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  link: { fontSize: 14, color: '#111', marginHorizontal: 6 },
  outlineButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#6B46C1', marginLeft: 8 },
  outlineButtonText: { color: '#6B46C1', fontWeight: '600' },
  primaryButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#6B46C1', marginLeft: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '600' }
});
