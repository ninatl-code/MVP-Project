import { Stack } from 'expo-router';

export default function ClientDevisLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen 
        name="devis-list" 
        options={{ 
          title: 'Mes Devis',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#130183',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="devis-detail" 
        options={{ 
          title: 'Détail du devis',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
