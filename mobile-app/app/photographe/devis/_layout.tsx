import { Stack } from 'expo-router';

export default function PhotographeDevisLayout() {
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
            backgroundColor: '#5C6BC0',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="devis-create" 
        options={{ 
          title: 'Créer un devis',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
