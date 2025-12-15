import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabaseClient';
import FooterPresta from '@/components/photographe/FooterPresta';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

interface Conversation {
  id: string;
  client_id: string;
  photographe_id: string;
  last_message_text: string;
  last_message_at: string;
  last_message_sender_id: string;
  unread_count_client: number;
  unread_count_provider: number;
  is_archived_by_client: boolean;
  is_archived_by_provider: boolean;
  // Joined data
  client_name?: string;
  provider_name?: string;
  other_user_name?: string;
}

export default function MessagesListScreen() {
  // Gérer le StatusBar - blanc sur le fond dégradé
  useStatusBarStyle('light-content', '#5C6BC0');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'provider' | null>(null);

  useEffect(() => {
    loadConversations();
    subscribeToMessages();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('User not authenticated');
        return;
      }
      setUserId(user.id);

      // Determine if user is client or provider by checking their role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role || 'client';
      setUserRole(role);

      // Get conversations where user is either client or provider
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`client_id.eq.${user.id},photographe_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for client and photographer names
      const userIds = new Set<string>();
      (conversationsData || []).forEach(conv => {
        if (conv.client_id) userIds.add(conv.client_id);
        if (conv.photographe_id) userIds.add(conv.photographe_id);
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', Array.from(userIds));

      // Create profile map
      const profileMap: any = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });

      // Format conversations with other user's name
      const formatted = (conversationsData || []).map(conv => ({
        ...conv,
        other_user_name:
          conv.client_id === user.id
            ? `${profileMap[conv.photographe_id]?.prenom || ''} ${profileMap[conv.photographe_id]?.nom || ''}`
            : `${profileMap[conv.client_id]?.prenom || ''} ${profileMap[conv.client_id]?.nom || ''}`,
      }));

      setConversations(formatted);
    } catch (error) {
      console.error('Error loading conversations:', error);
      alert('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getUnreadCount = (conversation: Conversation) => {
    if (!userId) return 0;
    return conversation.client_id === userId
      ? conversation.unread_count_client
      : conversation.unread_count_provider;
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const unreadCount = getUnreadCount(item);
    const isUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, isUnread && styles.conversationCardUnread]}
        onPress={() =>
          router.push(`/messages/chat-conversation?id=${item.id}` as any)
        }
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
          </View>
          {isUnread && <View style={styles.unreadIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, isUnread && styles.conversationNameUnread]}>
              {item.other_user_name || 'Unknown User'}
            </Text>
            <Text style={styles.conversationTime}>
              {formatLastMessageTime(item.last_message_at)}
            </Text>
          </View>

          <View style={styles.conversationFooter}>
            <Text
              style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.last_message_sender_id === userId ? 'You: ' : ''}
              {item.last_message_text || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity onPress={() => router.push('/messages/message-templates' as any)}>
            <Ionicons name="document-text-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? 'No Results' : 'No Conversations'}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? 'Try searching with a different name'
              : 'Start chatting with clients or providers to see conversations here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  list: {
    padding: 16,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conversationCardUnread: {
    backgroundColor: '#F0F8FF',
    borderColor: COLORS.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  conversationNameUnread: {
    fontWeight: '700',
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
