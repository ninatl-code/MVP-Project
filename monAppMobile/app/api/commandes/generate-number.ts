import { supabase } from '../../../lib/supabaseClient';

export async function generateCommandeNumber(): Promise<{ num_commande: number; date_prefix: string; increment: number }> {
  // Obtenir la date du jour au format YYMMDD
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2); // YY
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // MM
  const day = today.getDate().toString().padStart(2, '0'); // DD
  const datePrefix = `${year}${month}${day}`;

  // Compter le nombre de commandes créées aujourd'hui pour obtenir le prochain numéro
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const { data: existingCommandes, error: countError } = await supabase
    .from('commandes')
    .select('num_commande')
    .gte('date_commande', startOfDay.toISOString())
    .lt('date_commande', endOfDay.toISOString())
    .not('num_commande', 'is', null)
    .order('num_commande', { ascending: false })
    .limit(1);

  if (countError) {
    throw new Error('Erreur lors de la génération du numéro de commande');
  }

  let nextNumber = 1;
  if (existingCommandes && existingCommandes.length > 0) {
    const lastNumCommande = existingCommandes[0].num_commande;
    const lastNumber = lastNumCommande - parseInt(datePrefix + '0');
    nextNumber = lastNumber + 1;
  }

  // Générer le nouveau numéro de commande
  const numCommande = parseInt(datePrefix + nextNumber.toString());

  return {
    num_commande: numCommande,
    date_prefix: datePrefix,
    increment: nextNumber
  };
}
