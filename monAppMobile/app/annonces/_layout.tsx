import { Stack } from 'expo-router';

export default function AnnoncesLayout() {
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
          title: 'Annonce'
        }}
      />
      <Stack.Screen
        name="[id]/avis"
        options={{
          title: 'Avis clients',
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="[id]/devis"
        options={{
          title: 'Demande de devis',
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="[id]/reservations"
        options={{
          title: 'Réservation',
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="[id]/success"
        options={{
          title: 'Paiement réussi',
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="[id]/cancel"
        options={{
          title: 'Paiement annulé',
          presentation: 'modal'
        }}
      />
    </Stack>
  );
}
