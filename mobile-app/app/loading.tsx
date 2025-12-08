import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ShootyLogo from '@/components/ShootyLogo';

const COLORS = {
  primary: '#5C6BC0',
  white: '#FFFFFF',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
};

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ShootyLogo />
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary} 
        style={styles.spinner}
      />
      <ThemedText style={styles.text}>Chargement...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
  },
  spinner: {
    marginTop: 40,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});