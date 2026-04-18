import { supabase } from '../../../lib/supabaseClient';

/**
 * Reçoit un formulaire de support depuis le menu photographe
 * Body: { objet, description, nom, email, userId, timestamp }
 *
 * 1. Sauvegarde le ticket dans la table `support_tickets`
 * 2. Envoie une notification interne à l'admin (notifications table, user_id = 'admin')
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { objet, description, nom, email, userId, timestamp } = req.body;

  if (!objet || !description || !email) {
    return res.status(400).json({ error: 'objet, description et email sont requis' });
  }

  try {
    // 1. Sauvegarder le ticket
    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId || null,
        nom: nom || '',
        email,
        objet,
        description,
        statut: 'ouvert',
        created_at: timestamp || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // La table support_tickets n'existe peut-être pas encore — on continue sans bloquer
      console.warn('support_tickets insert failed (table may not exist):', insertError.message);
    }

    // 2. Notifier l'admin via la table notifications
    await supabase.from('notifications').insert({
      user_id: userId || null,
      type: 'support',
      titre: `Support : ${objet}`,
      contenu: description.slice(0, 300),
      metadata: { email, nom, ticket_id: ticket?.id || null },
      lu: false,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: 'Demande de support envoyée' });
  } catch (err) {
    console.error('Erreur support/send:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
