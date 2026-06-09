import { supabase } from '../../../lib/supabaseClient';
import { expireDemande } from '../../../lib/demandeService';

/**
 * Cron job to auto-expire demandes whose date has passed
 * Runs nightly at 01:00
 *
 * GET /api/cron/expire-demandes?secret=YOUR_CRON_SECRET
 */
export default async function handler(req, res) {
  const { secret } = req.query;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('🔄 Running expire-demandes cron...');
    console.log('📅 Expiring demandes with date_souhaitee <', today);

    // Fetch open demandes whose event date has passed
    const { data: demandes, error: fetchError } = await supabase
      .from('demandes_client')
      .select('id')
      .eq('statut', 'ouverte')
      .lt('date_souhaitee', today);

    if (fetchError) throw fetchError;

    console.log(`📋 Found ${demandes?.length || 0} demandes to expire`);

    if (!demandes || demandes.length === 0) {
      return res.status(200).json({ expired: 0 });
    }

    const ids = demandes.map(d => d.id);

    // Mark them as expired
    const { error: updateError } = await expireDemande(ids);

    if (updateError) throw updateError;

    // Also refuse pending devis on those demandes
    const { error: devisError } = await cancelDevis(null, ids);

    if (devisError) {
      console.error('Erreur mise à jour devis:', devisError);
      // Non-blocking — on continue
    }

    console.log(`✅ Expired ${ids.length} demandes`);

    return res.status(200).json({
      expired: ids.length,
      ids,
    });
  } catch (error) {
    console.error('Expire-demandes cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
