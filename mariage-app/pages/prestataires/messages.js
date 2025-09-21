import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderParti';
import { Eye, EyeOff, Trash2 } from "lucide-react";

export default function MessagesParticulier() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [checkedConvs, setCheckedConvs] = useState([]);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [objetInput, setObjetInput] = useState('');
  const [annonceTitles, setAnnonceTitles] = useState({});

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      const { data: authData } = await supabase.auth.getUser();
      setUser(authData?.user);
      if (!authData?.user) return;
      // Récupère toutes les conversations de l'utilisateur (non supprimées)
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('id, artist_id, client_id, annonce_id, last_message, created_at, updated, deletion_dateParti, lu')
        .eq('artist_id', authData.user.id)
        .is('deletion_datePresta', null)
        .order('updated', { ascending: false });
      if (convError || !conversationsData) return;

      // Récupère tous les messages liés à ces conversations
      const convIds = conversationsData.map(c => c.id);
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, receiver_id, objet, contenu, created_at, deletion_dateParti')
        .in('conversation_id', convIds)
        .is('deletion_datePresta', null)
        .order('created_at', { ascending: true });
      if (msgError || !messages) return;

      // Récupère tous les profils nécessaires
      const userIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nom, photos')
        .in('id', userIds);
      if (profileError || !profiles) return;
      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      // Récupère les titres des annonces
      const annonceIds = Array.from(new Set(conversationsData.map(c => c.annonce_id).filter(Boolean)));
      let annonceTitlesMap = {};
      if (annonceIds.length > 0) {
        const { data: annoncesData } = await supabase
          .from('annonces')
          .select('id, titre')
          .in('id', annonceIds);
        if (annoncesData) {
          annoncesData.forEach(a => { annonceTitlesMap[a.id] = a.titre; });
        }
      }
      setAnnonceTitles(annonceTitlesMap);

      // Regroupe les messages par conversation
      const convMap = {};
      conversationsData.forEach(conv => {
        convMap[conv.id] = {
          conversation: conv,
          user: profileMap[conv.artist_id === authData.user.id ? conv.client_id : conv.artist_id],
          userId: conv.artist_id === authData.user.id ? conv.client_id : conv.artist_id,
          annonceId: conv.annonce_id,
          messages: [],
          prestatairePhoto: profileMap[conv.artist_id]?.photos || null // Ajout de la photo du prestataire
        };
      });
      messages.forEach(msg => {
        if (convMap[msg.conversation_id]) {
          convMap[msg.conversation_id].messages.push(msg);
        }
      });
      const convArr = Object.values(convMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.created_at || '';
        const bDate = b.messages[b.messages.length - 1]?.created_at || '';
        return new Date(bDate) - new Date(aDate);
      });
      setConversations(convArr);
      if (convArr.length > 0 && !selectedConv) setSelectedConv(convArr[0]);

      // Marquer comme lus tous les messages dont l'utilisateur est le receiver dans la conversation sélectionnée
      if (convArr.length > 0) {
        const conv = convArr[0];
        await supabase
          .from('messages')
          .update({ lu: true })
          .eq('conversation_id', conv.conversation.id)
          .eq('receiver_id', authData.user.id);
        // Marquer la conversation comme lue
        await supabase
          .from('conversations')
          .update({ lu: true })
          .eq('id', conv.conversation.id);
      }
    };
    fetchUserAndConversations();
  }, []);

  // Marquer comme lu/non lu
  const handleMarkReadUnread = async (markAsRead) => {
    for (const convId of checkedConvs) {
      await supabase
        .from('conversations')
        .update({ lu: markAsRead })
        .eq('id', convId);
    }
    setCheckedConvs([]);
    // Met à jour localement
    setConversations(conversations.map(conv =>
      checkedConvs.includes(conv.conversation.id)
        ? { ...conv, conversation: { ...conv.conversation, lu: markAsRead } }
        : conv
    ));
  };

  // Sélection d'une conversation
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

  // Envoi d'un message : l'objet du premier message reste l'objet de la conversation
  const handleSend = async () => {
    if (!messageInput || !selectedConv || !user?.id) return;
    // Utilise l'objet du premier message de la conversation
    let objetToUse = '';
    if (selectedConv.messages.length > 0) {
      objetToUse = selectedConv.messages[0].objet || '';
    } else {
      objetToUse = objetInput;
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: selectedConv.conversation.id,
        sender_id: user.id,
        receiver_id: selectedConv.userId,
        contenu: messageInput,
        objet: objetToUse,
        lu: false
      }]);
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: selectedConv.userId,
          type: 'message',
          contenu: messageInput,
          lu: false
        }
      ]);
    if (!error) {
      await supabase
        .from('conversations')
        .update({ last_message: messageInput, updated: now })
        .eq('id', selectedConv.conversation.id);
      await supabase
        .from('messages')
        .update({ deletion_dateParti: null })
        .eq('conversation_id', selectedConv.conversation.id);
      setMessageInput('');
      setObjetInput('');
      await new Promise(res => setTimeout(res, 300));
      window.location.reload();
    }
  };

  const filteredConvs = conversations.filter(conv =>
    ((conv.user?.nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (conv.user?.metier || '').toLowerCase().includes(search.toLowerCase()))
    && conv.conversation.deletion_dateParti == null
  );

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-4">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Liste des conversations */}
          <div className="md:col-span-1 bg-slate-50 border-r border-slate-200 py-6">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 px-4">Messages</h2>
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full mb-4 px-3 py-2 rounded-xl border border-slate-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {/* Boutons marquer comme lu/non lu */}
            <div className="mb-4 flex gap-2">
              <div className="inline-block relative group">
                <button
                  className={`p-2 rounded-full transition ${
                    checkedConvs.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : checkedConvs.every(convId => {
                          const conv = conversations.find(c => c.conversation.id === convId);
                          if (!conv) return true;
                          return conv.conversation.lu;
                        })
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                  }`}
                  disabled={checkedConvs.length === 0}
                  onClick={async () => {
                    if (checkedConvs.length === 0) return;
                    const allSelectedRead = checkedConvs.every(convId => {
                      const conv = conversations.find(c => c.conversation.id === convId);
                      if (!conv) return true;
                      return conv.conversation.lu;
                    });
                    await handleMarkReadUnread(!allSelectedRead);
                  }}
                  aria-label={
                    checkedConvs.length === 0
                      ? "Marquer comme lu/non lu"
                      : checkedConvs.every(convId => {
                          const conv = conversations.find(c => c.conversation.id === convId);
                          if (!conv) return true;
                          return conv.conversation.lu;
                        })
                      ? "Marquer comme non lu"
                      : "Marquer comme lu"
                  }
                >
                  {checkedConvs.length === 0
                    ? <Eye className="w-5 h-5" />
                    : checkedConvs.every(convId => {
                        const conv = conversations.find(c => c.conversation.id === convId);
                        if (!conv) return true;
                        return conv.conversation.lu;
                      })
                    ? <EyeOff className="w-5 h-5" />
                    : <Eye className="w-5 h-5" />
                  }
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-slate-700 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
                  {checkedConvs.length === 0
                    ? "Marquer comme lu/non lu"
                    : checkedConvs.every(convId => {
                        const conv = conversations.find(c => c.conversation.id === convId);
                        if (!conv) return true;
                        return conv.conversation.lu;
                      })
                    ? "Marquer comme non lu"
                    : "Marquer comme lu"
                  }
                </span>
              </div>
              <div className="inline-block relative group">
                <button
                  className={`p-2 rounded-full transition ${
                    checkedConvs.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-red-800 text-white hover:bg-red-900"
                  }`}
                  disabled={checkedConvs.length === 0}
                  onClick={async () => {
                    if (checkedConvs.length === 0) return;
                    const now = new Date().toISOString();
                    await Promise.all(checkedConvs.map(async (convId) => {
                      await supabase
                        .from('conversations')
                        .update({ deletion_dateParti: now })
                        .eq('id', convId);
                    }));
                    setCheckedConvs([]);
                    window.location.reload();
                  }}
                  aria-label="Supprimer la conversation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-slate-700 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
                  Supprimer la conversation
                </span>
              </div>
            </div>
            <ul>
              {filteredConvs.length === 0 ? (
                <div className="text-slate-400 text-center py-12">Aucun message</div>
              ) : (
                filteredConvs.map(conv => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const objet = lastMsg?.objet || '';
                  const lastPreview = lastMsg?.contenu ? lastMsg.contenu.slice(0, 40) + (lastMsg.contenu.length > 40 ? "..." : "") : '';
                  const isRead = conv.conversation.lu;
                  const annonceTitre = conv.annonceId ? annonceTitles[conv.annonceId] : '';
                  // Utilise la photo du prestataire
                  const photoUrl = conv.prestatairePhoto || 'https://via.placeholder.com/40';
                  return (
                    <li
                      key={conv.userId}
                      className={`flex flex-col gap-1 p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-100 ${
                        selectedConv?.userId === conv.userId
                          ? 'bg-white'
                          : !isRead
                            ? 'bg-blue-50'
                            : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checkedConvs.includes(conv.conversation.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setCheckedConvs([...checkedConvs, conv.conversation.id]);
                            } else {
                              setCheckedConvs(checkedConvs.filter(id => id !== conv.conversation.id));
                            }
                          }}
                          className="mr-2"
                        />
                        <img src={photoUrl} alt={conv.user?.nom} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 min-w-0" onClick={() => handleSelectConv(conv)}>
                          <div className="font-semibold text-slate-700 truncate">{conv.user?.nom || 'Utilisateur'}</div>
                          {/* Titre de l'annonce */}
                          {annonceTitre && <div className="text-xs text-blue-700 truncate">{annonceTitre}</div>}
                          {/* Aperçu du dernier message */}
                          <div className="text-xs text-slate-500 truncate">{lastPreview}</div>
                        </div>
                        <div className="text-xs text-slate-400 min-w-[60px] text-right">{lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
                      </div>
                      {objet && <div className="text-xs text-slate-500 ml-14">{objet}</div>}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
          {/* Messages de la conversation sélectionnée */}
          <div className="md:col-span-2 py-6">
            {selectedConv ? (
              <div className="flex flex-col h-[60vh] bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-lg text-slate-800">{selectedConv.user?.nom || 'Utilisateur'}</div>
                    <div className="text-sm text-slate-400">{selectedConv.user?.role || ''}</div>
                    {/* Objet du premier message */}
                    {selectedConv.messages.length > 0 && selectedConv.messages[0].objet && (
                      <div className="text-xs text-slate-500 mt-1">{selectedConv.messages[0].objet}</div>
                    )}
                    {/* Titre de l'annonce */}
                    {selectedConv.annonceId && annonceTitles[selectedConv.annonceId] && (
                      <div className="text-xs text-blue-700 mt-1">{annonceTitles[selectedConv.annonceId]}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{selectedConv.messages.length > 0 ? new Date(selectedConv.messages[selectedConv.messages.length - 1].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
                <div className="flex-1 overflow-y-auto mb-4">
                  {selectedConv.messages.map(msg => (
                    <div key={msg.id} className={`mb-3 flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2 rounded-xl whitespace-pre-line relative ${msg.sender_id === user?.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <div className="text-sm">{msg.contenu}</div>
                        <div className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Formulaire d'envoi : champ objet seulement si aucun message dans la conversation */}
                <form className="flex gap-2" onSubmit={e => {e.preventDefault(); handleSend();}}>
                  {selectedConv.messages.length === 0 && (
                    <input
                      type="text"
                      className="w-1/3 px-3 py-2 rounded-xl border border-slate-300"
                      placeholder="Objet du message"
                      value={objetInput}
                      onChange={e => setObjetInput(e.target.value)}
                    />
                  )}
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="Votre message..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                  />
                  <button type="submit" className="bg-slate-700 text-white px-6 py-2 rounded-xl">Envoyer</button>
                </form>
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