import { supabase } from './supabaseClient';

/**
 * Create a new conversation between client and service provider
 */
export const createConversation = async (clientId, photographeId, reservationId = null,demandeId=null) => {
  try {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('prestataire_id', photographeId)
      .single();

    if (existing) {
      return { data: existing, error: null };
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        prestataire_id: photographeId,
        reservation_id: reservationId,
        demande_id: demandeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { data: null, error };
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId, role = 'particulier') => {
  try {
    const column = role === 'particulier' ? 'client_id' : 'prestataire_id';

    const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      client:profiles!conversations_client_id_fkey(
        id,
        nom,
        avatar_url
      ),
      prestataire:profils_prestataire!conversations_photographe_id_fkey(
        id,
        bio,
        nom_entreprise,
        note_moyenne
      ),
      messages(
        contenu,
        created_at,
        sender_id
      )
    `)
    .eq(column, userId)
    .order('updated_at', { ascending: false });

    if (error) throw error;

    // Add last message to each conversation
    const conversationsWithLastMessage = data?.map(conv => ({
      ...conv,
      lastMessage: conv.messages?.[conv.messages.length - 1] || null,
      otherParticipant: role === 'client' ? conv.prestataire : conv.client,
    })) || [];

    return { data: conversationsWithLastMessage, error: null };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { data: null, error };
  }
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (conversationId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, nom, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { data: null, error };
  }
};

/**
 * Send a message
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  receiverId,
  content,
  attachments = [],
}) => {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        contenu: content,
        attachments,
        lu: false,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, nom, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update conversation's updated_at and unread count
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: content,
        last_message_sender_id: senderId,
      })
      .eq('id', conversationId);

    return { data: message, error: null };
  } catch (error) {
    console.error('Error sending message:', error);
    return { data: null, error };
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        lu: true,
        lu_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('lu', false);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error };
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .neq('sender_id', userId)
      .eq('lu', false);

    if (error) throw error;

    // Get unique conversations with unread messages
    const unreadConversations = new Set(data?.map(m => m.conversation_id));
    
    return { 
      totalUnread: data?.length || 0,
      conversationsWithUnread: unreadConversations.size,
      error: null 
    };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return { totalUnread: 0, conversationsWithUnread: 0, error };
  }
};

/**
 * Get conversation by ID with details
 */
export const getConversationById = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        client:profiles!conversations_client_id_fkey(id, nom, email, avatar_url, telephone),
        prestataire:profiles!conversations_prestataire_id_fkey(id, nom, email, avatar_url, telephone),
        reservations(id, date, statut, montant_total)
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return { data: null, error };
  }
};

export const getExistingConversation = async (client_id, prestataire_id) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', client_id)
      .eq('prestataire_id', prestataire_id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return { data: null, error };
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId, userId) => {
  try {
    // Only allow sender to delete their own messages
    const { data, error } = await supabase
      .from('messages')
      .update({
        deleted_by_sender: true,
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { data: null, error };
  }
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToConversation = (conversationId, onMessage) => {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the complete message with sender info
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, nom, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();
        
        onMessage(data || payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from conversation
 */
export const unsubscribeFromConversation = (channel) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

/**
 * Upload attachment for message
 */
export const uploadMessageAttachment = async (conversationId, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, path: data.path, error: null };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return { url: null, path: null, error };
  }
};

export default {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  getConversationById,
  deleteMessage,
  subscribeToConversation,
  unsubscribeFromConversation,
  uploadMessageAttachment,
};
