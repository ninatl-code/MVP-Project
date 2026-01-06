import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Header from '../../components/HeaderPresta'

export default function InvoicePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [prestataireInfo, setPrestataireInfo] = useState(null)
  const [reservations, setReservations] = useState([])
  const [recentInvoices, setRecentInvoices] = useState([])
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [prestaLogo, setPrestaLogo] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingPrestaInfo, setEditingPrestaInfo] = useState(false)
  const invoiceRef = useRef(null)
  
  // Données de la facture
  const [invoiceData, setInvoiceData] = useState({
    numero: `FACT-${Date.now()}`,
    dateFacture: new Date().toISOString().split('T')[0],
    datePaiement: '',
    
    // Info prestataire (sera rempli automatiquement)
    prestaNom: '',
    prestaAdresse: '',
    prestaCodePostal: '',
    prestaVille: '',
    prestaPays: 'France',
    prestaSiret: '',
    prestaTVA: '',
    prestaEmail: '',
    prestaTelephone: '',
    prestaLogo: '',
    
    // Info client (sera rempli si réservation sélectionnée)
    clientNom: '',
    clientAdresse: '',
    clientCodePostal: '',
    clientVille: '',
    clientPays: 'France',
    clientEmail: '',
    clientTelephone: '',
    
    // Détails prestation
    prestations: [{
      description: '',
      quantite: 1,
      prixUnitaire: 0,
      tva: 20
    }],
  })

  // Charger les données au montage
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      
      // Charger les infos du prestataire
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nom, email, telephone, adresse, code_postal, ville, siret, tva_intracom, logo_facture')
        .eq('id', user.id)
        .single()
      
      if (!profileError && profile) {
        setPrestataireInfo(profile)
        setPrestaLogo(profile.logo_facture)
        setInvoiceData(prev => ({
          ...prev,
          prestaNom: profile.nom || '',
          prestaAdresse: profile.adresse || '',
          prestaCodePostal: profile.code_postal || '',
          prestaVille: profile.ville || '',
          prestaSiret: profile.siret || '',
          prestaTVA: profile.tva_intracom || '',
          prestaEmail: profile.email || '',
          prestaTelephone: profile.telephone || '',
          prestaLogo: profile.logo_facture || ''
        }))
      }
      
      // Charger les réservations confirmées
      const { data: resas, error: resasError } = await supabase
        .from('reservations')
        .select(`
          id,
          date_debut,
          date_fin,
          montant_total,
          statut,
          annonces(titre, tarif_unit),
          profiles!reservations_particulier_id_fkey(nom, email, telephone, adresse, code_postal, ville)
        `)
        .eq('prestataire_id', user.id)
        .eq('statut', 'confirmée')
        .order('date_debut', { ascending: false })
      
      if (!resasError && resas) {
        setReservations(resas)
      }
      
      // Charger les 5 dernières factures
      const { data: factures, error: facturesError } = await supabase
        .from('factures')
        .select('*')
        .eq('prestataire_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!facturesError && factures) {
        setRecentInvoices(factures)
      }
    }
    
    fetchData()
  }, [router])

  // Sélectionner une réservation
  const handleSelectReservation = (resa) => {
    setSelectedReservation(resa)
    const client = resa.profiles
    
    setInvoiceData(prev => ({
      ...prev,
      clientNom: client?.nom || '',
      clientEmail: client?.email || '',
      clientTelephone: client?.telephone || '',
      clientAdresse: client?.adresse || '',
      clientCodePostal: client?.code_postal || '',
      clientVille: client?.ville || '',
      prestations: [{
        description: resa.annonces?.titre || 'Prestation photographe',
        quantite: 1,
        prixUnitaire: resa.montant_total || resa.annonces?.tarif_unit || 0,
        tva: 20
      }]
    }))
  }

  // Ajouter une ligne de prestation
  const addPrestationLine = () => {
    setInvoiceData(prev => ({
      ...prev,
      prestations: [...prev.prestations, { description: '', quantite: 1, prixUnitaire: 0, tva: 20 }]
    }))
  }

  // Supprimer une ligne de prestation
  const removePrestationLine = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      prestations: prev.prestations.filter((_, i) => i !== index)
    }))
  }

  // Calculer les totaux
  const calculateTotals = () => {
    let totalHT = 0
    let totalTVA = 0
    
    invoiceData.prestations.forEach(p => {
      const ht = p.quantite * p.prixUnitaire
      const tva = (ht * p.tva) / 100
      totalHT += ht
      totalTVA += tva
    })
    
    return {
      totalHT: totalHT.toFixed(2),
      totalTVA: totalTVA.toFixed(2),
      totalTTC: (totalHT + totalTVA).toFixed(2)
    }
  }

  const totals = calculateTotals()

  // Sauvegarder la facture
  const handleSave = async () => {
    try {
      if (!invoiceData.clientNom || !invoiceData.prestations[0].description) {
        alert('Veuillez remplir au moins le nom du client et une prestation')
        return
      }

      // Générer le PDF en base64
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const pdfBase64 = pdf.output('dataurlstring').split(',')[1]

      // Sauvegarder dans la base
      const { error } = await supabase
        .from('factures')
        .insert([{
          prestataire_id: user.id,
          reservation_id: selectedReservation?.id || null,
          facture: [pdfBase64],
          num_facture: invoiceData.numero
        }])

      if (error) throw error

      alert('Facture sauvegardée avec succès !')
      
      // Recharger les factures récentes
      const { data: factures } = await supabase
        .from('factures')
        .select('*')
        .eq('prestataire_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (factures) setRecentInvoices(factures)

    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la sauvegarde: ' + error.message)
    }
  }

  // Télécharger la facture en PDF
  const handleDownload = async () => {
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Facture-${invoiceData.numero}.pdf`)
      
      alert('Facture téléchargée !')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du téléchargement: ' + error.message)
    }
  }

  // Télécharger une facture existante
  const downloadExistingInvoice = (facture) => {
    if (facture.facture && facture.facture[0]) {
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${facture.facture[0]}`
      link.download = `${facture.num_facture}.pdf`
      link.click()
    }
  }

  // Upload du logo prestataire
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Veuillez sélectionner une image (PNG, JPG, WebP)')
      return
    }

    // Validation de la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ Le fichier est trop volumineux. Taille maximale : 5 MB')
      return
    }

    setUploadingLogo(true)

    try {
      // Supprimer l'ancien logo si existant
      if (prestaLogo) {
        const oldFileName = prestaLogo.split('/').pop()
        await supabase.storage
          .from('logos-factures')
          .remove([oldFileName])
      }

      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-logo-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos-factures')
        .upload(fileName, file, {
          contentType: file.type || 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('logos-factures')
        .getPublicUrl(fileName)

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_facture: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPrestaLogo(publicUrl)
      setInvoiceData(prev => ({ ...prev, prestaLogo: publicUrl }))
      alert('✅ Logo téléchargé avec succès !')

    } catch (error) {
      console.error('Erreur upload:', error)
      let errorMessage = 'Erreur lors du téléchargement'
      
      if (error.message.includes('not found')) {
        errorMessage = '❌ Le bucket de stockage n\'existe pas. Contactez l\'administrateur.'
      } else if (error.message.includes('policy')) {
        errorMessage = '❌ Vous n\'avez pas les permissions pour uploader. Contactez l\'administrateur.'
      } else {
        errorMessage = '❌ ' + error.message
      }
      
      alert(errorMessage)
    } finally {
      setUploadingLogo(false)
    }
  }

  // Sauvegarder les infos du prestataire
  const handleSavePrestaInfo = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nom: invoiceData.prestaNom,
          adresse: invoiceData.prestaAdresse,
          code_postal: invoiceData.prestaCodePostal,
          ville: invoiceData.prestaVille,
          siret: invoiceData.prestaSiret,
          tva_intracom: invoiceData.prestaTVA,
          email: invoiceData.prestaEmail,
          telephone: invoiceData.prestaTelephone
        })
        .eq('id', user.id)

      if (error) throw error

      setPrestataireInfo({
        ...prestataireInfo,
        nom: invoiceData.prestaNom,
        adresse: invoiceData.prestaAdresse,
        code_postal: invoiceData.prestaCodePostal,
        ville: invoiceData.prestaVille,
        siret: invoiceData.prestaSiret,
        tva_intracom: invoiceData.prestaTVA,
        email: invoiceData.prestaEmail,
        telephone: invoiceData.prestaTelephone
      })

      setEditingPrestaInfo(false)
      alert('Informations mises à jour avec succès !')

    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  return (
    <>
      <Header />
      <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 30, color: '#635BFF' }}>
            📄 Génération de factures
          </h1>

        {/* Dernières factures */}
        {recentInvoices.length > 0 && (
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            padding: 24, 
            marginBottom: 30,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
              📋 5 dernières factures
            </h2>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
              {recentInvoices.map(facture => (
                <div 
                  key={facture.id}
                  style={{
                    minWidth: 200,
                    padding: 16,
                    background: '#f8f9fb',
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => downloadExistingInvoice(facture)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#635BFF'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    {facture.num_facture}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {new Date(facture.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div style={{ 
                    marginTop: 12, 
                    fontSize: 12, 
                    color: '#635BFF',
                    fontWeight: 500
                  }}>
                    📥 Télécharger
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire et aperçu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          {/* Colonne de gauche - Formulaire */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            padding: 30,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            height: 'fit-content'
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>
              ⚙️ Configuration de la facture
            </h2>

            {/* Infos Prestataire */}
            <div style={{ 
              padding: 16, 
              background: '#f0f4ff', 
              borderRadius: 12, 
              marginBottom: 24,
              border: '2px solid #635BFF20'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  🏢 Mes informations
                </h3>
                {!editingPrestaInfo ? (
                  <button
                    onClick={() => setEditingPrestaInfo(true)}
                    style={{
                      padding: '6px 12px',
                      background: '#635BFF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Modifier
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSavePrestaInfo}
                      style={{
                        padding: '6px 12px',
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      💾 Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditingPrestaInfo(false)}
                      style={{
                        padding: '6px 12px',
                        background: '#999',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Annuler
                    </button>
                  </div>
                )}
              </div>

              {/* Logo prestataire */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Logo (affiché sur la facture)
                </label>
                
                {/* Aperçu du logo */}
                {prestaLogo && (
                  <div style={{ 
                    marginBottom: 8,
                    padding: 12,
                    background: '#fff',
                    border: '2px solid #635BFF20',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <img 
                      src={prestaLogo} 
                      alt="Logo" 
                      style={{ 
                        maxWidth: 150, 
                        maxHeight: 60, 
                        objectFit: 'contain'
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, marginBottom: 4 }}>
                        ✅ Logo actif
                      </div>
                      <div style={{ fontSize: 10, color: '#666' }}>
                        Apparaît en haut à droite de vos factures
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upload */}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 12,
                    background: '#fff',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer'
                  }}
                />
                
                {/* État du chargement */}
                {uploadingLogo && (
                  <div style={{ 
                    fontSize: 12, 
                    color: '#635BFF', 
                    marginTop: 6,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <div style={{ 
                      width: 12, 
                      height: 12, 
                      border: '2px solid #635BFF', 
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Téléchargement en cours...
                  </div>
                )}
                
                {/* Conseils */}
                {!prestaLogo && (
                  <div style={{ 
                    marginTop: 8,
                    padding: 10,
                    background: '#fff8e1',
                    border: '1px solid #ffc107',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#856404'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 Conseils :</div>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Format horizontal (300-400 x 80-120 px)</li>
                      <li>PNG avec fond transparent (recommandé)</li>
                      <li>Taille max : 5 MB</li>
                    </ul>
                  </div>
                )}
              </div>
              
              <style jsx>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Nom / Raison sociale"
                  value={invoiceData.prestaNom}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaNom: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
                <input
                  type="text"
                  placeholder="Adresse"
                  value={invoiceData.prestaAdresse}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaAdresse: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Code postal"
                    value={invoiceData.prestaCodePostal}
                    onChange={(e) => setInvoiceData({...invoiceData, prestaCodePostal: e.target.value})}
                    disabled={!editingPrestaInfo}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 13,
                      background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={invoiceData.prestaVille}
                    onChange={(e) => setInvoiceData({...invoiceData, prestaVille: e.target.value})}
                    disabled={!editingPrestaInfo}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 13,
                      background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="SIRET"
                  value={invoiceData.prestaSiret}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaSiret: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
                <input
                  type="text"
                  placeholder="TVA Intracommunautaire"
                  value={invoiceData.prestaTVA}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaTVA: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={invoiceData.prestaEmail}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaEmail: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={invoiceData.prestaTelephone}
                  onChange={(e) => setInvoiceData({...invoiceData, prestaTelephone: e.target.value})}
                  disabled={!editingPrestaInfo}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: editingPrestaInfo ? '#fff' : '#f5f5f5'
                  }}
                />
              </div>
            </div>

            {/* Sélection réservation */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                Sélectionner une réservation
              </label>
              <select
                value={selectedReservation?.id || ''}
                onChange={(e) => {
                  const resa = reservations.find(r => r.id === e.target.value)
                  if (resa) handleSelectReservation(resa)
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '2px solid #e0e0e0',
                  fontSize: 14
                }}
              >
                <option value="">-- Sélectionner --</option>
                {reservations.map(resa => (
                  <option key={resa.id} value={resa.id}>
                    {resa.annonces?.titre} - {new Date(resa.date_debut).toLocaleDateString('fr-FR')} - {resa.montant_total}€
                  </option>
                ))}
              </select>
            </div>

            {/* Infos facture */}
            <div style={{ 
              padding: 16, 
              background: '#f8f9fb', 
              borderRadius: 12, 
              marginBottom: 24 
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                📋 Informations facture
              </h3>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Numéro de facture
                </label>
                <input
                  type="text"
                  value={invoiceData.numero}
                  onChange={(e) => setInvoiceData({...invoiceData, numero: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    Date de facture
                  </label>
                  <input
                    type="date"
                    value={invoiceData.dateFacture}
                    onChange={(e) => setInvoiceData({...invoiceData, dateFacture: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    Date de paiement
                  </label>
                  <input
                    type="date"
                    value={invoiceData.datePaiement}
                    onChange={(e) => setInvoiceData({...invoiceData, datePaiement: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Infos client */}
            <div style={{ 
              padding: 16, 
              background: '#fff8f0', 
              borderRadius: 12, 
              marginBottom: 24 
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                👤 Informations client
              </h3>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Nom"
                  value={invoiceData.clientNom}
                  onChange={(e) => setInvoiceData({...invoiceData, clientNom: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14
                  }}
                />
                <input
                  type="text"
                  placeholder="Adresse"
                  value={invoiceData.clientAdresse}
                  onChange={(e) => setInvoiceData({...invoiceData, clientAdresse: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Code postal"
                    value={invoiceData.clientCodePostal}
                    onChange={(e) => setInvoiceData({...invoiceData, clientCodePostal: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 14
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={invoiceData.clientVille}
                    onChange={(e) => setInvoiceData({...invoiceData, clientVille: e.target.value})}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 14
                    }}
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData({...invoiceData, clientEmail: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14
                  }}
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={invoiceData.clientTelephone}
                  onChange={(e) => setInvoiceData({...invoiceData, clientTelephone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            {/* Détails prestations */}
            <div style={{ 
              padding: 16, 
              background: '#e8f5e9', 
              borderRadius: 12, 
              marginBottom: 24 
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                💼 Détails des prestations
              </h3>
              
              {invoiceData.prestations.map((presta, index) => (
                <div key={index} style={{ 
                  marginBottom: 16, 
                  padding: 12, 
                  background: '#fff', 
                  borderRadius: 8 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Ligne {index + 1}</span>
                    {invoiceData.prestations.length > 1 && (
                      <button
                        onClick={() => removePrestationLine(index)}
                        style={{
                          background: '#ff4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 12px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Supprimer
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Description"
                    value={presta.description}
                    onChange={(e) => {
                      const newPrestations = [...invoiceData.prestations]
                      newPrestations[index].description = e.target.value
                      setInvoiceData({...invoiceData, prestations: newPrestations})
                    }}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      marginBottom: 8
                    }}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={presta.quantite}
                        onChange={(e) => {
                          const newPrestations = [...invoiceData.prestations]
                          newPrestations[index].quantite = parseFloat(e.target.value) || 1
                          setInvoiceData({...invoiceData, prestations: newPrestations})
                        }}
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Prix HT</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={presta.prixUnitaire}
                        onChange={(e) => {
                          const newPrestations = [...invoiceData.prestations]
                          newPrestations[index].prixUnitaire = parseFloat(e.target.value) || 0
                          setInvoiceData({...invoiceData, prestations: newPrestations})
                        }}
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>TVA %</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={presta.tva}
                        onChange={(e) => {
                          const newPrestations = [...invoiceData.prestations]
                          newPrestations[index].tva = parseFloat(e.target.value) || 0
                          setInvoiceData({...invoiceData, prestations: newPrestations})
                        }}
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          fontSize: 13
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={addPrestationLine}
                style={{
                  width: '100%',
                  padding: 12,
                  background: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ➕ Ajouter une ligne
              </button>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: 16,
                  background: '#635BFF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                💾 Sauvegarder
              </button>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  padding: 16,
                  background: '#FF7F50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📥 Télécharger PDF
              </button>
            </div>
          </div>

          {/* Colonne de droite - Aperçu facture */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: 40,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minHeight: 800
            }}>
              <div ref={invoiceRef} style={{ padding: 20, position: 'relative', minHeight: 1000 }}>
                {/* En-tête */}
                <div style={{ 
                  borderBottom: '3px solid #635BFF', 
                  paddingBottom: 20, 
                  marginBottom: 30,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <h1 style={{ 
                      fontSize: 32, 
                      fontWeight: 700, 
                      color: '#635BFF', 
                      marginBottom: 8 
                    }}>
                      FACTURE
                    </h1>
                    <div style={{ fontSize: 14, color: '#666' }}>
                      <div><strong>N° :</strong> {invoiceData.numero}</div>
                      <div><strong>Date :</strong> {invoiceData.dateFacture ? new Date(invoiceData.dateFacture).toLocaleDateString('fr-FR') : '-'}</div>
                      {invoiceData.datePaiement && (
                        <div><strong>Paiement :</strong> {new Date(invoiceData.datePaiement).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Logo prestataire */}
                  {prestaLogo && (
                    <div style={{ maxWidth: 150 }}>
                      <img 
                        src={prestaLogo} 
                        alt="Logo prestataire" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 80, 
                          objectFit: 'contain' 
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Infos Prestataire et Client */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 30, 
                  marginBottom: 40 
                }}>
                  <div>
                    <h3 style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: '#635BFF', 
                      marginBottom: 12,
                      textTransform: 'uppercase'
                    }}>
                      Prestataire
                    </h3>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 600 }}>{invoiceData.prestaNom || '-'}</div>
                      <div>{invoiceData.prestaAdresse || '-'}</div>
                      <div>{invoiceData.prestaCodePostal} {invoiceData.prestaVille} {invoiceData.prestaPays}</div>
                      {invoiceData.prestaSiret && <div>SIRET: {invoiceData.prestaSiret}</div>}
                      {invoiceData.prestaTVA && <div>TVA: {invoiceData.prestaTVA}</div>}
                      <div>{invoiceData.prestaEmail}</div>
                      <div>{invoiceData.prestaTelephone}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: '#FF7F50', 
                      marginBottom: 12,
                      textTransform: 'uppercase'
                    }}>
                      Client
                    </h3>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 600 }}>{invoiceData.clientNom || '-'}</div>
                      <div>{invoiceData.clientAdresse || '-'}</div>
                      <div>{invoiceData.clientCodePostal} {invoiceData.clientVille} {invoiceData.clientPays}</div>
                      <div>{invoiceData.clientEmail || '-'}</div>
                      <div>{invoiceData.clientTelephone || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Tableau prestations */}
                <div style={{ marginBottom: 30 }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: 13
                  }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ 
                          padding: '12px 8px', 
                          textAlign: 'left', 
                          fontWeight: 600,
                          borderBottom: '2px solid #ddd'
                        }}>Description</th>
                        <th style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center', 
                          fontWeight: 600,
                          borderBottom: '2px solid #ddd'
                        }}>Qté</th>
                        <th style={{ 
                          padding: '12px 8px', 
                          textAlign: 'right', 
                          fontWeight: 600,
                          borderBottom: '2px solid #ddd'
                        }}>Prix HT</th>
                        <th style={{ 
                          padding: '12px 8px', 
                          textAlign: 'center', 
                          fontWeight: 600,
                          borderBottom: '2px solid #ddd'
                        }}>TVA</th>
                        <th style={{ 
                          padding: '12px 8px', 
                          textAlign: 'right', 
                          fontWeight: 600,
                          borderBottom: '2px solid #ddd'
                        }}>Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.prestations.map((presta, index) => (
                        <tr key={index}>
                          <td style={{ padding: '12px 8px', borderBottom: '1px solid #eee' }}>
                            {presta.description || '-'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {presta.quantite}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                            {presta.prixUnitaire.toFixed(2)} €
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                            {presta.tva}%
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                            {(presta.quantite * presta.prixUnitaire).toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totaux */}
                <div style={{ 
                  marginLeft: 'auto', 
                  width: '300px',
                  background: '#f8f9fb',
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 40
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 8,
                    fontSize: 14
                  }}>
                    <span>Total HT :</span>
                    <span style={{ fontWeight: 600 }}>{totals.totalHT} €</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 12,
                    fontSize: 14,
                    paddingBottom: 12,
                    borderBottom: '1px solid #ddd'
                  }}>
                    <span>TVA :</span>
                    <span style={{ fontWeight: 600 }}>{totals.totalTVA} €</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#635BFF'
                  }}>
                    <span>Total TTC :</span>
                    <span>{totals.totalTTC} €</span>
                  </div>
                </div>

                {/* Logo Shooty en bas à gauche */}
                <div style={{ 
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #635BFF10, #FF7F5010)',
                  borderRadius: 12,
                  border: '1px solid #635BFF20'
                }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" rx="8" fill="#635BFF"/>
                    <circle cx="20" cy="16" r="5" stroke="white" strokeWidth="2" fill="none"/>
                    <path d="M12 28 L15 22 L20 25 L25 20 L28 24 L28 30 L12 30 Z" fill="white"/>
                    <rect x="26" y="10" width="4" height="4" rx="1" fill="#FFD369"/>
                  </svg>
                  <div>
                    <div style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#635BFF',
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: 1.2
                    }}>
                      Shooty
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: '#999',
                      fontWeight: 500,
                      letterSpacing: '0.3px'
                    }}>
                      Plateforme de réservation photo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
