import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="messages-list" />
      <Stack.Screen name="chat-conversation" />
      <Stack.Screen name="message-templates" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
