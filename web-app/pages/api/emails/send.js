import { supabase } from '../../lib/supabaseClient';

/**
 * Send email notifications
 * Uses Supabase Edge Functions or external email service
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { 
      to, 
      subject, 
      template, 
      data = {},
      from = 'Shooty <noreply@shooty.fr>'
    } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'to et subject requis' });
    }

    // Email templates
    const templates = {
      reservation_confirmed: {
        subject: 'Réservation confirmée - Shooty',
        html: `
          <h1>Votre réservation est confirmée !</h1>
          <p>Bonjour ${data.clientName || ''},</p>
          <p>Votre séance photo avec <strong>${data.photographeName || 'le photographe'}</strong> est confirmée.</p>
          <p><strong>Date:</strong> ${data.date || 'À définir'}</p>
          <p><strong>Lieu:</strong> ${data.lieu || 'À définir'}</p>
          <p><strong>Montant:</strong> ${data.montant || '0'} DH</p>
          <br>
          <p>Vous pouvez accéder aux détails de votre réservation dans votre espace client.</p>
          <p>L'équipe Shooty</p>
        `,
      },
      new_devis: {
        subject: 'Nouveau devis reçu - Shooty',
        html: `
          <h1>Vous avez reçu un nouveau devis !</h1>
          <p>Bonjour ${data.clientName || ''},</p>
          <p><strong>${data.photographeName || 'Un photographe'}</strong> vous a envoyé un devis.</p>
          <p><strong>Montant:</strong> ${data.montant || '0'} DH</p>
          <p><strong>Message:</strong> ${data.message || ''}</p>
          <br>
          <p>Connectez-vous pour accepter ou refuser ce devis.</p>
          <p>L'équipe Shooty</p>
        `,
      },
      payment_received: {
        subject: 'Paiement reçu - Shooty',
        html: `
          <h1>Paiement confirmé</h1>
          <p>Bonjour ${data.name || ''},</p>
          <p>Nous avons bien reçu votre paiement de <strong>${data.montant || '0'} DH</strong>.</p>
          <p>Numéro de réservation: ${data.reservationNumber || 'N/A'}</p>
          <br>
          <p>Merci de votre confiance !</p>
          <p>L'équipe Shooty</p>
        `,
      },
      review_request: {
        subject: 'Donnez votre avis - Shooty',
        html: `
          <h1>Comment s'est passée votre séance ?</h1>
          <p>Bonjour ${data.clientName || ''},</p>
          <p>Votre séance avec <strong>${data.photographeName || 'le photographe'}</strong> est terminée.</p>
          <p>Prenez quelques secondes pour partager votre expérience !</p>
          <br>
          <a href="${data.reviewUrl || '#'}" style="background: #5C6BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Laisser un avis
          </a>
          <br><br>
          <p>L'équipe Shooty</p>
        `,
      },
    };

    // Build email content
    let emailContent;
    if (template && templates[template]) {
      emailContent = templates[template];
    } else {
      emailContent = {
        subject: subject,
        html: data.html || `<p>${data.text || ''}</p>`,
      };
    }

    // Option 1: Log email (development)
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:', {
        to,
        subject: emailContent.subject,
        template,
      });
      return res.status(200).json({ 
        success: true, 
        message: 'Email logged (dev mode)' 
      });
    }

    // Option 2: Use Resend, SendGrid, or other email service
    // Example with Resend:
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: from,
          to: to,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email service error');
      }

      const result = await response.json();
      return res.status(200).json({ success: true, id: result.id });
    }

    // Fallback: Just log
    console.log('📧 Email (no service configured):', { to, subject: emailContent.subject });
    res.status(200).json({ 
      success: true, 
      message: 'Email queued (no service configured)' 
    });

  } catch (err) {
    console.error('Erreur envoi email:', err);
    res.status(500).json({ error: err.message });
  }
}
