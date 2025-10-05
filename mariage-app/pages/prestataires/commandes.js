// Imports nécessaires pour React et Supabase
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'

// Page de gestion des commandes pour les prestataires
export default function CommandesPrestataire() {
  // États pour stocker les données des commandes et annonces
  const [commandes, setCommandes] = useState([]); // Liste de toutes les commandes du prestataire
  const [annonces, setAnnonces] = useState([]); // Liste des annonces du prestataire (pour les filtres)
  const [selectedCommande, setSelectedCommande] = useState(null); // Commande actuellement sélectionnée dans le panel de détails
  
  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState('all'); // Filtre par statut (paid, shipped, cancelled, etc.)
  const [annonceFilter, setAnnonceFilter] = useState('all'); // Filtre par annonce spécifique
  
  // États pour la gestion de l'expédition
  const [trackingNumber, setTrackingNumber] = useState(''); // Numéro de suivi saisi par le prestataire
  const [deliveryDate, setDeliveryDate] = useState(''); // Date de livraison estimée
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // État de chargement pour éviter les clics multiples

  // Récupération des annonces du prestataire au chargement de la page
  // Utilisé pour le filtre par annonce dans l'interface
  useEffect(() => {
    const fetchAnnonces = async () => {
      // Récupération de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Requête pour récupérer les annonces de ce prestataire
      const { data, error } = await supabase
        .from('annonces')
        .select('id, titre')
        .eq('prestataire', user.id)
      
      if (!error) {
        setAnnonces(data)
      }
    }
    fetchAnnonces()
  }, []) // Exécuté une seule fois au montage du composant

  // Récupération des commandes du prestataire au chargement de la page
  useEffect(() => {
    const fetchCommandes = async () => {
      // Récupération de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Requête simple pour récupérer toutes les commandes de ce prestataire
      // On récupère d'abord les commandes, puis on ajoute les infos séparément
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('prestataire_id', user.id) // Filtre par prestataire connecté
                .order('date_commande', { ascending: false }) // Tri par date de commande décroissante
      
      if (!error && data) {
        
        // Enrichissement des commandes avec les données des clients et annonces
        const commandesEnrichies = await Promise.all(
          data.map(async (commande) => {
            // Récupération des infos client
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('nom, email, photos')
              .eq('id', commande.particulier_id)
              .single()
            
            // Récupération des infos annonce
            const { data: annonceInfo } = await supabase
              .from('annonces')
              .select('titre, tarif_unit')
              .eq('id', commande.annonce_id)
              .single()
            
            // Récupération des livraisons
            const { data: livraisons } = await supabase
              .from('livraisons')
              .select('*')
              .eq('commande_id', commande.id)
            
            // Récupération des modèles commandés
            const { data: commandeModeles } = await supabase
              .from('commande_modeles')
              .select('*')
              .eq('commande_id', commande.id)
            
            return {
              ...commande,
              client_profile: clientProfile,
              annonce_info: annonceInfo,
              livraisons: livraisons || [],
              commande_modeles: commandeModeles || []
            }
          })
        )
        
        setCommandes(commandesEnrichies)
        
        // Sélection automatique de la première commande pour l'affichage des détails
        if (commandesEnrichies.length > 0 && !selectedCommande) {
          setSelectedCommande(commandesEnrichies[0])
        }
      }
    }
    fetchCommandes()
  }, []) // Exécuté une seule fois au montage du composant

  // Fonction pour confirmer une commande manuellement
  const confirmCommande = async (id) => {
    const commande = commandes.find(c => c.id === id)
    if (!commande) return
    
    if (isUpdatingStatus) return; // Empêcher les clics multiples
    
    setIsUpdatingStatus(true);

    // 1. Mise à jour du statut dans la table commandes
    const { error: commandeError } = await supabase
      .from('commandes')
      .update({ status: 'confirmed' })
      .eq('id', id)

    // 2. Mise à jour ou création de l'entrée dans la table livraisons
    const { data: existingLivraison } = await supabase
      .from('livraisons')
      .select('id')
      .eq('commande_id', id)
      .single()

    let livraisonError = null
    if (existingLivraison) {
      // Mise à jour de l'entrée existante
      const { error } = await supabase
        .from('livraisons')
        .update({
          status: 'confirmed',
          update_date: new Date()
        })
        .eq('commande_id', id)
      livraisonError = error
    } else {
      // Création d'une nouvelle entrée livraison
      const { error } = await supabase
        .from('livraisons')
        .insert({
          commande_id: id,
          status: 'confirmed'
        })
      livraisonError = error
    }

    // 3. Envoi de notification au client
    const clientId = commande.particulier_id
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: clientId,
          type: 'commande',
          contenu: `Votre commande a été confirmée par le prestataire. Elle sera traitée dans les plus brefs délais.`,
          lu: false,
          commande_id: commande.id
        }
      ])

    if (commandeError || livraisonError) {
      alert(`Erreur: ${commandeError?.message || livraisonError?.message}`)
    } else {
      alert('Commande confirmée ✅')
      // Mise à jour de l'état local
      setCommandes(commandes.map(c => c.id === id ? { ...c, status: 'confirmed' } : c))
      if (selectedCommande?.id === id) {
        setSelectedCommande({ ...selectedCommande, status: 'confirmed' })
      }
    }
    
    setIsUpdatingStatus(false);
  }

  // Fonction principale pour mettre à jour le statut d'une commande
  // Gère à la fois l'expédition (avec tracking) et l'annulation
  const updateCommandeStatus = async (id, status, trackingData = null) => {
    const commande = commandes.find(c => c.id === id)
    if (!commande) return
    
    if (isUpdatingStatus) return; // Empêcher les clics multiples
    
    setIsUpdatingStatus(true);
    try {
      // Si c'est une annulation, gérer le remboursement d'abord
      if (status === 'cancelled') {
        console.log('🚀 Annulation par prestataire - Début du processus');
        console.log('📋 Commande à annuler:', commande);
        
        // Vérifier si la commande était payée et nécessite un remboursement
        if (['paid', 'confirmed'].includes(commande.status) && commande.montant > 0) {
          console.log('💳 Traitement du remboursement pour commande payée...');
          
          try {
            const refundResponse = await fetch('/api/stripe/refund', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                reservationId: id, // L'API accepte reservationId même pour les commandes
                cancelReason: 'Annulation par le prestataire',
                userId: commande.particulier_id
              })
            });

            console.log('🔄 Réponse API refund status:', refundResponse.status);
            const refundResult = await refundResponse.json();
            console.log('📨 Réponse API refund complète:', refundResult);
            
            if (!refundResponse.ok) {
              console.error('❌ Erreur lors du remboursement:', refundResult);
              alert(`⚠️ Commande annulée mais problème de remboursement: ${refundResult.error}\n\nVeuillez contacter le support.`);
            } else if (refundResult.success) {
              console.log('✅ Remboursement traité avec succès:', refundResult);
            }
          } catch (refundError) {
            console.error('💥 Erreur générale remboursement:', refundError);
            alert(`⚠️ Commande sera annulée mais erreur de remboursement: ${refundError.message}\n\nVeuillez contacter le support.`);
          }
        }
      }

      // 1. Mise à jour du statut dans la table commandes
      const updateData = { 
        status,
        ...(status === 'cancelled' && {
          date_annulation: new Date().toISOString(),
          motif_annulation: 'Annulation par le prestataire'
        }),
        ...(status === 'delivered' && {
          date_livraison: new Date().toISOString()
        })
      }
      
      const { error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        alert(`Erreur: ${error.message}`);
        return;
      }

      // 2. Préparation de la notification pour le client
      const clientId = commande.particulier_id
      let contenu = ''
      
      // Construction du message selon l'action
      if (status === 'shipped') {
        contenu = trackingData?.tracking_number ? 
          `Votre commande a été expédiée. Numéro de suivi: ${trackingData.tracking_number}` : 
          'Votre commande a été expédiée.'
      } else if (status === 'cancelled') {
        contenu = 'Votre commande a été annulée par le prestataire. Vous serez remboursé dans les plus brefs délais';
      } else if (status === 'delivered') {
        contenu = 'Votre commande a été livrée avec succès !'
      }

    // 3. Gestion de la table livraisons (pour le tracking et le suivi)
    if (trackingData || status === 'cancelled' || status === 'delivered') {
      // Vérification si une entrée livraison existe déjà
      const { data: existingLivraison } = await supabase
        .from('livraisons')
        .select('id')
        .eq('commande_id', id)
        .single()

      if (existingLivraison) {
        // Mise à jour de l'entrée existante
        await supabase
          .from('livraisons')
          .update({
            status: status === 'shipped' ? 'shipped' : 
                    status === 'delivered' ? 'delivered' : 
                    status === 'cancelled' ? 'cancelled' : status,
            ...(trackingData && {
              tracking_number: trackingData.tracking_number,
              delivery_date: trackingData.delivery_date || null
            }),
            ...(status === 'delivered' && { delivery_date: new Date().toISOString() }),
            update_date: new Date().toISOString()
          })
          .eq('commande_id', id)
      } else {
        // Création d'une nouvelle entrée livraison
        await supabase
          .from('livraisons')
          .insert({
            commande_id: id,
            status: status === 'shipped' ? 'shipped' : 
                    status === 'delivered' ? 'delivered' : 
                    status === 'cancelled' ? 'cancelled' : status,
            ...(trackingData && {
              tracking_number: trackingData.tracking_number,
              delivery_date: trackingData.delivery_date || null,
              delivery_provider: 'Standard'
            }),
            ...(status === 'delivered' && { delivery_date: new Date().toISOString() })
          })
      }
    }

    // 4. Envoi de notification au client
    if (clientId && contenu) {
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: clientId,
            contenu: contenu,
            type: 'commande',
            lu: false,
            commande_id: id
          }
        ])
    }

      // 5. Les notifications de notation sont maintenant gérées automatiquement par le trigger Supabase ✨
      if (status === 'delivered') {
        console.log(`✅ Commande ${id} marquée comme livrée - Notification automatique via trigger Supabase`)
      }

      // 6. Gestion du résultat et mise à jour de l'interface
      const statusText = status === 'shipped' ? 'expédiée' : 
                        status === 'cancelled' ? 'annulée' : status
      
      const successMessage = status === 'cancelled' && 
                             ['paid', 'confirmed'].includes(commande.status) && 
                             commande.montant > 0
        ? `Commande ${statusText} ✅ Le client sera automatiquement remboursé.`
        : `Commande ${statusText} ✅`;
        
      alert(successMessage);
      
      // Mise à jour de l'état local des commandes
      setCommandes(commandes.map(c => c.id === id ? { ...c, status } : c))
      if (selectedCommande?.id === id) {
        setSelectedCommande({ ...selectedCommande, status })
      }
      // Reset des champs de saisie
      setTrackingNumber('')
      setDeliveryDate('')
      
    } catch (error) {
      console.error('💥 Erreur générale dans updateCommandeStatus:', error);
      alert('Erreur lors de la mise à jour: ' + error.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Logique de filtrage des commandes affichées
  // Applique les filtres de statut et d'annonce sélectionnés par l'utilisateur
  const filteredCommandes = commandes.filter(c => {
    // Vérification du filtre de statut (ex: 'paid', 'shipped', 'cancelled')
    const statusMatch = statusFilter === 'all' || c.status === statusFilter;
    
    // Vérification du filtre d'annonce (permet de voir les commandes d'une annonce spécifique)
    const annonceMatch = annonceFilter === 'all' || c.annonce_id === parseInt(annonceFilter);
    
    // Retourne true si les deux filtres correspondent
    return statusMatch && annonceMatch;
  });

  // Composant pour afficher le statut d'une commande avec des couleurs distinctives
  const StatusBadge = ({ status }) => {
    // Fonction qui retourne les styles CSS selon le statut
    const getStatusStyle = () => {
      switch(status) {
        case 'paid':
        case 'confirmed':
          return { background: '#dcf4e6', color: '#8ba987', fontWeight: 600 }; // Vert clair
        case 'shipped':
          return { background: '#e0f2fe', color: '#0277bd', fontWeight: 600 }; // Bleu
        case 'delivered':
          return { background: '#e8f5e8', color: '#4caf50', fontWeight: 600 }; // Vert foncé
        case 'cancelled':
          return { background: '#fbe7ee', color: '#e67c73', fontWeight: 600 }; // Rouge
        case 'pending':
        default:
          return { background: '#fef3c7', color: '#f59e0b', fontWeight: 600 }; // Orange
      }
    };

    // Fonction qui retourne le texte à afficher selon le statut
    const getStatusText = () => {
      switch(status) {
        case 'paid': return 'Payé';
        case 'confirmed': return 'Confirmé';
        case 'shipped': return 'Expédié';
        case 'delivered': return 'Livré';
        case 'cancelled': return 'Annulé';
        case 'pending':
        default: return 'En attente';
      }
    };

    // Rendu du badge avec styles et texte appropriés
    return (
      <span style={{
        ...getStatusStyle(), // Application des styles de couleur
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 13
      }}>
        {getStatusText()}
      </span>
    );
  };

  // Composant pour afficher une commande dans la liste de gauche
  // Cliquable pour sélectionner et afficher les détails à droite
  const CommandeCard = ({ commande }) => (
    <div
      onClick={() => setSelectedCommande(commande)} // Sélection au clic
      style={{
        padding: 16,
        // Style conditionnel : surbrillance si sélectionnée
        background: selectedCommande?.id === commande.id ? '#f8f9ff' : '#fff',
        borderRadius: 12,
        border: selectedCommande?.id === commande.id ? '2px solid #6366f1' : '1px solid #e5e7eb',
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'all 0.2s' // Animation fluide
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar du client avec photo ou initiales */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#f3f3f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
          color: '#888',
          overflow: 'hidden'
        }}>
          {commande.client_profile?.photos ? (
            <img
              src={commande.client_profile.photos}
              alt="Photo du client"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = commande.client_profile?.nom ? commande.client_profile.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
              }}
            />
          ) : (
            /* Génération des initiales à partir du nom si pas de photo */
            commande.client_profile?.nom ? commande.client_profile.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
          )}
        </div>
        {/* Informations principales du client et de la commande */}
        <div style={{ flex: 1 }}>
          {/* Nom du client */}
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
            {commande.client_profile?.nom || 'Client inconnu'} {commande.num_commande && <span style={{color: '#666', fontSize: 12, fontWeight: 400}}>#{commande.num_commande}</span>}
          </div>
          {/* Email du client */}
          <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
            {commande.client_profile?.email}
          </div>
          {/* Badge de statut et date de création */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={commande.status} />
            <span style={{ color: '#888', fontSize: 12 }}>
              {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        {/* Informations financières et produit */}
        <div style={{ textAlign: 'right' }}>
          {/* Montant total de la commande */}
          <div style={{ fontWeight: 700, fontSize: 16, color: '#333' }}>
            {commande.montant}€
          </div>
          {/* Titre de l'annonce/produit commandé */}
          <div style={{ color: '#6bbf7b', fontSize: 12, fontWeight: 600 }}>
            {commande.annonce_info?.titre}
          </div>
        </div>
      </div>
    </div>
  );

  // Interface utilisateur principale
  return (
    <>
      {/* Header de navigation pour prestataires */}
      <PrestataireHeader />
      {/* Header avec statistiques */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold mb-2">Gestion des Commandes</h3>
                <p className="text-slate-300">Gérez toutes vos commandes en un seul endroit</p>
              </div>
              
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{commandes.length}</div>
                  <div className="text-slate-300 text-sm">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {commandes.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-slate-300 text-sm">En attente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {commandes.filter(r => r.status === 'confirmed' || r.status === 'accepted').length}
                  </div>
                  <div className="text-slate-300 text-sm">Confirmées</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/* Container principal avec background gris clair */}
      <div style={{
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '20px 40px'
      }}>
        {/* Layout en colonnes : liste à gauche, détails à droite */}
        <div style={{
          display: 'flex',
          gap: 24,
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          {/* Colonne de gauche : Liste des commandes avec filtres */}
          <div style={{
            flex: 2,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            padding: 24,
            height: 'fit-content'
          }}>
            <h1 style={{
              fontWeight: 700,
              fontSize: 28,
              marginBottom: 24,
              color: '#333'
            }}>
              Mes Commandes ({filteredCommandes.length})
            </h1>

            {/* Filtres */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 24,
              flexWrap: 'wrap'
            }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 16,
                  background: '#fff'
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="confirmed">Confirmé</option>
                <option value="shipped">Expédié</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
                <option value="pending">En attente</option>
              </select>
              
              <select
                value={annonceFilter}
                onChange={e => setAnnonceFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 16,
                  background: '#fff'
                }}
              >
                <option value="all">Toutes les annonces</option>
                {annonces.map(a => (
                  <option key={a.id} value={a.id}>{a.titre}</option>
                ))}
              </select>
            </div>

            {/* Liste des commandes */}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredCommandes.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#888',
                  fontSize: 16
                }}>
                  Aucune commande trouvée
                </div>
              ) : (
                filteredCommandes.map(commande => (
                  <CommandeCard key={commande.id} commande={commande} />
                ))
              )}
            </div>
          </div>

          {/* Détail à droite */}
          <div style={{
            flex: 1,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            padding: 24,
            minWidth: 320,
            maxWidth: 400,
            height: 'fit-content'
          }}>
            {selectedCommande ? (
              <>
                <h2 style={{
                  fontWeight: 700,
                  fontSize: 22,
                  marginBottom: 24,
                  color: '#333'
                }}>
                  Détails de la commande {selectedCommande.num_commande && <span style={{color: '#666', fontSize: 18}}>#{selectedCommande.num_commande}</span>}
                </h2>

                {/* Informations client */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#f3f3f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 24,
                    color: '#888',
                    marginBottom: 12,
                    overflow: 'hidden'
                  }}>
                    {selectedCommande.client_profile?.photos ? (
                      <img
                        src={selectedCommande.client_profile.photos}
                        alt="Photo du client"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = selectedCommande.client_profile?.nom ? selectedCommande.client_profile.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
                        }}
                      />
                    ) : (
                      selectedCommande.client_profile?.nom ? selectedCommande.client_profile.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
                    )}
                  </div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 18,
                    marginBottom: 4,
                    color: '#333'
                  }}>
                    {selectedCommande.client_profile?.nom || 'Client inconnu'}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: 15,
                    marginBottom: 8
                  }}>
                    {selectedCommande.client_profile?.email}
                  </div>
                  <StatusBadge status={selectedCommande.status} />
                </div>

                {/* Informations commande */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    fontSize: 15,
                    marginBottom: 12,
                    color: '#6bbf7b',
                    fontWeight: 600
                  }}>
                    {selectedCommande.annonce_info?.titre}
                  </div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: '#333'
                  }}>
                    {selectedCommande.montant}€
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: 14,
                    marginBottom: 16
                  }}>
                    Commandé le {new Date(selectedCommande.date_commande).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>

                  {/* Adresse et mode de livraison */}
                  {(selectedCommande.adresse_livraison || selectedCommande.mode_livraison) && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 16
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 8,
                        color: '#333'
                      }}>
                        Informations de livraison
                      </div>
                      {selectedCommande.mode_livraison && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <strong>Mode:</strong> {selectedCommande.mode_livraison}
                        </div>
                      )}
                      {selectedCommande.adresse_livraison && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <strong>Adresse:</strong> {selectedCommande.adresse_livraison}
                        </div>
                      )}
                      {selectedCommande.frais_livraison && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <strong>Frais de livraison:</strong> {selectedCommande.frais_livraison}€
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photos de la commande */}
                  {selectedCommande.photo && selectedCommande.photo.length > 0 && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 16
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 12,
                        color: '#333'
                      }}>
                        Photos de la commande
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: 8,
                        maxHeight: 200,
                        overflowY: 'auto'
                      }}>
                        {selectedCommande.photo.map((photoUrl, index) => (
                          <div
                            key={index}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(photoUrl, '_blank')}
                          >
                            <img
                              src={photoUrl}
                              alt={`Photo ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modèles commandés */}
                  {selectedCommande.commande_modeles && selectedCommande.commande_modeles.length > 0 && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 16
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 12,
                        color: '#333'
                      }}>
                        Modèles commandés ({selectedCommande.commande_modeles.length})
                      </div>
                      {selectedCommande.commande_modeles.map((modele, index) => (
                        <div key={modele.id} style={{
                          background: '#fff',
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 8
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                                Modèle #{modele.modele_id}
                              </div>
                              <div style={{ fontSize: 12, color: '#666' }}>
                                Quantité: {modele.quantite} × {modele.prix_unitaire}€
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>
                              {(modele.quantite * modele.prix_unitaire).toFixed(2)}€
                            </div>
                          </div>
                          
                          {/* Message du client pour ce modèle */}
                          {modele.message_client && (
                            <div style={{
                              background: '#f1f3f4',
                              padding: 8,
                              borderRadius: 6,
                              marginBottom: 8
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                                Message client:
                              </div>
                              <div style={{ fontSize: 12, fontStyle: 'italic', color: '#666' }}>
                                "{modele.message_client}"
                              </div>
                            </div>
                          )}
                          
                          {/* Photo du client pour ce modèle */}
                          {modele.photo_client && (
                            <div style={{
                              marginTop: 8
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                                Photo client:
                              </div>
                              <div
                                style={{
                                  width: '100px',
                                  height: '100px',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  border: '1px solid #e5e7eb',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(modele.photo_client, '_blank')}
                              >
                                <img
                                  src={modele.photo_client}
                                  alt={`Photo client pour modèle ${modele.modele_id}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #666; font-size: 12px;">Photo non disponible</div>'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Total des modèles */}
                      <div style={{
                        background: '#fff',
                        padding: 12,
                        borderRadius: 8,
                        border: '2px solid #6366f1',
                        marginTop: 8
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                            Total modèles:
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#6366f1' }}>
                            {selectedCommande.commande_modeles.reduce((total, modele) => 
                              total + (modele.quantite * modele.prix_unitaire), 0
                            ).toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commentaire de la commande */}
                  {selectedCommande.commentaire && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 16
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 8,
                        color: '#333'
                      }}>
                        Commentaire général
                      </div>
                      <div style={{ fontSize: 14, fontStyle: 'italic', color: '#555' }}>
                        "{selectedCommande.commentaire}"
                      </div>
                    </div>
                  )}

                  {/* Informations de suivi actuelles */}
                  {selectedCommande.livraisons?.[0] && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 16
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 8,
                        color: '#333'
                      }}>
                        Suivi de livraison
                      </div>
                      {selectedCommande.livraisons[0].tracking_number && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <strong>Suivi:</strong> {selectedCommande.livraisons[0].tracking_number}
                        </div>
                      )}
                      {selectedCommande.livraisons[0].delivery_date && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <strong>Livraison estimée:</strong> {new Date(selectedCommande.livraisons[0].delivery_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action de confirmation pour commandes payées */}
                {selectedCommande.status === 'paid' && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 16,
                      color: '#333'
                    }}>
                      Confirmer la commande
                    </h3>
                    <div style={{
                      background: '#e7f3ff',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: 13,
                      color: '#0277bd'
                    }}>
                      ⚠️ Cette commande sera automatiquement confirmée dans 24h si vous ne l'annulez pas.
                    </div>
                    <button
                      onClick={() => confirmCommande(selectedCommande.id)}
                      disabled={isUpdatingStatus}
                      style={{
                        width: '100%',
                        background: isUpdatingStatus ? '#ccc' : '#4caf50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 16px',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                        marginBottom: 16,
                        opacity: isUpdatingStatus ? 0.6 : 1
                      }}
                    >
                      {isUpdatingStatus ? 'Confirmation...' : 'Confirmer la commande'}
                    </button>
                  </div>
                )}

                {/* Actions d'expédition pour commandes confirmées */}
                {selectedCommande.status === 'confirmed' && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 16,
                      color: '#333'
                    }}>
                      Marquer comme expédié
                    </h3>
                    
                    <input
                      type="text"
                      placeholder="Numéro de suivi"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        marginBottom: 12
                      }}
                    />
                    
                    <input
                      type="date"
                      placeholder="Date de livraison estimée"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        marginBottom: 16
                      }}
                    />
                    
                    <button
                      onClick={() => updateCommandeStatus(selectedCommande.id, 'shipped', { tracking_number: trackingNumber, delivery_date: deliveryDate })}
                      disabled={!trackingNumber || isUpdatingStatus}
                      style={{
                        width: '100%',
                        background: (trackingNumber && !isUpdatingStatus) ? '#0277bd' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 16px',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: (trackingNumber && !isUpdatingStatus) ? 'pointer' : 'not-allowed',
                        marginBottom: 12,
                        opacity: isUpdatingStatus ? 0.6 : 1
                      }}
                    >
                      {isUpdatingStatus ? 'Traitement...' : 'Marquer comme expédié'}
                    </button>
                  </div>
                )}

                {/* Action pour marquer comme livré */}
                {selectedCommande.status === 'shipped' && (
                  <div style={{ marginBottom: 24 }}>
                    <button
                      onClick={() => updateCommandeStatus(selectedCommande.id, 'delivered')}
                      disabled={isUpdatingStatus}
                      style={{
                        width: '100%',
                        background: isUpdatingStatus ? '#ccc' : '#4caf50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 16px',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                        marginBottom: 12,
                        opacity: isUpdatingStatus ? 0.6 : 1
                      }}
                    >
                      {isUpdatingStatus ? '⏳ Traitement...' : '✅ Marquer comme livré'}
                    </button>
                    <div style={{
                      fontSize: 12,
                      color: '#666',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      Le client recevra automatiquement une invitation à noter la commande
                    </div>
                  </div>
                )}

                {/* Bouton d'annulation */}
                {selectedCommande.status !== 'cancelled' && selectedCommande.status !== 'delivered' && (
                  <button
                    onClick={() => updateCommandeStatus(selectedCommande.id, 'cancelled')}
                    disabled={isUpdatingStatus}
                    style={{
                      width: '100%',
                      background: isUpdatingStatus ? '#f5f5f5' : '#fbe7ee',
                      color: isUpdatingStatus ? '#999' : '#e67c73',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 16px',
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingStatus ? 0.6 : 1
                    }}
                  >
                    {isUpdatingStatus ? '🔄 Annulation en cours...' : '❌ Annuler la commande'}
                  </button>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: '#888',
                fontSize: 16
              }}>
                Sélectionnez une commande pour voir les détails
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
