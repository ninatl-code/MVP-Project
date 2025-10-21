import { Stack } from "expo-router";

export default function RemboursementsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Mes Remboursements" }} />
      <Stack.Screen name="[id]" options={{ title: "Détail Remboursement" }} />
    </Stack>
  );
}
