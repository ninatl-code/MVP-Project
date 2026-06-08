import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderParti';

import {
  Send, Search, MessageCircle, UserCircle,
  CheckCircle, MoreVertical, Paperclip,
  ArrowLeft, X, Users, Plus
} from 'lucide-react';

/* ----- Helpers avatar ----- */
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

const svgAvatarDataUrl = (name = '') => {
  const initials = initialsFromName(name);
  const bg = stringToColor(name || 'user');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' fill='${bg}' rx='20' />
    <text x='50%' y='50%' dy='.06em' text-anchor='middle' font-family='system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-size='46' fill='white'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getAvatarUrl = (profile) => {
  if (!profile) return null;
  const url = profile.avatar_url;
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) return url;
  return null;
};

/* ----- Page principale ----- */
export default function ClientMessages() {
  const router = useRouter();
  const { prestataire: prestataireParam } = router.query;

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { router.push('/auth/login'); return; }
      setUser(authData.user);
      await loadConversations(authData.user.id, prestataireParam);
    };
    if (router.isReady) init();
  }, [router.isReady, prestataireParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const loadConversations = async (userId, autoOpenPrestataireId) => {
    setLoading(true);
    try {
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('id, client_id, prestataire_id, demande_id, reservation_id, last_message_text, last_message_at, unread_count_client, created_at, updated_at')
        .eq('client_id', userId)
        .order('updated_at', { ascending: false });

      if (!conversationsData) return;

      const convIds = conversationsData.map(c => c.id);
      const [{ data: messages }, { data: profiles }, { data: prestProfiles }] = await Promise.all([
        convIds.length > 0
          ? supabase.from('messages').select('id, conversation_id, sender_id, receiver_id, contenu, attachments, lu, created_at').in('conversation_id', convIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        (() => {
          const ids = Array.from(new Set(conversationsData.map(c => c.prestataire_id).filter(Boolean)));
          return ids.length > 0
            ? supabase.from('profiles').select('id, nom, avatar_url').in('id', ids)
            : Promise.resolve({ data: [] });
        })(),
        (() => {
          const ids = Array.from(new Set(conversationsData.map(c => c.prestataire_id).filter(Boolean)));
          return ids.length > 0
            ? supabase.from('profils_prestataire').select('id, nom_entreprise, avatar_url').in('id', ids)
            : Promise.resolve({ data: [] });
        })(),
      ]);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      (prestProfiles || []).forEach(p => {
        if (!profileMap[p.id]) profileMap[p.id] = {};
        profileMap[p.id] = { ...profileMap[p.id], nom_entreprise: p.nom_entreprise, prest_avatar: p.avatar_url };
      });

      // Index messages par conversation_id
      const msgsByConvId = {};
      (messages || []).forEach(msg => {
        if (!msgsByConvId[msg.conversation_id]) msgsByConvId[msg.conversation_id] = [];
        msgsByConvId[msg.conversation_id].push(msg);
      });

      // Grouper par prestataire_id (fusionner les doublons)
      const convMap = {}; // keyed by prestataire_id
      conversationsData.forEach(conv => {
        const otherId = conv.prestataire_id;
        if (!otherId) return;
        const profile = profileMap[otherId] || null;
        const displayName = profile?.nom_entreprise || profile?.nom || 'Prestataire';
        const photoUrl = getAvatarUrl({ avatar_url: profile?.prest_avatar || profile?.avatar_url }) || svgAvatarDataUrl(displayName);

        if (!convMap[otherId]) {
          convMap[otherId] = {
            conversation: conv, // conversation la plus récente = celle pour envoyer
            allConvIds: [conv.id],
            user: { ...profile, nom: displayName },
            userId: otherId,
            messages: [],
            photoUrl,
          };
        } else {
          // Doublon : garder la conversation la plus récente pour les envois
          convMap[otherId].allConvIds.push(conv.id);
          if (new Date(conv.updated_at) > new Date(convMap[otherId].conversation.updated_at)) {
            convMap[otherId].conversation = conv;
          }
        }
      });

      // Fusionner les messages de toutes les conversations d'un même prestataire
      Object.values(convMap).forEach(entry => {
        const allMsgs = entry.allConvIds.flatMap(cid => msgsByConvId[cid] || []);
        allMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        entry.messages = allMsgs;
      });

      const convArr = Object.values(convMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.created_at || a.conversation.updated_at || '';
        const bDate = b.messages[b.messages.length - 1]?.created_at || b.conversation.updated_at || '';
        return new Date(bDate) - new Date(aDate);
      });

      setConversations(convArr);

      // Auto-ouvrir ou créer conversation si ?prestataire= est dans l'URL
      if (autoOpenPrestataireId) {
        const existing = convArr.find(c => c.userId === autoOpenPrestataireId);
        if (existing) {
          setSelectedConv(existing);
        } else {
          // Créer la conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({ client_id: userId, prestataire_id: autoOpenPrestataireId })
            .select()
            .single();
          if (!error && newConv) {
            // Récupérer le profil du prestataire
            const [{ data: pProfile }, { data: pPrest }] = await Promise.all([
              supabase.from('profiles').select('id, nom, avatar_url').eq('id', autoOpenPrestataireId).single(),
              supabase.from('profils_prestataire').select('id, nom_entreprise, avatar_url').eq('id', autoOpenPrestataireId).single(),
            ]);
            const displayName = pPrest?.nom_entreprise || pProfile?.nom || 'Prestataire';
            const photoUrl = getAvatarUrl({ avatar_url: pPrest?.avatar_url || pProfile?.avatar_url }) || svgAvatarDataUrl(displayName);
            const newEntry = {
              conversation: newConv,
              user: { nom: displayName },
              userId: autoOpenPrestataireId,
              messages: [],
              photoUrl,
            };
            setConversations(prev => [newEntry, ...prev]);
            setSelectedConv(newEntry);
          }
        }
      } else if (convArr.length > 0) {
        setSelectedConv(convArr[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConv = async (conv) => {
    setSelectedConv(conv);
    if (!user?.id) return;
    // Marquer lus dans toutes les conversations fusionnées
    await Promise.all(conv.allConvIds.map(cid =>
      supabase.from('messages').update({ lu: true }).eq('conversation_id', cid).eq('receiver_id', user.id)
    ));
    await Promise.all(conv.allConvIds.map(cid =>
      supabase.from('conversations').update({ unread_count_client: 0 }).eq('id', cid)
    ));
    setConversations(prev => prev.map(c =>
      c.userId === conv.userId
        ? { ...c, conversation: { ...c.conversation, unread_count_client: 0 } }
        : c
    ));
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    setIsUploading(true);
    try {
      const newAttachments = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { alert(`${file.name} dépasse 5MB`); continue; }
        const base64 = await fileToBase64(file);
        newAttachments.push({ name: file.name, type: file.type, size: file.size, data: base64 });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConv || !user?.id) return;

    const now = new Date().toISOString();
    const text = messageInput || '[Fichier joint]';

    const { error } = await supabase.from('messages').insert([{
      conversation_id: selectedConv.conversation.id,
      sender_id: user.id,
      receiver_id: selectedConv.userId,
      contenu: text,
      lu: false,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
    }]);

    if (!error) {
      await supabase.from('conversations').update({ last_message_text: text, last_message_at: now, updated_at: now }).eq('id', selectedConv.conversation.id);
      setMessageInput('');
      setAttachments([]);
      // Rafraîchir les messages de toutes les conversations fusionnées
      const allMsgsPromises = selectedConv.allConvIds.map(cid =>
        supabase.from('messages').select('id, conversation_id, sender_id, receiver_id, contenu, attachments, lu, created_at').eq('conversation_id', cid).order('created_at', { ascending: true })
      );
      const allResults = await Promise.all(allMsgsPromises);
      const mergedMsgs = allResults.flatMap(r => r.data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const updated = { ...selectedConv, messages: mergedMsgs };
      setSelectedConv(updated);
      setConversations(prev => prev.map(c => c.userId === selectedConv.userId ? updated : c));
    }
  };

  const filteredConvs = conversations.filter(conv =>
    (conv.user?.nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.conversation.unread_count_client || 0), 0);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-800 text-white shadow-xl">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={() => router.back()} className="flex items-center gap-1 text-indigo-200 hover:text-white text-sm mb-2 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  Messagerie
                </h1>
                <p className="text-indigo-200 mt-1">Vos conversations avec les prestataires</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                  <div className="text-xl font-bold">{conversations.length}</div>
                  <div className="text-indigo-200 text-xs">Conversations</div>
                </div>
                {unreadTotal > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                    <div className="text-xl font-bold">{unreadTotal}</div>
                    <div className="text-indigo-200 text-xs">Non lus</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar conversations */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Conversations
                </h2>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  {filteredConvs.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="h-[calc(80vh-160px)] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Chargement...</div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune conversation</p>
                  <p className="text-xs mt-1">Contactez un prestataire depuis son profil</p>
                </div>
              ) : (
                filteredConvs.map(conv => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const preview = lastMsg?.contenu ? lastMsg.contenu.slice(0, 45) + (lastMsg.contenu.length > 45 ? '…' : '') : 'Nouvelle conversation';
                  const unread = (conv.conversation.unread_count_client || 0) > 0;
                  const isSelected = selectedConv?.conversation?.id === conv.conversation.id;

                  return (
                    <div
                      key={conv.conversation.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-indigo-50 border-l-4 border-l-indigo-600'
                          : unread
                            ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectConv(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={conv.photoUrl} alt={conv.user?.nom} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow" />
                          {unread && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-semibold truncate ${unread ? 'text-gray-900' : 'text-gray-700'}`}>
                              {conv.user?.nom || 'Prestataire'}
                            </span>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                            </span>
                          </div>
                          <p className={`text-xs truncate ${unread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>{preview}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Zone messages */}
          <div className="md:col-span-2 py-6">
            {selectedConv ? (
              <div className="flex flex-col h-[80vh] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header conversation */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={selectedConv.photoUrl} alt={selectedConv.user?.nom} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg" />
                      <div>
                        <h2 className="font-bold text-lg text-gray-800">{selectedConv.user?.nom || 'Prestataire'}</h2>
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> En ligne
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setShowProfileMenu(v => !v)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                          <button
                            onClick={() => { router.push(`/client/photographes/${selectedConv.userId}`); setShowProfileMenu(false); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserCircle className="w-4 h-4" /> Voir le profil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-gray-50/30 to-slate-50/30">
                  {selectedConv.messages.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Commencez la conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedConv.messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.id;
                        const showAvatar = !isMe && (index === 0 || selectedConv.messages[index - 1].sender_id !== msg.sender_id);
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {!isMe && showAvatar && (
                              <img src={selectedConv.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                            )}
                            {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}
                            <div className="max-w-[72%]">
                              <div className={`px-4 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.contenu}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 px-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && <CheckCircle className="w-3 h-3 text-gray-300" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Zone de saisie */}
                <div className="p-4 border-t border-gray-200 bg-white space-y-2">
                  {attachments.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-slate-400 text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
                          </div>
                          <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                    <div className="relative flex-shrink-0">
                      <input type="file" multiple onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif" disabled={isUploading} />
                      <button type="button" className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" disabled={isUploading}>
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>
                    <textarea
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
                      placeholder="Tapez votre message..."
                      value={messageInput}
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      onChange={e => setMessageInput(e.target.value)}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() && attachments.length === 0}
                      className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-[80vh] bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">Sélectionnez une conversation</p>
                <p className="text-sm mt-1">ou contactez un prestataire depuis son profil</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
