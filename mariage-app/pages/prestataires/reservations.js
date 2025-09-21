import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'

export default function ReservationsPrestataire() {
  const [reservations, setReservations] = useState([])
  const [annonces, setAnnonces] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [annonceFilter, setAnnonceFilter] = useState('all')

  useEffect(() => {
    const fetchAnnonces = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('annonces')
        .select('id, titre')
        .eq('prestataire', user.id)
      if (!error) setAnnonces(data)
    }
    fetchAnnonces()
  }, [])

  useEffect(() => {
    const fetchReservations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('reservations')
        .select('*, profiles!reservations_particulier_id_fkey(nom, email), annonces!reservations_annonce_id_fkey(titre)')
        .eq('prestataire_id', user.id)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (annonceFilter !== 'all') {
        query = query.eq('annonce_id', annonceFilter)
      }

      const { data, error } = await query
      if (error) console.error(error)
      else setReservations(data)
    }
    fetchReservations()
  }, [statusFilter, annonceFilter])

  const handleUpdate = async (id, status) => {
    // Met à jour le statut de la réservation
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)

    // Récupère la réservation pour obtenir le particulier concerné
    const reservation = reservations.find(r => r.id === id);
    const particulierId = reservation?.particulier_id;
    let contenu = '';
    if (status === 'confirmed') contenu = 'Votre réservation a été confirmée.';
    else if (status === 'refused') contenu = 'Votre réservation a été refusée.';
    else if (status === 'cancelled') contenu = 'Votre réservation a été annulée.';

    // Crée une notification si action pertinente
    if (particulierId && contenu) {
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: particulierId,
            type: 'reservation',
            contenu,
            lu: false
          }
        ]);
    }

    if (error) alert(error.message)
    else {
      alert(`Réservation ${status} ✅`)
      setReservations(reservations.map(r => r.id === id ? { ...r, status } : r))
    }
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
        {r.status === 'pending' && (
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <button
              onClick={() => handleUpdate(r.id, 'confirmed')}
              style={{
                background:'#8ba987', color:'#fff', border:'none', borderRadius:8,
                padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer'
              }}
            >Confirmer</button>
            <button
              onClick={() => handleUpdate(r.id, 'refused')}
              style={{
                background:'#fbe7ee', color:'#e67c73', border:'none', borderRadius:8,
                padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer'
              }}
            >Décliner</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <PrestataireHeader />
      <div style={{background:'#f8fafc', minHeight:'100vh', padding:'40px 0'}}>
        <div style={{maxWidth:1100, margin:'0 auto', display:'flex', gap:32}}>
          <div style={{flex:2}}>
            <h1 style={{fontWeight:700, fontSize:32, marginBottom:28}}>Réservations</h1>
            {/* Barre de recherche et filtres */}
            <div style={{
              display:'flex', gap:16, marginBottom:28, alignItems:'center', flexWrap:'wrap'
            }}>
              <input
                type="text"
                placeholder="Rechercher"
                style={{
                  flex:1, padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb',
                  fontSize:16, background:'#fff'
                }}
              />
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
                value={annonceFilter}
                onChange={e => setAnnonceFilter(e.target.value)}
                style={{
                  padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:16, background:'#fff'
                }}
              >
                <option value="all">Annonces</option>
                {annonces.map(a => (
                  <option key={a.id} value={a.id}>{a.titre}</option>
                ))}
              </select>
              <select style={{
                padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:16, background:'#fff'
              }}>
                <option>Date</option>
              </select>
            </div>
            {/* Liste des réservations */}
            {reservations.map(r => (
              <ReservationCard key={r.id} r={r} />
            ))}
          </div>
          {/* Détail à droite */}
          <div style={{
            flex:1,
            background:'#fff',
            borderRadius:14,
            boxShadow:'0 1px 8px rgba(0,0,0,0.04)',
            padding:24,
            minWidth:320,
            maxWidth:350,
            height:'fit-content'
          }}>
            <h2 style={{fontWeight:700, fontSize:22, marginBottom:18}}>Réservation</h2>
            {/* Affiche le détail de la première réservation */}
            {reservations[0] && (
              <div>
                <div style={{
                  width:54, height:54, borderRadius:'50%',
                  background:'#f3f3f3', display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:22, color:'#888', marginBottom:10
                }}>
                  {reservations[0].profiles?.nom ? reservations[0].profiles.nom.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'}
                </div>
                <div style={{fontWeight:700, fontSize:17, marginBottom:2}}>
                  {reservations[0].profiles?.nom || 'Nom inconnu'}
                </div>
                <div style={{color:'#888', fontSize:15, marginBottom:8}}>
                  {reservations[0].profiles?.email}
                </div>
                <div style={{color:'#6bbf7b', fontSize:15, marginBottom:8, fontWeight:600}}>
                  {reservations[0].annonces?.titre ? `Annonce réservée : ${reservations[0].annonces.titre}` : ''}
                </div>
                <div style={{fontSize:15, marginBottom:8}}>
                  <span style={{display:'flex', alignItems:'center', gap:4}}>
                    <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#bdbdbd"/></svg>
                    {reservations[0].endroit || 'Lieu inconnu'}
                  </span>
                </div>
                <div style={{fontSize:15, marginBottom:8}}>
                  <span style={{display:'flex', alignItems:'center', gap:4}}>
                    <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#bdbdbd"/></svg>
                    {reservations[0].nb_personnes ? reservations[0].nb_personnes : '' }
                  </span>
                </div>
                <div style={{fontSize:15, marginBottom:8}}>
                  <span style={{display:'flex', alignItems:'center', gap:4}}>
                    <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#bdbdbd"/></svg>
                    {reservations[0].date ? new Date(reservations[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}, {reservations[0].heure ? `${reservations[0].heure}:00` : ''}
                  </span>
                </div>
                <div style={{fontSize:15, marginBottom:8}}>
                  <span style={{display:'flex', alignItems:'center', gap:4}}>
                    <svg width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="#bdbdbd" strokeWidth="2"/><path d="M8 4v4l3 2" stroke="#bdbdbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    4h
                  </span>
                </div>
                <div style={{fontSize:15, marginBottom:8}}>
                  Notes<br />
                  
                </div>
                <div style={{display:'flex', gap:10, marginTop:16}}>
                  <button
                    style={{
                      background:'#8ba987', color:'#fff', border:'none', borderRadius:8,
                      padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer'
                    }}
                  >Confirmer</button>
                  <button
                    style={{
                      background:'#fbe7ee', color:'#e67c73', border:'none', borderRadius:8,
                      padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer'
                    }}
                  >Décliner</button>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </>
  )
}
