import { Stack } from 'expo-router';

export default function DemandesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="demandes-list" />
      <Stack.Screen name="demande-detail" />
    </Stack>
  );
}
