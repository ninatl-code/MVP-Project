import { Stack } from 'expo-router';

export default function DevisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="devis-list" />
      <Stack.Screen name="devis" />
      <Stack.Screen name="devis-create" />
    </Stack>
  );
}
