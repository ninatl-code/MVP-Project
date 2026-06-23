import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import HeaderParti from '../components/HeaderParti';
import HeaderPresta from '../components/HeaderPresta';
import * as messageService from '../lib/messageService';
import {
  ArrowLeft, Send, MoreVertical, FileText,
  Check, CheckCheck, MessageSquare, Search, X,
  MessageCircle, UserCircle, Users, ChevronRight
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Helpers avatar
───────────────────────────────────────────── */
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
    <rect width='100%' height='100%' fill='${bg}' rx='64'/>
    <text x='50%' y='54%' dy='.06em' text-anchor='middle' font-family='system-ui,-apple-system,sans-serif' font-size='46' fill='white'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
const getAvatarSrc = (profile) => {
  const url = profile?.avatar_url;
  if (url && (url.startsWith('http') || url.startsWith('data:'))) return url;
  return null;
};

/* ─────────────────────────────────────────────
   MessageContent — liens devis cliquables
───────────────────────────────────────────── */
function MessageContent({ contenu, isOwn }) {
  if (!contenu) return null;
  const devisRefRegex = /\[Devis: (.+?) — (\/client\/devis\/[^\]]+)\]/g;
  const parts = [];
  let last = 0, match;
  while ((match = devisRefRegex.exec(contenu)) !== null) {
    if (match.index > last) parts.push(contenu.slice(last, match.index));
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        className={`inline-flex items-center gap-1.5 underline-offset-2 underline font-medium text-xs mt-1.5 px-2 py-1 rounded-md ${
          isOwn
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        } transition-colors`}
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < contenu.length) parts.push(contenu.slice(last));
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{parts}</p>;
}

/* ─────────────────────────────────────────────
   Skeleton loader for conversations
───────────────────────────────────────────── */
function ConversationSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-2/3" />
            <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
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
  const [isTyping] = useState(false); // placeholder for future typing indicator
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !profileId || !activeRole) return;
    setLoading(true);
    fetchConversations();
  }, [router.isReady, profileId, activeRole]);

  useEffect(() => {
    if (!selectedConversation) return;
    setMessages([]);
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
      const { data } = await supabase
        .from('devis').select('id, titre, montant_total')
        .eq('id', router.query.devis).single();
      if (data) setDevisContext(data);
    };
    fetchDevisContext();
  }, [router.isReady, router.query.devis]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length]);

  // Close profile menu when clicking outside
  useEffect(() => {
    if (!showProfileMenu) return;
    const close = () => setShowProfileMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showProfileMenu]);

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
        const { data: profilesData } = await supabase
          .from('profiles').select('id, nom, avatar_url')
          .in('id', Array.from(profileIds));
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
          const found = enriched.find(c => c.id === existingConv.id);
          if (found) {
          setSelectedConversation(found);
          } else {
            // La conv existe en base mais pas encore dans enriched → l'ajouter
            setConversations(prev => {
              const all = [existingConv, ...prev];
              const seen = new Map();
              for (const c of all) {
                const key = `${c.client_id}__${c.prestataire_id}`;
                if (!seen.has(key)) seen.set(key, c);
              }
              return Array.from(seen.values());
            });
            setSelectedConversation(existingConv);
          }
        } else {
          const { data: newConv, error: convCreateError } = await messageService.createConversation(profileId, prestataireId);
          if (convCreateError) {
            setError(`Impossible de créer la conversation : ${convCreateError.message}`);
          } else if (newConv) {
            const { data: prestaProfile } = await supabase
              .from('profiles').select('id, nom, avatar_url')
              .eq('id', prestataireId).single();
            const displayName = prestaProfile?.nom || 'Utilisateur';
            const newEnriched = {
              ...newConv, lastMessage: null,
              client: profileMap[profileId] || null,
              prestataire: prestaProfile || null,
              otherParticipant: prestaProfile || null,
              displayName,
              photoUrl: getAvatarSrc(prestaProfile) || svgAvatarDataUrl(displayName),
            };
            setConversations(prev => {
              const all = [newEnriched, ...prev];
              const seen = new Map();
              for (const c of all) {
                const key = `${c.client_id}__${c.prestataire_id}`;
                if (!seen.has(key)) seen.set(key, c);
              }
              return Array.from(seen.values());
            });
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
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;
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
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const diff = Date.now() - date;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
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
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto w-full px-6 py-6">
        <div className="flex gap-6" style={{ height: '85vh' }}>
          {/* Sidebar skeleton */}
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="h-6 bg-gray-200 rounded-full animate-pulse w-40 mb-3" />
              <div className="h-9 bg-gray-100 rounded-xl animate-pulse" />
            </div>
            <ConversationSkeleton />
          </div>
          {/* Chat skeleton */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Chargement…</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Impossible de charger</p>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchConversations(); }}
            className="w-full px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Main ── */
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Header />

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              <h1 className="text-base font-semibold text-gray-900">Messagerie</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="hidden sm:inline">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</span>
            {unreadTotal > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-6 py-5">
        <div className="flex gap-4 sm:gap-5" style={{ height: 'calc(100vh - 130px)' }}>

          {/* ── SIDEBAR ── */}
          <aside
            className={`
              ${selectedConversation ? 'hidden md:flex' : 'flex'} 
              flex-col w-full md:w-72 lg:w-80 flex-shrink-0
              bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden
            `}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  Conversations
                </h2>
                {filteredConversations.length > 0 && (
                  <span className="text-xs text-gray-400 tabular-nums">{filteredConversations.length}</span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher…"
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-gray-400 mt-1">
                      Contactez un prestataire depuis son profil
                    </p>
                  )}
                </div>
              ) : (
                <ul className="p-2 space-y-0.5">
                  {filteredConversations.map((conv) => {
                    const isActive = selectedConversation?.id === conv.id;
                    const isPresta = activeRole === 'photographe';
                    const unreadCount = (isPresta ? conv.unread_count_prestataire : conv.unread_count_client) || 0;
                    const hasUnread = unreadCount > 0;
                    const preview = conv.lastMessage?.contenu?.replace(/\[Devis:.*?\]/g, '📄 Devis joint')
                      || 'Démarrer la conversation';

                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => setSelectedConversation(conv)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group ${
                            isActive
                              ? 'bg-indigo-50 ring-1 ring-indigo-200'
                              : hasUnread
                                ? 'bg-blue-50 hover:bg-blue-100'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <img
                              src={conv.photoUrl}
                              alt={conv.displayName}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                            {hasUnread && (
                              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white" />
                            )}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                              <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {conv.displayName}
                              </span>
                              {conv.lastMessage && (
                                <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">
                                  {formatTime(conv.lastMessage.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs truncate ${hasUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                                {preview.slice(0, 55)}{preview.length > 55 ? '…' : ''}
                              </p>
                              {hasUnread && (
                                <span className="flex-shrink-0 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all ${isActive ? 'text-indigo-400' : 'text-gray-300 group-hover:text-gray-400'}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── CHAT AREA ── */}
          <main className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0`}>
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <header className="flex-shrink-0 border-b border-gray-100 px-6 py-3">
                  <div className="flex items-center gap-3">
                    {/* Mobile back */}
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden -ml-1 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedConversation.photoUrl}
                          alt={selectedConversation.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-gray-900 truncate leading-tight">
                          {selectedConversation.displayName}
                        </h2>
                        <span className="text-xs text-green-500 font-medium">En ligne</span>
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowProfileMenu(v => !v); }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[160px]" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              router.push(`/client/photographes/${selectedConversation.otherParticipant?.id}`);
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-6 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 rounded-lg mx-1"
                            style={{ width: 'calc(100% - 8px)' }}
                          >
                            <UserCircle className="w-4 h-4 text-gray-400" />
                            Voir le profil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-6 py-5 space-y-1"
                  style={{ background: '#f8f9fb', overscrollBehavior: 'contain' }}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-indigo-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Commencez à écrire</p>
                      <p className="text-xs text-gray-400">Envoyez le premier message à {selectedConversation.displayName}</p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isOwn = message.sender_id === profileId || message.sender_id === user?.id;
                      const prevMsg = messages[index - 1];
                      const nextMsg = messages[index + 1];
                      const showDateSep = !prevMsg ||
                        new Date(message.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                      const isGroupStart = !prevMsg || prevMsg.sender_id !== message.sender_id;
                      const isGroupEnd = !nextMsg || nextMsg.sender_id !== message.sender_id;

                      return (
                        <div key={message.id}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-gray-200" />
                              <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                                {new Date(message.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                          )}

                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 ${isGroupStart ? 'mt-3' : 'mt-0.5'}`}>
                            {/* Other's avatar */}
                            {!isOwn && (
                              <div className="flex-shrink-0 w-7 h-7">
                                {isGroupEnd ? (
                                  <img
                                    src={selectedConversation.photoUrl}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover"
                                  />
                                ) : null}
                              </div>
                            )}

                            <div className={`max-w-[70%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                              {/* Bubble */}
                              <div className={`
                                px-6 py-2.5 shadow-sm
                                ${isOwn
                                  ? `bg-indigo-600 text-white ${isGroupStart ? 'rounded-t-2xl' : 'rounded-t-lg'} rounded-bl-2xl ${isGroupEnd ? 'rounded-br-sm' : 'rounded-br-lg'}`
                                  : `bg-white border border-gray-200 text-gray-800 ${isGroupStart ? 'rounded-t-2xl' : 'rounded-t-lg'} rounded-br-2xl ${isGroupEnd ? 'rounded-bl-sm' : 'rounded-bl-lg'}`
                                }
                              `}>
                                <MessageContent contenu={message.contenu} isOwn={isOwn} />
                              </div>

                              {/* Timestamp + read status */}
                              {isGroupEnd && (
                                <div className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[11px] text-gray-400 tabular-nums">{formatTime(message.created_at)}</span>
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

                  {/* Typing indicator placeholder */}
                  {isTyping && (
                    <div className="flex items-end gap-2 mt-2">
                      <img src={selectedConversation.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      <div className="bg-white border border-gray-200 px-6 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <div className="flex gap-1 items-center h-4">
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Devis banner */}
                {devisContext && (
                  <div className="flex-shrink-0 bg-indigo-50 border-t border-indigo-100 px-6 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide mb-0.5">Devis lié</p>
                      <button
                        type="button"
                        onClick={() => router.push(`/client/devis/${devisContext.id}`)}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 truncate block text-left leading-tight transition-colors"
                      >
                        {devisContext.titre || `Devis #${devisContext.id.slice(0, 8)}`}
                        {devisContext.montant_total && (
                          <span className="ml-2 font-normal text-indigo-400">
                            {Number(devisContext.montant_total).toLocaleString('fr-FR')} MAD
                          </span>
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDevisContext(null)}
                      className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-400 hover:text-indigo-600 flex-shrink-0"
                      aria-label="Retirer le devis lié"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Input area */}
                <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onInput={handleTextareaInput}
                      placeholder={
                        devisContext
                          ? `Message à propos de « ${devisContext.titre || 'ce devis'} »…`
                          : `Message à ${selectedConversation.displayName}…`
                      }
                      rows={1}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all text-sm outline-none placeholder:text-gray-400"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`
                        flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all
                        ${newMessage.trim() && !sending
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200 hover:shadow-md'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }
                      `}
                      aria-label="Envoyer"
                    >
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-2 select-none">
                    Entrée pour envoyer · Shift+Entrée pour un saut de ligne
                  </p>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                  <MessageCircle className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sélectionnez une conversation</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Choisissez une conversation dans la liste ou contactez un prestataire depuis son profil.
                </p>
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}