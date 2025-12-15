import { Stack } from 'expo-router';

export default function PackagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="packages-list" />
      <Stack.Screen name="package-create" />
      <Stack.Screen name="package-edit" />
    </Stack>
  );
}
