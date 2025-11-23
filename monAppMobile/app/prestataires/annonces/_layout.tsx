import { Stack } from 'expo-router';

export default function AnnoncesPrestatairesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Aperçu de l\'annonce'
        }}
      />
    </Stack>
  );
}
