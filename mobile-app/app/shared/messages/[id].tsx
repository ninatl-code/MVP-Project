import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  myMessage: '#5C6BC0',
  otherMessage: '#E5E7EB'
};

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  contenu: string;
  lu: boolean;
  created_at: string;
}

interface ConversationDetails {
  id: string;
  artist_id: string;
  client_id: string;
  other_user_name: string;
  other_user_photo?: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { conversation_id, user_role } = params; // user_role: 'particulier' | 'prestataire'

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeConversation();
  }, [conversation_id]);

  useEffect(() => {
    if (!conversation_id || !currentUserId) return;

    // Supabase realtime - Écoute des nouveaux messages
    const channel = supabase
      .channel(`messages-${conversation_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation_id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Scroll vers le bas pour le nouveau message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Marquer comme lu si message reçu
          if (newMessage.sender_id !== currentUserId) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation_id}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation_id, currentUserId]);

  const initializeConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(user.id);

      // Récupérer les détails de la conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          artist_id,
          client_id,
          artist:profiles!artist_id(nom, photos),
          client:profiles!client_id(nom, photos)
        `)
        .eq('id', conversation_id)
        .single();

      if (convError) throw convError;

      if (convData) {
        const isParti = user_role === 'particulier';
        const otherUserId = isParti ? convData.artist_id : convData.client_id;
        const otherUserProfile: any = isParti
          ? convData.artist // artist profile
          : convData.client; // client profile
        
        setConversationDetails({
          id: convData.id,
          artist_id: convData.artist_id,
          client_id: convData.client_id,
          other_user_name: otherUserProfile?.nom || 'Utilisateur',
          other_user_photo: otherUserProfile?.photos
        });
      }

      // Récupérer les messages
      await fetchMessages();
    } catch (error) {
      console.error('Erreur initialisation conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Marquer tous les messages reçus comme lus
      if (currentUserId && data) {
        const unreadMessages = data.filter(
          (msg) => msg.receiver_id === currentUserId && !msg.lu
        );
        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map((msg) => msg.id);
          await supabase
            .from('messages')
            .update({ lu: true })
            .in('id', unreadIds);
        }
      }

      // Mettre à jour le statut lu de la conversation
      if (currentUserId) {
        const updateField = user_role === 'particulier' ? 'client_lu' : 'lu';
        await supabase
          .from('conversations')
          .update({ [updateField]: true })
          .eq('id', conversation_id);
      }

      // Scroll vers le bas après chargement
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ lu: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Erreur marquage message lu:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUserId || !conversationDetails) return;

    const messageContent = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      const receiverId =
        user_role === 'particulier'
          ? conversationDetails.artist_id
          : conversationDetails.client_id;

      // Insérer le message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation_id as string,
          sender_id: currentUserId,
          receiver_id: receiverId,
          contenu: messageContent,
          lu: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour last_message de la conversation
      await supabase
        .from('conversations')
        .update({
          last_message: messageContent.substring(0, 100),
          updated: new Date().toISOString(),
          // Marquer comme non lu pour le destinataire
          [user_role === 'particulier' ? 'lu' : 'client_lu']: false
        })
        .eq('id', conversation_id);

      // Le message sera automatiquement ajouté via realtime
    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      setMessageInput(messageContent); // Restaurer le message en cas d'erreur
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessageInput(text);

    // Indicateur de frappe (optionnel - peut être étendu avec une table typing_indicators)
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000) as any;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const time = new Date(item.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}
      >
        {!isMyMessage && conversationDetails?.other_user_photo && (
          <Image
            source={{ uri: conversationDetails.other_user_photo }}
            style={styles.messageAvatar}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}
          >
            {item.contenu}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isMyMessage ? styles.myMessageTime : styles.otherMessageTime
              ]}
            >
              {time}
            </Text>
            {isMyMessage && (
              <Ionicons
                name={item.lu ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.lu ? COLORS.primary : COLORS.background}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
        {isMyMessage && <View style={{ width: 40 }} />}
      </View>
    );
  };

  const renderDateSeparator = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label = '';
    if (messageDate.toDateString() === today.toDateString()) {
      label = "Aujourd'hui";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      label = 'Hier';
    } else {
      label = messageDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }

    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{label}</Text>
        <View style={styles.dateLine} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de la conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {conversationDetails?.other_user_photo ? (
              <Image
                source={{ uri: conversationDetails.other_user_photo }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={20} color={COLORS.textLight} />
              </View>
            )}
            <View>
              <Text style={styles.headerTitle}>
                {conversationDetails?.other_user_name || 'Utilisateur'}
              </Text>
              {isTyping && <Text style={styles.headerTyping}>Écrit...</Text>}
            </View>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Liste des messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input de saisie */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Écrivez votre message..."
            value={messageInput}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  headerTyping: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic'
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border
  },
  dateText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600'
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end'
  },
  myMessageContainer: {
    justifyContent: 'flex-end'
  },
  otherMessageContainer: {
    justifyContent: 'flex-start'
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18
  },
  myMessageBubble: {
    backgroundColor: COLORS.myMessage,
    borderBottomRightRadius: 4
  },
  otherMessageBubble: {
    backgroundColor: COLORS.otherMessage,
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  myMessageText: {
    color: COLORS.background
  },
  otherMessageText: {
    color: COLORS.text
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  messageTime: {
    fontSize: 11
  },
  myMessageTime: {
    color: COLORS.background,
    opacity: 0.8
  },
  otherMessageTime: {
    color: COLORS.textLight
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  attachButton: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    opacity: 0.5
  }
});
