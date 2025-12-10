import { Stack } from 'expo-router';

export default function LivraisonLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="albums" />
      <Stack.Screen name="tirages" />
    </Stack>
  );
}
