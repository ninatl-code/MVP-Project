[
    {
        "type": "command",
        "details": {
            "key": "typescript.removeUnusedImports"
        }
    }
]

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Header from '../../components/HeaderParti'
import { Search, Minus, Plus } from "lucide-react";

export default function ParticularHomeMenu() {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [devis, setDevis] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [prestations, setPrestations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [prestationFilter, setPrestationFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [showDevis, setShowDevis] = useState(true)
  const [showReservations, setShowReservations] = useState(true)
  const [showCommandes, setShowCommandes] = useState(true)
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [commandeQuantities, setCommandeQuantities] = useState({});
  const [loadingDevisAction, setLoadingDevisAction] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: devisData } = await supabase
        .from("devis")
        .select("*, annonces!devis_annonce_id_fkey(titre)")
        .eq("particulier_id", user.id);
      setDevis(devisData || []);

      const { data: reservationsData } = await supabase
        .from("reservations")
        .select("*, profiles!reservations_prestataire_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre)")
        .eq("particulier_id", user.id);
      setReservations(reservationsData || []);

      const { data: commandesData } = await supabase
        .from("commandes")
        .select("*, annonces!commandes_annonce_id_fkey(titre)")
        .eq("particulier_id", user.id);
      setCommandes(commandesData || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchPrestations = async () => {
      const { data, error } = await supabase
        .from('prestations')
        .select('id, nom')
      if (!error) setPrestations(data)
    }
    fetchPrestations()
  }, [])

  useEffect(() => {
    const fetchReservations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('reservations')
        .select('*, profiles!reservations_prestataire_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre)')

      query = query.eq('particulier_id', user.id)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (prestationFilter !== 'all') {
        query = query.eq('prestation', prestationFilter)
      }
      if (dateFilter !== 'all') {
        query = query.eq('date', dateFilter)
      }

      const { data, error } = await query
      if (error) console.error(error)
      else setReservations(data)
    }
    fetchReservations()
  }, [statusFilter, prestationFilter, dateFilter])

  // Récupérer les quantités pour chaque commande
  useEffect(() => {
    async function fetchQuantities() {
      if (commandes.length === 0) return;
      const commandeIds = commandes.map(c => c.id);
      const { data: lignes } = await supabase
        .from("commande_modeles")
        .select("commande_id, quantite")
        .in("commande_id", commandeIds);
      const quantities = {};
      commandeIds.forEach(id => {
        quantities[id] = lignes
          ? lignes.filter(l => l.commande_id === id).reduce((sum, l) => sum + (l.quantite || 0), 0)
          : 0;
      });
      setCommandeQuantities(quantities);
    }
    fetchQuantities();
  }, [commandes]);

  function MiniCalendar({ onSelect }) {
    const [calendarDate, setCalendarDate] = useState(() => {
      const today = new Date()
      return { year: today.getFullYear(), month: today.getMonth() }
    })

    const { year, month } = calendarDate
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    return (
      <div style={{
        position: 'absolute',
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: 12,
        zIndex: 1000,
        top: 40,
        left: 0,
        minWidth: 200
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <button
            style={{
              background: '#f6f6f6',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 15,
              cursor: 'pointer'
            }}
            onClick={() => setCalendarDate(d => {
              let newMonth = d.month - 1
              let newYear = d.year
              if (newMonth < 0) {
                newMonth = 11
                newYear -= 1
              }
              return { year: newYear, month: newMonth }
            })}
          >◀</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {monthNames[month]} {year}
          </span>
          <button
            style={{
              background: '#f6f6f6',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 15,
              cursor: 'pointer'
            }}
            onClick={() => setCalendarDate(d => {
              let newMonth = d.month + 1
              let newYear = d.year
              if (newMonth > 11) {
                newMonth = 0
                newYear += 1
              }
              return { year: newYear, month: newMonth }
            })}
          >▶</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
          {['L','M','M','J','V','S','D'].map(j => (
            <div key={j} style={{fontSize:11, color:'#888', textAlign:'center'}}>{j}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
            return (
              <button
                key={dateStr}
                style={{
                  border:'none',
                  background: dateFilter === dateStr ? '#6bbf7b' : '#f6f6f6',
                  color: dateFilter === dateStr ? '#fff' : '#222',
                  borderRadius:6,
                  width:24,
                  height:24,
                  fontSize:13,
                  cursor:'pointer',
                  margin:1
                }}
                onClick={() => {
                  onSelect(dateStr)
                  setShowCalendar(false)
                }}
              >{i+1}</button>
            )
          })}
        </div>
        <button
          style={{
            marginTop:8,
            background:'#eee',
            border:'none',
            borderRadius:6,
            padding:'4px 12px',
            fontSize:13,
            cursor:'pointer',
            width:'100%'
          }}
          onClick={() => {
            onSelect('all')
            setShowCalendar(false)
          }}
        >Réinitialiser</button>
      </div>
    )
  }

  function StatusBadge({ status }) {
    let color = '#b7e4c7', bg = '#eafaf1', label = 'Confirmé'
    if (status === 'pending') { color = '#e67c73'; bg = '#fbeaea'; label = 'En attente' }
    if (status === 'refused') { color = '#e67c73'; bg = '#fbeaea'; label = 'Rejetée' }
    if (status === 'cancelled') { color = '#e67c73'; bg = '#fbeaea'; label = 'Annulée' }
    if (status === 'confirmed' || status === 'accepted') { color = '#3cb371'; bg = '#eafaf1'; label = 'Confirmé' }
    return (
      <span style={{
        background: bg,
        color,
        borderRadius: 8,
        padding: '4px 14px',
        fontWeight: 600,
        fontSize: 15,
        marginLeft: 12
      }}>{label}</span>
    )
  }

  // Actions pour accepter/refuser un devis
  async function handleAcceptDevis(devis) {
    setLoadingDevisAction(true);
    try {
      // 1. Changer le statut du devis à "accepted"
      const { error: devisError } = await supabase
        .from('devis')
        .update({ status: 'accepted' })
        .eq('id', devis.id);

      if (devisError) {
        alert("Erreur lors de l'acceptation du devis :\n" + (devisError.message || JSON.stringify(devisError)));
        setLoadingDevisAction(false);
        return;
      }

      // 2. Créer une nouvelle réservation liée au devis avec tous les champs demandés
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          status: 'TBC',
          devis_id: devis.id,
          montant: devis.montant,
          montant_acompte: devis.montant_acompte,
          particulier_id: devis.particulier_id,
          prestataire_id: devis.prestataire_id,
          annonce_id: devis.annonce_id,
          duree: devis.duree,
          endroit: devis.endroit,
          ville: devis.ville,
          participants: devis.participants || devis.nb_personnes,
          photos: devis.photos || [],
          unit_tarif: devis.unit_tarif,
          date: devis.date,
          client_nom: devis.client_nom || "",
          client_email: devis.client_email || ""
        }])
        .select()
        .single();

      if (reservationError || !reservationData) {
        alert("Erreur lors de la création de la réservation :\n" + (reservationError?.message || "Aucune donnée retournée."));
        setLoadingDevisAction(false);
        return;
      }

      // 3. Envoyer une notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: devis.prestataire_id,
          type: 'devis',
          contenu: 'votre devis a été accepté'
        }]);

      if (notifError) {
        alert("Erreur lors de l'envoi de la notification :\n" + (notifError.message || JSON.stringify(notifError)));
        // On continue quand même la redirection
      }

      setLoadingDevisAction(false);
      setSelectedDevis(null);

      // 4. Rediriger vers la page reservations.js de l'annonce avec l'id de la réservation créée
      router.push(`/annonces/${devis.annonce_id}/reservations?reservation_id=${reservationData.id}`);
    } catch (err) {
      alert("Erreur inattendue :\n" + (err.message || JSON.stringify(err)));
      setLoadingDevisAction(false);
    }
  }

  async function handleRefuseDevis(devis) {
    setLoadingDevisAction(true);
    // 1. Changer le statut du devis à "refused"
    const { error: devisError } = await supabase
      .from('devis')
      .update({ status: 'refused' })
      .eq('id', devis.id);

    if (devisError) {
      alert("Erreur lors du refus du devis.");
      setLoadingDevisAction(false);
      return;
    }

    // 2. Envoyer une notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: devis.prestataire_id,
        type: 'devis',
        contenu: 'votre devis a été refusé'
      }]);

    setLoadingDevisAction(false);
    setSelectedDevis(null);
    // Optionnel: rafraîchir la liste des devis
  }

  // Pop-up pour afficher les infos du devis
  function DevisInfoModal({ devis, onClose }) {
    if (!devis) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.18)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          minWidth: 600,
          maxWidth: 900,
          textAlign: 'left',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 12,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, textAlign: 'center' }}>Informations du devis</h2>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 48,
            minWidth: 500,
            maxWidth: 900,
            justifyContent: 'space-between'
          }}>
            {/* Colonne gauche : infos client */}
            <div style={{flex:1, borderRight:'1px solid #eee', paddingRight:24}}>
              <div style={{marginBottom:14}}>
                <strong>Prestataire :</strong><br />
                <span>{devis.nom_prestataire || devis.prestataire_nom || devis.prestataire || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Titre annonce :</strong><br />
                <span>{devis.annonces?.titre || devis.titre || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Endroit :</strong><br />
                <span>{devis.endroit || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Date :</strong><br />
                <span>{devis.date ? new Date(devis.date).toLocaleDateString('fr-FR') : ''}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Participants :</strong><br />
                <span>{devis.participants || devis.nb_personnes || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Durée en  {devis.unit_tarif} : </strong><br />
                <span>{devis.duree || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:14}}>
                <strong>Commentaire client :</strong><br />
                <span>{devis.comment_client || 'Non renseigné'}</span>
              </div>
              {devis.status === 'accepted' && (
                <div style={{marginBottom:14}}>
                  <strong>Date confirmation :</strong><br />
                  <span>{devis.date_confirmation ? new Date(devis.date_confirmation).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              )}
              {devis.status === 'refused' && (
                <>
                  <div style={{marginBottom:14}}>
                    <strong>Date refus :</strong><br />
                    <span>{devis.date_refus ? new Date(devis.date_refus).toLocaleDateString('fr-FR') : ''}</span>
                  </div>
                  <div style={{marginBottom:14}}>
                    <strong>Motif refus :</strong><br />
                    <span>{devis.motif_refus || 'Non renseigné'}</span>
                  </div>
                </>
              )}
            </div>
            {/* Colonne droite : réponses du prestataire, élargie */}
            <div style={{flex:1.5, paddingLeft:32}}>
              <div style={{marginBottom:18}}>
                <strong>Commentaire prestataire :</strong><br />
                <span>{devis.comment_presta || 'Non renseigné'}</span>
              </div>
              {(devis.status === 'answered' || devis.status === 'refused' || devis.status === 'accepted') && (
                <div style={{marginBottom:14}}>
                  <strong>Date réponse :</strong><br />
                  <span>{devis.date_reponse ? new Date(devis.date_reponse).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              )}
              <div style={{marginBottom:18}}>
                <strong>Montant :</strong><br />
                <span style={{fontSize:16}}>{devis.montant || 'Non renseigné'}</span>
              </div>
              <div style={{marginBottom:18}}>
                <strong>Acompte :</strong><br />
                <span style={{fontSize:16}}>{devis.montant_acompte || 'Non renseigné'}</span>
              </div>
            </div>
          </div>
          {/* Boutons Accepter/Refuser si status = answered */}
          {devis.status === 'answered' && (
            <div style={{marginTop:24, display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{
                  background:'#6bbf7b',
                  color:'#fff',
                  border:'none',
                  borderRadius:8,
                  padding:'10px 22px',
                  fontWeight:600,
                  fontSize:16,
                  cursor:'pointer'
                }}
                disabled={loadingDevisAction}
                onClick={() => handleAcceptDevis(devis)}
              >
                {loadingDevisAction ? "Traitement..." : "Accepter le devis"}
              </button>
              <button
                style={{
                  background:'#e67c73',
                  color:'#fff',
                  border:'none',
                  borderRadius:8,
                  padding:'10px 22px',
                  fontWeight:600,
                  fontSize:16,
                  cursor:'pointer'
                }}
                disabled={loadingDevisAction}
                onClick={() => handleRefuseDevis(devis)}
              >
                {loadingDevisAction ? "Traitement..." : "Refuser le devis"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pop-up pour afficher les infos de la réservation
  function ReservationInfoModal({ reservation, onClose }) {
    if (!reservation) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.18)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          minWidth: 320,
          maxWidth: 500,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 12,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Détail de la réservation</h2>
          <div style={{marginBottom:10}}>
            <strong>Date de la réservation :</strong> {reservation.created_at ? new Date(reservation.created_at).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Nom du prestataire :</strong> {reservation.profiles?.nom || reservation.prestataire_nom || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Annonce concernée :</strong> {reservation.annonces?.titre || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Date de la prestation :</strong> {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Durée de la prestation :</strong> {reservation.duree || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>En :</strong> {reservation.unit_tarif || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Endroit de la prestation :</strong> {reservation.endroit || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Votre commentaire :</strong> {reservation.commentaire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant :</strong> {reservation.montant || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant acompte payé :</strong> {reservation.montant_acompte || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Photos :</strong>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
              {Array.isArray(reservation.photos) && reservation.photos.length > 0 ? (
                reservation.photos.map((b64, idx) => (
                  <img
                    key={idx}
                    src={`data:image/*;base64,${b64}`}
                    alt="photo"
                    style={{width:60, height:60, objectFit:'cover', borderRadius:8, border:'1px solid #eee'}}
                  />
                ))
              ) : (
                <span style={{color:'#888'}}>Aucune photo</span>
              )}
            </div>
          </div>
          {reservation.nb_personnes > 1 && (
            <div style={{marginBottom:10}}>
              <strong>Nb de participants :</strong> {reservation.nb_personnes}
            </div>
          )}
          {reservation.status === 'confirmed' && (
            <div style={{marginBottom:10}}>
              <strong>Date confirmation :</strong> {reservation.date_confirmation ? new Date(reservation.date_confirmation).toLocaleDateString('fr-FR') : ''}
            </div>
          )}
          {reservation.status === 'cancelled' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date annulation :</strong> {reservation.date_annulation ? new Date(reservation.date_annulation).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif annulation :</strong> {reservation.motif_annulation || 'Non renseigné'}
              </div>
            </>
          )}
          {reservation.status === 'refused' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date refus :</strong> {reservation.date_refus ? new Date(reservation.date_refus).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif refus :</strong> {reservation.motif_refus || 'Non renseigné'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pop-up pour afficher les infos de la commande
  function CommandeInfoModal({ commande, onClose, quantity }) {
    if (!commande) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.18)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          minWidth: 320,
          maxWidth: 500,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 12,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Détail de la commande</h2>
          <div style={{marginBottom:10}}>
            <strong>Date de la commande :</strong> {commande.date_commande ? new Date(commande.date_commande).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Nom du prestataire :</strong> {commande.prestataire_nom || commande.nom_prestataire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Annonce concernée :</strong> {commande.annonces?.titre || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Quantité commandée :</strong> {quantity || 0}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant :</strong> {commande.montant || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Frais de livraison :</strong> {commande.frais_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Votre commentaire :</strong> {commande.commentaire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Adresse de livraison :</strong> {commande.adresse_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Mode de livraison :</strong> {commande.mode_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Photos :</strong>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
              {Array.isArray(commande.photos) && commande.photos.length > 0 ? (
                commande.photos.map((b64, idx) => (
                  <img
                    key={idx}
                    src={`data:image/*;base64,${b64}`}
                    alt="photo"
                    style={{width:60, height:60, objectFit:'cover', borderRadius:8, border:'1px solid #eee'}}
                  />
                ))
              ) : (
                <span style={{color:'#888'}}>Aucune photo</span>
              )}
            </div>
          </div>
          {commande.status === 'confirmed' && (
            <div style={{marginBottom:10}}>
              <strong>Date confirmation :</strong> {commande.date_confirmation ? new Date(commande.date_confirmation).toLocaleDateString('fr-FR') : ''}
            </div>
          )}
          {commande.status === 'cancelled' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date annulation :</strong> {commande.date_annulation ? new Date(commande.date_annulation).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif annulation :</strong> {commande.motif_annulation || 'Non renseigné'}
              </div>
            </>
          )}
          {commande.status === 'refused' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date refus :</strong> {commande.date_refus ? new Date(commande.date_refus).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif refus :</strong> {commande.motif_refus || 'Non renseigné'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Bloc Devis
  function DevisCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        border: '1px solid #f1f1f1',
        position: 'relative'
      }}>
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:18}}>
              {r.annonces?.titre || 'Annonce'}
            </div>
            <div style={{color:'#888', fontSize:15, marginTop:2}}>
              Date du devis : {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Endroit : {r.endroit || 'Non renseigné'}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Date : {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''}
            </div>
          </div>
          <div style={{marginLeft: 16}}>
            <StatusBadge status={r.status} />
          </div>
        </div>
        <div style={{marginTop:16, textAlign:'right'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedDevis(r)}
          >
            Afficher les informations
          </button>
        </div>
      </div>
    )
  }
  // Pop-up pour afficher les infos de la réservation
  function ReservationInfoModal({ reservation, onClose }) {
    if (!reservation) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.18)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          minWidth: 320,
          maxWidth: 500,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 12,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Détail de la réservation</h2>
          <div style={{marginBottom:10}}>
            <strong>Date de la réservation :</strong> {reservation.created_at ? new Date(reservation.created_at).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Nom du prestataire :</strong> {reservation.profiles?.nom || reservation.prestataire_nom || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Annonce concernée :</strong> {reservation.annonces?.titre || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Date de la prestation :</strong> {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Durée de la prestation :</strong> {reservation.duree || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>En :</strong> {reservation.unit_tarif || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Endroit de la prestation :</strong> {reservation.endroit || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Votre commentaire :</strong> {reservation.commentaire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant :</strong> {reservation.montant || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant acompte payé :</strong> {reservation.montant_acompte || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Photos :</strong>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
              {Array.isArray(reservation.photos) && reservation.photos.length > 0 ? (
                reservation.photos.map((b64, idx) => (
                  <img
                    key={idx}
                    src={`data:image/*;base64,${b64}`}
                    alt="photo"
                    style={{width:60, height:60, objectFit:'cover', borderRadius:8, border:'1px solid #eee'}}
                  />
                ))
              ) : (
                <span style={{color:'#888'}}>Aucune photo</span>
              )}
            </div>
          </div>
          {reservation.nb_personnes > 1 && (
            <div style={{marginBottom:10}}>
              <strong>Nb de participants :</strong> {reservation.nb_personnes}
            </div>
          )}
          {reservation.status === 'confirmed' && (
            <div style={{marginBottom:10}}>
              <strong>Date confirmation :</strong> {reservation.date_confirmation ? new Date(reservation.date_confirmation).toLocaleDateString('fr-FR') : ''}
            </div>
          )}
          {reservation.status === 'cancelled' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date annulation :</strong> {reservation.date_annulation ? new Date(reservation.date_annulation).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif annulation :</strong> {reservation.motif_annulation || 'Non renseigné'}
              </div>
            </>
          )}
          {reservation.status === 'refused' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date refus :</strong> {reservation.date_refus ? new Date(reservation.date_refus).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif refus :</strong> {reservation.motif_refus || 'Non renseigné'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pop-up pour afficher les infos de la commande
  function CommandeInfoModal({ commande, onClose, quantity }) {
    if (!commande) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.18)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          minWidth: 320,
          maxWidth: 500,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 12,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Détail de la commande</h2>
          <div style={{marginBottom:10}}>
            <strong>Date de la commande :</strong> {commande.date_commande ? new Date(commande.date_commande).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Nom du prestataire :</strong> {commande.prestataire_nom || commande.nom_prestataire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Annonce concernée :</strong> {commande.annonces?.titre || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Quantité commandée :</strong> {quantity || 0}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Montant :</strong> {commande.montant || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Frais de livraison :</strong> {commande.frais_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Votre commentaire :</strong> {commande.commentaire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Adresse de livraison :</strong> {commande.adresse_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Mode de livraison :</strong> {commande.mode_livraison || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Photos :</strong>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
              {Array.isArray(commande.photos) && commande.photos.length > 0 ? (
                commande.photos.map((b64, idx) => (
                  <img
                    key={idx}
                    src={`data:image/*;base64,${b64}`}
                    alt="photo"
                    style={{width:60, height:60, objectFit:'cover', borderRadius:8, border:'1px solid #eee'}}
                  />
                ))
              ) : (
                <span style={{color:'#888'}}>Aucune photo</span>
              )}
            </div>
          </div>
          {commande.status === 'confirmed' && (
            <div style={{marginBottom:10}}>
              <strong>Date confirmation :</strong> {commande.date_confirmation ? new Date(commande.date_confirmation).toLocaleDateString('fr-FR') : ''}
            </div>
          )}
          {commande.status === 'cancelled' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date annulation :</strong> {commande.date_annulation ? new Date(commande.date_annulation).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif annulation :</strong> {commande.motif_annulation || 'Non renseigné'}
              </div>
            </>
          )}
          {commande.status === 'refused' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date refus :</strong> {commande.date_refus ? new Date(commande.date_refus).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif refus :</strong> {commande.motif_refus || 'Non renseigné'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Bloc Commandes
  function CommandeCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        border: '1px solid #f1f1f1',
        position: 'relative'
      }}>
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:18}}>
              {r.annonces?.titre || 'Annonce'}
            </div>
            <div style={{color:'#888', fontSize:15, marginTop:2}}>
              Date de la commande : {r.date_commande ? new Date(r.date_commande).toLocaleDateString('fr-FR') : ''}
            </div>
            <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
              Mode de livraison : {r.mode_livraison || 'Non renseigné'}
            </div>
          </div>
          <div style={{marginLeft: 16}}>
            <StatusBadge status={r.status} />
          </div>
        </div>
        <div style={{marginTop:16, textAlign:'right'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedCommande(r)}
          >
            Afficher les détails
          </button>
        </div>
      </div>
    )
  }

  // Bloc Réservations
  function ReservationCard({ r }) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24,
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        border: '1px solid #f1f1f1'
      }}>
        <div>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, color: '#888'
          }}>
            {r.profiles?.nom ? r.profiles.nom.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'}
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontWeight:700, fontSize:18}}>{r.profiles?.nom || 'Nom inconnu'}</span>
            <StatusBadge status={r.status} />
          </div>
          <div style={{color:'#888', fontSize:15, marginTop:2}}>{r.profiles?.email}</div>
          <div style={{color:'#6bbf7b', fontSize:15, marginTop:6, fontWeight:600}}>
            {r.annonces?.titre ? `Annonce réservée : ${r.annonces.titre}` : ''}
          </div>
          <div style={{color:'#6bbf7b', fontSize:15, marginTop:2, fontWeight:600}}>
            {r.prestation ? `Prestation : ${prestations.find(p => p.id === r.prestation)?.nom || ''}` : ''}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:18, marginTop:10, flexWrap:'wrap'}}>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#bdbdbd"/></svg>
              {r.endroit || 'Lieu inconnu'}
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#bdbdbd"/></svg>
              {r.nb_personnes ? `${r.nb_personnes} ws` : '' }
            </span>
            <span style={{display:'flex', alignItems:'center', gap:4, color:'#666', fontSize:15}}>
              <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#bdbdbd"/></svg>
              {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}, {r.heure ? `${r.heure}:00` : ''}
            </span>
          </div>
        </div>
        <div style={{marginLeft: 'auto'}}>
          <button
            style={{
              background:'#eafaf1',
              color:'#222',
              border:'1px solid #b7e4c7',
              borderRadius:8,
              padding:'8px 18px',
              fontWeight:600,
              fontSize:15,
              cursor:'pointer'
            }}
            onClick={() => setSelectedReservation(r)}
          >
            Afficher les détails
          </button>
        </div>
        {r.status === 'pending' && (
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <button
              onClick={() => {
                setPendingCancelId(r.id)
                setShowConfirm(true)
              }}
              style={{
                background:'#fbe7ee', color:'#e67c73', border:'none', borderRadius:8,
                padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer'
              }}
            >Annuler</button>
          </div>
        )}
      </div>
    )
  }

  const ConfirmCancelModal = ({ onConfirm, onCancel }) => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.18)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
        padding: '32px 28px',
        minWidth: 320,
        maxWidth: 900,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>❗</div>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 10, color: '#e67c73' }}>
          Annuler la commande/réservation ?
        </h2>
        <p style={{ fontSize: 16, color: '#444', marginBottom: 22 }}>
          Êtes-vous sûr de vouloir annuler cette commande/réservation ?<br />
          Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              background: '#e67c73',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Oui, annuler
          </button>
          <button
            onClick={onCancel}
            style={{
              background: '#eee',
              color: '#222',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Non, garder
          </button>
        </div>
      </div>
    </div>
  )

  const handleUpdate = async (id, status) => {
    if (status === 'cancelled') {
      setShowConfirm(false)
      setPendingCancelId(null)
      const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
      if (error) {
        alert("Erreur lors de la mise à jour du statut.")
      } else {
        setReservations(reservations =>
          reservations.map(r =>
            r.id === id ? { ...r, status } : r
          )
        )
      }
      return
    }
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
    if (error) {
      alert("Erreur lors de la mise à jour du statut.")
    } else {
      setReservations(reservations =>
        reservations.map(r =>
          r.id === id ? { ...r, status } : r
        )
      )
    }
  }

  // Tri des listes par date décroissante (plus récent en haut)
  const devisSorted = [...devis].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const reservationsSorted = [...reservations].sort((a, b) => new Date(b.date) - new Date(a.date));
  const commandesSorted = [...commandes].sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));

  return (
    <>
      <Header />
      <div style={{background:'#f8fafc', minHeight:'100vh', padding:'40px 0'}}>
        <div style={{maxWidth:1100, margin:'0 auto'}}>
          {/* Bonjour + bouton rechercher */}
          <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 36,
          }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                Bonjour {profile?.nom ? profile.nom.split(" ")[0] : ""}
                <span> 👋</span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="px-4 py-2 font-semibold rounded-xl border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100 transition-colors"
                onClick={() => router.push("/particuliers/search")}
              >
                <Search className="inline-block mr-2 w-5 h-5" />
                Rechercher un prestataire
              </button>
            </div>
          </div>

          {/* Bloc Devis */}
          {devisSorted.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div className="bg-white shadow-sm rounded-xl p-5">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <h2 className="font-semibold text-lg">Mes devis</h2>
                  <button
                    style={{background:'none', border:'none', cursor:'pointer'}}
                    onClick={() => setShowDevis(v => !v)}
                  >
                    {showDevis ? <Minus size={22}/> : <Plus size={22}/>}
                  </button>
                </div>
                {showDevis && (
                  <div className="space-y-3">
                    {devisSorted.map((r) => (
                      <DevisCard key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </div>
              {/* Pop-up infos devis */}
              <DevisInfoModal devis={selectedDevis} onClose={() => setSelectedDevis(null)} />
            </section>
          )}

          {/* Bloc Réservations */}
          {reservationsSorted.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div className="bg-white shadow-sm rounded-xl p-5">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <h2 className="font-semibold text-lg">Mes réservations</h2>
                  <button
                    style={{background:'none', border:'none', cursor:'pointer'}}
                    onClick={() => setShowReservations(v => !v)}
                  >
                    {showReservations ? <Minus size={22}/> : <Plus size={22}/>}
                  </button>
                </div>
                {showReservations && (
                  <>
                    {/* Barre de recherche et filtres */}
                    <div style={{
                      display:'flex', gap:16, marginBottom:28, alignItems:'center', flexWrap:'wrap', position:'relative'
                    }}>
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{
                          padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:16, background:'#fff'
                        }}
                      >
                        <option value="all">Statut</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="cancelled">Annulé</option>
                        <option value="refused">Rejeté</option>
                        <option value="pending">En attente</option>
                      </select>
                      <select
                        value={prestationFilter}
                        onChange={e => setPrestationFilter(e.target.value)}
                        style={{
                          padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:16, background:'#fff'
                        }}
                      >
                        <option value="all">Prestation</option>
                        {prestations.map(p => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </select>
                      <div style={{position:'relative'}}>
                        <button
                          style={{
                            padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb',
                            fontSize:16, background:'#fff', cursor:'pointer'
                          }}
                          onClick={() => setShowCalendar(!showCalendar)}
                        >
                          Date
                        </button>
                        {showCalendar && (
                          <MiniCalendar onSelect={setDateFilter} />
                        )}
                      </div>
                    </div>
                    {/* Liste des réservations */}
                    {reservationsSorted.map(r => (
                      <ReservationCard key={r.id} r={r} />
                    ))}
                    <ReservationInfoModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
                    {showConfirm && (
                      <ConfirmCancelModal
                        onConfirm={() => handleUpdate(pendingCancelId, 'cancelled')}
                        onCancel={() => {
                          setShowConfirm(false)
                          setPendingCancelId(null)
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Bloc Commandes */}
          {commandesSorted.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div className="bg-white shadow-sm rounded-xl p-5">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <h2 className="font-semibold text-lg">Mes commandes</h2>
                  <button
                    style={{background:'none', border:'none', cursor:'pointer'}}
                    onClick={() => setShowCommandes(v => !v)}
                  >
                    {showCommandes ? <Minus size={22}/> : <Plus size={22}/>}
                  </button>
                </div>
                {showCommandes && (
                  <div className="space-y-3">
                    {commandesSorted.map((r) => (
                      <CommandeCard key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </div>
              <CommandeInfoModal
                commande={selectedCommande}
                onClose={() => setSelectedCommande(null)}
                quantity={selectedCommande ? commandeQuantities[selectedCommande.id] : 0}
              />
            </section>
          )}
        </div>
      </div>
    </>
  )
}
