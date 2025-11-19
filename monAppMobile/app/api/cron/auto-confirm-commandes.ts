import { supabase } from '../../../lib/supabaseClient';

/**
 * Fonction à appeler manuellement depuis l'app mobile pour confirmer les commandes payées depuis plus de 24h.
 * Retourne le nombre de commandes confirmées et les erreurs éventuelles.
 */
export async function autoConfirmCommandes(cronSecret: string): Promise<{
  confirmed: number;
  processed: number;
  errors: number;
  success: boolean;
  message: string;
}> {
  // Vérification de sécurité (optionnel)
  const expectedSecret = process.env.CRON_SECRET || 'your-secret-key';
  if (cronSecret !== expectedSecret) {
    throw new Error('Unauthorized');
  }

  // Récupérer les commandes payées depuis plus de 24h
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: commandesToConfirm, error: fetchError } = await supabase
    .from('commandes')
    .select('*')
    .eq('status', 'paid')
    .lt('date_commande', twentyFourHoursAgo.toISOString());

  if (fetchError) throw fetchError;
  if (!commandesToConfirm || commandesToConfirm.length === 0) {
    return {
      message: 'Aucune commande à confirmer automatiquement',
      confirmed: 0,
      processed: 0,
      errors: 0,
      success: true
    };
  }

  let confirmedCount = 0;
  let errorCount = 0;

  for (const commande of commandesToConfirm) {
    try {
      // Mettre à jour le statut à 'confirmed' dans la table commandes
      const { error: updateError } = await supabase
        .from('commandes')
        .update({ status: 'confirmed' })
        .eq('id', commande.id);
      if (updateError) {
        errorCount++;
        continue;
      }
      // Mettre à jour ou créer l'entrée dans la table livraisons
      const { data: existingLivraison } = await supabase
        .from('livraisons')
        .select('id')
        .eq('commande_id', commande.id)
        .single();
      if (existingLivraison) {
        await supabase
          .from('livraisons')
          .update({ status: 'confirmed', update_date: new Date() })
          .eq('commande_id', commande.id);
      } else {
        await supabase
          .from('livraisons')
          .insert({ commande_id: commande.id, status: 'confirmed' });
      }
      // Notification client
      await supabase
        .from('notifications')
        .insert({
          user_id: commande.particulier_id,
          type: 'commande',
          contenu: 'Votre commande a été automatiquement confirmée. Elle sera traitée dans les plus brefs délais.',
          lu: false
        });
      // Notification prestataire
      await supabase
        .from('notifications')
        .insert({
          user_id: commande.prestataire_id,
          type: 'commande',
          contenu: `Une commande a été automatiquement confirmée après 24h (Commande #${commande.id}).`,
          lu: false
        });
      confirmedCount++;
    } catch {
      errorCount++;
    }
  }

  return {
    message: `${confirmedCount} commande(s) confirmée(s) automatiquement`,
    confirmed: confirmedCount,
    processed: commandesToConfirm.length,
    errors: errorCount,
    success: errorCount === 0
  };
}

// Export par défaut requis pour Expo Router
export default function AutoConfirmCommandesAPI() {
  return null; // Ce n'est pas un composant React, juste une fonction utilitaire
}
