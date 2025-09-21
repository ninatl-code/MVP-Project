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
          minWidth: 320,
          maxWidth: 500,
          textAlign: 'left',
          position: 'relative'
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
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Informations du devis</h2>
          <div style={{marginBottom:10}}>
            <strong>Prestataire :</strong> {devis.nom_prestataire || devis.prestataire_nom || devis.prestataire || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Titre annonce :</strong> {devis.annonces?.titre || devis.titre || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Endroit :</strong> {devis.endroit || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Date :</strong> {devis.date ? new Date(devis.date).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Participants :</strong> {devis.participants || devis.nb_personnes || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Durée :</strong> {devis.duree || 'Non renseigné'}
          </div>
          <div style={{marginBottom:10}}>
            <strong>Commentaire client :</strong> {devis.comment_client || 'Non renseigné'}
          </div>
          {(devis.status === 'answered' || devis.status === 'refused' || devis.status === 'accepted') && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date réponse :</strong> {devis.date_reponse ? new Date(devis.date_reponse).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Commentaire prestataire :</strong> {devis.comment_presta || 'Non renseigné'}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Montant :</strong> {devis.montant || 'Non renseigné'}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Acompte :</strong> {devis.montant_acompte || 'Non renseigné'}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Unité tarif :</strong> {devis.unit_tarif || 'Non renseigné'}
              </div>
            </>
          )}
          {devis.status === 'accepted' && (
            <div style={{marginBottom:10}}>
              <strong>Date confirmation :</strong> {devis.date_confirmation ? new Date(devis.date_confirmation).toLocaleDateString('fr-FR') : ''}
            </div>
          )}
          {devis.status === 'refused' && (
            <>
              <div style={{marginBottom:10}}>
                <strong>Date refus :</strong> {devis.date_refus ? new Date(devis.date_refus).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{marginBottom:10}}>
                <strong>Motif refus :</strong> {devis.motif_refus || 'Non renseigné'}
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
            // À adapter pour afficher une pop-up commande si besoin
            onClick={() => alert('Informations commande à afficher ici')}
          >
            Afficher les informations
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
            // À adapter pour afficher une pop-up réservation si besoin
            onClick={() => alert('Informations réservation à afficher ici')}
          >
            Afficher les informations
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
            </section>
          )}
        </div>
      </div>
    </>
  )
}
