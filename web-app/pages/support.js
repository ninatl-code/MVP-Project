import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import HeaderParti from '../components/HeaderParti';
import HeaderPresta from '../components/HeaderPresta';
import * as supportService from '../lib/supportService';
import {
  ArrowLeft, Send, LifeBuoy, Search, X, Plus,
  Check, CheckCheck, MessageCircle, ChevronRight, Tag
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Constantes
───────────────────────────────────────────── */
const CATEGORIES = [
  { value: 'general', label: 'Question générale' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'reservation', label: 'Réservation' },
  { value: 'compte', label: 'Compte' },
  { value: 'litige', label: 'Litige' },
  { value: 'technique', label: 'Problème technique' },
  { value: 'autre', label: 'Autre' },
];

const STATUT_STYLES = {
  ouvert: { label: 'Ouvert', className: 'bg-blue-50 text-blue-600' },
  en_cours: { label: 'En cours', className: 'bg-amber-50 text-amber-600' },
  resolu: { label: 'Résolu', className: 'bg-green-50 text-green-600' },
  ferme: { label: 'Fermé', className: 'bg-gray-100 text-gray-500' },
};

function StatutBadge({ statut }) {
  const s = STATUT_STYLES[statut] || STATUT_STYLES.ouvert;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
export default function SupportPage() {
  const router = useRouter();
  const { user, activeRole, profileId } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Nouveau ticket
  const [newSujet, setNewSujet] = useState('');
  const [newCategorie, setNewCategorie] = useState('general');
  const [newFirstMessage, setNewFirstMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!profileId) return;
    fetchTickets();
  }, [profileId]);

  useEffect(() => {
    if (!selectedTicket) return;
    setMessages([]);
    const loadMessages = async () => {
      const { data } = await supportService.getTicketMessages(selectedTicket.id);
      if (data) setMessages(data);
      await supportService.markTicketAsRead(selectedTicket.id, false);
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
      const { data, error } = await supportService.getUserTickets(profileId);
      if (error) { setError(`Erreur : ${error.message}`); return; }
      setTickets(data || []);
    } catch (err) {
      setError(`Erreur inattendue : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openNewTicketForm = () => {
    setSelectedTicket(null);
    setCreatingNew(true);
    setNewSujet('');
    setNewCategorie('general');
    setNewFirstMessage('');
  };

  const handleCreateTicket = async (e) => {
    e?.preventDefault();
    if (!newSujet.trim() || !newFirstMessage.trim() || creating) return;
    setCreating(true);
    const role = activeRole === 'photographe' ? 'photographe' : 'client';
    const { data, error } = await supportService.createTicket({
      userId: profileId,
      role,
      sujet: newSujet.trim(),
      categorie: newCategorie,
      message: newFirstMessage.trim(),
    });
    setCreating(false);
    if (error || !data) { setError(`Impossible de créer le ticket : ${error?.message || ''}`); return; }
    const newTicket = { ...data.ticket, unread_count_user: 0 };
    setTickets(prev => [newTicket, ...prev]);
    setCreatingNew(false);
    setSelectedTicket(newTicket);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedTicket || sending) return;
    setSending(true);
    const { data, error } = await supportService.sendSupportMessage({
      ticketId: selectedTicket.id,
      senderId: profileId,
      isAdmin: false,
      contenu: newMessage.trim(),
    });
    if (!error && data) {
      // Pas d'ajout local ici : le message arrive via subscribeToTicket (realtime),
      // qui dédupliquera de toute façon par id si jamais il arrivait deux fois.
      setNewMessage('');
      if (textareaRef.current) textareaRef.current.style.height = '48px';
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

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    return (t.sujet || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isClosed = selectedTicket?.statut === 'ferme' || selectedTicket?.statut === 'resolu';

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chargement…</p>
        </div>
      </div>
    </div>
  );

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
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              <h1 className="text-base font-semibold text-gray-900">Support</h1>
            </div>
          </div>
          <button
            onClick={openNewTicketForm}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau ticket
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto w-full px-6 pt-4">
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">
            {error}
          </div>
        </div>
      )}

      {/* ── Layout ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-6 py-5">
        <div className="flex gap-4 sm:gap-5" style={{ height: 'calc(100vh - 130px)' }}>

          {/* ── SIDEBAR ── */}
          <aside
            className={`
              ${(selectedTicket || creatingNew) ? 'hidden md:flex' : 'flex'}
              flex-col w-full md:w-72 lg:w-80 flex-shrink-0
              bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden
            `}
          >
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Mes tickets</h2>
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
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <LifeBuoy className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {searchQuery ? 'Aucun résultat' : 'Aucun ticket'}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-gray-400 mt-1">
                      Ouvrez un ticket pour contacter le support
                    </p>
                  )}
                </div>
              ) : (
                <ul className="p-2 space-y-0.5">
                  {filteredTickets.map((t) => {
                    const isActive = selectedTicket?.id === t.id;
                    const hasUnread = (t.unread_count_user || 0) > 0;
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => { setCreatingNew(false); setSelectedTicket(t); }}
                          className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group ${
                            isActive ? 'bg-indigo-50 ring-1 ring-indigo-200'
                              : hasUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <LifeBuoy className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                              <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {t.sujet}
                              </span>
                              <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">
                                {formatTime(t.last_message_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <StatutBadge statut={t.statut} />
                              {hasUnread && (
                                <span className="flex-shrink-0 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {t.unread_count_user > 9 ? '9+' : t.unread_count_user}
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

          {/* ── ZONE PRINCIPALE ── */}
          <main className={`${!selectedTicket && !creatingNew ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0`}>

            {creatingNew ? (
              /* ── Formulaire nouveau ticket ── */
              <div className="flex flex-col h-full">
                <header className="flex-shrink-0 border-b border-gray-100 px-6 py-3 flex items-center gap-3">
                  <button
                    onClick={() => setCreatingNew(false)}
                    className="md:hidden -ml-1 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">Nouveau ticket de support</h2>
                </header>

                <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Catégorie</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <select
                        value={newCategorie}
                        onChange={e => setNewCategorie(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none appearance-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sujet</label>
                    <input
                      type="text"
                      value={newSujet}
                      onChange={e => setNewSujet(e.target.value)}
                      placeholder="Résumez votre problème en quelques mots"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Votre message</label>
                    <textarea
                      value={newFirstMessage}
                      onChange={e => setNewFirstMessage(e.target.value)}
                      placeholder="Décrivez votre problème en détail…"
                      rows={6}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newSujet.trim() || !newFirstMessage.trim() || creating}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      newSujet.trim() && newFirstMessage.trim() && !creating
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {creating
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                    Envoyer au support
                  </button>
                </form>
              </div>

            ) : selectedTicket ? (
              /* ── Fil de discussion du ticket ── */
              <>
                <header className="flex-shrink-0 border-b border-gray-100 px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="md:hidden -ml-1 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <LifeBuoy className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-gray-900 truncate leading-tight">
                        {selectedTicket.sujet}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {CATEGORIES.find(c => c.value === selectedTicket.categorie)?.label || 'Général'}
                      </span>
                    </div>
                    <StatutBadge statut={selectedTicket.statut} />
                  </div>
                </header>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-6 py-5 space-y-1"
                  style={{ background: '#f8f9fb', overscrollBehavior: 'contain' }}
                >
                  {messages.map((message, index) => {
                    const isOwn = !message.is_admin;
                    const prevMsg = messages[index - 1];
                    const isGroupStart = !prevMsg || prevMsg.is_admin !== message.is_admin;

                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 ${isGroupStart ? 'mt-3' : 'mt-0.5'}`}>
                        {!isOwn && (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <LifeBuoy className="w-3.5 h-3.5 text-indigo-500" />
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
                            {isOwn && (
                              message.lu
                                ? <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                                : <Check className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input area */}
                <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white">
                  {isClosed ? (
                    <p className="text-center text-xs text-gray-400 py-2">
                      Ce ticket est {selectedTicket.statut === 'resolu' ? 'résolu' : 'fermé'}. Ouvrez un nouveau ticket si besoin.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={textareaRef}
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onInput={handleTextareaInput}
                          placeholder="Votre message au support…"
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
                            : <Send className="w-4 h-4" />
                          }
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 text-center mt-2 select-none">
                        Entrée pour envoyer · Shift+Entrée pour un saut de ligne
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                  <LifeBuoy className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Besoin d'aide ?</h3>
                <p className="text-sm text-gray-400 max-w-xs mb-5">
                  Sélectionnez un ticket existant ou ouvrez-en un nouveau pour contacter le support.
                </p>
                <button
                  onClick={openNewTicketForm}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau ticket
                </button>
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}