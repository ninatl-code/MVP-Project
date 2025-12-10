import { Stack } from 'expo-router';

export default function ReviewLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="avis-liste" />
      <Stack.Screen name="reviews-dashboard" />
      <Stack.Screen name="respond-to-review" />
    </Stack>
  );
}
