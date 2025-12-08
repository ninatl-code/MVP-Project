import { Stack } from "expo-router";

export default function ParticuliersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="index" options={{ title: "Accueil Particuliers" }} />
      <Stack.Screen name="notification" options={{ title: "Notifications" }} />
      <Stack.Screen name="profil" options={{ title: "Profil" }} />
      <Stack.Screen name="search" options={{ title: "Recherche" }} />
    </Stack>
  );
}
