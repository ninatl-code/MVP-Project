import { Stack } from 'expo-router';

export default function KpisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="kpis" />
      <Stack.Screen name="analytics-dashboard" />
    </Stack>
  );
}
