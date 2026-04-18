import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { otp, userId } = req.body;
  if (!otp || !userId) return res.status(400).json({ error: 'otp et userId requis' });

  // Récupère la vérification en attente
  const { data, error: fetchError } = await supabaseAdmin
    .from('phone_verifications')
    .select('otp_code, expires_at, verified')
    .eq('user_id', userId)
    .single();

  if (fetchError || !data) {
    return res.status(400).json({ error: 'Aucune vérification en attente' });
  }

  if (data.verified) {
    return res.status(400).json({ error: 'Numéro déjà vérifié' });
  }

  if (new Date() > new Date(data.expires_at)) {
    return res.status(400).json({ error: 'Code expiré. Renvoyez un nouveau code.' });
  }

  if (data.otp_code !== String(otp)) {
    return res.status(400).json({ error: 'Code incorrect' });
  }

  // Marque comme vérifié dans phone_verifications
  await supabaseAdmin
    .from('phone_verifications')
    .update({ verified: true })
    .eq('user_id', userId);

  // Marque phone_verified dans profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ phone_verified: true })
    .eq('id', userId);

  if (profileError) {
    console.error('profiles update error:', profileError);
    return res.status(500).json({ error: 'Erreur mise à jour du profil' });
  }

  return res.status(200).json({ success: true });
}
