import { Stack } from 'expo-router';

export default function ReservationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reservations" />
    </Stack>
  );
}
