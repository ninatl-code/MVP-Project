import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import PrestataireHeader from '../../components/HeaderPresta'


// Modale de confirmation moderne adaptée
function ConfirmationModal({ open, title, message }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top:0, left:0, width:'100vw', height:'100vh',
      background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
    }}>
      <div style={{
        background:'#fff', borderRadius:12, padding:40, minWidth:400, boxShadow:'0 2px 16px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{marginBottom:16}}>{title}</h2>
        <div style={{marginBottom:32}}>{message}</div>
      </div>
    </div>
  )
}

function roundToHour(date){
  const d = new Date(date)
  d.setMinutes(0,0,0)
  d.setSeconds(0,0)
  d.setMilliseconds(0)
  return d
}

// Ajout d'une modale pour la réservation manuelle avec annonces et paiement
function ReservationModal({ open, slots, onConfirm, onCancel, annonces }) {
  const [clientNom, setClientNom] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [annonceId, setAnnonceId] = useState('');
  const [montant, setMontant] = useState('');
  const [montantAcompte, setMontantAcompte] = useState('0');
  const [endroit, setEndroit] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAnnonceId('');
    setError('');
    setMontant('');
    setMontantAcompte('0');
    setClientNom('');
    setClientEmail('');
    setDescription('');
    setEndroit('')
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top:0, left:0, width:'100vw', height:'100vh',
      background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
    }}>
      <div style={{
        background:'#fff', borderRadius:12, padding:32, minWidth:380, boxShadow:'0 2px 16px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{marginBottom:16}}>Réserver pour un client externe</h2>
        <div style={{marginBottom:12}}>
          <label>Annonce <span style={{color:'#d00'}}>*</span> :</label>
          <select
            value={annonceId}
            onChange={e => setAnnonceId(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, borderRadius:6, border:'1px solid #ccc'}}
            required
          >
            <option value="">Sélectionnez une annonce</option>
            {annonces.map(a => (
              <option key={a.id} value={a.id}>{a.titre}</option>
            ))}
          </select>
        </div>
        <div style={{marginBottom:12}}>
          <label>Nom du client :</label>
          <input
            type="text"
            value={clientNom}
            onChange={e => setClientNom(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, marginBottom:8, borderRadius:6, border:'1px solid #ccc'}}
          />
        </div>
        <div style={{marginBottom:12}}>
          <label>Email du client :</label>
          <input
            type="email"
            value={clientEmail}
            onChange={e => setClientEmail(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, marginBottom:8, borderRadius:6, border:'1px solid #ccc'}}
            placeholder="Optionnel"
          />
        </div>
        <div style={{marginBottom:12}}>
          <label>Endroit de la céremonie :</label>
          <input
            type="text"
            value={endroit}
            onChange={e => setEndroit(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, borderRadius:6, border:'1px solid #ccc'}}
            placeholder="Optionnel"
          />
        </div>
        <div style={{marginBottom:12}}>
          <label>Commentaire :</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, borderRadius:6, border:'1px solid #ccc'}}
            placeholder="Optionnel"
          />
        </div>
        <div style={{marginBottom:12}}>
          <label>Montant total (€) :</label>
          <input
            type="number"
            min="0"
            value={montant}
            onChange={e => setMontant(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, borderRadius:6, border:'1px solid #ccc'}}
            placeholder="Optionnel"
          />
        </div>
        <div style={{marginBottom:12}}>
          <label>Acompte versé (€) :</label>
          <input
            type="number"
            min="0"
            value={montantAcompte}
            onChange={e => setMontantAcompte(e.target.value)}
            style={{width:'100%', padding:8, marginTop:4, borderRadius:6, border:'1px solid #ccc'}}
            placeholder="0"
          />
        </div>
        <div style={{marginBottom:18}}>
          <b>Créneaux sélectionnés :</b>
          <ul style={{marginTop:8, marginBottom:0, paddingLeft:18}}>
            {slots.map(slot =>
              <li key={slot}>{new Date(slot).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</li>
            )}
          </ul>
        </div>
        {error && <div style={{color:'#d00', marginBottom:12}}>{error}</div>}
        <button
          style={{marginRight:12, padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
          onClick={() => {
            if (!annonceId) {
              setError("Veuillez sélectionner une annonce.");
              return;
            }
            setError('');
            onConfirm({
              clientNom,
              clientEmail,
              description,
              annonceId,
              montant,
              montantAcompte,
              endroit
            });
          }}
        >Réserver</button>
        <button style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}

// Supprime l'utilisation de window.setModal et passe setModal directement
function showModal(setModal, title, message, onConfirm) {
  setModal({
    open: true,
    title,
    message: (
      <div>
        <div style={{marginBottom:24}}>{message}</div>
        <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
          <button
            style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
          >Confirmer</button>
          <button
            style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}}
            onClick={() => setModal({open:false})}
          >Annuler</button>
        </div>
      </div>
    )
  });
}

function closeModal(setModal) {
  setModal({open:false});
}

export default function PrestataireCalendar(){
  const [events, setEvents] = useState([])
  const [currentView, setCurrentView] = useState('timeGridWeek')
  const [modal, setModal] = useState({ open:false, title:'', message:'', onCancel:null });
  const [blockedByDay, setBlockedByDay] = useState({})
  const [reservationModal, setReservationModal] = useState({ open:false, slots:[] })
  const [calendarRef, setCalendarRef] = useState(null)
  const [selectedMiniDate, setSelectedMiniDate] = useState(null)
  const [annonces, setAnnonces] = useState([])
  const [annualView, setAnnualView] = useState(false);

  useEffect(() => {
    async function fetchAnnonces() {
      // Récupère l'utilisateur connecté correctement
      const { data: userData, error: userError } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setAnnonces([])
        return
      }
      // Correction : utilise le nom exact de la colonne "prestataire"
      const { data, error } = await supabase
        .from('annonces')
        .select('id, titre')
        .eq('actif', true)
        .eq('prestataire', userId)

      if (error) {
        setAnnonces([])
        return
      }
      setAnnonces(data || [])
    }
    fetchAnnonces()
  }, [])

  // Mini calendrier avec dates cliquables et highlight jaune clair
  function Sidebar() {
    const [miniDate, setMiniDate] = useState(new Date());

    // Génère les événements pour la mini vue mois (uniquement couleur de fond)
    const miniMonthEvents = Object.entries(blockedByDay).map(([dayIso, slots]) => {
      const hasBooked = slots.some(s => s.type === 'reservation' && s.title === 'Réservé')
      if (hasBooked) {
        return {
          id: `booked-${dayIso}`,
          start: dayIso,
          allDay: true,
          display: 'background',
          backgroundColor: '#6bbf7b'
        }
      }
      const hasBlocked = slots.some(s => s.type === 'blocked')
      if (hasBlocked) {
        return {
          id: `blocked-${dayIso}`,
          start: dayIso,
          allDay: true,
          display: 'background',
          backgroundColor: '#ECECEC'
        }
      }
      const hasPending = slots.some(s => s.type === 'pending')
      if (hasPending) {
        return {
          id: `pending-${dayIso}`,
          start: dayIso,
          allDay: true,
          display: 'background',
          backgroundColor: '#ffd166'
        }
      }
      return null
    }).filter(Boolean)

    // Navigation
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    const currentMonth = miniDate.getMonth()
    const currentYear = miniDate.getFullYear()

    const goPrevMonth = () => {
      const d = new Date(miniDate)
      d.setMonth(d.getMonth() - 1)
      setMiniDate(new Date(d))
    }
    const goNextMonth = () => {
      const d = new Date(miniDate)
      d.setMonth(d.getMonth() + 1)
      setMiniDate(new Date(d))
    }

    // Affiche uniquement la première lettre du jour
    function renderDayHeader(arg) {
      return (
        <span style={{fontWeight:600, fontSize:16}}>
          {arg.text.charAt(0)}
        </span>
      )
    }

    // Ajoute la gestion du clic sur une date
    function handleMiniDateClick(arg) {
      setSelectedMiniDate(arg.dateStr)
      if (calendarRef && calendarRef.getApi) {
        calendarRef.getApi().gotoDate(arg.date);
        calendarRef.getApi().changeView('timeGridWeek');
      }
    }

    // Personnalise le rendu des jours pour highlight la sélection
    function renderDayCell(arg) {
      const isSelected = selectedMiniDate === arg.date.toISOString().slice(0,10)
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: isSelected ? '#fffbe8' : '',
            borderRadius: isSelected ? 8 : 0,
            cursor: 'pointer'
          }}
          onClick={() => handleMiniDateClick(arg)}
        >
          {arg.dayNumberText}
        </div>
      )
    }

    return (
      <div style={{
        width: 280,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}>
        <div>
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            marginBottom:12
          }}>
            <button
              onClick={goPrevMonth}
              style={{
                background:'none',
                border:'none',
                fontSize:22,
                cursor:'pointer',
                marginRight:10,
                color:'#1976d2',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                width:32,
                height:32,
                borderRadius:'50%',
                transition:'background 0.2s'
              }}
              aria-label="Mois précédent"
              onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 16L7 10L13 4" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{fontWeight:700, fontSize:18, minWidth:120, textAlign:'center'}}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goNextMonth}
              style={{
                background:'none',
                border:'none',
                fontSize:22,
                cursor:'pointer',
                marginLeft:10,
                color:'#1976d2',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                width:32,
                height:32,
                borderRadius:'50%',
                transition:'background 0.2s'
              }}
              aria-label="Mois suivant"
              onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4L13 10L7 16" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{marginTop:0}}>
            <FullCalendar
              key={miniDate.getFullYear() + '-' + miniDate.getMonth()}
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              events={miniMonthEvents}
              eventContent={() => null}
              dayHeaderContent={renderDayHeader}
              dayCellContent={renderDayCell}
              height={370}
              locale="fr"
              initialDate={miniDate}
            />
          </div>
        </div>
      </div>
    )
  }

  // Récupération et affichage des événements
  const fetchData = async () => {
    const { data:{ user } } = await supabase.auth.getUser()

    let { data: reservations } = await supabase
      .from('reservations')
      .select('*')
      .eq('prestataire_id', user.id)
      .order('date',{ascending:true})

    let { data: blocked } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('prestataire_id', user.id)

    reservations = reservations || []
    blocked = blocked || []

    // Filtre les réservations annulées ou refusées pour les rendre libres
    const activeReservations = reservations.filter(r =>
      r.status !== 'cancelled' && r.status !== 'refused'
    )

    const blockedByDayObj = {}
    blocked.forEach(b => {
      const day = new Date(b.date)
      day.setHours(0,0,0,0)
      const key = day.getFullYear() + '-' +
        String(day.getMonth()+1).padStart(2,'0') + '-' +
        String(day.getDate()).padStart(2,'0')
      blockedByDayObj[key] = blockedByDayObj[key] || []
      blockedByDayObj[key].push({ ...b, type: 'blocked' })
    })
    activeReservations.forEach(r => {
      const day = new Date(r.date)
      day.setHours(0,0,0,0)
      const key = day.getFullYear() + '-' +
        String(day.getMonth()+1).padStart(2,'0') + '-' +
        String(day.getDate()).padStart(2,'0')
      blockedByDayObj[key] = blockedByDayObj[key] || []
      blockedByDayObj[key].push({ ...r, type: 'reservation', title: r.status==='confirmed'?'Réservé':'En attente' })
    })

    setBlockedByDay(blockedByDayObj)

    // Vue mois
    const monthEvents = Object.entries(blockedByDayObj).map(([dayIso, slots]) => {
      const reservedCount = slots.filter(s => s.type === 'reservation' && s.title === 'Réservé').length
      const pendingCount = slots.filter(s => s.type === 'reservation' && s.title === 'En attente').length
      const blockedCount = slots.filter(s => s.type === 'blocked').length

      // On ne met pas de title, on utilisera eventContent pour afficher les cercles
      if (reservedCount === 0 && pendingCount === 0 && blockedCount === 0) return null

      return {
        id: `month-${dayIso}`,
        reservedCount,
        pendingCount,
        blockedCount,
        start: dayIso,
        allDay: true,
        color: '#fafafa', // fond blanc pour le jour
        textColor: '#222',
        type: 'month_summary'
      }
    }).filter(Boolean)

    // Vue semaine/jour
    const timeEvents = [
      ...((activeReservations||[]).map(r=>({
        id: r.id,
        title: r.status==='confirmed'?'Réservé':'En attente',
        start: roundToHour(r.date),
        color: r.status==='confirmed'?'#6bbf7b':'#ffd166',
        type:'reservation',
        allDay: false
      }))),
      ...((blocked||[]).map(b=>({
        id: b.id,
        title:'Bloqué',
        start: roundToHour(b.date),
        color:'#ECECEC',
        type:'blocked',
        allDay: false
      })))
    ]

    if(currentView === 'dayGridMonth'){
      setEvents(monthEvents)
    } else {
      setEvents(timeEvents)
    }
  }

  useEffect(()=>{ fetchData() },[currentView])

  // Sélection multiple pour bloquer ou réserver/créer réservation manuelle
  const handleSelect = async (selectionInfo) => {
    const { data:{ user } } = await supabase.auth.getUser()
    let slots = []

    if (selectionInfo.allDay) {
      const day = new Date(selectionInfo.start)
      for (let h = 0; h < 24; h++) {
        const slot = new Date(day)
        slot.setHours(h, 0, 0, 0)
        slots.push(slot.toISOString())
      }
    } else {
      const start = roundToHour(selectionInfo.start)
      const end = roundToHour(selectionInfo.end)
      let current = new Date(start)
      while(current < end){
        slots.push(current.toISOString())
        current.setHours(current.getHours()+1)
      }
    }

    // Vérifie les créneaux sélectionnés
    const selectedEvents = events.filter(e =>
      slots.includes(roundToHour(new Date(e.start)).toISOString())
    )

    const allReserved = selectedEvents.length > 0 && selectedEvents.every(e => e.type === 'reservation')
    const allBlocked = selectedEvents.length > 0 && selectedEvents.every(e => e.type === 'blocked')
    const allReservedOrBlocked = selectedEvents.length > 0 && selectedEvents.every(e => e.type === 'reservation' || e.type === 'blocked')

    // Si tous les créneaux sont réservés ou bloqués, proposer la libération
    if (allReservedOrBlocked) {
      setModal({
        open: true,
        title: "Libérer les créneaux",
        message: (
          <div>
            <div style={{marginBottom:12}}>Voulez-vous libérer ces créneaux ?</div>
            <div style={{marginBottom:12}}>Commentaire :</div>
            <textarea
              id="liberation-comment"
              style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #ccc', marginBottom:18}}
            />
            <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', fontWeight:600}}
                onClick={async () => {
                  const motif = document.getElementById('liberation-comment').value;
                  const now = new Date().toISOString();
                  // Libère les réservations
                  for (const e of selectedEvents) {
                    if (e.type === 'reservation') {
                      await supabase
                        .from('reservations')
                        .update({
                          status: 'cancelled',
                          motif_annulation: motif,
                          date_annulation: now
                        })
                        .eq('id', e.id)
                    }
                    if (e.type === 'blocked') {
                      await supabase
                        .from('blocked_slots')
                        .delete()
                        .eq('id', e.id)
                    }
                  }
                  fetchData();
                  setModal({open:false});
                }}
              >Confirmer</button>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#eee'}}
                onClick={() => setModal({open:false})}
              >Retour</button>
            </div>
          </div>
        )
      });
      return;
    }

    // Vérifie si la sélection contient des créneaux bloqués ou réservés (empêche la réservation/bloquage si déjà pris)
    const blockedSlots = events.filter(e =>
      (e.type === 'blocked' || e.type === 'reservation') &&
      slots.includes(roundToHour(new Date(e.start)).toISOString())
    )

    if(blockedSlots.length > 0 && selectedEvents.length === 0){
      alert("Certains créneaux sont déjà bloqués ou réservés.");
      return;
    }

    // Propose le choix : bloquer ou réserver
    setModal({
      open: true,
      title: "Que souhaitez-vous faire ?",
      message: (
        <div style={{display:'flex', flexDirection:'column', gap:24}}>
          <div>Vous avez sélectionné {slots.length} créneau(x).</div>
          <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', fontWeight:600}}
              onClick={() => {
                setModal({open:false});
                setReservationModal({ open:true, slots });
              }}
            >Réserver pour un client</button>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#ECECEC', fontWeight:600}}
              onClick={async () => {
                setModal({open:false});
                // Bloquer les créneaux
                const insertData = slots.map(slotIso => ({
                  prestataire_id: user.id,
                  date: slotIso
                }))
                const { error } = await supabase
                  .from('blocked_slots')
                  .insert(insertData)
                if(error) alert(error.message)
                else fetchData()
              }}
            >Bloquer le créneau</button>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#eee'}}
              onClick={() => setModal({open:false})}
            >Annuler</button>
          </div>
        </div>
      )
    });
  }

  // Ajoute la gestion de la réservation manuelle enrichie
  const handleReservationConfirm = async ({
    clientNom,
    clientEmail,
    description,
    annonceId,
    montant,
    montantAcompte,
    endroit
  }) => {
    const { data:{ user } } = await supabase.auth.getUser()
    const slots = reservationModal.slots
    const acomptePaye = Number(montantAcompte) > 0 ? true : false
    // Ajoute une réservation pour chaque créneau
    const insertData = slots.map(slotIso => ({
      prestataire_id: user.id,
      client_nom: clientNom,
      client_email: clientEmail,
      commentaire: description,
      annonce_id: annonceId,
      montant: montant ? Number(montant) : null,
      montant_acompte: montantAcompte ? Number(montantAcompte) : 0,
      acompte_paye: acomptePaye,
      date: slotIso,
      endroit: endroit,
      status: 'confirmed'
    }))
    const { error } = await supabase
      .from('reservations')
      .insert(insertData)
    if(error) alert(error.message)
    else fetchData()
    setReservationModal({ open:false, slots:[] })
  }

  // Clic sur un événement
  const handleEventClick = async (info) => {
    const clickedDate = roundToHour(new Date(info.event.start)).toISOString()
    const event = events.find(e => {
      const eventDate = roundToHour(new Date(e.start)).toISOString()
      return eventDate === clickedDate
    })

    if(!event) return

    // Annulation d'une réservation confirmée
    if(event.type==='reservation' && event.title==='Réservé'){
      let motif = ''
      setModal({
        open: true,
        title: "Annuler la réservation",
        message: (
          <div>
            <div style={{marginBottom:12}}>Veuillez indiquer le motif d'annulation :</div>
            <textarea
              style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #ccc', marginBottom:18}}
              onChange={e => motif = e.target.value}
            />
            <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
                onClick={async () => {
                  const now = new Date().toISOString()
                  const { error } = await supabase
                    .from('reservations')
                    .update({
                      status:'cancelled',
                      motif_annulation: motif,
                      date_annulation: now
                    })
                    .eq('id', event.id)
                  if(error) alert(error.message)
                  else fetchData()
                  setModal({open:false})
                }}
              >Confirmer</button>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}}
                onClick={() => setModal({open:false})}
              >Retour</button>
            </div>
          </div>
        )
      })
      return
    }

    // Confirmation ou rejet d'une réservation en attente
    if(event.type==='reservation' && event.title==='En attente'){
      let commentaire = ''
      setModal({
        open: true,
        title: "Gérer la réservation",
        message: (
          <div>
            <div style={{marginBottom:12}}>Commentaire au client :</div>
            <textarea
              style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #ccc', marginBottom:18}}
              onChange={e => commentaire = e.target.value}
            />
            <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
                onClick={async () => {
                  const now = new Date().toISOString()
                  const { error } = await supabase
                    .from('reservations')
                    .update({
                      status:'confirmed',
                      commentaire: commentaire,
                      date_confirmation: now
                    })
                    .eq('id', event.id)
                  if(error) alert(error.message)
                  else fetchData()
                  setModal({open:false})
                }}
              >Accepter la réservation</button>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#ffd166', color:'#222', border:'none', fontWeight:600}}
                onClick={async () => {
                  const now = new Date().toISOString()
                  const { error } = await supabase
                    .from('reservations')
                    .update({
                      status:'refused',
                      motif_refus: commentaire,
                      date_refus: now
                    })
                    .eq('id', event.id)
                  if(error) alert(error.message)
                  else fetchData()
                  setModal({open:false})
                }}
              >Rejeter la réservation</button>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}}
                onClick={() => setModal({open:false})}
              >Retour</button>
            </div>
          </div>
        )
      })
      return
    }

    // Débloquer un créneau bloqué
    if(event.type === 'blocked'){
      setModal({
        open: true,
        title: "Débloquer le créneau",
        message: (
          <div>
            <div style={{marginBottom:18}}>Voulez-vous débloquer ce créneau ?</div>
            <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
                onClick={async () => {
                  const { error } = await supabase
                    .from('blocked_slots')
                    .delete()
                    .eq('id', event.id)
                  if(error) alert(error.message)
                  else fetchData()
                  setModal({open:false})
                }}
              >Débloquer</button>
              <button
                style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}}
                onClick={() => setModal({open:false})}
              >Retour</button>
            </div>
          </div>
        )
      })
      return
    }
  }

  // Personnalisation de l'affichage des événements façon Airbnb + couleurs homogènes
  function renderEventContent(eventInfo) {
    // Vue mensuelle : affiche les cercles
    if (eventInfo.event.extendedProps.type === 'month_summary') {
      const { reservedCount = 0, pendingCount = 0, blockedCount = 0 } = eventInfo.event.extendedProps

      // Cercles : vert, orange, gris
      const circles = []
      if (reservedCount > 0) {
        circles.push(
          <span key="reserved" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#6bbf7b',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            marginRight: 4
          }}>{reservedCount}</span>
        )
      }
      if (pendingCount > 0) {
        circles.push(
          <span key="pending" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#ffd166',
            color: '#222',
            fontWeight: 700,
            fontSize: 13,
            marginRight: 4
          }}>{pendingCount}</span>
        )
      }
      if (blockedCount > 0) {
        circles.push(
          <span key="blocked" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#CBCBCB',
            color: '#222',
            fontWeight: 700,
            fontSize: 13
          }}>{blockedCount}</span>
        )
      }

      return (
        <div style={{display:'flex', alignItems:'center', marginTop:2}}>
          {circles}
        </div>
      )
    }

    // Vue semaine/jour
    let bg = '#ECECEC', color = '#333', label = eventInfo.event.title
    if(label === 'Réservé') { bg = '#6bbf7b'; color = '#fff'; }
    if(label === 'En attente') { bg = '#ffd166'; color = '#222'; }
    if(label === 'Bloqué') { bg = '#ECECEC'; color = '#222'; }
    return (
      <div title={label}>
        <span style={{
          borderRadius: '8px',
          padding: '2px 8px',
          background: bg,
          color: color,
          fontWeight: 100,
          fontSize: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          {label}
        </span>
      </div>
    )
  }

  // Ajoute la fonction handleDateClick pour le blocage ou réservation par clic simple
  const handleDateClick = async (info) => {
    const { data:{ user } } = await supabase.auth.getUser()
    const roundedDate = roundToHour(info.date).toISOString()

    // Vérifie si le créneau est déjà bloqué ou réservé
    const conflict = events.find(e => {
      const eventDate = roundToHour(new Date(e.start)).toISOString()
      return eventDate === roundedDate
    })
    if(conflict){
      alert("Ce créneau est déjà réservé ou bloqué !");
      return;
    }

    // Propose le choix : bloquer ou réserver pour un client
    setModal({
      open: true,
      title: "Que souhaitez-vous faire ?",
      message: (
        <div style={{display:'flex', flexDirection:'column', gap:24}}>
          <div>Vous avez sélectionné le créneau de {new Date(roundedDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}.</div>
          <div style={{display:'flex', gap:16, justifyContent:'flex-end'}}>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#6bbf7b', color:'#fff', border:'none', fontWeight:600}}
              onClick={() => {
                setModal({open:false});
                setReservationModal({ open:true, slots: [roundedDate] });
              }}
            >Réserver pour un client</button>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#ECECEC', border:'none', fontWeight:600}}
              onClick={async () => {
                setModal({open:false});
                // Bloquer le créneau
                const { error } = await supabase
                  .from('blocked_slots')
                  .insert([{ prestataire_id:user.id, date:roundedDate }])
                if(error) alert(error.message)
                else fetchData()
              }}
            >Bloquer le créneau</button>
            <button
              style={{padding:'8px 24px', borderRadius:8, background:'#eee', border:'none'}}
              onClick={() => setModal({open:false})}
            >Annuler</button>
          </div>
        </div>
      )
    });
  }

  // Ajoute une vue annuelle personnalisée
  function AnnualView({ reservations }) {
    // Génère la structure : chaque mois, nombre de réservations confirmées
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const now = new Date();
    const year = now.getFullYear();

    // Compte les réservations confirmées par mois
    const reservationsByMonth = Array(12).fill(0);
    reservations.forEach(r => {
      if (r.status === 'confirmed') {
        const d = new Date(r.date);
        if (d.getFullYear() === year) {
          reservationsByMonth[d.getMonth()] += 1;
        }
      }
    });

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24,
        margin: '32px 0'
      }}>
        {months.map((month, idx) => (
          <div key={month} style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 120
          }}>
            <div style={{fontWeight:700, fontSize:18, marginBottom:12}}>{month}</div>
            <div style={{
              background: '#6bbf7b',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 24px',
              fontWeight: 700,
              fontSize: 22,
              minWidth: 60,
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}>
              {reservationsByMonth[idx]}
            </div>
            <div style={{marginTop:8, fontSize:14, color:'#555'}}>Réservations acceptées</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PrestataireHeader />
      <div style={{
        display: 'flex',
        gap: 32,
        background: '#fafafa',
        borderRadius: 20,
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
        padding: 32,
        margin: 50
      }}>
        <div style={{flex: 1}}>
          <h1 style={{fontWeight:'bold', fontSize:24, marginBottom:20}}>Calendrier du prestataire</h1>
          <div style={{marginBottom:24}}>
            <button
              style={{
                padding:'8px 24px',
                borderRadius:8,
                background: annualView ? '#6bbf7b' : '#ECECEC',
                color: annualView ? '#fff' : '#222',
                fontWeight:600,
                border:'none',
                marginRight:12
              }}
              onClick={() => setAnnualView(!annualView)}
            >
              {annualView ? "Vue classique" : "Vue annuelle"}
            </button>
          </div>
          {annualView ? (
            <AnnualView reservations={events.filter(e => e.type === 'reservation' && e.title === 'Réservé').map(e => ({
              date: e.start,
              status: 'confirmed'
            }))} />
          ) : (
            <FullCalendar
              ref={ref => setCalendarRef(ref)}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              slotDuration="01:00:00"
              allDaySlot={false}
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              selectable={true}
              select={handleSelect}
              eventContent={renderEventContent}
              height="auto"
              locale="fr"
              buttonText={{
                today: "Aujourd'hui",
                week: "Semaine",
                day: "Jour",
                month: "Mois"
              }}
              views={{
                dayGridMonth: { buttonText: "Mois" }
              }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              viewDidMount={(info) => setCurrentView(info.view.type)}
              datesSet={(info) => setCurrentView(info.view.type)}
            />
          )}
          <ConfirmationModal
            open={modal.open}
            title={modal.title}
            message={modal.message}
          />
          <ReservationModal
            open={reservationModal.open}
            slots={reservationModal.slots}
            onConfirm={handleReservationConfirm}
            onCancel={() => setReservationModal({ open:false, slots:[] })}
            annonces={annonces}
          />
          <p style={{marginTop:20, fontSize:16}}>
            <span style={{color:'#0a0a0a'}}>Cliquez sur un créneau pour le bloquer, le débloquer ou le réserver pour un client.</span><br />
            <span style={{color:'#6bbf7b', fontWeight:600}}>Créneau réservé</span>, <span style={{color:'#ffd166', fontWeight:600}}>En attente</span>, <span style={{color:'#CBCBCB', fontWeight:600}}>Bloqué</span>.
          </p>
        </div>
        <Sidebar />
      </div>
    </>
  )
}
