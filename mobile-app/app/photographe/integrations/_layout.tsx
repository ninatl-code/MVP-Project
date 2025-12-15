import { Stack } from 'expo-router';

export default function IntegrationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="webhooks" />
    </Stack>
  );
}
