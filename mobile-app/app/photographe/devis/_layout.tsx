import { Stack } from 'expo-router';

export default function DevisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="devis" />
    </Stack>
  );
}
