import { Stack } from 'expo-router';

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="avis" />
      <Stack.Screen name="livraison" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="paiement" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="mes-remboursements" />
    </Stack>
  );
}
