import { Stack } from 'expo-router';

export default function PrestataireLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      {/* Menu principal */}
      <Stack.Screen name="menu" options={{ title: 'Menu' }} />
      
      {/* Demandes */}
      <Stack.Screen name="demandes" options={{ title: 'Demandes' }} />
      
      {/* Devis */}
      <Stack.Screen name="devis" options={{ title: 'Devis' }} />
      
      {/* Leads (Invoices) */}
      <Stack.Screen name="leads" options={{ title: 'Factures' }} />
      
      {/* Réservations */}
      <Stack.Screen name="reservations" options={{ title: 'Réservations' }} />
      
      {/* Calendar */}
      <Stack.Screen name="calendar" options={{ title: 'Planning' }} />
      
      {/* Review */}
      <Stack.Screen name="review" options={{ title: 'Avis' }} />
      
      {/* KPIs */}
      <Stack.Screen name="kpis" options={{ title: 'Statistiques' }} />
      
      {/* Profil */}
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
      
      {/* Media Library */}
      <Stack.Screen name="media-library" options={{ title: 'Médiathèque' }} />
      
      {/* Notifications */}
      <Stack.Screen name="notification" options={{ title: 'Notifications' }} />
      
      {/* Packages */}
      <Stack.Screen name="packages" options={{ title: 'Packages' }} />
      
      {/* Autres */}
      <Stack.Screen name="remboursements" options={{ title: 'Remboursements' }} />
      <Stack.Screen name="cancellation-policies" options={{ title: 'Politiques' }} />
      <Stack.Screen name="integrations" options={{ title: 'Intégrations' }} />
      <Stack.Screen name="ma-localisation" options={{ title: 'Localisation' }} />
    </Stack>
  );
}
