import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import FooterParti from "@/components/client/FooterParti";

export default function ClientLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="menu" options={{ title: "Menu Client" }} />
        <Stack.Screen name="search" options={{ title: "Recherche" }} />
        <Stack.Screen name="demandes" options={{ title: "Mes demandes" }} />
        <Stack.Screen name="devis" options={{ title: "Mes devis" }} />
        <Stack.Screen name="reservations" options={{ title: "Mes réservations" }} />
        <Stack.Screen name="packages" options={{ title: "Mes packages" }} />
        <Stack.Screen name="Avis" options={{ title: "Mes avis" }} />
        <Stack.Screen name="Achievements" options={{ title: "Achievements" }} />
        <Stack.Screen name="profil" options={{ title: "Mon profil" }} />
      </Stack>
      <FooterParti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
