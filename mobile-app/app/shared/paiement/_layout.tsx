import { Stack } from 'expo-router';

export default function PaiementLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="checkout" />
      <Stack.Screen name="success" />
      <Stack.Screen name="cancel" />
    </Stack>
  );
}
