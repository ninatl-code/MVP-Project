import { Stack } from 'expo-router';

export default function AlbumsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="configure" />
      <Stack.Screen name="commander" />
    </Stack>
  );
}
