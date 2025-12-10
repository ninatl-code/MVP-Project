import { Stack } from 'expo-router';

export default function TiragesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="configure" />
      <Stack.Screen name="mes-commandes" />
    </Stack>
  );
}
