import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import HeaderParti from '../../../components/HeaderParti';
import HeaderPresta from '../../../components/HeaderPresta';
import * as messageService from '../../../lib/messageService';
import {
  ArrowLeft, Send, Paperclip, MoreVertical, FileText,
  Phone, Info, Check, CheckCheck, MessageSquare, Search, X,
  MessageCircle, UserCircle, Users
} from 'lucide-react';

/* ── Helpers avatar ── */
const initialsFromName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
const svgAvatarDataUrl = (name = '') => {
  const initials = initialsFromName(name);
  const bg = stringToColor(name || 'user');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' fill='${bg}' rx='20'/>
    <text x='50%' y='50%' dy='.06em' text-anchor='middle' font-family='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial' font-size='46' fill='white'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
const getAvatarSrc = (profile) => {
  const url = profile?.avatar_url;
  if (url && (url.startsWith('http') || url.startsWith('data:'))) return url;
  return null;
};

/* ── Renders message text with devis references as clickable links ── */
function MessageContent({ contenu, isOwn }) {
  if (!contenu) return null;
  const devisRefRegex = /\[Devis: (.+?) — (\/client\/devis\/[^\]]+)\]/g;
  const parts = [];
  let last = 0, match;
  while ((match = devisRefRegex.exec(contenu)) !== null) {
    if (match.index > last) parts.push(contenu.slice(last, match.index));
    parts.push(
      <a key={match.index} href={match[2]}
        className={`inline-flex items-center gap-1 underline font-medium text-sm mt-1 ${isOwn ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}>
        <FileText className="w-3.5 h-3.5" />{match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < contenu.length) parts.push(contenu.slice(last));
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{parts}</p>;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, activeRole, profileId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [devisContext, setDevisContext] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const messagesContainerRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !profileId || !activeRole) return;
    setLoading(true);
    fetchConversations();
  }, [router.isReady, profileId, activeRole]);

  useEffect(() => {
    if (!selectedConversation) return;
    const loadMessages = async () => {
      const { data, error } = await messageService.getConversationMessages(selectedConversation.id);
      if (!error && data) setMessages(data);
    };
    loadMessages();
    const channel = messageService.subscribeToConversation(selectedConversation.id, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });
    channelRef.current = channel;
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [selectedConversation]);

  useEffect(() => {
    if (!router.isReady || !router.query.devis) return;
    const fetchDevisContext = async () => {
      const { data } = await supabase.from('devis').select('id, titre, montant_total').eq('id', router.query.devis).single();
      if (data) setDevisContext(data);
    };
    fetchDevisContext();
  }, [router.isReady, router.query.devis]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length]);

  const fetchConversations = async () => {
    setError(null);
    try {
      const { data: convData, error: convError } = await messageService.getUserConversations(profileId, activeRole);
      if (!convData) { setError(`Pas de conversation : ${profileId}, ${activeRole}`); return; }
      if (convError) { setError(`Erreur : ${convError.message}`); return; }

      const profileIds = new Set();
      (convData || []).forEach(c => {
        if (c.client_id) profileIds.add(c.client_id);
        if (c.prestataire_id) profileIds.add(c.prestataire_id);
      });

      let profileMap = {};
      if (profileIds.size > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, nom, avatar_url').in('id', Array.from(profileIds));
        (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      }

      const enriched = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages').select('contenu, created_at, sender_id')
            .eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).single();
          const isPresta = activeRole === 'photographe';
          const otherParticipantId = isPresta ? conv.client_id : conv.prestataire_id;
          const otherProfile = profileMap[otherParticipantId] || null;
          const displayName = otherProfile?.nom || 'Utilisateur';
          return {
            ...conv,
            lastMessage: lastMsg || null,
            client: profileMap[conv.client_id] || null,
            prestataire: profileMap[conv.prestataire_id] || null,
            otherParticipant: otherProfile,
            displayName,
            photoUrl: getAvatarSrc(otherProfile) || svgAvatarDataUrl(displayName),
          };
        })
      );

      // Dédupliquer par paire client/prestataire
      const seen = new Map();
      for (const conv of enriched) {
        const key = `${conv.client_id}__${conv.prestataire_id}`;
        if (!seen.has(key)) {
          seen.set(key, conv);
        } else {
          const existing = seen.get(key);
          const existingDate = existing.last_message_at || existing.created_at || '';
          const convDate = conv.last_message_at || conv.created_at || '';
          if (convDate > existingDate) seen.set(key, conv);
        }
      }
      const deduped = Array.from(seen.values());
      setConversations(deduped);

      if (router.query.id) {
        const conv = deduped.find(c => String(c.id) === String(router.query.id));
        if (conv) { setSelectedConversation(conv); return; }
      }

      if (router.query.prestataire) {
        const prestataireId = router.query.prestataire;
        const { data: existingConvs } = await messageService.getExistingConversation(profileId, prestataireId);
        const existingConv = existingConvs?.[0];
        if (existingConv) {
          const found = enriched.find(c => c.id === existingConv.id) || existingConv;
          setSelectedConversation(found);
        } else {
          const { data: newConv, error: convCreateError } = await messageService.createConversation(profileId, prestataireId);
          if (convCreateError) {
            setError(`Impossible de créer la conversation : ${convCreateError.message}`);
          } else if (newConv) {
            const { data: prestaProfile } = await supabase.from('profiles').select('id, nom, avatar_url').eq('id', prestataireId).single();
            const displayName = prestaProfile?.nom || 'Utilisateur';
            const newEnriched = {
              ...newConv, lastMessage: null,
              client: profileMap[profileId] || null,
              prestataire: prestaProfile || null,
              otherParticipant: prestaProfile || null,
              displayName,
              photoUrl: getAvatarSrc(prestaProfile) || svgAvatarDataUrl(displayName),
            };
            setConversations(prev => [newEnriched, ...prev]);
            setSelectedConversation(newEnriched);
          }
        }
      }
    } catch (err) {
      setError(`Erreur inattendue : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    const baseContenu = newMessage.trim();
    const contenu = devisContext
      ? `${baseContenu}\n\n[Devis: ${devisContext.titre || devisContext.id} — /client/devis/${devisContext.id}]`
      : baseContenu;
    const receiverId = selectedConversation.otherParticipant?.id;
    const { data, error } = await messageService.sendMessage({
      conversationId: selectedConversation.id,
      senderId: profileId,
      receiverId,
      content: contenu,
    });
    if (!error && data) { setMessages(prev => [...prev, data]); setNewMessage(''); }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const diff = Date.now() - date;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const Header = activeRole === 'photographe' ? HeaderPresta : HeaderParti;

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = (conv.displayName || '').toLowerCase();
    const lastMsg = (conv.lastMessage?.contenu || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || lastMsg.includes(searchQuery.toLowerCase());
  });

  const unreadTotal = conversations.reduce((acc, c) => {
    const isPresta = activeRole === 'photographe';
    return acc + ((isPresta ? c.unread_count_prestataire : c.unread_count_client) || 0);
  }, 0);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Chargement des messages…</p>
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Erreur de chargement</p>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button onClick={() => { setError(null); setLoading(true); fetchConversations(); }}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Main ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <Header />

      {/* ── Page header gradient ── */}
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

      {/* ── Grid layout ── */}
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── SIDEBAR ── */}
        <div className={`${selectedConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'} md:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden`}>
          {/* Sidebar header — fixe */}
          <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-slate-50 p-5 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" /> Conversations
              </h2>
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                {filteredConversations.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Liste conversations — scroll indépendant */}
          <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: 'calc(80vh - 160px)' }}>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{searchQuery ? 'Aucun résultat' : 'Aucune conversation'}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = selectedConversation?.id === conv.id;
                const isPresta = activeRole === 'photographe';
                const unread = ((isPresta ? conv.unread_count_prestataire : conv.unread_count_client) || 0) > 0;
                const preview = (conv.lastMessage?.contenu?.replace(/\[Devis:.*?\]/g, '📄 Devis joint') || 'Démarrer la conversation');

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-600'
                        : unread
                          ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <img src={conv.photoUrl} alt={conv.displayName} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow" />
                        {unread && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold truncate ${unread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.displayName}
                          </span>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {conv.lastMessage && formatTime(conv.lastMessage.created_at)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${unread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {preview.slice(0, 50)}{preview.length > 50 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className={`${!selectedConversation ? 'hidden md:block' : 'block'} md:col-span-2`}>
          {selectedConversation ? (
            <div className="flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden" style={{ height: '80vh' }}>

              {/* Chat header — fixe */}
              <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-slate-50 p-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <img src={selectedConversation.photoUrl} alt={selectedConversation.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg" />
                    <div>
                      <h2 className="font-bold text-lg text-gray-800">{selectedConversation.displayName}</h2>
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
                          onClick={() => { router.push(`/client/photographes/${selectedConversation.otherParticipant?.id}`); setShowProfileMenu(false); }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UserCircle className="w-4 h-4" /> Voir le profil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages — scroll indépendant */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-5 space-y-4"
                style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', overscrollBehavior: 'contain' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Commencez la conversation</p>
                    <p className="text-xs mt-1">Envoyez le premier message !</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === profileId || message.sender_id === user?.id;
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];
                    const showDateSep = !prevMsg ||
                      new Date(message.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== message.sender_id;
                    const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== message.sender_id);

                    return (
                      <div key={message.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                              {new Date(message.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {!isOwn && (
                            <div className={`flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
                              <img src={selectedConversation.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                            </div>
                          )}
                          <div className={`max-w-[72%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                              isOwn
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                            }`}>
                              <MessageContent contenu={message.contenu} isOwn={isOwn} />
                            </div>
                            {isLastInGroup && (
                              <div className={`flex items-center gap-1 px-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                                {isOwn && (
                                  message.lu
                                    ? <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                                    : <Check className="w-3.5 h-3.5 text-gray-300" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Devis banner — fixe */}
              {devisContext && (
                <div className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 px-4 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-400 font-medium">Devis lié</p>
                    <button type="button" onClick={() => router.push(`/client/devis/${devisContext.id}`)}
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 truncate block text-left leading-tight">
                      {devisContext.titre || `Devis #${devisContext.id.slice(0, 8)}`}
                      {devisContext.montant_total && (
                        <span className="ml-2 font-normal text-indigo-400">{Number(devisContext.montant_total).toLocaleString('fr-FR')} MAD</span>
                      )}
                    </button>
                  </div>
                  <button type="button" onClick={() => setDevisContext(null)}
                    className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-400 hover:text-indigo-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input — fixe en bas */}
              <form onSubmit={handleSendMessage} className="flex-shrink-0 p-4 border-t border-gray-200 bg-white space-y-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={devisContext ? 'Votre message à propos du devis…' : 'Tapez votre message...'}
                    rows={1}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all text-sm"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center select-none">
                  Entrée pour envoyer · Shift+Entrée pour sauter une ligne
                </p>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-xl border border-slate-200 text-gray-400" style={{ height: '80vh' }}>
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">ou contactez un prestataire depuis son profil</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}