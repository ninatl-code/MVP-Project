import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import * as supportService from '../../../lib/supportService';
import {
  ArrowLeft, Send, LifeBuoy, Search, X,
  Check, CheckCheck, ChevronRight, Filter
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Constantes (identiques à pages/support.js)
───────────────────────────────────────────── */
const CATEGORIES = {
  general: 'Question générale', paiement: 'Paiement', reservation: 'Réservation',
  compte: 'Compte', litige: 'Litige', technique: 'Problème technique', autre: 'Autre',
};

const STATUTS = [
  { value: 'ouvert', label: 'Ouvert', className: 'bg-blue-50 text-blue-600' },
  { value: 'en_cours', label: 'En cours', className: 'bg-amber-50 text-amber-600' },
  { value: 'resolu', label: 'Résolu', className: 'bg-green-50 text-green-600' },
  { value: 'ferme', label: 'Fermé', className: 'bg-gray-100 text-gray-500' },
];

const initialsFromName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function StatutBadge({ statut }) {
  const s = STATUTS.find(x => x.value === statut) || STATUTS[0];
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>;
}

/* ─────────────────────────────────────────────
   Page admin
───────────────────────────────────────────── */
export default function AdminSupportPage() {
  const router = useRouter();
  const { profileId } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statutFilter, setStatutFilter] = useState('tous');

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    setMessages([]);
    const loadMessages = async () => {
      const { data } = await supportService.getTicketMessages(selectedTicket.id);
      if (data) setMessages(data);
      await supportService.markTicketAsRead(selectedTicket.id, true);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, unread_count_admin: 0 } : t));
    };
    loadMessages();
    const channel = supportService.subscribeToTicket(selectedTicket.id, (newMsg) => {
      setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    });
    channelRef.current = channel;
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [selectedTicket]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length]);

  const fetchTickets = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supportService.getAllTickets();
      if (error) { setError(`Erreur : ${error.message}`); return; }
      setTickets(data || []);
    } catch (err) {
      setError(`Erreur inattendue : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedTicket || sending) return;
    setSending(true);
    const { data, error } = await supportService.sendSupportMessage({
      ticketId: selectedTicket.id,
      senderId: profileId,
      isAdmin: true,
      contenu: newMessage.trim(),
    });
    if (!error && data) {
      // Pas d'ajout local ici : le message arrive via subscribeToTicket (realtime).
      setNewMessage('');
      if (textareaRef.current) textareaRef.current.style.height = '48px';
      // Passe automatiquement le ticket en "en_cours" si l'admin répond à un ticket ouvert
      if (selectedTicket.statut === 'ouvert') {
        await handleStatutChange('en_cours');
      }
    }
    setSending(false);
  };

  const handleStatutChange = async (statut) => {
    const { data, error } = await supportService.updateTicketStatus(selectedTicket.id, statut);
    if (!error && data) {
      setSelectedTicket(data);
      setTickets(prev => prev.map(t => t.id === data.id ? data : t));
    }
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

  const filteredTickets = tickets.filter(t => {
    if (statutFilter !== 'tous' && t.statut !== statutFilter) return false;
    if (!searchQuery) return true;
    const nom = (t.profiles?.nom || '').toLowerCase();
    const sujet = (t.sujet || '').toLowerCase();
    return nom.includes(searchQuery.toLowerCase()) || sujet.includes(searchQuery.toLowerCase());
  });

  const unreadTotal = tickets.reduce((acc, t) => acc + (t.unread_count_admin || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              <h1 className="text-base font-semibold text-gray-900">Support — Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="hidden sm:inline">{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span>
            {unreadTotal > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto w-full px-6 pt-4">
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>
        </div>
      )}

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-5">
        <div className="flex gap-4 sm:gap-5" style={{ height: 'calc(100vh - 130px)' }}>

          {/* ── SIDEBAR ── */}
          <aside className={`${selectedTicket ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden`}>
            <div className="p-4 border-b border-gray-100 flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou sujet…"
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                {['tous', ...STATUTS.map(s => s.value)].map(val => (
                  <button
                    key={val}
                    onClick={() => setStatutFilter(val)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                      statutFilter === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {val === 'tous' ? 'Tous' : STATUTS.find(s => s.value === val).label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <LifeBuoy className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Aucun ticket</p>
                </div>
              ) : (
                <ul className="p-2 space-y-0.5">
                  {filteredTickets.map((t) => {
                    const isActive = selectedTicket?.id === t.id;
                    const hasUnread = (t.unread_count_admin || 0) > 0;
                    const nom = t.profiles?.nom || 'Utilisateur';
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group ${
                            isActive ? 'bg-indigo-50 ring-1 ring-indigo-200' : hasUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-600">
                            {initialsFromName(nom)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                              <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {nom}
                              </span>
                              <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">{formatTime(t.last_message_at)}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mb-1">{t.sujet}</p>
                            <div className="flex items-center gap-1.5">
                              <StatutBadge statut={t.statut} />
                              <span className="text-[10px] text-gray-400 capitalize">{t.role}</span>
                              {hasUnread && (
                                <span className="ml-auto flex-shrink-0 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {t.unread_count_admin > 9 ? '9+' : t.unread_count_admin}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── ZONE PRINCIPALE ── */}
          <main className={`${!selectedTicket ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0`}>
            {selectedTicket ? (
              <>
                <header className="flex-shrink-0 border-b border-gray-100 px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedTicket(null)} className="md:hidden -ml-1 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-600">
                      {initialsFromName(selectedTicket.profiles?.nom || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-gray-900 truncate leading-tight">{selectedTicket.sujet}</h2>
                      <span className="text-xs text-gray-400">
                        {selectedTicket.profiles?.nom || 'Utilisateur'} · {CATEGORIES[selectedTicket.categorie] || 'Général'}
                      </span>
                    </div>
                    <select
                      value={selectedTicket.statut}
                      onChange={e => handleStatutChange(e.target.value)}
                      className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </header>

                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-1" style={{ background: '#f8f9fb', overscrollBehavior: 'contain' }}>
                  {messages.map((message, index) => {
                    const isOwn = message.is_admin;
                    const prevMsg = messages[index - 1];
                    const isGroupStart = !prevMsg || prevMsg.is_admin !== message.is_admin;
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 ${isGroupStart ? 'mt-3' : 'mt-0.5'}`}>
                        {!isOwn && (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {initialsFromName(selectedTicket.profiles?.nom || 'U')}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`px-6 py-2.5 rounded-2xl shadow-sm ${
                            isOwn ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.contenu}</p>
                          </div>
                          <div className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[11px] text-gray-400 tabular-nums">{formatTime(message.created_at)}</span>
                            {isOwn && (message.lu
                              ? <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                              : <Check className="w-3.5 h-3.5 text-gray-300" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onInput={handleTextareaInput}
                      placeholder="Répondre à l'utilisateur…"
                      rows={1}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all text-sm outline-none placeholder:text-gray-400"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        newMessage.trim() && !sending
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200 hover:shadow-md'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                      aria-label="Envoyer"
                    >
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                  <LifeBuoy className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sélectionnez un ticket</h3>
                <p className="text-sm text-gray-400 max-w-xs">Choisissez un ticket dans la liste pour voir et répondre à la conversation.</p>
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}