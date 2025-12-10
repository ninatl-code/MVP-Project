import { Stack } from 'expo-router';

export default function AvisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reviews-list" />
      <Stack.Screen name="submit-review" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[prestataire_id]" />
    </Stack>
  );
}
