import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useCameraSplashNavigation } from '../../components/CameraSplash'

export default function DevisPrestataire() {
  const router = useRouter()
  const [devisList, setDevisList] = useState([])
  const [annonces, setAnnonces] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [annonceFilter, setAnnonceFilter] = useState('all')
  const [showPopup, setShowPopup] = useState(false)
  const [selectedDevis, setSelectedDevis] = useState(null)
  const [reponse, setReponse] = useState({
    comment_presta: "",
    montant: "",
    montant_acompte: "",
    validite_jours: "30"
  })
  const [sending, setSending] = useState(false)
  const [unites, setUnites] = useState([]);
  const [prestataireInfo, setPrestataireInfo] = useState(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const devisRef = useRef(null)
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000)

  // Récupère les annonces du prestataire
  useEffect(() => {
    const fetchAnnonces = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('prestations_photographe')
        .select('id, titre')
        .eq('prestataire', user.id)
      if (!error) setAnnonces(data)
    }
    fetchAnnonces()
  }, [])

  // Charger les infos du prestataire pour le PDF
  useEffect(() => {
    const fetchPrestataireInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nom, email, telephone, adresse, code_postal, ville, siret, tva_intracom, logo_facture')
        .eq('id', user.id)
        .single()
      
      if (!error && profile) {
        setPrestataireInfo(profile)
      }
    }
    fetchPrestataireInfo()
  }, [])

  // Récupère les devis du prestataire
  useEffect(() => {
    const fetchDevis = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('devis')
        .select('*, profiles!devis_particulier_id_fkey(nom, email), prestations_photographe!devis_annonce_id_fkey(titre, conditions_annulation)')
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

  // Fonction pour remplacer les placeholders dans le message
  const updateMessageWithValues = (message, montant, montantAcompte) => {
    let updatedMessage = message;
    
    // Remplacer [Prix à compléter] par le montant
    if (montant && parseFloat(montant) > 0) {
      updatedMessage = updatedMessage.replace(/\[Prix à compléter\]/g, `${parseFloat(montant).toFixed(2)}`);
    }
    
    // Remplacer "%" par le pourcentage calculé
    if (montantAcompte && parseFloat(montantAcompte) > 0 && montant && parseFloat(montant) > 0) {
      const pourcentage = ((parseFloat(montantAcompte) / parseFloat(montant)) * 100).toFixed(0);
      // Remplacer "%" ou le pourcentage existant
      updatedMessage = updatedMessage.replace(/"%" d'acompte/g, `${pourcentage}% d'acompte`);
      updatedMessage = updatedMessage.replace(/\d+% d'acompte/g, `${pourcentage}% d'acompte`);
    }
    
    // Si le montant est vide, remettre le placeholder
    if (!montant || parseFloat(montant) <= 0) {
      updatedMessage = updatedMessage.replace(/\d+\.?\d* EURO pour ce service/g, '[Prix à compléter] EURO pour ce service');
    }
    
    // Si l'acompte est vide, remettre le placeholder
    if (!montantAcompte || parseFloat(montantAcompte) <= 0) {
      updatedMessage = updatedMessage.replace(/\d+% d'acompte/g, '"%" d\'acompte');
    }
    
    return updatedMessage;
  }

  // Ouvre la pop-up réponse
  const handleAnswerClick = (devis) => {
    setSelectedDevis(devis);
    setShowPopup(true);
    const prenomClient = devis.profiles?.nom ? devis.profiles.nom.split(' ')[0] : '';
    const titreAnnonce = devis.annonces?.titre || '';
    
    // Définir le texte d'annulation selon les conditions de l'annonce
    let textAnnulation = '';
    const conditions = devis.annonces?.conditions_annulation;
    
    if (conditions === 'Flexible') {
      textAnnulation = 'Annulation gratuite jusqu\'à 24h avant, remboursement 100%';
    } else if (conditions === 'Modéré') {
      textAnnulation = 'Annulation gratuite jusqu\'à 7 jours avant, remboursement 50% si <7 jours';
    } else if (conditions === 'Strict') {
      textAnnulation = 'Pas de remboursement sauf cas de force majeure';
    } else {
      textAnnulation = 'Annulation possible jusqu\'à [X jours] avant la date prévue';
    }
    
    // Message par défaut
    const defaultComment = `Bonjour ${prenomClient},

Merci pour votre demande concernant ${titreAnnonce}.
Je vous propose un tarif de [Prix à compléter] EURO pour ce service.

Ce devis inclut :
✔️ Point fort 1, ex : déplacement inclus dans la ville de Casablanca
✔️ Point fort 2, ex : matériel fourni par mes soins

Conditions :
Réservation confirmée après paiement de "%" d'acompte
${textAnnulation}
Si cela vous convient, vous pouvez accepter ce devis et finaliser la réservation directement depuis la plateforme.

Bien à vous,
`;
    setReponse({
      comment_presta: defaultComment,
      montant: "",
      montant_acompte: "",
      validite_jours: "30"
    });
  }

  // Générer le PDF du devis
  const generateDevisPDF = async () => {
    if (!selectedDevis || !reponse.montant) {
      alert('⚠️ Veuillez remplir le montant avant de générer le PDF')
      return null
    }

    setGeneratingPDF(true)
    try {
      const canvas = await html2canvas(devisRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const pdfBase64 = pdf.output('dataurlstring').split(',')[1]

      setGeneratingPDF(false)
      return pdfBase64
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      setGeneratingPDF(false)
      alert('Erreur lors de la génération du PDF: ' + error.message)
      return null
    }
  }

  // Envoie la réponse du prestataire
  const handleSendReponse = async () => {
    if (!selectedDevis) return
    
    // Vérifier que le montant est renseigné
    if (!reponse.montant || parseFloat(reponse.montant) <= 0) {
      alert('⚠️ Veuillez renseigner un montant valide')
      return
    }

    setSending(true)
    
    try {
      // Générer le PDF du devis
      const pdfBase64 = await generateDevisPDF()
      if (!pdfBase64) {
        setSending(false)
        return
      }

      const now = new Date().toISOString()
      
      // Préparer les données à mettre à jour
      const updateData = {
        comment_presta: reponse.comment_presta,
        montant: reponse.montant,
        montant_acompte: reponse.montant_acompte,
        date_reponse: now,
        status: 'answered',
        devis_pdf: [pdfBase64]
      }
      
      // Ajouter unit_tarif seulement s'il existe
      const unitTarif = selectedDevis.annonces?.unit_tarif;
      if (unitTarif) {
        updateData.unit_tarif = unitTarif;
      }
      
      const { error } = await supabase
        .from('devis')
        .update(updateData)
        .eq('id', selectedDevis.id)

      if (error) throw error

      // Notification au particulier
      if (selectedDevis.particulier_id) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: selectedDevis.particulier_id,
            type: 'devis',
            contenu: 'Votre demande de devis a été répondue avec un devis PDF.',
            lu: false
          }])
      }

      setSending(false)
      setShowPopup(false)
      
      // Déclencher le camera splash et rafraîchir la page
      navigateWithSplash(router.asPath)
      
    } catch (error) {
      console.error('Erreur:', error)
      setSending(false)
      alert('❌ Erreur lors de l\'envoi: ' + error.message)
    }
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
          background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, boxShadow: '0 2px 24px rgba(0,0,0,0.12)',
            display: 'flex', minWidth: 900, maxWidth: 1200, width: '95vw', padding: 0, overflow: 'hidden',
            maxHeight: '90vh', margin: '20px 0'
          }}>
            {/* Partie réponse à gauche élargie */}
            <div style={{ flex: 1.7, padding: 32, borderRight: '1px solid #eee', overflowY: 'auto' }}>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Votre réponse</h2>
              
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Commentaire</label>
                <textarea
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6, minHeight: 150, fontSize: 16 }}
                  value={reponse.comment_presta}
                  onChange={e => setReponse(r => ({ ...r, comment_presta: e.target.value }))}
                  placeholder="Votre commentaire pour le client"
                />
              </div>
              
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Montant proposé (EURO)</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6 }}
                  value={reponse.montant}
                  onChange={e => {
                    const newMontant = e.target.value;
                    setReponse(r => ({ ...r, montant: newMontant }));
                  }}
                  onBlur={e => {
                    const newMontant = e.target.value;
                    setReponse(r => {
                      const updatedMessage = updateMessageWithValues(r.comment_presta, newMontant, r.montant_acompte);
                      return { ...r, comment_presta: updatedMessage };
                    });
                  }}
                  placeholder="Montant total"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Acompte nécessaire (EURO)</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6 }}
                  value={reponse.montant_acompte}
                  onChange={e => {
                    const newAcompte = e.target.value;
                    setReponse(r => ({ ...r, montant_acompte: newAcompte }));
                  }}
                  onBlur={e => {
                    const newAcompte = e.target.value;
                    setReponse(r => {
                      const updatedMessage = updateMessageWithValues(r.comment_presta, r.montant, newAcompte);
                      return { ...r, comment_presta: updatedMessage };
                    });
                  }}
                  placeholder="Montant acompte"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600 }}>Validité du devis (jours)</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', padding: 10, marginTop: 6 }}
                  value={reponse.validite_jours}
                  onChange={e => setReponse(r => ({ ...r, validite_jours: e.target.value }))}
                  placeholder="Nombre de jours de validité (ex: 30)"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    background: '#eee', color: '#888', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (!reponse.montant) {
                      alert('⚠️ Veuillez renseigner un montant avant de prévisualiser')
                      return
                    }
                    setGeneratingPDF(true)
                    const pdfBase64 = await generateDevisPDF()
                    if (pdfBase64) {
                      const link = document.createElement('a')
                      link.href = `data:application/pdf;base64,${pdfBase64}`
                      link.download = `Devis-PREVIEW-${selectedDevis.num_devis}.pdf`
                      link.click()
                    }
                    setGeneratingPDF(false)
                  }}
                  disabled={generatingPDF}
                  style={{
                    background: '#5C6BC0', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    opacity: generatingPDF ? 0.7 : 1
                  }}
                >
                  {generatingPDF ? '📄 Génération...' : '📄 Prévisualiser PDF'}
                </button>
                <button
                  onClick={handleSendReponse}
                  disabled={sending || generatingPDF}
                  style={{
                    background: '#e67c73', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '12px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer',
                    opacity: (sending || generatingPDF) ? 0.7 : 1,
                    marginLeft: 'auto'
                  }}
                >
                  {sending ? "📤 Envoi..." : "📤 Envoyer avec PDF"}
                </button>
              </div>
              
            </div>
            {/* Partie infos devis à droite moins large */}
            <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
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

      {/* Template PDF du devis (caché, utilisé pour la génération) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={devisRef} style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          background: '#fff',
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}>
          {/* En-tête avec logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '3px solid #130183', paddingBottom: 20 }}>
            <div>
              {prestataireInfo?.logo_facture && (
                <img src={prestataireInfo.logo_facture} alt="Logo" style={{ maxWidth: 120, maxHeight: 80, marginBottom: 10 }} />
              )}
              <h1 style={{ margin: 0, fontSize: 28, color: '#130183', fontWeight: 700 }}>
                {prestataireInfo?.nom || 'Prestataire'}
              </h1>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                {prestataireInfo?.adresse && <div>{prestataireInfo.adresse}</div>}
                {prestataireInfo?.code_postal && prestataireInfo?.ville && (
                  <div>{prestataireInfo.code_postal} {prestataireInfo.ville}</div>
                )}
                {prestataireInfo?.email && <div>Email: {prestataireInfo.email}</div>}
                {prestataireInfo?.telephone && <div>Tél: {prestataireInfo.telephone}</div>}
                {prestataireInfo?.siret && <div>SIRET: {prestataireInfo.siret}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: 32, color: '#130183', fontWeight: 700 }}>DEVIS</h2>
              <div style={{ fontSize: 14, marginTop: 10 }}>
                <div><strong>N° :</strong> {selectedDevis?.num_devis || `DEVIS-${selectedDevis?.id}`}</div>
                <div><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</div>
                <div style={{ marginTop: 10, padding: 8, background: '#E8EAF6', borderRadius: 4 }}>
                  <strong>Valable jusqu'au :</strong><br />
                  {new Date(Date.now() + (parseInt(reponse.validite_jours) || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 16, color: '#130183', marginBottom: 10, borderBottom: '2px solid #E8EAF6', paddingBottom: 5 }}>
              CLIENT
            </h2>
            <div style={{ fontSize: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 5 }}>{selectedDevis?.profiles?.nom}</div>
              {selectedDevis?.profiles?.email && <div>Email: {selectedDevis.profiles.email}</div>}
              {selectedDevis?.endroit && <div>Lieu: {selectedDevis.endroit}</div>}
            </div>
          </div>

          {/* Détails de la prestation */}
          <div style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 16, color: '#130183', marginBottom: 10, borderBottom: '2px solid #E8EAF6', paddingBottom: 5 }}>
              DÉTAILS DE LA PRESTATION
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#E8EAF6' }}>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                  <th style={{ padding: 10, textAlign: 'center', border: '1px solid #ddd', width: 100 }}>Quantité</th>
                  <th style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd', width: 120 }}>Prix unitaire</th>
                  <th style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd', width: 120 }}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 10, border: '1px solid #ddd' }}>
                    <strong>{selectedDevis?.annonces?.titre || 'Prestation photo'}</strong>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
                      Date: {selectedDevis?.date ? new Date(selectedDevis.date).toLocaleDateString('fr-FR') : '-'}<br />
                      Durée: {selectedDevis?.duree || '-'}h<br />
                      Participants: {selectedDevis?.participants || '-'}
                    </div>
                  </td>
                  <td style={{ padding: 10, textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                  <td style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd' }}>
                    {reponse.montant ? parseFloat(reponse.montant).toFixed(2) : '0.00'} EURO
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', border: '1px solid #ddd', fontWeight: 700 }}>
                    {reponse.montant ? parseFloat(reponse.montant).toFixed(2) : '0.00'} EURO
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div style={{ marginLeft: 'auto', width: 300, marginBottom: 30 }}>
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ padding: 8, textAlign: 'right' }}>Total HT:</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>
                    {reponse.montant ? parseFloat(reponse.montant).toFixed(2) : '0.00'} EURO
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 8, textAlign: 'right' }}>TVA (20%):</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {reponse.montant ? (parseFloat(reponse.montant) * 0.2).toFixed(2) : '0.00'} EURO
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #130183', background: '#E8EAF6' }}>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 16 }}>Total TTC:</td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 18, color: '#130183' }}>
                    {reponse.montant ? (parseFloat(reponse.montant) * 1.2).toFixed(2) : '0.00'} EURO
                  </td>
                </tr>
                {reponse.montant_acompte && parseFloat(reponse.montant_acompte) > 0 && (
                  <tr style={{ background: '#FFF9E6' }}>
                    <td style={{ padding: 8, textAlign: 'right', color: '#d97706' }}>Acompte requis:</td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                      {parseFloat(reponse.montant_acompte).toFixed(2)} EURO
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Conditions */}
          <div style={{ marginTop: 40, padding: 15, background: '#f8fafc', borderRadius: 4 }}>
            <h2 style={{ fontSize: 14, color: '#130183', marginBottom: 10 }}>CONDITIONS GÉNÉRALES</h2>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: '#666' }}>
              <p style={{ margin: '5px 0' }}>• Ce devis est valable {reponse.validite_jours || '30'} jours à compter de sa date d'émission.</p>
              <p style={{ margin: '5px 0' }}>• Un acompte de {reponse.montant_acompte || '30%'} est requis pour confirmer la réservation.</p>
              <p style={{ margin: '5px 0' }}>• Le solde est à régler le jour de la prestation.</p>
              <p style={{ margin: '5px 0' }}>• Toute annulation doit être notifiée par écrit selon les conditions d'annulation de l'annonce.</p>
              <p style={{ margin: '5px 0' }}>• Les droits d'utilisation des photos sont définis dans le contrat de prestation.</p>
            </div>
          </div>

          {/* Pied de page */}
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 11, color: '#999' }}>
            <p>Devis généré via la plateforme Shooty</p>
            <p>Pour toute question, contactez-nous à {prestataireInfo?.email || 'contact@shooty.com'}</p>
          </div>
        </div>
      </div>
      
      {/* Camera Splash Component */}
      {CameraSplashComponent}
    </>
  )
}
