import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';
import { Eye, EyeOff, Trash2 } from "lucide-react";

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

  const handleSend = async () => {
    if (!messageInput || !selectedConv || !user?.id) return;
    let objetToUse = selectedConv.messages.length > 0 ? selectedConv.messages[0].objet || '' : objetInput;
    const now = new Date().toISOString();
    const { error } = await supabase.from('messages').insert([{
      conversation_id: selectedConv.conversation.id,
      sender_id: user.id,
      receiver_id: selectedConv.userId,
      contenu: messageInput,
      objet: objetToUse,
      lu: false
    }]);
    await supabase.from('notifications').insert([{
      user_id: selectedConv.userId,
      type: 'message',
      contenu: messageInput,
      lu: false
    }]);
    if (!error) {
      await supabase.from('conversations').update({ last_message: messageInput, updated: now }).eq('id', selectedConv.conversation.id);
      setMessageInput('');
      setObjetInput('');
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

            <ul>
              {filteredConvs.length === 0 ? (
                <div className="text-slate-400 text-center py-12">Aucun message</div>
              ) : (
                filteredConvs.map(conv => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const lastPreview = lastMsg?.contenu ? lastMsg.contenu.slice(0, 40) + (lastMsg.contenu.length > 40 ? "..." : "") : '';
                  const isRead = conv.conversation.lu;
                  const annonceTitre = conv.annonceId ? annonceTitles[conv.annonceId] : '';
                  const photoUrl = conv.ParticulierPhoto || svgAvatarDataUrl(conv.user?.nom || 'U');

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
                      onClick={() => handleSelectConv(conv)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checkedConvs.includes(conv.conversation.id)}
                          onChange={e => {
                            if (e.target.checked) setCheckedConvs([...checkedConvs, conv.conversation.id]);
                            else setCheckedConvs(checkedConvs.filter(id => id !== conv.conversation.id));
                          }}
                          className="mr-2"
                        />
                        <img src={photoUrl} alt={conv.user?.nom} className="w-10 h-10 rounded-full object-cover border" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-700 truncate">{conv.user?.nom || 'Utilisateur'}</div>
                          {annonceTitre && <div className="text-xs text-blue-700 truncate">{annonceTitre}</div>}
                          <div className="text-xs text-slate-500 truncate">{lastPreview}</div>
                        </div>
                        <div className="text-xs text-slate-400 min-w-[60px] text-right">
                          {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                        </div>
                      </div>
                      {lastMsg?.objet && <div className="text-xs text-slate-500 ml-14">{lastMsg.objet}</div>}
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
                  <div className="flex items-center gap-3">
                    <img src={selectedConv.ParticulierPhoto || svgAvatarDataUrl(selectedConv.user?.nom || 'U')} alt={selectedConv.user?.nom || "Utilisateur"} className="w-12 h-12 rounded-full object-cover border" />
                    <div>
                      <div className="font-bold text-lg text-slate-800">{selectedConv.user?.nom || 'Utilisateur'}</div>
                      <div className="text-sm text-slate-400">{selectedConv.user?.role || ''}</div>
                      {selectedConv.messages.length > 0 && selectedConv.messages[0].objet && <div className="text-xs text-slate-500 mt-1">{selectedConv.messages[0].objet}</div>}
                      {selectedConv.annonceId && annonceTitles[selectedConv.annonceId] && <div className="text-xs text-blue-700 mt-1">{annonceTitles[selectedConv.annonceId]}</div>}
                    </div>
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

                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); handleSend(); }}>
                  {selectedConv.messages.length === 0 && (
                    <input type="text" className="w-1/3 px-3 py-2 rounded-xl border border-slate-300" placeholder="Objet du message" value={objetInput} onChange={e => setObjetInput(e.target.value)} />
                  )}
                  <input type="text" className="flex-1 px-3 py-2 rounded-xl border border-slate-300" placeholder="Votre message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} />
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
