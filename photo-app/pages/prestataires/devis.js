import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'

export default function DevisPrestataire() {
  const [devisList, setDevisList] = useState([])
  const [annonces, setAnnonces] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [annonceFilter, setAnnonceFilter] = useState('all')
  const [showPopup, setShowPopup] = useState(false)
  const [selectedDevis, setSelectedDevis] = useState(null)
  const [reponse, setReponse] = useState({
    comment_presta: "",
    montant: "",
    montant_acompte: ""
  })
  const [sending, setSending] = useState(false)
  const [unites, setUnites] = useState([]);

  // Récupère les annonces du prestataire
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

  // Récupère les devis du prestataire
  useEffect(() => {
    const fetchDevis = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('devis')
        .select('*, profiles!devis_particulier_id_fkey(nom, email), annonces!devis_annonce_id_fkey(titre)')
        .eq('prestataire_id', user.id)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (annonceFilter !== 'all') {
        query = query.eq('annonce_id', annonceFilter)
      }

      const { data, error } = await query
      if (error) console.error(error)
      else setDevisList(data)
    }
    fetchDevis()
  }, [statusFilter, annonceFilter, showPopup])

  // Récupère les valeurs possibles de l'enum unite_tarif
  useEffect(() => {
    async function fetchUnites() {
      const { data, error } = await supabase.rpc('get_enum_values', { table_name: 'annonces', column_name: 'unit_tarif' });
      if (!error && Array.isArray(data)) setUnites(data);
    }
    fetchUnites();
  }, [])

  // Ouvre la pop-up réponse
  const handleAnswerClick = (devis) => {
    setSelectedDevis(devis);
    setShowPopup(true);
    const prenomClient = devis.profiles?.nom ? devis.profiles.nom.split(' ')[0] : '';
    const titreAnnonce = devis.annonces?.titre || '';
    // Message par défaut
    const defaultComment = `Bonjour ${prenomClient},

Merci pour votre demande concernant ${titreAnnonce}.
Je vous propose un tarif de [Prix à compléter] MAD pour ce service.

Ce devis inclut :
✔️ Point fort 1, ex : déplacement inclus dans la ville de Casablanca
✔️ Point fort 2, ex : matériel fourni par mes soins

Conditions :
Réservation confirmée après paiement de "%" d’acompte
Annulation possible jusqu’à [X jours] avant la date prévue
Si cela vous convient, vous pouvez accepter ce devis et finaliser la réservation directement depuis la plateforme.

Bien à vous,
`;
    setReponse({
      comment_presta: defaultComment,
      montant: "",
      montant_acompte: ""
    });
  }

  // Envoie la réponse du prestataire
  const handleSendReponse = async () => {
    if (!selectedDevis) return
    setSending(true)
    const now = new Date().toISOString()
    // Récupère unit_tarif depuis l'annonce liée
    const unitTarif = selectedDevis.annonces?.unit_tarif || "";
    const { error } = await supabase
      .from('devis')
      .update({
        comment_presta: reponse.comment_presta,
        montant: reponse.montant,
        montant_acompte: reponse.montant_acompte,
        unit_tarif: unitTarif,
        date_reponse: now,
        status: 'answered'
      })
      .eq('id', selectedDevis.id)

    // Notification au particulier
    if (selectedDevis.particulier_id) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: selectedDevis.particulier_id,
          type: 'devis',
          contenu: 'Votre demande de devis a été répondue.',
          lu: false
        }])
    }

    setSending(false)
    setShowPopup(false)
    if (error) alert(error.message)
    else alert('Réponse envoyée ✅')
  }

  function StatusBadge({ status }) {
    let color = '#b7e4c7', bg = '#eafaf1', label = 'Répondu'
    if (status === 'pending') { color = '#e67c73'; bg = '#fbeaea'; label = 'En attente' }
    if (status === 'answered') { color = '#3cb371'; bg = '#eafaf1'; label = 'Répondu' }
    if (status === 'accepted') { color = '#3cb371'; bg = '#eafaf1'; label = 'Accepté' }
    if (status === 'refused') { color = '#e67c73'; bg = '#fbeaea'; label = 'Refusé' }
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

  function DevisCard({ d }) {
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
            {d.profiles?.nom ? d.profiles.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{d.profiles?.nom || 'Nom inconnu'}</span>
            <StatusBadge status={d.status} />
          </div>
          <div style={{ color: '#888', fontSize: 15, marginTop: 2 }}>{d.profiles?.email}</div>
          <div style={{ color: '#6bbf7b', fontSize: 15, marginTop: 6, fontWeight: 600 }}>
            {d.annonces?.titre ? `Annonce : ${d.annonces.titre}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#bdbdbd"/></svg>
              {d.endroit || 'Lieu inconnu'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#bdbdbd"/></svg>
              {d.participants ? `${d.participants} pers.` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#bdbdbd"/></svg>
              {d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}, {d.heure ? `${d.heure}:00` : ''}
            </span>
          </div>
        </div>
        {d.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => handleAnswerClick(d)}
              style={{
                background: '#8ba987', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer'
              }}
            >Répondre</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <PrestataireHeader />
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 32 }}>
          <div style={{ flex: 2 }}>
            <h1 style={{ fontWeight: 700, fontSize: 32, marginBottom: 28 }}>Demandes de devis</h1>
            {/* Barre de recherche et filtres */}
            <div style={{
              display: 'flex', gap: 16, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap'
            }}>
              <input
                type="text"
                placeholder="Rechercher"
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                  fontSize: 16, background: '#fff'
                }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16, background: '#fff'
                }}
              >
                <option value="all">Statut</option>
                <option value="pending">En attente</option>
                <option value="answered">Répondu</option>
                <option value="accepted">Accepté</option>
                <option value="refused">Refusé</option>
              </select>
              <select
                value={annonceFilter}
                onChange={e => setAnnonceFilter(e.target.value)}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16, background: '#fff'
                }}
              >
                <option value="all">Annonces</option>
                {annonces.map(a => (
                  <option key={a.id} value={a.id}>{a.titre}</option>
                ))}
              </select>
              <select style={{
                padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16, background: '#fff'
              }}>
                <option>Date</option>
              </select>
            </div>
            {/* Liste des devis */}
            {devisList.map(d => (
              <DevisCard key={d.id} d={d} />
            ))}
          </div>
          {/* Détail à droite */}
          <div style={{
            flex: 1,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            padding: 24,
            minWidth: 320,
            maxWidth: 350,
            height: 'fit-content'
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Devis</h2>
            {/* Affiche le détail du premier devis */}
            {devisList[0] && (
              <div>
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 22, color: '#888', marginBottom: 10
                }}>
                  {devisList[0].profiles?.nom ? devisList[0].profiles.nom.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>
                  {devisList[0].profiles?.nom || 'Nom inconnu'}
                </div>
                <div style={{ color: '#888', fontSize: 15, marginBottom: 8 }}>
                  {devisList[0].profiles?.email}
                </div>
                <div style={{ color: '#6bbf7b', fontSize: 15, marginBottom: 8, fontWeight: 600 }}>
                  {devisList[0].annonces?.titre ? `Annonce : ${devisList[0].annonces.titre}` : ''}
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="16" height="16" fill="none"><path d="M8 2C5.24 2 3 4.24 3 7c0 4.25 5 7 5 7s5-2.75 5-7c0-2.76-2.24-5-5-5Zm0 7.5A2.5 2.5 0 1 1 8 4a2.5 2.5 0 0 1 0 5.5Z" fill="#bdbdbd"/></svg>
                    {devisList[0].endroit || 'Lieu inconnu'}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="16" height="16" fill="none"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Z" fill="#bdbdbd"/></svg>
                    {devisList[0].participants ? devisList[0].participants : ''}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="16" height="16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8.666H7.333v4l3.5 2.1.667-1.1-3-1.8V4.667Z" fill="#bdbdbd"/></svg>
                    {devisList[0].date ? new Date(devisList[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}, {devisList[0].heure ? `${devisList[0].heure}:00` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="#bdbdbd" strokeWidth="2"/><path d="M8 4v4l3 2" stroke="#bdbdbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {devisList[0].duree ? `${devisList[0].duree}h` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  Notes<br />
                  {devisList[0].comment_client || ""}
                </div>
                {devisList[0].status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => handleAnswerClick(devisList[0])}
                      style={{
                        background: '#8ba987', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer'
                      }}
                    >Répondre</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Pop-up réponse devis */}
      {showPopup && selectedDevis && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, boxShadow: '0 2px 24px rgba(0,0,0,0.12)',
            display: 'flex', minWidth: 900, maxWidth: 1200, width: '95vw', padding: 0, overflow: 'hidden'
          }}>
            {/* Partie réponse à gauche élargie */}
            <div style={{ flex: 1.7, padding: 32, borderRight: '1px solid #eee' }}>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Votre réponse</h2>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Commentaire</label>
                <textarea
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6, minHeight: 120, fontSize: 16 }}
                  value={reponse.comment_presta}
                  onChange={e => setReponse(r => ({ ...r, comment_presta: e.target.value }))}
                  placeholder="Votre commentaire pour le client"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Montant proposé (MAD)</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6 }}
                  value={reponse.montant}
                  onChange={e => setReponse(r => ({ ...r, montant: e.target.value }))}
                  placeholder="Montant total"
                />
              </div>
              {/* Champ unité supprimé */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Acompte nécessaire (MAD)</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6 }}
                  value={reponse.montant_acompte}
                  onChange={e => setReponse(r => ({ ...r, montant_acompte: e.target.value }))}
                  placeholder="Montant acompte"
                />
              </div>
              <button
                onClick={handleSendReponse}
                disabled={sending}
                style={{
                  background: '#e67c73', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '12px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer',
                  marginTop: 24, float: 'right'
                }}
              >
                {sending ? "Envoi..." : "Envoyer votre réponse"}
              </button>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  background: '#eee', color: '#888', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                  marginTop: 24, marginRight: 12
                }}
              >
                Annuler
              </button>
            </div>
            {/* Partie infos devis à droite moins large */}
            <div style={{ flex: 1, padding: 32 }}>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Informations du devis</h2>
              <div style={{ marginBottom: 12 }}>
                <b>Client :</b> {selectedDevis.profiles?.nom}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Email :</b> {selectedDevis.profiles?.email}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Endroit :</b> {selectedDevis.endroit}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Date :</b> {selectedDevis.date ? new Date(selectedDevis.date).toLocaleDateString('fr-FR') : ''}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Participants :</b> {selectedDevis.participants}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Durée :</b> {selectedDevis.duree} h
              </div>
              <div style={{ marginBottom: 12, whiteSpace: 'pre-line', fontSize: 16 }}>
                <b>Demande :</b> {selectedDevis.comment_client}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}