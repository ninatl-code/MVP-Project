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
  const [livraisons, setLivraisons] = useState([]);
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

      // Récupérer les données de livraisons
      if (commandesData && commandesData.length > 0) {
        const commandeIds = commandesData.map(c => c.id);
        const { data: livraisonsData } = await supabase
          .from("livraisons")
          .select("*")
          .in("commande_id", commandeIds);
        setLivraisons(livraisonsData || []);
      }
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

  // Pop-up pour afficher les infos du devis - Version moderne
  function DevisInfoModal({ devis, onClose }) {
    if (!devis) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          minWidth: 600,
          maxWidth: 900,
          width: '100%',
          textAlign: 'left',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background 0.2s'
            }}
            onClick={onClose}
            aria-label="Fermer"
            onMouseOver={(e) => e.target.style.background = '#e5e5e5'}
            onMouseOut={(e) => e.target.style.background = '#f5f5f5'}
          >×</button>
          
          {/* En-tête */}
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '32px',
            borderRadius: '20px 20px 0 0',
            color: 'white'
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              📋 Informations du devis
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
              Devis créé le {devis.created_at ? new Date(devis.created_at).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
          </div>

          {/* Contenu */}
          <div style={{ padding: '32px' }}>
            {/* Informations principales en grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 32,
              marginBottom: 32
            }}>
              {/* Section Prestataire et Service */}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  👤 Prestataire & Service
                </h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 12 }}>
                  <strong>{devis.nom_prestataire || devis.prestataire_nom || devis.prestataire || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
                  Service : {devis.annonces?.titre || devis.titre || 'Non renseigné'}
                </div>
                
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>📍 Lieu :</strong> {devis.endroit || 'Non renseigné'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>📅 Date :</strong> {devis.date ? new Date(devis.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>👥 Participants :</strong> {devis.participants || devis.nb_personnes || 'Non renseigné'}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>⏱️ Durée :</strong> {devis.duree || 'Non renseigné'} {devis.unit_tarif || ''}
                </div>
              </div>

              {/* Section Réponse du prestataire */}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💼 Réponse du prestataire
                </h2>
                
                {(devis.status === 'answered' || devis.status === 'refused' || devis.status === 'accepted') && devis.date_reponse && (
                  <div style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>
                    <strong>Répondu le :</strong> {new Date(devis.date_reponse).toLocaleDateString('fr-FR')}
                  </div>
                )}
                
                {devis.comment_presta && (
                  <div style={{
                    background: '#e3f2fd',
                    border: '1px solid #bbdefb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: 14,
                    color: '#1565c0',
                    fontStyle: 'italic'
                  }}>
                    "{devis.comment_presta}"
                  </div>
                )}
                
                {/* Montants */}
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: 12,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#555' }}>Montant total :</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{devis.montant || 'Non renseigné'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: '#555' }}>Acompte demandé :</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#f39c12' }}>{devis.montant_acompte || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Commentaire client */}
            {devis.comment_client && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💬 Votre demande
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{devis.comment_client}"
                </p>
              </div>
            )}

            {/* Informations de statut */}
            {(devis.status === 'accepted' || devis.status === 'refused') && (
              <div style={{
                background: devis.status === 'accepted' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${devis.status === 'accepted' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: devis.status === 'answered' ? 24 : 0
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: devis.status === 'accepted' ? '#155724' : '#721c24' 
                }}>
                  {devis.status === 'accepted' ? '✅ Devis accepté' : '🚫 Devis refusé'}
                </h4>
                {devis.status === 'accepted' && devis.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Accepté le {new Date(devis.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {devis.status === 'refused' && (
                  <>
                    {devis.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusé le {new Date(devis.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {devis.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {devis.motif_refus}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
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
        background: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          padding: 0,
          width: '100%',
          maxWidth: 650,
          textAlign: 'left',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header avec couleur */}
          <div style={{
            background: 'linear-gradient(135deg, #6bbf7b 0%, #5aa169 100%)',
            padding: '24px 32px',
            borderRadius: '20px 20px 0 0',
            color: '#fff',
            position: 'relative'
          }}>
            <button
              style={{
                position: 'absolute',
                top: 16,
                right: 24,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={onClose}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              aria-label="Fermer"
            >×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, margin: 0 }}>🎉 Réservation</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>{reservation.annonces?.titre || 'Service'}</p>
          </div>

          {/* Contenu */}
          <div style={{ padding: '32px' }}>
            {/* Informations principales */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 24,
              marginBottom: 32
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  👤 Prestataire
                </h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>
                  <strong>{reservation.profiles?.nom || reservation.prestataire_nom || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>
                  {reservation.profiles?.email || 'Email non disponible'}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📅 Planning
                </h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Date :</strong> {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Durée :</strong> {reservation.duree || 'Non renseignée'} {reservation.unit_tarif || ''}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>Lieu :</strong> {reservation.endroit || 'Non renseigné'}
                </div>
              </div>
            </div>

            {/* Détails financiers */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                💰 Facturation
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Montant total :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{reservation.montant || 0} MAD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Acompte payé :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#6bbf7b' }}>{reservation.montant_acompte || 0} MAD</span>
              </div>
              {reservation.nb_personnes && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
                  <strong>Participants :</strong> {reservation.nb_personnes} personne{reservation.nb_personnes > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Commentaire */}
            {reservation.commentaire && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💬 Votre message
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{reservation.commentaire}"
                </p>
              </div>
            )}

            {/* Photos */}
            {Array.isArray(reservation.photos) && reservation.photos.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📸 Photos jointes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
                  {reservation.photos.map((b64, idx) => (
                    <img
                      key={idx}
                      src={`data:image/*;base64,${b64}`}
                      alt={`Photo ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
                        modal.innerHTML = `<img src="data:image/*;base64,${b64}" style="max-width:90%;max-height:90%;border-radius:8px">`;
                        modal.onclick = () => document.body.removeChild(modal);
                        document.body.appendChild(modal);
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Informations de statut */}
            {(reservation.status === 'confirmed' || reservation.status === 'cancelled' || reservation.status === 'refused') && (
              <div style={{
                background: reservation.status === 'confirmed' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${reservation.status === 'confirmed' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: reservation.status === 'confirmed' ? '#155724' : '#721c24' 
                }}>
                  {reservation.status === 'confirmed' ? '✅ Confirmée' : reservation.status === 'cancelled' ? '❌ Annulée' : '🚫 Refusée'}
                </h4>
                {reservation.status === 'confirmed' && reservation.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Confirmée le {new Date(reservation.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {reservation.status === 'cancelled' && (
                  <>
                    {reservation.date_annulation && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Annulée le {new Date(reservation.date_annulation).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {reservation.motif_annulation && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {reservation.motif_annulation}
                      </p>
                    )}
                  </>
                )}
                {reservation.status === 'refused' && (
                  <>
                    {reservation.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusée le {new Date(reservation.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {reservation.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {reservation.motif_refus}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
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

  // Pop-up pour afficher les infos de la commande - Version moderne
  function CommandeInfoModal({ commande, onClose, quantity }) {
    if (!commande) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          minWidth: 320,
          maxWidth: 700,
          width: '100%',
          textAlign: 'left',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <button
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background 0.2s'
            }}
            onClick={onClose}
            aria-label="Fermer"
            onMouseOver={(e) => e.target.style.background = '#e5e5e5'}
            onMouseOut={(e) => e.target.style.background = '#f5f5f5'}
          >×</button>
          
          {/* En-tête */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px',
            borderRadius: '20px 20px 0 0',
            color: 'white'
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              🛒 Détail de la commande
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
              Commande du {commande.date_commande ? new Date(commande.date_commande).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
          </div>

          {/* Contenu */}
          <div style={{ padding: '32px' }}>
            {/* Informations principales */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 24,
              marginBottom: 32
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  👤 Prestataire
                </h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>
                  <strong>{commande.profiles?.nom || commande.prestataire_nom || 'Non renseigné'}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>
                  Service : {commande.annonces?.titre || 'Non renseigné'}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📦 Commande
                </h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                  <strong>Quantité :</strong> {quantity || 0} article{quantity > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  <strong>Mode :</strong> {commande.mode_livraison || 'Non renseigné'}
                </div>
              </div>
            </div>

            {/* Détails financiers */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                💰 Facturation
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Montant articles :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{commande.montant || 0} MAD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Frais de livraison :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#f39c12' }}>{commande.frais_livraison || 0} MAD</span>
              </div>
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>Total :</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#6bbf7b' }}>
                  {((commande.montant || 0) + (commande.frais_livraison || 0))} MAD
                </span>
              </div>
            </div>

            {/* Adresse de livraison */}
            <div style={{
              background: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1565c0', display: 'flex', alignItems: 'center', gap: 8 }}>
                🏠 Adresse de livraison
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#1565c0' }}>
                {commande.adresse_livraison || 'Non renseignée'}
              </p>
            </div>

            {/* Commentaire */}
            {commande.commentaire && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💬 Votre message
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{commande.commentaire}"
                </p>
              </div>
            )}

            {/* Photos */}
            {Array.isArray(commande.photos) && commande.photos.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📸 Photos jointes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
                  {commande.photos.map((b64, idx) => (
                    <img
                      key={idx}
                      src={`data:image/*;base64,${b64}`}
                      alt={`Photo ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
                        modal.innerHTML = `<img src="data:image/*;base64,${b64}" style="max-width:90%;max-height:90%;border-radius:8px">`;
                        modal.onclick = () => document.body.removeChild(modal);
                        document.body.appendChild(modal);
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Informations de statut */}
            {(commande.status === 'confirmed' || commande.status === 'cancelled' || commande.status === 'refused') && (
              <div style={{
                background: commande.status === 'confirmed' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${commande.status === 'confirmed' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  marginBottom: 8, 
                  color: commande.status === 'confirmed' ? '#155724' : '#721c24' 
                }}>
                  {commande.status === 'confirmed' ? '✅ Confirmée' : commande.status === 'cancelled' ? '❌ Annulée' : '🚫 Refusée'}
                </h4>
                {commande.status === 'confirmed' && commande.date_confirmation && (
                  <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>
                    Confirmée le {new Date(commande.date_confirmation).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {commande.status === 'cancelled' && (
                  <>
                    {commande.date_annulation && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Annulée le {new Date(commande.date_annulation).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {commande.motif_annulation && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {commande.motif_annulation}
                      </p>
                    )}
                  </>
                )}
                {commande.status === 'refused' && (
                  <>
                    {commande.date_refus && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#721c24' }}>
                        Refusée le {new Date(commande.date_refus).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {commande.motif_refus && (
                      <p style={{ margin: 0, fontSize: 14, color: '#721c24', fontStyle: 'italic' }}>
                        Motif : {commande.motif_refus}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Bloc Commandes
  function CommandeCard({ r }) {
    const livraison = livraisons.find(l => l.commande_id === r.id);
    
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
        
        {/* Affichage du suivi de livraison pour les commandes payées */}
        <LivraisonTracker commande={r} livraison={livraison} />
        
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

  // Composant de suivi de livraison
  function LivraisonTracker({ commande, livraison }) {
  if (!commande ) return null;

  const getStatutLivraison = () => {
    if (!livraison) return 'paid'; // Par défaut si pas de livraison trouvée
    return livraison.status || 'paid';
  };

  const statutActuel = getStatutLivraison();

  const etapes = [
    { id: 'paid', label: 'Commandé', completed: ['paid','confirmed', 'shipped', 'delivered'].includes(statutActuel) },
    { id: 'confirmed', label: 'Confirmé', completed: ['confirmed', 'shipped', 'delivered'].includes(statutActuel) },
    { id: 'shipped', label: 'Expédié', completed: ['shipped', 'delivered'].includes(statutActuel) },
    { id: 'delivered', label: 'Livré', completed: ['delivered'].includes(statutActuel) }
  ];

  // Cas spécial pour annulation
  if (statutActuel === 'cancelled') {
    return (
      <div style={{ marginTop: 12, padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✕</span>
          </div>
          <span style={{ fontWeight: 600, color: '#dc2626' }}>Annulée</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 16, backgroundColor: '#f8fffe', borderRadius: 8, border: '1px solid #d1fae5' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        {/* Section suivi principal */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#065f46' }}>Suivi de livraison</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {etapes.map((etape, index) => (
              <div key={etape.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    backgroundColor: etape.completed ? '#10b981' : '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4
                  }}>
                    {etape.completed && (
                      <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 500,
                    color: etape.completed ? '#065f46' : '#6b7280'
                  }}>{etape.label}</span>
                  {etape.id === 'delivered' && livraison?.delivery_date && (
                    <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' }}>
                      Livraison prévue le {new Date(livraison.delivery_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                {index < etapes.length - 1 && (
                  <div style={{
                    height: 2, flex: 1, backgroundColor: etapes[index + 1].completed ? '#10b981' : '#e5e7eb',
                    marginLeft: 8, marginRight: 8, marginTop: -20
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section informations de suivi (à droite) */}
        {(livraison?.tracking_number || livraison?.delivery_provider) && (
          <div style={{ 
            minWidth: 200, 
            paddingLeft: 16, 
            borderLeft: '1px solid #d1fae5',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {livraison?.delivery_provider && (
              <div style={{ fontSize: 12, color: '#065f46' }}>
                <span style={{ fontWeight: 600 }}>Transporteur :</span>
                <br />
                <span>{livraison.delivery_provider}</span>
              </div>
            )}
            {livraison?.tracking_number && (
              <div style={{ fontSize: 12, color: '#065f46' }}>
                <span style={{ fontWeight: 600 }}>N° de suivi :</span>
                <br />
                <span style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#f0fdf4', 
                  padding: '2px 6px', 
                  borderRadius: 4,
                  fontSize: 11
                }}>{livraison.tracking_number}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  }
}
