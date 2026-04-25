import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import HeaderParti from '../../../components/HeaderParti';
import HeaderPresta from '../../../components/HeaderPresta';
import { 
  ArrowLeft, Send, Paperclip, MoreVertical, FileText,
  Phone, Info, Check, CheckCheck, MessageSquare, Search, X
} from 'lucide-react';

// Renders message text with devis references as clickable links
function MessageContent({ contenu, isOwn }) {
  if (!contenu) return null;
  const devisRefRegex = /\[Devis: (.+?) — (\/client\/devis\/[^\]]+)\]/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = devisRefRegex.exec(contenu)) !== null) {
    if (match.index > last) parts.push(contenu.slice(last, match.index));
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        className={`inline-flex items-center gap-1 underline font-medium text-sm mt-1 ${isOwn ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}
      >
        <FileText className="w-3.5 h-3.5" />
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < contenu.length) parts.push(contenu.slice(last));
  return <p className="whitespace-pre-wrap">{parts}</p>;
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
  const [devisContext, setDevisContext] = useState(null); // { id, titre }
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (user?.id && profileId && router.isReady) {
      fetchConversations();
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, profileId, router.isReady]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Load devis context when ?devis= param is present
  useEffect(() => {
    if (!router.isReady || !router.query.devis) return;
    const fetchDevisContext = async () => {
      const { data } = await supabase
        .from('devis')
        .select('id, titre, montant_total')
        .eq('id', router.query.devis)
        .single();
      if (data) setDevisContext(data);
    };
    fetchDevisContext();
  }, [router.isReady, router.query.devis]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setError(null);
    try {
      const column = activeRole === 'photographe' || activeRole === 'prestataire'
        ? 'prestataire_id'
        : 'client_id';

      // Step 1: fetch conversations (no FK join hints)
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq(column, profileId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) {
        console.error('Conversations query error:', convError);
        setError(`Erreur chargement des conversations : ${convError.message}`);
        return;
      }

      // Step 2: collect all profile IDs and fetch them in one query
      const profileIds = new Set();
      (convData || []).forEach(c => {
        if (c.client_id) profileIds.add(c.client_id);
        if (c.prestataire_id) profileIds.add(c.prestataire_id);
      });

      let profileMap = {};
      if (profileIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nom, avatar_url')
          .in('id', Array.from(profileIds));
        (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      }

      // Step 3: get last message for each conversation
      const enriched = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('contenu, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const isPresta = activeRole === 'photographe' || activeRole === 'prestataire';
          const otherParticipantId = isPresta ? conv.client_id : conv.prestataire_id;
          return {
            ...conv,
            lastMessage: lastMsg || null,
            client: profileMap[conv.client_id] || null,
            prestataire: profileMap[conv.prestataire_id] || null,
            otherParticipant: profileMap[otherParticipantId] || null,
          };
        })
      );

      // Deduplicate: keep only the most recent conversation per (client_id, prestataire_id) pair
      const seen = new Map();
      for (const conv of enriched) {
        const key = `${conv.client_id}__${conv.prestataire_id}`;
        if (!seen.has(key)) {
          seen.set(key, conv);
        } else {
          // Keep the one with the most recent activity
          const existing = seen.get(key);
          const existingDate = existing.last_message_at || existing.created_at || '';
          const convDate = conv.last_message_at || conv.created_at || '';
          if (convDate > existingDate) seen.set(key, conv);
        }
      }
      const deduped = Array.from(seen.values());
      setConversations(deduped);

      // Auto-select by conversation id
      if (router.query.id) {
        const conv = deduped.find(c => String(c.id) === String(router.query.id));
        if (conv) { setSelectedConversation(conv); return; }
      }

      // Auto-open or create conversation with a specific prestataire
      if (router.query.prestataire) {
        const prestataireId = router.query.prestataire;

        // Always check DB directly (not just the in-memory list) to avoid duplicates
        const { data: existingConvs } = await supabase
          .from('conversations')
          .select('*')
          .eq('client_id', profileId)
          .eq('prestataire_id', prestataireId)
          .order('created_at', { ascending: true })
          .limit(1);

        const existingConv = existingConvs?.[0];

        if (existingConv) {
          const { data: prestaProfile } = await supabase
            .from('profiles').select('id, nom, avatar_url').eq('id', prestataireId).single();
          const found = enriched.find(c => c.id === existingConv.id) || {
            ...existingConv,
            lastMessage: null,
            client: profileMap[profileId] || null,
            prestataire: prestaProfile || null,
            otherParticipant: prestaProfile || null,
          };
          setSelectedConversation(found);
        } else {
          const { data: newConv, error: convCreateError } = await supabase
            .from('conversations')
            .insert({ client_id: profileId, prestataire_id: prestataireId })
            .select('*')
            .single();

          if (convCreateError) {
            console.error('Error creating conversation:', convCreateError);
            setError(`Impossible de créer la conversation : ${convCreateError.message}`);
          } else if (newConv) {
            const { data: prestaProfile } = await supabase
              .from('profiles').select('id, nom, avatar_url').eq('id', prestataireId).single();
            const newEnriched = {
              ...newConv,
              lastMessage: null,
              client: profileMap[profileId] || null,
              prestataire: prestaProfile || null,
              otherParticipant: prestaProfile || null,
            };
            setConversations(prev => [newEnriched, ...prev]);
            setSelectedConversation(newEnriched);
          }
        }
      }
    } catch (err) {
      console.error('fetchConversations unexpected error:', err);
      setError(`Erreur inattendue : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      // Find all conversation IDs between this pair (merge messages from duplicate conversations)
      const conv = selectedConversation;
      const isPresta = activeRole === 'photographe' || activeRole === 'prestataire';
      const otherParticipantId = isPresta ? conv?.client_id : conv?.prestataire_id;

      let allConvIds = [conversationId];
      if (otherParticipantId && profileId) {
        const { data: allConvs } = await supabase
          .from('conversations')
          .select('id')
          .eq(isPresta ? 'prestataire_id' : 'client_id', profileId)
          .eq(isPresta ? 'client_id' : 'prestataire_id', otherParticipantId);
        if (allConvs?.length) allConvIds = allConvs.map(c => c.id);
      }

      // Fetch messages from all conversations between this pair
      const { data: rawMessages, error } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', allConvIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles separately
      const senderIds = [...new Set((rawMessages || []).map(m => m.sender_id).filter(Boolean))];
      let senderMap = {};
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, nom, avatar_url')
          .in('id', senderIds);
        (senders || []).forEach(s => { senderMap[s.id] = s; });
      }

      setMessages((rawMessages || []).map(m => ({ ...m, sender: senderMap[m.sender_id] || null })));

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ lu: true, lu_at: new Date().toISOString() })
        .in('conversation_id', allConvIds)
        .neq('sender_id', profileId)
        .eq('lu', false);

      // Reset unread counter on all related conversations
      const unreadCol = isPresta ? 'unread_count_prestataire' : 'unread_count_client';
      await supabase
        .from('conversations')
        .update({ [unreadCol]: 0 })
        .in('id', allConvIds);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = (conversationId) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          // Fetch sender profile without FK hint
          let sender = null;
          if (newMsg.sender_id) {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('id, nom, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();
            sender = senderData || null;
          }
          setMessages(prev => {
            // Avoid duplicates (optimistic message already added)
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender }];
          });
        }
      )
      .subscribe();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const baseContenu = newMessage.trim();
    const contenu = devisContext
      ? `${baseContenu}\n\n[Devis: ${devisContext.titre || devisContext.id} — /client/devis/${devisContext.id}]`
      : baseContenu;
    const now = new Date().toISOString();
    setSending(true);

    // Optimistic update — show message immediately
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: profileId,
      receiver_id: selectedConversation.otherParticipant?.id,
      contenu,
      lu: false,
      created_at: now,
      sender: { id: profileId, nom: null, avatar_url: null },
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const receiverId = selectedConversation.otherParticipant?.id;
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: profileId,
          receiver_id: receiverId,
          contenu,
          lu: false,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setNewMessage(contenu);
        return;
      }

      // Replace optimistic with real message
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...inserted, sender: optimisticMsg.sender } : m
      ));

      // Update conversation last message + increment receiver's unread count
      const isPresta = activeRole === 'photographe' || activeRole === 'prestataire';
      const unreadCol = isPresta ? 'unread_count_client' : 'unread_count_prestataire';
      await supabase
        .from('conversations')
        .update({
          last_message_at: now,
          last_message_text: contenu,
          last_message_sender_id: profileId,
          [unreadCol]: (selectedConversation[unreadCol] || 0) + 1,
        })
        .eq('id', selectedConversation.id);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const Header = activeRole === 'photographe' || activeRole === 'prestataire' ? HeaderPresta : HeaderParti;

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.otherParticipant?.nom?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.contenu?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || lastMsg.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
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
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-1">Erreur de chargement</p>
            <p className="text-sm text-gray-500 mb-5">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetchConversations(); }}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Sidebar ── */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white border-r border-gray-200 flex-shrink-0`}>

          {/* Sidebar header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">
                  {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = selectedConversation?.id === conv.id;
                const isPresta = activeRole === 'photographe' || activeRole === 'prestataire';
                const unread = isPresta ? (conv.unread_count_prestataire || 0) : (conv.unread_count_client || 0);
                const initial = conv.otherParticipant?.nom?.charAt(0)?.toUpperCase() || '?';
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all ${
                      isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                    style={isActive
                      ? { borderLeft: '3px solid #4f46e5' }
                      : { borderLeft: '3px solid transparent' }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                          isActive ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
                        }`}
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {conv.otherParticipant?.avatar_url ? (
                          <img src={conv.otherParticipant.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-lg">{initial}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm truncate ${
                          unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                        }`}>
                          {conv.otherParticipant?.nom || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {conv.lastMessage && formatTime(conv.lastMessage.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className={`text-sm truncate ${
                          unread > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'
                        }`}>
                          {conv.lastMessage?.contenu?.replace(/\[Devis:.*?\]/g, '📄 Devis joint') || 'Démarrer la conversation'}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 bg-white`}>
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>

                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {selectedConversation.otherParticipant?.avatar_url ? (
                      <img src={selectedConversation.otherParticipant.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">
                        {selectedConversation.otherParticipant?.nom?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {selectedConversation.otherParticipant?.nom || 'Utilisateur'}
                  </h2>
                  <p className="text-xs text-green-500 font-medium">En ligne</p>
                </div>

                <div className="flex items-center gap-0.5">
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <Info className="w-5 h-5 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                      <MessageSquare className="w-8 h-8 text-indigo-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Aucun message pour l'instant</p>
                    <p className="text-xs text-gray-400 mt-1">Envoyez le premier message !</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === profileId || message.sender_id === user?.id;
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];
                    const showDateSep = !prevMsg ||
                      new Date(message.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== message.sender_id;
                    const isSameGroup = prevMsg && prevMsg.sender_id === message.sender_id;

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

                        <div className={`flex items-end gap-2 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        } ${isSameGroup ? 'mt-0.5' : 'mt-3'}`}>

                          {/* Avatar for other person */}
                          {!isOwn && (
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                                isLastInGroup ? 'visible' : 'invisible'
                              }`}
                              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                              {message.sender?.avatar_url ? (
                                <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-xs font-bold">
                                  {message.sender?.nom?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                          )}

                          <div className={`max-w-[65%] flex flex-col gap-0.5 ${
                            isOwn ? 'items-end' : 'items-start'
                          }`}>
                            <div className={`px-4 py-2.5 shadow-sm ${
                              isOwn
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
                            }`}>
                              <MessageContent contenu={message.contenu} isOwn={isOwn} />
                            </div>
                            {isLastInGroup && (
                              <div className={`flex items-center gap-1 px-1 ${
                                isOwn ? 'flex-row-reverse' : ''
                              }`}>
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
                <div ref={messagesEndRef} />
              </div>

              {/* Devis banner */}
              {devisContext && (
                <div className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 px-4 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-400 font-medium">Devis lié</p>
                    <button
                      type="button"
                      onClick={() => router.push(`/client/devis/${devisContext.id}`)}
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 truncate block text-left leading-tight"
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
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input */}
              <form onSubmit={sendMessage} className="flex-shrink-0 bg-white border-t border-gray-200 p-3">
                <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-sm">
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded-xl transition-colors flex-shrink-0 mb-0.5">
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder={devisContext ? 'Votre message à propos du devis…' : 'Écrivez votre message…'}
                    rows={1}
                    className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 py-1.5 max-h-28"
                    style={{ lineHeight: '1.5' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className={`flex-shrink-0 p-2 rounded-xl transition-all mb-0.5 ${
                      newMessage.trim() && !sending
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center select-none">
                  Entrée pour envoyer · Shift+Entrée pour sauter une ligne
                </p>
              </form>
            </>
          ) : (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}
            >
              <div className="text-center px-8">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-100">
                  <MessageSquare className="w-12 h-12 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Vos messages</h3>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                  Sélectionnez une conversation pour commencer à discuter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
