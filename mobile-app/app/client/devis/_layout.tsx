import { Stack } from 'expo-router';

export default function DevisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="devis-list" />
      <Stack.Screen name="devis-detail" />
      <Stack.Screen name="devis-comparaison" />
    </Stack>
  );
}
