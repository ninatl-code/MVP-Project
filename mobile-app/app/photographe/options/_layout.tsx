import { Stack } from 'expo-router';

export default function OptionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="options-list" />
      <Stack.Screen name="option-edit" />
    </Stack>
  );
}