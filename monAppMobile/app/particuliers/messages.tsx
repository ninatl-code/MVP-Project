import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterParti from '../../components/FooterParti';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  unread: '#DC2626'
};

interface Conversation {
  id: string;
  artist_id: string;
  last_message: string;
  updated: string;
  lu: boolean;
  prestataire: { nom: string; photos?: string[] };
}

interface Message {
  id: string;
  sender_id: string;
  contenu: string;
  created_at: string;
}

export default function MessagesParticulier() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/login');
      return;
    }
    setUser(authUser);

    const { data: convData } = await supabase
      .from('conversations')
      .select('id, artist_id, last_message, updated, lu, artist:profiles!artist_id(nom, photos)')
      .eq('client_id', authUser.id)
      .order('updated', { ascending: false });

    if (convData) {
      const formatted = convData.map((conv: any) => ({ ...conv, prestataire: conv.artist || { nom: 'Prestataire' }}));
      setConversations(formatted);
    }
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      await supabase.from('messages').update({ lu: true }).eq('conversation_id', convId).eq('receiver_id', user.id);
      await supabase.from('conversations').update({ lu: true }).eq('id', convId);
    }
  };

  const handleSelectConv = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConv || !user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ conversation_id: selectedConv.id, sender_id: user.id, receiver_id: selectedConv.artist_id, contenu: messageInput, objet: 'Message' });
    if (!error) {
      await supabase.from('conversations').update({ last_message: messageInput, updated: new Date().toISOString() }).eq('id', selectedConv.id);
      setMessageInput('');
      await fetchMessages(selectedConv.id);
      await fetchConversations();
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = new Date().getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Hier';
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  if (!selectedConv) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtitle}>Vos messages apparaîtront ici</Text>
          </View>
        ) : (
          <FlatList data={conversations} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} ItemSeparatorComponent={() => <View style={styles.separator} />} renderItem={({ item }) => (
            <TouchableOpacity style={styles.conversationItem} onPress={() => handleSelectConv(item)}>
              <View style={styles.avatarContainer}>
                {item.prestataire.photos?.[0] ? <Image source={{ uri: item.prestataire.photos[0] }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{getInitials(item.prestataire.nom)}</Text></View>}
                {!item.lu && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={[styles.prestataireNom, !item.lu && styles.boldText]}>{item.prestataire.nom}</Text>
                  <Text style={styles.timeText}>{formatTime(item.updated)}</Text>
                </View>
                <Text style={[styles.lastMessage, !item.lu && styles.boldText]} numberOfLines={1}>{item.last_message}</Text>
              </View>
            </TouchableOpacity>
          )} />
        )}
        <FooterParti />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedConv(null)} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.smallAvatar}>{selectedConv.prestataire.photos?.[0] ? <Image source={{ uri: selectedConv.prestataire.photos[0] }} style={styles.smallAvatarImage} /> : <Text style={styles.smallAvatarText}>{getInitials(selectedConv.prestataire.nom)}</Text>}</View>
            <Text style={styles.headerName}>{selectedConv.prestataire.nom}</Text>
          </View>
          <TouchableOpacity style={styles.moreButton}><Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} /></TouchableOpacity>
        </View>
        <FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.messagesContent} renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender_id === user.id ? styles.myMessage : styles.theirMessage]}>
            <Text style={[styles.messageText, item.sender_id === user.id && styles.myMessageText]}>{item.contenu}</Text>
            <Text style={[styles.messageTime, item.sender_id === user.id && styles.myMessageTime]}>{new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )} />
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Écrivez un message..." placeholderTextColor={COLORS.textLight} value={messageInput} onChangeText={setMessageInput} multiline maxLength={500} />
          <TouchableOpacity style={[styles.sendButton, (!messageInput.trim() || sending) && styles.sendButtonDisabled]} onPress={handleSend} disabled={!messageInput.trim() || sending}>
            {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={20} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  moreButton: { padding: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  listContent: { paddingVertical: 8 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.background },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 76 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '600' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.unread, borderWidth: 2, borderColor: COLORS.background },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  prestataireNom: { fontSize: 16, color: COLORS.text },
  boldText: { fontWeight: '600' },
  timeText: { fontSize: 13, color: COLORS.textLight },
  lastMessage: { fontSize: 14, color: COLORS.textLight },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  smallAvatarImage: { width: 32, height: 32, borderRadius: 16 },
  smallAvatarText: { color: 'white', fontSize: 14, fontWeight: '600' },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  messageBubble: { maxWidth: '75%', marginVertical: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.backgroundLight, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  myMessageText: { color: 'white' },
  messageTime: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.backgroundLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: COLORS.text },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 }
});
