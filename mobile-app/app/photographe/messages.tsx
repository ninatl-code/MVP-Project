import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

/**
 * REDIRECT PAGE - Messages System Architecture Refactor
 * 
 * This page is a redirect to the unified messaging system at /shared/messages
 * Previously: app/photographe/messages.tsx (ARCHITECTURE SMELL - redundant code)
 * Now: app/shared/messages/ (SINGLE SOURCE OF TRUTH)
 * 
 * MIGRATION BENEFITS:
 *  Single codebase for both photographer and client messaging
 *  Reduced bugs (no code duplication)
 *  Easier maintenance and testing  
 *  Consistent user experience across roles
 *  Shared utilities and components
 * 
 * The unified messaging system at /shared/messages automatically:
 * - Detects user role (photographer or client)
 * - Shows appropriate conversations filtered by role
 * - Handles unread counts per role
 * - Routes to correct chat interface
 */
export default function MessagesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect to unified messaging system
    router.replace('/shared/messages' as any);
  }, [router]);

  // Loading screen during redirect
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#5C6BC0" />
    </View>
  );
}
