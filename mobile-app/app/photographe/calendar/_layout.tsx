import { Stack } from 'expo-router';

export default function CalendarLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="calendrier" />
      <Stack.Screen name="availability-calendar" />
      <Stack.Screen name="blocked-slots" />
      <Stack.Screen name="calendar-management" />
    </Stack>
  );
}
