import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderParti';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

// Types
interface Profile {
  id: string;
  nom: string;
  role?: string;
  photos?: string[] | string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  objet?: string;
  contenu: string;
  created_at: string;
  deletion_dateParti?: string | null;
}

interface Conversation {
  conversation: {
    id: string;
    artist_id: string;
    client_id: string;
    annonce_id?: string;
    last_message?: string;
    created_at: string;
    updated: string;
    deletion_dateParti?: string | null;
    lu?: boolean;
  };
  user: Profile | null;
  userId: string;
  annonceId?: string;
  messages: Message[];
  prestatairePhoto?: string;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

// Helpers
const cleanBase64 = (s: string) => (s || '').replace(/\s+/g, '');
const isProbablyBase64 = (s: string) => {
  if (!s) return false;
  const clean = cleanBase64(s);
  return clean.length > 50 && /^[A-Za-z0-9+/=]+$/.test(clean);
};
const guessMime = (b64: string) => {
  if (!b64) return 'image/jpeg';
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
};
const initialsFromName = (name: string = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
const svgAvatarDataUrl = (name: string = '', size: number = 128) => {
  const initials = initialsFromName(name);
  const bg = stringToColor(name || 'user');
  const fontSize = Math.round(size / 2.8);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <rect width='100%' height='100%' fill='${bg}' rx='20' />
    <text x='50%' y='50%' dy='.06em' text-anchor='middle' font-family='system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-size='${fontSize}' fill='white'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
const getPhotoUrlFromProfile = (profile: Profile | null) => {
  if (!profile) return null;
  let photos = profile.photos;
  if (Array.isArray(photos) && photos.length > 0) photos = photos[0];
  if (typeof photos === 'string') {
    const trimmed = photos.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) photos = parsed[0];
        else if (typeof parsed === 'string') photos = parsed;
      } catch (e) {}
    }
  }
  if (!photos) return null;
  if (typeof photos === 'string' && photos.startsWith('data:')) return photos;
  if (typeof photos === 'string' && (photos.startsWith('http://') || photos.startsWith('https://'))) return photos;
  if (typeof photos === 'string' && isProbablyBase64(photos)) {
    const cleaned = cleanBase64(photos);
    const mime = guessMime(cleaned);
    return `data:${mime};base64,${cleaned}`;
  }
  return null;
};

export default function MessagesParticulier() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [checkedConvs, setCheckedConvs] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [user, setUser] = useState<Profile | null>(null);
  const [messageInput, setMessageInput] = useState<string>("");
  const [objetInput, setObjetInput] = useState<string>("");
  const [annonceTitles, setAnnonceTitles] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;
      setUser({ id: authData.user.id, nom: authData.user.email || 'Utilisateur' });
      // Récupère toutes les conversations de l'utilisateur (non supprimées)
      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("id, artist_id, client_id, annonce_id, last_message, created_at, updated, deletion_dateParti, lu")
        .eq("client_id", authData.user.id)
        .is("deletion_dateParti", null)
        .order("updated", { ascending: false });
      if (!conversationsData) return;
      // Récupère tous les messages liés
      const convIds = conversationsData.map((c: any) => c.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, receiver_id, objet, contenu, created_at, deletion_dateParti")
        .in("conversation_id", convIds)
        .is("deletion_dateParti", null)
        .order("created_at", { ascending: true });
      if (!messages) return;
      // Récupère tous les profils nécessaires
      const userIds = Array.from(new Set(messages.flatMap((m: any) => [m.sender_id, m.receiver_id])));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nom, role, photos")
        .in("id", userIds);
      if (!profiles) return;
      const profileMap: Record<string, Profile> = {};
      profiles.forEach((p: Profile) => {
        profileMap[p.id] = p;
      });
      // Récupère les titres d'annonces
      const annonceIds = Array.from(new Set(conversationsData.map((c: any) => c.annonce_id).filter(Boolean)));
      let annonceTitlesMap: Record<string, string> = {};
      if (annonceIds.length > 0) {
        const { data: annoncesData } = await supabase
          .from("annonces")
          .select("id, titre")
          .in("id", annonceIds);
        if (annoncesData) {
          annoncesData.forEach((a: any) => {
            annonceTitlesMap[a.id] = a.titre;
          });
        }
      }
      setAnnonceTitles(annonceTitlesMap);
      // Regroupe les messages par conversation
      const convMap: Record<string, Conversation> = {};
      conversationsData.forEach((conv: any) => {
        const otherId = conv.artist_id === authData.user.id ? conv.client_id : conv.artist_id;
        const userProfile = profileMap[otherId] || null;
        let photoUrl = getPhotoUrlFromProfile(userProfile);
        if (!photoUrl) photoUrl = svgAvatarDataUrl(userProfile?.nom || 'U');
        convMap[conv.id] = {
          conversation: conv,
          user: userProfile,
          userId: otherId,
          annonceId: conv.annonce_id,
          messages: [],
          prestatairePhoto: photoUrl,
        };
      });
      messages.forEach((msg: any) => {
        if (convMap[msg.conversation_id]) {
          convMap[msg.conversation_id].messages.push(msg);
        }
      });
      const convArr: Conversation[] = Object.values(convMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.created_at || "";
        const bDate = b.messages[b.messages.length - 1]?.created_at || "";
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setConversations(convArr);
      if (convArr.length > 0 && !selectedConv) setSelectedConv(convArr[0]);

      // Marquer comme lus messages du premier conv
      if (convArr.length > 0) {
        const conv = convArr[0];
        await supabase
          .from("messages")
          .update({ lu: true })
          .eq("conversation_id", conv.conversation.id)
          .eq("receiver_id", authData.user.id);
        await supabase
          .from("conversations")
          .update({ lu: true })
          .eq("id", conv.conversation.id);
      }
    };
    fetchUserAndConversations();
  }, []);

  // Marquer lu / non lu
  const handleMarkReadUnread = async (markAsRead: boolean) => {
    for (const convId of checkedConvs) {
      await supabase
        .from("conversations")
        .update({ lu: markAsRead })
        .eq("id", convId);
    }
    setCheckedConvs([]);
    setConversations(
      conversations.map((conv) =>
        checkedConvs.includes(conv.conversation.id)
          ? { ...conv, conversation: { ...conv.conversation, lu: markAsRead } }
          : conv
      )
    );
  };

  // Sélection d'une conv
  const handleSelectConv = async (conv: Conversation) => {
    setSelectedConv(conv);
    await supabase
      .from("messages")
      .update({ lu: true })
      .eq("conversation_id", conv.conversation.id)
      .eq("receiver_id", user?.id);
    await supabase
      .from("conversations")
      .update({ lu: true })
      .eq("id", conv.conversation.id);
    setConversations(
      conversations.map((c) =>
        c.conversation.id === conv.conversation.id
          ? { ...c, conversation: { ...c.conversation, lu: true } }
          : c
      )
    );
  };

  // Fonction pour convertir un fichier en base64
  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Fonction pour gérer l'ajout de pièces jointes
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setIsUploading(true);
    
    try {
      const newAttachments: Attachment[] = [];
      
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert(`Le fichier ${file.name} est trop volumineux (max 5MB)`);
          continue;
        }
        
        const base64 = await fileToBase64(file);
        newAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Erreur lors de l\'encodage des fichiers:', error);
      Alert.alert('Erreur lors de l\'ajout des fichiers');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Fonction pour supprimer une pièce jointe
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Fonction pour naviguer vers le profil du prestataire
  const handleViewProfile = () => {
    if (selectedConv?.userId) {
      // Remplacer par navigation native si besoin
      // navigation.navigate('Profil', { userId: selectedConv.userId });
      Alert.alert('Navigation', `Voir le profil de ${selectedConv.user?.nom}`);
    }
    setShowProfileMenu(false);
  };

  // Envoi message
  const handleSend = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConv || !user?.id) return;
    
    let objetToUse = "";
    if (selectedConv.messages.length > 0) {
      objetToUse = selectedConv.messages[0].objet || "";
    } else {
      objetToUse = objetInput;
    }
    
    let contenuToSend = messageInput;
    
    // Si on a des pièces jointes, les inclure dans le contenu
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(att => `[Fichier: ${att.name}]`).join(' ');
      contenuToSend = messageInput ? `${messageInput}\n\n${attachmentInfo}` : attachmentInfo;
    }
    
    const now = new Date().toISOString();
    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: selectedConv.conversation.id,
        sender_id: user.id,
        receiver_id: selectedConv.userId,
        contenu: contenuToSend,
        objet: objetToUse,
        lu: false,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    ]);
    
    if (!error) {
      await supabase
        .from("conversations")
        .update({ last_message: contenuToSend, updated: now })
        .eq("id", selectedConv.conversation.id);
      await supabase
        .from("messages")
        .update({ deletion_dateParti: null })
        .eq("conversation_id", selectedConv.conversation.id);
      setMessageInput("");
      setObjetInput("");
      setAttachments([]);
      await new Promise((res) => setTimeout(res, 300));
      // Remplacer par navigation native si besoin
      // navigation.navigate('MessagesParticulier');
      Alert.alert('Succès', 'Message envoyé avec succès');
    }
  };

  const filteredConvs = conversations.filter(
    (conv) =>
      (conv.user?.nom || "").toLowerCase().includes(search.toLowerCase()) &&
      conv.conversation.deletion_dateParti == null
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Header />
      <View style={{ flex: 1, padding: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Messages</Text>
        <TextInput
          placeholder="Rechercher une conversation..."
          value={search}
          onChangeText={setSearch}
          style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 10 }}
        />
        <ScrollView>
          {conversations.length === 0 ? (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Aucun message</Text>
          ) : (
            conversations.map((conv) => (
              <TouchableOpacity
                key={conv.conversation.id}
                onPress={() => handleSelectConv(conv)}
                style={{ backgroundColor: selectedConv?.conversation.id === conv.conversation.id ? '#e0e0e0' : '#fff', borderRadius: 8, marginBottom: 8, padding: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: conv.prestatairePhoto || svgAvatarDataUrl(conv.user?.nom || 'U') }}
                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#ccc' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{conv.user?.nom || 'Utilisateur'}</Text>
                    <Text style={{ color: '#666' }}>{conv.messages[conv.messages.length - 1]?.contenu?.slice(0, 45) || 'Nouvelle conversation'}</Text>
                  </View>
                  {conv.conversation.lu ? null : <Feather name="mail" size={20} color="#007AFF" />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        {selectedConv && (
          <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 8, padding: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Image
                source={{ uri: selectedConv.prestatairePhoto || svgAvatarDataUrl(selectedConv.user?.nom || 'U') }}
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 10, backgroundColor: '#ccc' }}
              />
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{selectedConv.user?.nom || 'Utilisateur'}</Text>
                <Text style={{ color: '#666' }}>{selectedConv.user?.role || ''}</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              {selectedConv.messages.map((msg) => (
                <View key={msg.id} style={{ marginBottom: 8, alignSelf: msg.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <View style={{ backgroundColor: msg.sender_id === user?.id ? '#007AFF' : '#eee', borderRadius: 12, padding: 8 }}>
                    <Text style={{ color: msg.sender_id === user?.id ? '#fff' : '#333' }}>{msg.contenu}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TextInput
                placeholder="Tapez votre message..."
                value={messageInput}
                onChangeText={setMessageInput}
                style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 8 }}
              />
              <TouchableOpacity
                onPress={() => {/* handleSend() à compléter */}}
                style={{ marginLeft: 8, backgroundColor: '#007AFF', borderRadius: 8, padding: 10 }}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
