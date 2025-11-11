import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FooterPresta from '../../components/FooterPresta';

interface Message {
  id: string;
  objet: string;
  contenu: string;
  created_at: string;
  lu: boolean;
  sender_id: string;
  profiles?: { nom: string };
}

interface Conversation {
  id: string;
  last_message: string;
  user: { nom: string; id: string };
  messages: Message[];
}

export default function MessagesPrestataire() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUser(authUser);

    const { data: convData } = await supabase
      .from('conversations')
      .select('*')
      .eq('artist_id', authUser.id)
      .order('updated', { ascending: false });

    if (!convData) {
      setLoading(false);
      return;
    }

    const convIds = convData.map(c => c.id);
    const { data: messages } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(nom)')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true });

    const convMap: any = {};
    convData.forEach(conv => {
      const otherId = conv.artist_id === authUser.id ? conv.client_id : conv.artist_id;
      convMap[conv.id] = {
        id: conv.id,
        last_message: conv.last_message,
        user: { id: otherId, nom: 'Client' },
        messages: []
      };
    });

    (messages || []).forEach(msg => {
      if (convMap[msg.conversation_id]) {
        convMap[msg.conversation_id].messages.push(msg);
      }
    });

    const convArr = Object.values(convMap) as Conversation[];
    setConversations(convArr);
    if (convArr.length > 0) setSelectedConv(convArr[0]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConv || !user) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      receiver_id: selectedConv.user.id,
      contenu: messageInput,
      objet: 'Réponse'
    });

    if (!error) {
      setMessageInput('');
      fetchConversations();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      
      <View style={styles.mainContent}>
        {/* Liste conversations */}
        <View style={styles.leftColumn}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Messages</Text>
          </View>
          <ScrollView style={styles.convList}>
            {conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={[
                  styles.convItem,
                  selectedConv?.id === conv.id && styles.convItemSelected
                ]}
                onPress={() => setSelectedConv(conv)}
              >
                <Text style={styles.convName}>{conv.user.nom}</Text>
                <Text style={styles.convPreview} numberOfLines={1}>
                  {conv.last_message}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
        <View style={styles.rightColumn}>
          {!selectedConv ? (
            <View style={styles.emptyDetail}>
              <Text style={styles.emptyText}>Sélectionnez une conversation</Text>
            </View>
          ) : (
            <>
              <View style={styles.messageHeader}>
                <Text style={styles.messageHeaderTitle}>{selectedConv.user.nom}</Text>
              </View>
              
              <ScrollView style={styles.messagesList}>
                {selectedConv.messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageItem,
                      msg.sender_id === user?.id ? styles.messageItemSent : styles.messageItemReceived
                    ]}
                  >
                    <Text style={styles.messageText}>{msg.contenu}</Text>
                    <Text style={styles.messageDate}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Votre message..."
                  value={messageInput}
                  onChangeText={setMessageInput}
                  multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                  <Text style={styles.sendButtonText}>📤</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  leftColumn: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#fff'
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  convList: {
    flex: 1
  },
  convItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  convItemSelected: {
    backgroundColor: '#F3F4F6'
  },
  convName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  convPreview: {
    fontSize: 14,
    color: '#6B7280'
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#fff'
  },
  emptyDetail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  messageHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  messageHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  messagesList: {
    flex: 1,
    padding: 16
  },
  messageItem: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },
  messageItemSent: {
    alignSelf: 'flex-end',
    backgroundColor: '#5C6BC0'
  },
  messageItemReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB'
  },
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4
  },
  messageDate: {
    fontSize: 12,
    color: '#6B7280'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: '#5C6BC0',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonText: {
    fontSize: 24
  }
});

