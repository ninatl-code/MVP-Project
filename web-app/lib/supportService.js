import { supabase } from './supabaseClient';

/* ─────────────────────────────────────────────
   Utilisateur
───────────────────────────────────────────── */

// Liste des tickets de l'utilisateur connecté
export const getUserTickets = async (userId) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });
  return { data, error };
};

// Crée un ticket + son premier message en une fois
export const createTicket = async ({ userId, role, sujet, categorie, message }) => {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, role, sujet, categorie: categorie || 'general' })
    .select()
    .single();

  if (ticketError || !ticket) return { data: null, error: ticketError };

  const { data: msg, error: msgError } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticket.id, sender_id: userId, is_admin: false, contenu: message })
    .select()
    .single();

  if (msgError) return { data: null, error: msgError };

  return { data: { ticket, firstMessage: msg }, error: null };
};

/* ─────────────────────────────────────────────
   Messages d'un ticket (utilisateur + admin)
───────────────────────────────────────────── */

export const getTicketMessages = async (ticketId) => {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  return { data, error };
};

export const sendSupportMessage = async ({ ticketId, senderId, isAdmin, contenu }) => {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticketId, sender_id: senderId, is_admin: isAdmin, contenu })
    .select()
    .single();
  return { data, error };
};

export const subscribeToTicket = (ticketId, onNewMessage) => {
  const channel = supabase
    .channel(`support_ticket_${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();
  return channel;
};

// Marque les messages de l'autre partie comme lus + remet le compteur à 0
export const markTicketAsRead = async (ticketId, isAdmin) => {
  await supabase
    .from('support_messages')
    .update({ lu: true })
    .eq('ticket_id', ticketId)
    .eq('is_admin', !isAdmin);

  const field = isAdmin ? 'unread_count_admin' : 'unread_count_user';
  await supabase.from('support_tickets').update({ [field]: 0 }).eq('id', ticketId);
};

/* ─────────────────────────────────────────────
   Admin
───────────────────────────────────────────── */

// Tous les tickets, avec le profil de l'auteur
export const getAllTickets = async () => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, profiles:user_id (id, nom, avatar_url)')
    .order('last_message_at', { ascending: false });
  return { data, error };
};

export const updateTicketStatus = async (ticketId, statut) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ statut })
    .eq('id', ticketId)
    .select()
    .single();
  return { data, error };
};

export const subscribeToAllTickets = (onChange) => {
  const channel = supabase
    .channel('admin_support_tickets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_tickets' },
      (payload) => onChange(payload)
    )
    .subscribe();
  return channel;
};