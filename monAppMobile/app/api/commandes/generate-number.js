import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      console.error('Erreur lors du comptage des commandes:', countError);
      throw new Error('Erreur lors de la génération du numéro de commande');
    }

    let nextNumber = 1;

    if (existingCommandes && existingCommandes.length > 0) {
      const lastNumCommande = existingCommandes[0].num_commande;
      // Extraire le numéro incrémental (derniers chiffres après la date)
      const lastNumber = lastNumCommande - parseInt(datePrefix + '0');
      nextNumber = lastNumber + 1;
    }

    // Générer le nouveau numéro de commande
    const numCommande = parseInt(datePrefix + nextNumber.toString());

    res.status(200).json({
      success: true,
      num_commande: numCommande,
      date_prefix: datePrefix,
      increment: nextNumber
    });

  } catch (error) {
    console.error('Erreur génération numéro commande:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du numéro de commande',
      message: error.message
    });
  }
}