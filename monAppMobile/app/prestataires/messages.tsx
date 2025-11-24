import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '../../components/FooterPresta';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Utilitaires pour gérer les photos
function cleanBase64(str: string): string {
  if (!str) return '';
  let cleaned = str.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('data:')) {
    const idx = cleaned.indexOf(',');
    if (idx !== -1) cleaned = cleaned.slice(idx + 1);
  }
  return cleaned;
}

function isProbablyBase64(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const cleaned = cleanBase64(str);
  if (cleaned.length < 10) return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(cleaned);
}

function guessMime(base64: string): string {
  const firstChars = base64.slice(0, 20).toUpperCase();
  if (firstChars.startsWith('IVBORW') || firstChars.includes('PNG')) return 'image/png';
  if (firstChars.startsWith('/9J/') || firstChars.includes('JFIF')) return 'image/jpeg';
  if (firstChars.startsWith('AAABAA')) return 'image/x-icon';
  return 'image/jpeg';
}

function getPhotoUrlFromProfile(profile: any): string | null {
  if (!profile) return null;
  let photos = profile.photos;

  if (Array.isArray(photos) && photos.length > 0) {
    const first = photos[0];
    if (typeof first === 'string') {
      if (first.startsWith('data:')) return first;
      if (first.startsWith('http://') || first.startsWith('https://')) return first;
      if (isProbablyBase64(first)) {
        return `data:${guessMime(first)};base64,${cleanBase64(first)}`;
      }
    }
    return null;
  }

  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (typeof first === 'string') {
          if (first.startsWith('data:')) return first;
          if (first.startsWith('http://') || first.startsWith('https://')) return first;
          if (isProbablyBase64(first)) {
            return `data:${guessMime(first)};base64,${cleanBase64(first)}`;
          }
        }
      }
    } catch {
      if (photos.startsWith('data:')) return photos;
      if (photos.startsWith('http://') || photos.startsWith('https://')) return photos;
      if (isProbablyBase64(photos)) {
        return `data:${guessMime(photos)};base64,${cleanBase64(photos)}`;
      }
    }
  }

  return null;
}

// Génération d'avatar SVG de secours
function stringToColor(str: string): string {
  if (!str) return '#6B7280';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function initialsFromName(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function svgAvatarDataUrl(name: string): string {
  const initials = initialsFromName(name);
  const bgColor = stringToColor(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${bgColor}"/><text x="50%" y="50%" font-size="32" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

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
  client_id: string;
  last_message: string;
  updated: string;
  lu: boolean;
  client: { nom: string; photos?: string[] };
}

interface Message {
  id: string;
  sender_id: string;
  contenu: string;
  created_at: string;
}

export default function MessagesPrestataire() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [checkedConvs, setCheckedConvs] = useState<string[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [annonceTitles, setAnnonceTitles] = useState<{[key: string]: string}>({});
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('/login' as any);
      return;
    }
    setUser(authUser);

    // Récupérer toutes les conversations où je suis l'artist (prestataire)
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('id, artist_id, client_id, annonce_id, last_message, created_at, updated, lu')
      .eq('artist_id', authUser.id)
      .order('updated', { ascending: false });

    if (convError) {
      console.error('Erreur conversations:', convError);
      setLoading(false);
      return;
    }

    if (!convData || convData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Récupérer tous les messages de ces conversations
    const convIds = convData.map(c => c.id);
    const { data: messagesData, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, receiver_id, objet, contenu, created_at, lu')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Erreur messages:', msgError);
    }

    // Récupérer tous les profils des clients
    const clientIds = convData.map(c => c.client_id).filter(Boolean);
    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('id, nom, photos')
      .in('id', clientIds);

    if (profileError) {
      console.error('Erreur profiles:', profileError);
    }

    // Créer un map des profils
    const profileMap: any = {};
    (profilesData || []).forEach((p: any) => {
      profileMap[p.id] = p;
    });

    // Mapper les conversations avec messages et profil client
    const convMap: any = {};
    convData.forEach(conv => {
      const clientProfile = profileMap[conv.client_id] || { nom: 'Client', photos: [] };
      convMap[conv.id] = {
        id: conv.id,
        client_id: conv.client_id,
        artist_id: conv.artist_id,
        annonce_id: conv.annonce_id,
        last_message: conv.last_message,
        updated: conv.updated,
        lu: conv.lu,
        client: clientProfile,
        messages: []
      };
    });

    // Ajouter les messages à chaque conversation
    (messagesData || []).forEach((msg: any) => {
      if (convMap[msg.conversation_id]) {
        convMap[msg.conversation_id].messages.push(msg);
      }
    });

    // Récupérer les titres des annonces
    const annonceIds = convData.map(c => c.annonce_id).filter(Boolean);
    if (annonceIds.length > 0) {
      const { data: annoncesData } = await supabase
        .from('annonces')
        .select('id, titre')
        .in('id', annonceIds);
      
      const titlesMap: {[key: string]: string} = {};
      (annoncesData || []).forEach((a: any) => {
        titlesMap[a.id] = a.titre;
      });
      setAnnonceTitles(titlesMap);
    }

    // Trier par dernier message
    const convArr = Object.values(convMap).sort((a: any, b: any) => {
      const aDate = a.messages[a.messages.length - 1]?.created_at || a.updated;
      const bDate = b.messages[b.messages.length - 1]?.created_at || b.updated;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    setConversations(convArr as Conversation[]);
    // Ne plus ouvrir automatiquement la première conversation
    
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
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConv || !user) return;
    setSending(true);
    
    const contenu = messageInput || (attachments.length > 0 ? '[Fichier joint]' : '');
    const { error } = await supabase.from('messages').insert({ 
      conversation_id: (selectedConv as any).id, 
      sender_id: user.id, 
      receiver_id: (selectedConv as any).client_id, 
      contenu: contenu, 
      objet: 'Message',
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
    });
    
    if (!error) {
      await supabase.from('conversations').update({ 
        last_message: contenu, 
        updated: new Date().toISOString() 
      }).eq('id', (selectedConv as any).id);
      
      setMessageInput('');
      setAttachments([]);
      await fetchMessages((selectedConv as any).id);
      await fetchConversations();
    }
    setSending(false);
  };

  const handleMarkReadUnread = async (markAsRead: boolean) => {
    if (checkedConvs.length === 0) return;
    
    for (const convId of checkedConvs) {
      await supabase.from('conversations').update({ lu: markAsRead }).eq('id', convId);
    }
    
    setConversations(conversations.map(conv =>
      checkedConvs.includes((conv as any).id)
        ? { ...conv, lu: markAsRead }
        : conv
    ));
    setCheckedConvs([]);
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'text/*'],
        copyToCacheDirectory: true,
        multiple: true
      });

      if (result.canceled) return;

      setIsUploading(true);
      const newAttachments: any[] = [];

      for (const asset of result.assets) {
        if (asset.size && asset.size > 5 * 1024 * 1024) {
          Alert.alert('Erreur', `Le fichier ${asset.name} est trop volumineux (max 5MB)`);
          continue;
        }

        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64' as any
        });

        newAttachments.push({
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size,
          data: `data:${asset.mimeType};base64,${base64}`
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewProfile = () => {
    if (selectedConv?.client_id) {
      // Navigation vers le profil du client
      Alert.alert('Profil', `Voir le profil de ${(selectedConv as any).client.nom}`);
    }
    setShowProfileMenu(false);
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

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const filteredConvs = conversations.filter(conv =>
    ((conv as any).client?.nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = conversations.filter(c => !c.lu).length;

  if (!selectedConv) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{conversations.length}</Text>
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.unread }]}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Non lus</Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Actions groupées */}
        {checkedConvs.length > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.bulkActionsText}>{checkedConvs.length} sélectionné(s)</Text>
            <View style={styles.bulkButtons}>
              <TouchableOpacity onPress={() => handleMarkReadUnread(true)} style={styles.bulkButton}>
                <Ionicons name="eye" size={20} color={COLORS.primary} />
                <Text style={styles.bulkButtonText}>Marquer lu</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMarkReadUnread(false)} style={styles.bulkButton}>
                <Ionicons name="eye-off" size={20} color={COLORS.primary} />
                <Text style={styles.bulkButtonText}>Marquer non lu</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCheckedConvs([])} style={styles.bulkButton}>
                <Ionicons name="close" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {filteredConvs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtitle}>Vos messages apparaîtront ici</Text>
          </View>
        ) : (
          <FlatList 
            data={filteredConvs} 
            keyExtractor={(item) => (item as any).id} 
            contentContainerStyle={styles.listContent} 
            ItemSeparatorComponent={() => <View style={styles.separator} />} 
            renderItem={({ item }) => {
              const photoUrl = getPhotoUrlFromProfile((item as any).client);
              const avatarUrl = photoUrl || svgAvatarDataUrl((item as any).client.nom || 'Client');
              const isChecked = checkedConvs.includes((item as any).id);
              const annonceTitre = (item as any).annonce_id ? annonceTitles[(item as any).annonce_id] : '';
              
              return (
                <TouchableOpacity 
                  style={[styles.conversationItem, isChecked && styles.conversationItemSelected]} 
                  onPress={() => handleSelectConv(item)}
                  onLongPress={() => {
                    if (isChecked) {
                      setCheckedConvs(checkedConvs.filter(id => id !== (item as any).id));
                    } else {
                      setCheckedConvs([...checkedConvs, (item as any).id]);
                    }
                  }}
                >
                  {/* Checkbox */}
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      if (isChecked) {
                        setCheckedConvs(checkedConvs.filter(id => id !== (item as any).id));
                      } else {
                        setCheckedConvs([...checkedConvs, (item as any).id]);
                      }
                    }}
                    style={styles.checkbox}
                  >
                    <Ionicons 
                      name={isChecked ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={isChecked ? COLORS.primary : COLORS.textLight} 
                    />
                  </TouchableOpacity>

                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    {!item.lu && <View style={styles.unreadDot} />}
                  </View>
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={[styles.clientNom, !item.lu && styles.boldText]}>{(item as any).client.nom || 'Client'}</Text>
                      <Text style={styles.timeText}>{formatTime(item.updated)}</Text>
                    </View>
                    {annonceTitre && (
                      <Text style={styles.annonceTitre} numberOfLines={1}>
                        <Ionicons name="camera" size={12} /> {annonceTitre}
                      </Text>
                    )}
                    <Text style={[styles.lastMessage, !item.lu && styles.boldText]} numberOfLines={1}>{item.last_message || 'Nouveau message'}</Text>
                  </View>
                </TouchableOpacity>
              );
            }} 
          />
        )}
        <FooterPresta />
      </SafeAreaView>
    );
  }

  const photoUrl = getPhotoUrlFromProfile((selectedConv as any).client);
  const avatarUrl = photoUrl || svgAvatarDataUrl((selectedConv as any).client.nom || 'Client');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedConv(null)} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatarContainer}>
              <Image source={{ uri: avatarUrl }} style={styles.smallAvatarImage} />
              <View style={styles.onlineIndicator} />
            </View>
            <View>
              <Text style={styles.headerName}>{(selectedConv as any).client.nom || 'Client'}</Text>
              <Text style={styles.onlineStatus}>En ligne</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.moreButton} 
            onPress={() => setShowProfileMenu(!showProfileMenu)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Menu contextuel */}
        {showProfileMenu && (
          <View style={styles.profileMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
              <Ionicons name="person-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Voir le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowProfileMenu(false)}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Informations</Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.messagesContent} renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender_id === user.id ? styles.myMessage : styles.theirMessage]}>
            <Text style={[styles.messageText, item.sender_id === user.id && styles.myMessageText]}>{item.contenu}</Text>
            <Text style={[styles.messageTime, item.sender_id === user.id && styles.myMessageTime]}>{new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )} />
        
        {/* Zone d'entrée avec pièces jointes */}
        <View>
          {/* Affichage des pièces jointes */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsPreview}>
              <Text style={styles.attachmentsTitle}>
                <Ionicons name="attach" size={14} /> Pièces jointes ({attachments.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {attachments.map((file, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Ionicons name="document" size={16} color={COLORS.primary} />
                    <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => removeAttachment(index)}>
                      <Ionicons name="close-circle" size={18} color={COLORS.unread} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            {/* Bouton pièces jointes */}
            <TouchableOpacity 
              onPress={handleFileSelect} 
              style={styles.attachButton}
              disabled={isUploading}
            >
              <Ionicons 
                name="attach" 
                size={24} 
                color={isUploading ? COLORS.textLight : COLORS.primary} 
              />
            </TouchableOpacity>
            
            <TextInput 
              style={styles.input} 
              placeholder="Écrivez un message..." 
              placeholderTextColor={COLORS.textLight} 
              value={messageInput} 
              onChangeText={setMessageInput} 
              multiline 
              maxLength={500} 
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, ((!messageInput.trim() && attachments.length === 0) || sending) && styles.sendButtonDisabled]} 
              onPress={handleSend} 
              disabled={(!messageInput.trim() && attachments.length === 0) || sending}
            >
              {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={20} color="white" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <FooterPresta />
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
  headerAvatarContainer: { position: 'relative' },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  onlineStatus: { fontSize: 12, color: '#10B981', marginTop: 2 },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: COLORS.background },
  moreButton: { padding: 4 },
  profileMenu: { position: 'absolute', top: 60, right: 16, backgroundColor: 'white', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, zIndex: 1000 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemText: { fontSize: 15, color: COLORS.text },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: COLORS.backgroundLight, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.backgroundLight, borderRadius: 12, gap: 8 },
  searchIcon: { marginRight: 4 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },
  bulkActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#EFF6FF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BFDBFE' },
  bulkActionsText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  bulkButtons: { flexDirection: 'row', gap: 12 },
  bulkButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bulkButtonText: { fontSize: 13, color: COLORS.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  listContent: { paddingVertical: 8 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.background },
  conversationItemSelected: { backgroundColor: '#EFF6FF' },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 92 },
  checkbox: { marginRight: 8 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '600' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.unread, borderWidth: 2, borderColor: COLORS.background },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientNom: { fontSize: 16, color: COLORS.text },
  boldText: { fontWeight: '600' },
  timeText: { fontSize: 13, color: COLORS.textLight },
  annonceTitre: { fontSize: 12, color: COLORS.primary, marginBottom: 2 },
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
  attachmentsPreview: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.backgroundLight, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachmentsTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, gap: 6, borderWidth: 1, borderColor: COLORS.border },
  attachmentName: { fontSize: 12, color: COLORS.text, maxWidth: 100 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, gap: 8 },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: COLORS.backgroundLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: COLORS.text },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 }
});
