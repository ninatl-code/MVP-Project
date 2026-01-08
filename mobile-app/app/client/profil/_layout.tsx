import { Stack } from "expo-router";

export default function ProfilLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="profil" options={{ title: "Mon profil" }} />
      <Stack.Screen name="change-password" options={{ title: "Changer le mot de passe" }} />
    </Stack>
  );
}
