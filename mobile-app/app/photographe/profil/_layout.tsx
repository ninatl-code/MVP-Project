import { Stack } from 'expo-router';

export default function ProfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profil" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="services" />
      <Stack.Screen name="tarifs" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="profil-complet" />
    </Stack>
  );
}
