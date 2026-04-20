import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import HeaderParti from '../../../components/HeaderParti';
import HeaderPresta from '../../../components/HeaderPresta';
import { 
  ArrowLeft, Send, Paperclip, MoreVertical, FileText,
  Phone, Info, Check, CheckCheck, MessageSquare
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-xl mx-auto mt-20 p-6 bg-white rounded-2xl shadow border border-red-100 text-center">
          <p className="text-red-600 font-medium mb-2">Une erreur est survenue</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchConversations(); }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const Header = activeRole === 'photographe' || activeRole === 'prestataire' ? HeaderPresta : HeaderParti;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto">
        <div className="flex h-[calc(100vh-64px)]">
          {/* Conversations List */}
          <div className={`w-full md:w-96 bg-white border-r ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-64px-57px)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Aucune conversation</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                      selectedConversation?.id === conv.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                        {conv.otherParticipant?.avatar_url ? (
                          <img 
                            src={conv.otherParticipant.avatar_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-indigo-600 font-semibold">
                            {conv.otherParticipant?.nom?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h2 className="font-semibold text-gray-900 truncate">
                            {conv.otherParticipant?.nom || 'Utilisateur'}
                          </h2>
                          <span className="text-xs text-gray-500">
                            {conv.lastMessage && formatTime(conv.lastMessage.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.lastMessage?.contenu || 'Aucun message'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {selectedConversation.otherParticipant?.avatar_url ? (
                      <img 
                        src={selectedConversation.otherParticipant.avatar_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-indigo-600 font-semibold">
                        {selectedConversation.otherParticipant?.nom?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.otherParticipant?.nom}
                    </h2>
                    <p className="text-sm text-green-500">En ligne</p>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <Info className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === profileId || message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <MessageContent contenu={message.contenu} isOwn={isOwn} />
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwn && (
                              message.lu 
                                ? <CheckCheck className="w-4 h-4 text-blue-500" />
                                : <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Devis context banner */}
                {devisContext && (
                  <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Ce message concerne le devis
                        <button
                          type="button"
                          onClick={() => router.push(`/client/devis/${devisContext.id}`)}
                          className="ml-1 font-semibold underline hover:text-indigo-900"
                        >
                          {devisContext.titre || `#${devisContext.id.slice(0, 8)}`}
                        </button>
                        {devisContext.montant_total && (
                          <span className="ml-1 text-indigo-500">— {Number(devisContext.montant_total).toLocaleString('fr-FR')} €</span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDevisContext(null)}
                      className="text-indigo-400 hover:text-indigo-600 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={sendMessage} className="bg-white border-t p-4">
                  <div className="flex items-center gap-2">
                    <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
                      <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={devisContext ? `Votre message à propos du devis…` : 'Écrivez votre message…'}
                      className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <p>Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
