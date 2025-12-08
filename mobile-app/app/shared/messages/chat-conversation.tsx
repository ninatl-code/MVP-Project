import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  sent: '#007AFF',
  received: '#E9E9EB',
};

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments: any[];
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  client_id: string;
  provider_id: string;
  booking_id: string;
  clients?: { nom: string; prenom: string };
  prestataires?: { nom: string; prenom: string };
}

export default function ChatConversationScreen() {
  const params = useLocalSearchParams();
  const conversationId = params.id as string;
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    loadConversation();
    loadMessages();
    subscribeToMessages();

    return () => {
      supabase.channel(`messages:${conversationId}`).unsubscribe();
    };
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          clients (nom, prenom),
          prestataires (nom, prenom)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setConversation(data);

      // Mark messages as read
      if (data.client_id === user.id) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('sender_id', data.provider_id);

        await supabase
          .from('conversations')
          .update({ unread_count_client: 0 })
          .eq('id', conversationId);
      } else {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('sender_id', data.client_id);

        await supabase
          .from('conversations')
          .update({ unread_count_provider: 0 })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe();
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!currentUserId || !conversation) return;

    try {
      setSending(true);

      // Upload attachments if any
      const uploadedAttachments = await uploadAttachments();

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        attachments: uploadedAttachments,
        is_read: false,
      });

      if (error) throw error;

      setNewMessage('');
      setAttachments([]);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];

    const uploaded = [];
    for (const attachment of attachments) {
      try {
        const fileExt = attachment.uri.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${conversationId}/${fileName}`;

        const response = await fetch(attachment.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message_attachments')
          .getPublicUrl(filePath);

        uploaded.push({
          type: attachment.type,
          url: publicUrl,
          name: attachment.name || fileName,
          size: attachment.size,
        });
      } catch (error) {
        console.error('Error uploading attachment:', error);
      }
    }
    return uploaded;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachments([...attachments, {
          type: 'image',
          uri: result.assets[0].uri,
          name: 'image.jpg',
        }]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachments([...attachments, {
          type: 'document',
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          size: result.assets[0].size,
        }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isSent = message.sender_id === currentUserId;
    const showDate = index === 0 || 
      formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

    return (
      <View key={message.id}>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(message.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isSent ? styles.sentContainer : styles.receivedContainer]}>
          <View style={[styles.messageBubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
            {message.content ? (
              <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
                {message.content}
              </Text>
            ) : null}
            {message.attachments && message.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {message.attachments.map((attachment: any, i: number) => (
                  <View key={i} style={styles.attachmentItem}>
                    {attachment.type === 'image' ? (
                      <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
                    ) : (
                      <View style={styles.documentAttachment}>
                        <Ionicons name="document-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.documentName} numberOfLines={1}>
                          {attachment.name}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedTime]}>
              {formatTime(message.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const otherUser = conversation?.client_id === currentUserId
    ? conversation?.prestataires
    : conversation?.clients;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {otherUser ? `${otherUser.prenom} ${otherUser.nom}` : 'Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>Online</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollToBottom()}
      >
        {messages.map((message, index) => renderMessage(message, index))}
      </ScrollView>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <View style={styles.attachmentsPreview}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentPreview}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewDocument}>
                    <Ionicons name="document-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.previewDocumentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => removeAttachment(index)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
          <Ionicons name="attach-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() && attachments.length === 0) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={sending || (!newMessage.trim() && attachments.length === 0)}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.surface} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.success,
    marginTop: 2,
  },
  headerButton: {
    marginLeft: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginVertical: 4,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sentBubble: {
    backgroundColor: COLORS.sent,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: COLORS.received,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: COLORS.surface,
  },
  receivedText: {
    color: COLORS.text,
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receivedTime: {
    color: COLORS.textSecondary,
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    marginBottom: 8,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
  },
  documentName: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.surface,
    flex: 1,
  },
  attachmentsPreview: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  attachmentPreview: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  previewDocument: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDocumentName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
