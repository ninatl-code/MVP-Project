import { supabase } from '../../../lib/supabaseClient'

// Cette fonction doit être appelée périodiquement (toutes les heures par exemple)
// Elle peut être utilisée avec un service cron externe comme cron-job.org
export default async function handler(req, res) {
  // Vérification de sécurité - optionnel: ajouter une clé API
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
  const providedSecret = req.headers.authorization || req.query.secret

  if (providedSecret !== `Bearer ${cronSecret}` && providedSecret !== cronSecret) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Récupérer les commandes payées depuis plus de 24h
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    console.log('Recherche de commandes payées avant:', twentyFourHoursAgo.toISOString())

    const { data: commandesToConfirm, error: fetchError } = await supabase
      .from('commandes')
      .select('*')
      .eq('status', 'paid')
      .lt('date_commande', twentyFourHoursAgo.toISOString())

    if (fetchError) {
      console.error('Erreur lors de la récupération des commandes:', fetchError)
      throw fetchError
    }

    console.log(`Commandes trouvées à confirmer: ${commandesToConfirm?.length || 0}`)

    if (!commandesToConfirm || commandesToConfirm.length === 0) {
      return res.status(200).json({ 
        message: 'Aucune commande à confirmer automatiquement',
        timestamp: new Date().toISOString(),
        confirmed: 0,
        processed: 0
      })
    }

    let confirmedCount = 0
    let errorCount = 0
    
    // Traiter chaque commande une par une
    for (const commande of commandesToConfirm) {
      try {
        console.log(`Traitement de la commande ${commande.id}`)
        
        // Mettre à jour le statut à 'confirmed' dans la table commandes
        const { error: updateError } = await supabase
          .from('commandes')
          .update({ status: 'confirmed' })
          .eq('id', commande.id)

        if (updateError) {
          console.error(`Erreur lors de la mise à jour de la commande ${commande.id}:`, updateError)
          errorCount++
          continue
        }

        // Mettre à jour ou créer l'entrée dans la table livraisons
        const { data: existingLivraison } = await supabase
          .from('livraisons')
          .select('id')
          .eq('commande_id', commande.id)
          .single()

        if (existingLivraison) {
          // Mise à jour de l'entrée existante
          const { error: livraisonUpdateError } = await supabase
            .from('livraisons')
            .update({
              status: 'confirmed',
              update_date: new Date()
            })
            .eq('commande_id', commande.id)

          if (livraisonUpdateError) {
            console.error(`Erreur mise à jour livraison pour commande ${commande.id}:`, livraisonUpdateError)
          }
        } else {
          // Création d'une nouvelle entrée livraison
          const { error: livraisonInsertError } = await supabase
            .from('livraisons')
            .insert({
              commande_id: commande.id,
              status: 'confirmed'
            })

          if (livraisonInsertError) {
            console.error(`Erreur création livraison pour commande ${commande.id}:`, livraisonInsertError)
          }
        }

        // Envoyer une notification au client
        const { error: clientNotifError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: commande.particulier_id,
              type: 'commande',
              contenu: 'Votre commande a été automatiquement confirmée. Elle sera traitée dans les plus brefs délais.',
              lu: false
            }
          ])

        if (clientNotifError) {
          console.error(`Erreur notification client pour commande ${commande.id}:`, clientNotifError)
        }

        // Envoyer une notification au prestataire
        const { error: prestataireNotifError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: commande.prestataire_id,
              type: 'commande',
              contenu: `Une commande a été automatiquement confirmée après 24h (Commande #${commande.id}).`,
              lu: false
            }
          ])

        if (prestataireNotifError) {
          console.error(`Erreur notification prestataire pour commande ${commande.id}:`, prestataireNotifError)
        }

        confirmedCount++
        console.log(`Commande ${commande.id} confirmée avec succès`)

      } catch (commandeError) {
        console.error(`Erreur lors du traitement de la commande ${commande.id}:`, commandeError)
        errorCount++
      }
    }

    const response = {
      message: `${confirmedCount} commande(s) confirmée(s) automatiquement`,
      timestamp: new Date().toISOString(),
      confirmed: confirmedCount,
      processed: commandesToConfirm.length,
      errors: errorCount,
      success: errorCount === 0
    }

    console.log('Résultat de la confirmation automatique:', response)

    return res.status(200).json(response)

  } catch (error) {
    console.error('Erreur fatale lors de la confirmation automatique:', error)
    return res.status(500).json({
      message: 'Erreur serveur lors de la confirmation automatique',
      timestamp: new Date().toISOString(),
      error: error.message,
      success: false
    })
  }
}