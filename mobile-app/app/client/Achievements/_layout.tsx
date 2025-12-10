import { Stack } from 'expo-router';

export default function AchievementsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="achievements" />
      <Stack.Screen name="loyalty-dashboard" />
      <Stack.Screen name="rewards-catalog" />
    </Stack>
  );
}
