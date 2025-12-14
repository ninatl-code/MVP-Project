import { Stack } from 'expo-router';

export default function DemandesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="mes-demandes" />
      <Stack.Screen name="create-demande" />
      <Stack.Screen name="demande-detail" />
      <Stack.Screen name="nouvelle-demande" />
      <Stack.Screen name="resultats" />
    </Stack>
  );
}
