import { Stack } from 'expo-router';

export default function PrestataireLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen 
        name="menu" 
        options={{ 
          title: 'Menu Prestataire'
        }} 
      />
      <Stack.Screen 
        name="calendrier" 
        options={{ 
          title: 'Planning',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="prestations" 
        options={{ 
          title: 'Mes Annonces',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="devis" 
        options={{ 
          title: 'Devis',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="reservations" 
        options={{ 
          title: 'Réservations',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="messages" 
        options={{ 
          title: 'Messages',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="kpis" 
        options={{ 
          title: 'Statistiques',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="profil" 
        options={{ 
          title: 'Mon Profil',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="notification" 
        options={{ 
          title: 'Notifications',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="remboursements" 
        options={{ 
          title: 'Remboursements',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="invoice" 
        options={{ 
          title: 'Factures',
          presentation: 'card'
        }} 
      />
    </Stack>
  );
}
