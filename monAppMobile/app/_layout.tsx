import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoadingScreen from './loading';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();

  // Afficher l'écran de loading pendant la vérification d'auth
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Routes publiques (non-authentifiées)
          <>
            {/* Show the explicit login screen first-time */}
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </>
        ) : (
          // Routes privées (authentifiées)
          <>
            {/* Menu unique qui s'adapte au rôle */}
            <Stack.Screen name="menu" options={{ headerShown: false }} />
            
            {/* Sous-routes pour particuliers */}
            <Stack.Screen name="particuliers" options={{ headerShown: false }} />
            
            {/* Sous-routes pour prestataires */}
            <Stack.Screen name="prestataires" options={{ headerShown: false }} />
            
            {/* Routes communes */}
            <Stack.Screen name="annonces" options={{ headerShown: false }} />
            <Stack.Screen name="profil" options={{ headerShown: false }} />
            <Stack.Screen name="remboursements" options={{ headerShown: false }} />
            <Stack.Screen name="payments" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export const unstable_settings = {
  // Point d'entrée initial : login pour non-authentifiés, menu pour authentifiés
  initialRouteName: 'login',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

