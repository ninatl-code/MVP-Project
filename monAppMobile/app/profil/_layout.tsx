import { Stack } from "expo-router";

export default function ProfilLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Profil" }} />
      <Stack.Screen name="[id]" options={{ title: "Détail Profil" }} />
    </Stack>
  );
}
