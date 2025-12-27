import { supabase } from '../../../lib/supabaseClient';

/**
 * Get notifications for a user
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
}

async function handleGet(req, res) {
  try {
    const { user_id, unread_only, limit = 50 } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id requis' });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_read', false);

    res.status(200).json({ 
      notifications: data,
      unreadCount: count || 0,
    });

  } catch (err) {
    console.error('Erreur récupération notifications:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const { 
      user_id, 
      type, 
      title, 
      message, 
      data = {},
      action_url 
    } = req.body;

    if (!user_id || !type || !title) {
      return res.status(400).json({ 
        error: 'user_id, type, et title requis' 
      });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        data,
        action_url,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ notification });

  } catch (err) {
    console.error('Erreur création notification:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handlePut(req, res) {
  try {
    const { notification_id, user_id, mark_all_read } = req.body;

    if (mark_all_read && user_id) {
      // Mark all notifications as read for user
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('is_read', false);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notification_id) {
      return res.status(400).json({ error: 'notification_id requis' });
    }

    // Mark single notification as read
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notification_id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ notification });

  } catch (err) {
    console.error('Erreur mise à jour notification:', err);
    res.status(500).json({ error: err.message });
  }
}
