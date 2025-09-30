import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';
import { 
  Eye, EyeOff, Trash2, Send, Search, MessageCircle, UserCircle, 
  Calendar, Clock, CheckCircle, Circle, MoreVertical, Paperclip,
  Info, ArrowLeft, Filter, Star, AlertCircle, X, Users
} from "lucide-react";

/* ----- Helpers image/base64 ----- */
const cleanBase64 = (s) => (s || '').replace(/\s+/g, '');

const isProbablyBase64 = (s) => {
  if (!s) return false;
  const clean = cleanBase64(s);
  // suffisamment long et caractères base64 uniquement
  return clean.length > 50 && /^[A-Za-z0-9+/=]+$/.test(clean);
};

const guessMime = (b64) => {
  if (!b64) return 'image/jpeg';
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
};

const initialsFromName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const svgAvatarDataUrl = (name = '', size = 128) => {
  const initials = initialsFromName(name);
  const bg = stringToColor(name || 'user');
  const fontSize = Math.round(size / 2.8);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <rect width='100%' height='100%' fill='${bg}' rx='20' />
    <text x='50%' y='50%' dy='.06em' text-anchor='middle' font-family='system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-size='${fontSize}' fill='white'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Retourne une URL utilisable pour <img src=...>
 * - accepte : array, string JSON, dataURL, plain base64, http(s) URL
 * - renvoie null si aucun visuel trouvé
 */
const getPhotoUrlFromProfile = (profile) => {
  if (!profile) return null;
  let photos = profile.photos;

  // si photos est un array, prends le premier élément
  if (Array.isArray(photos) && photos.length > 0) photos = photos[0];

  // si c'est une string JSON encodée comme '["..."]' -> parse
  if (typeof photos === 'string') {
    const trimmed = photos.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) photos = parsed[0];
        else if (typeof parsed === 'string') photos = parsed;
      } catch (e) {
        // ignore, on continue avec la chaîne brute
      }
    }
  }

  if (!photos) return null;

  // déjà une data URL ?
  if (typeof photos === 'string' && photos.startsWith('data:')) return photos;

  // une URL http(s) ?
  if (typeof photos === 'string' && (photos.startsWith('http://') || photos.startsWith('https://'))) {
    return photos;
  }

  // si c'est manifestement du base64 (sans data:prefix)
  if (typeof photos === 'string' && isProbablyBase64(photos)) {
    const cleaned = cleanBase64(photos);
    const mime = guessMime(cleaned);
    return `data:${mime};base64,${cleaned}`;
  }

  // sinon, on renvoie null pour fallback
  return null;
};

/* ----- Composant principal ----- */
export default function MessagesParticulier() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [checkedConvs, setCheckedConvs] = useState([]);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [objetInput, setObjetInput] = useState('');
  const [annonceTitles, setAnnonceTitles] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      const { data: authData } = await supabase.auth.getUser();
      setUser(authData?.user);
      if (!authData?.user) return;

      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('id, artist_id, client_id, annonce_id, last_message, created_at, updated, deletion_dateParti, lu')
        .eq('artist_id', authData.user.id)
        .is('deletion_datePresta', null)
        .order('updated', { ascending: false });

      if (!conversationsData) return;

      const convIds = conversationsData.map(c => c.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, receiver_id, objet, contenu, created_at, deletion_dateParti')
        .in('conversation_id', convIds)
        .is('deletion_datePresta', null)
        .order('created_at', { ascending: true });

      if (!messages) return;

      const userIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom, photos, role')
        .in('id', userIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      const annonceIds = Array.from(new Set(conversationsData.map(c => c.annonce_id).filter(Boolean)));
      let annonceTitlesMap = {};
      if (annonceIds.length > 0) {
        const { data: annoncesData } = await supabase
          .from('annonces')
          .select('id, titre')
          .in('id', annonceIds);
        if (annoncesData) annoncesData.forEach(a => { annonceTitlesMap[a.id] = a.titre; });
      }
      setAnnonceTitles(annonceTitlesMap);

      // Map conversations to include profile + photoUrl
      const convMap = {};
      conversationsData.forEach(conv => {
        const otherId = conv.artist_id === authData.user.id ? conv.client_id : conv.artist_id;
        const userProfile = profileMap[otherId] || null;
        let photoUrl = getPhotoUrlFromProfile(userProfile);
        if (!photoUrl) photoUrl = svgAvatarDataUrl(userProfile?.nom || 'U'); // fallback svg
        convMap[conv.id] = {
          conversation: conv,
          user: userProfile,
          userId: otherId,
          annonceId: conv.annonce_id,
          messages: [],
          ParticulierPhoto: photoUrl
        };
      });

      messages.forEach(msg => {
        if (convMap[msg.conversation_id]) convMap[msg.conversation_id].messages.push(msg);
      });

      const convArr = Object.values(convMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.created_at || '';
        const bDate = b.messages[b.messages.length - 1]?.created_at || '';
        return new Date(bDate) - new Date(aDate);
      });

      setConversations(convArr);
      if (convArr.length > 0) setSelectedConv(prev => prev || convArr[0]);

      // marquer lus pour la première conversation (optionnel)
      if (convArr.length > 0) {
        const conv = convArr[0];
        await supabase.from('messages').update({ lu: true }).eq('conversation_id', conv.conversation.id).eq('receiver_id', authData.user.id);
        await supabase.from('conversations').update({ lu: true }).eq('id', conv.conversation.id);
      }
    };

    fetchUserAndConversations();
  }, []);

  // Fermer le menu dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.relative')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // ... (le reste de ton code : handleMarkReadUnread, handleSelectConv, handleSend identiques)
  // Pour la brièveté, je reprends exactement les fonctions précédentes (adapte si besoin) :

  const handleMarkReadUnread = async (markAsRead) => {
    for (const convId of checkedConvs) {
      await supabase.from('conversations').update({ lu: markAsRead }).eq('id', convId);
    }
    setCheckedConvs([]);
    setConversations(conversations.map(conv =>
      checkedConvs.includes(conv.conversation.id)
        ? { ...conv, conversation: { ...conv.conversation, lu: markAsRead } }
        : conv
    ));
  };

  const handleSelectConv = async (conv) => {
    setSelectedConv(conv);
    await supabase
      .from('messages')
      .update({ lu: true })
      .eq('conversation_id', conv.conversation.id)
      .eq('receiver_id', user?.id);
    await supabase
      .from('conversations')
      .update({ lu: true })
      .eq('id', conv.conversation.id);
    setConversations(conversations.map(c =>
      c.conversation.id === conv.conversation.id
        ? { ...c, conversation: { ...c.conversation, lu: true } }
        : c
    ));
  };

  // Fonction pour convertir un fichier en base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Fonction pour gérer l'ajout de pièces jointes
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    setIsUploading(true);
    
    try {
      const newAttachments = [];
      
      for (const file of files) {
        // Limiter la taille des fichiers (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert(`Le fichier ${file.name} est trop volumineux (max 5MB)`);
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
      alert('Erreur lors de l\'ajout des fichiers');
    } finally {
      setIsUploading(false);
      // Reset l'input file
      event.target.value = '';
    }
  };

  // Fonction pour supprimer une pièce jointe
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Fonction pour naviguer vers le profil du client
  const handleViewProfile = () => {
    if (selectedConv?.userId) {
      window.open(`/profil/${selectedConv.userId}`, '_blank');
    }
    setShowProfileMenu(false);
  };

  const handleSend = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConv || !user?.id) return;
    
    let objetToUse = selectedConv.messages.length > 0 ? selectedConv.messages[0].objet || '' : objetInput;
    const now = new Date().toISOString();
    
    const { error } = await supabase.from('messages').insert([{
      conversation_id: selectedConv.conversation.id,
      sender_id: user.id,
      receiver_id: selectedConv.userId,
      contenu: messageInput || (attachments.length > 0 ? '[Fichier joint]' : ''),
      objet: objetToUse,
      lu: false,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
    }]);
    await supabase.from('notifications').insert([{
      user_id: selectedConv.userId,
      type: 'message',
      contenu: messageInput,
      lu: false
    }]);
    if (!error) {
      await supabase.from('conversations').update({ 
        last_message: messageInput || '[Fichier joint]', 
        updated: now 
      }).eq('id', selectedConv.conversation.id);
      setMessageInput('');
      setObjetInput('');
      setAttachments([]);
      await new Promise(res => setTimeout(res, 300));
      window.location.reload();
    }
  };

  const filteredConvs = conversations.filter(conv =>
    ((conv.user?.nom || '').toLowerCase().includes(search.toLowerCase())) &&
    conv.conversation.deletion_datePresta == null
  );

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        {/* Header moderne avec titre et statistiques */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-slate-800 text-white shadow-xl">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  Messagerie
                </h3>
                <p className="text-slate-300">Gérez vos conversations avec vos clients</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                  <div className="text-xl font-bold">{conversations.length}</div>
                  <div className="text-slate-300 text-xs">Conversations</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                  <div className="text-xl font-bold">
                    {conversations.filter(c => !c.conversation.lu).length}
                  </div>
                  <div className="text-slate-300 text-xs">Non lus</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des conversations */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header de la sidebar */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Conversations
                </h2>
                <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  {filteredConvs.length}
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all shadow-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            {/* Liste scrollable */}
            <div className="h-[calc(80vh-160px)] overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="text-slate-400 text-center py-12">Aucun message</div>
              ) : (
                filteredConvs.map(conv => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const lastPreview = lastMsg?.contenu ? lastMsg.contenu.slice(0, 45) + (lastMsg.contenu.length > 45 ? "..." : "") : 'Nouvelle conversation';
                  const isRead = conv.conversation.lu;
                  const annonceTitre = conv.annonceId ? annonceTitles[conv.annonceId] : '';
                  const photoUrl = conv.ParticulierPhoto || svgAvatarDataUrl(conv.user?.nom || 'U');
                  const isSelected = selectedConv?.userId === conv.userId;

                  return (
                    <div
                      key={conv.userId}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                        isSelected
                          ? 'bg-gray-100 border-l-4 border-l-gray-600 shadow-sm'
                          : !isRead
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:shadow-sm'
                      }`}
                      onClick={() => handleSelectConv(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={checkedConvs.includes(conv.conversation.id)}
                            onChange={e => {
                              e.stopPropagation();
                              if (e.target.checked) setCheckedConvs([...checkedConvs, conv.conversation.id]);
                              else setCheckedConvs(checkedConvs.filter(id => id !== conv.conversation.id));
                            }}
                            className="absolute -top-1 -left-1 w-4 h-4 text-gray-600 rounded focus:ring-gray-500 z-10"
                          />
                          <img 
                            src={photoUrl} 
                            alt={conv.user?.nom} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg ml-5" 
                          />
                          {!isRead && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h2 className={`text-base font-semibold truncate ${
                              !isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {conv.user?.nom || 'Utilisateur'}
                            </h2>
                            <span className="text-xs text-gray-500 ml-2">
                              {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                            </span>
                          </div>
                          
                          <p className={`text-sm truncate ${
                            !isRead ? 'text-gray-800 font-medium' : 'text-gray-500'
                          }`}>
                            {lastPreview}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Messages de la conversation sélectionnée */}
          <div className="md:col-span-2 py-6">
            {selectedConv ? (
              <div className="flex flex-col h-[80vh] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header de la conversation */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={selectedConv.ParticulierPhoto || svgAvatarDataUrl(selectedConv.user?.nom || 'U')} 
                          alt={selectedConv.user?.nom || "Utilisateur"} 
                          className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-lg" 
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      
                      <div>
                        <h2 className="font-bold text-xl text-gray-800">{selectedConv.user?.nom || 'Utilisateur'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            En ligne
                          </span>
                          {selectedConv.user?.role && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                              {selectedConv.user.role}
                            </span>
                          )}
                        </div>
                        
                        {selectedConv.annonceId && annonceTitles[selectedConv.annonceId] && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded">{annonceTitles[selectedConv.annonceId]}</span>
                          </div>
                        )}

                        {selectedConv.messages.length > 0 && selectedConv.messages[0].objet && (
                          <div className="flex items-center gap-1 mt-1">
                            <Info className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">{selectedConv.messages[0].objet}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button 
                          onClick={() => setShowProfileMenu(!showProfileMenu)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {showProfileMenu && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
                            <button
                              onClick={handleViewProfile}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <UserCircle className="w-4 h-4" />
                              Voir le profil
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50/30 to-slate-50/30">
                  <div className="space-y-4">
                    {selectedConv.messages.map((msg, index) => {
                      const isMyMessage = msg.sender_id === user?.id;
                      const showAvatar = index === 0 || selectedConv.messages[index - 1].sender_id !== msg.sender_id;
                      
                      return (
                        <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {!isMyMessage && showAvatar && (
                            <img 
                              src={selectedConv.ParticulierPhoto || svgAvatarDataUrl(selectedConv.user?.nom || 'U')} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md" 
                            />
                          )}
                          {!isMyMessage && !showAvatar && <div className="w-8"></div>}
                          
                          <div className={`group max-w-[75%] ${isMyMessage ? 'order-last' : ''}`}>
                            <div className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                              isMyMessage 
                                ? 'bg-gray-800 text-white' 
                                : 'bg-white border border-gray-200 text-gray-800'
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.contenu}</p>
                            </div>
                            
                            <div className={`flex items-center gap-2 mt-1 px-2 ${
                              isMyMessage ? 'justify-end' : 'justify-start'
                            }`}>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMyMessage && (
                                <CheckCircle className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedConv.messages.length === 0 && (
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent" 
                      placeholder="Objet du message" 
                      value={objetInput} 
                      onChange={e => setObjetInput(e.target.value)} 
                    />
                  )}
                  
                  {/* Affichage des pièces jointes */}
                  {attachments.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Pièces jointes ({attachments.length})
                      </h4>
                      <div className="space-y-1">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-700">{file.name}</span>
                              <span className="text-slate-400 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button 
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Zone de saisie */}
                  <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
                    <div className="flex items-end gap-2">
                      {/* Bouton pièces jointes */}
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                          disabled={isUploading}
                        />
                        <button 
                          type="button"
                          className={`p-3 rounded-xl transition-colors ${
                            isUploading 
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          disabled={isUploading}
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Zone de texte */}
                      <div className="flex-1">
                        <textarea
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                          placeholder="Tapez votre message..."
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          rows="1"
                          style={{ minHeight: '48px', maxHeight: '120px' }}
                          onInput={e => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                      </div>
                      
                      {/* Bouton d'envoi avec icône */}
                      <button 
                        type="submit" 
                        disabled={!messageInput.trim() && attachments.length === 0}
                        className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center py-12">Sélectionnez une conversation pour afficher les messages.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
