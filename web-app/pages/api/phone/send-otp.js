import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, userId } = req.body;
  if (!phone || !userId) return res.status(400).json({ error: 'phone et userId requis' });

  // Normalise vers format international
  const normalized = phone.startsWith('+') ? phone : '+33' + phone.replace(/^0/, '');

  // Génère un code à 6 chiffres
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Stocke le code en base (écrase l'éventuel précédent)
  const { error: dbError } = await supabaseAdmin
    .from('phone_verifications')
    .upsert({ user_id: userId, phone: normalized, otp_code: otp, expires_at: expiresAt, verified: false }, { onConflict: 'user_id' });

  if (dbError) {
    console.error('phone_verifications upsert error:', dbError);
    return res.status(500).json({ error: 'Erreur base de données' });
  }

  // Envoie via Twilio WhatsApp
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM, // ex: "whatsapp:+14155238886"
      to: `whatsapp:${normalized}`,
      body: `Votre code de vérification Shooty : *${otp}*\n\nCe code expire dans 5 minutes. Ne le communiquez à personne.`,
    });
  } catch (twilioError) {
    console.error('Twilio WhatsApp error:', twilioError);
    return res.status(500).json({ error: "Échec de l'envoi WhatsApp : " + twilioError.message });
  }

  return res.status(200).json({ success: true });
}
