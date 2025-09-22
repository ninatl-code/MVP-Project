import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'

export default function PrestationsPrestataire() {
  const [prestations, setPrestations] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedPrestation, setSelectedPrestation] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const fetchUserAndPrestations = async () => {
      // Récupérer l'id du prestataire connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Récupérer les annonces actives liées à ce prestataire
        const { data, error } = await supabase
          .from('annonces')
          .select('id, titre, description, photos, tarif_unit, unit_tarif, prix_fixe, acompte_percent, equipement, prestation, ville, actif, prestataire')
          .eq('actif', true)
          .eq('prestataire', user.id)
        if (!error) setPrestations(data || [])
      }
    }
    fetchUserAndPrestations()
  }, [])

  // Gestion de la sélection (adaptée pour ne sélectionner que des annonces du même état)
  const handleCheck = (id, checked) => {
    const clicked = prestations.find(p => p.id === id);
    if (!clicked) return;
    // Si on coche une annonce désactivée
    if (clicked.actif === false && checked) {
      // On ne garde que les désactivées dans la sélection
      setSelectedIds(prev => [
        ...prev.filter(selId => {
          const p = prestations.find(pp => pp.id === selId);
          return p && p.actif === false;
        }),
        id
      ]);
    }
    // Si on coche une annonce activée
    else if (clicked.actif !== false && checked) {
      // On ne garde que les activées dans la sélection
      setSelectedIds(prev => [
        ...prev.filter(selId => {
          const p = prestations.find(pp => pp.id === selId);
          return p && p.actif !== false;
        }),
        id
      ]);
    }
    // Si on décoche
    else {
      setSelectedIds(prev => prev.filter(_id => _id !== id));
    }
  }

  // Suppression des annonces sélectionnées
  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    const { error } = await supabase
      .from('annonces')
      .delete()
      .in('id', selectedIds)
    if (!error) {
      setPrestations(prev => prev.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
    } else {
      alert("Erreur lors de la suppression : " + error.message)
    }
    setShowConfirm(false)
  }

  // Désactivation des annonces sélectionnées
  const handleDisable = async () => {
    if (selectedIds.length === 0) return
    const { error } = await supabase
      .from('annonces')
      .update({ actif: false })
      .in('id', selectedIds)
    if (!error) {
      setPrestations(prev =>
        prev.map(p =>
          selectedIds.includes(p.id) ? { ...p, actif: false } : p
        )
      )
      setSelectedIds([])
    } else {
      alert("Erreur lors de la désactivation : " + error.message)
    }
    setShowDisableConfirm(false)
  }

  // Réactivation des annonces sélectionnées
  const handleReactivate = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase
      .from('annonces')
      .update({ actif: true })
      .in('id', selectedIds);
    if (!error) {
      setPrestations(prev =>
        prev.map(p =>
          selectedIds.includes(p.id) ? { ...p, actif: true } : p
        )
      );
      setSelectedIds([]);
    } else {
      alert("Erreur lors de la réactivation : " + error.message);
    }
    setShowDisableConfirm(false);
  }

  // Affichage d'une carte prestation à partir des infos de la table annonces
  function PrestationCard({ prestation }) {
    return (
      <div
        style={{
          background: prestation.actif === false ? '#f3f3f3' : '#fff',
          borderRadius: 22,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          width: 320,
          marginBottom: 18,
          marginRight: 18,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative',
          opacity: prestation.actif === false ? 0.6 : 1
        }}
        onClick={async e => {
          if (e.target.type === 'checkbox') return;
          // Recherche les infos complètes de l'annonce dans la table annonces
          const { data: annonceDetails, error } = await supabase
            .from('annonces')
            .select('*, prestations(*), villes(*)')
            .eq('id', prestation.id)
            .single();
          if (!error && annonceDetails) {
            setSelectedPrestation({
              ...annonceDetails,
              prestation: annonceDetails.prestations?.nom || '',
              prestationType: annonceDetails.prestations?.type || '',
              ville: annonceDetails.villes?.ville || '',
              // Ajoute les autres champs nécessaires ici
            });
            setShowModal(true);
          } else {
            alert("Impossible de charger les détails de l'annonce.");
          }
        }}
      >
        {/* Case à cocher en haut à droite */}
        <input
          type="checkbox"
          checked={selectedIds.includes(prestation.id)}
          onChange={e => handleCheck(prestation.id, e.target.checked)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            width: 22,
            height: 22,
            accentColor: '#bfa046',
            cursor: 'pointer'
          }}
          onClick={e => e.stopPropagation()}
        />
        <div style={{
          width: '100%',
          height: 210,
          background: '#f3f3f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {prestation.photos && prestation.photos.length > 0 ? (
            <img
              src={prestation.photos[0]}
              alt={prestation.titre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: 32
            }}>
              Pas de photo
            </div>
          )}
        </div>
        <div style={{padding: '22px 20px 18px 20px'}}>
          <div style={{fontWeight:700, fontSize:18, marginBottom:6, lineHeight:1.2}}>
            {prestation.titre}
          </div>
          <div style={{fontSize:15, color:'#888', marginBottom:10}}>
            {prestation.description}
          </div>
          <div style={{fontSize:15, color:'#444', marginBottom:6}}>
            <b>Tarif unitaire :</b> {prestation.tarif_unit} {prestation.unit_tarif}
          </div>
          <div style={{fontSize:15, color:'#444', marginBottom:6}}>
            <b>Prix fixe :</b> {prestation.prix_fixe ? "Oui" : "Non"}
          </div>
          <div style={{fontSize:15, color:'#444', marginBottom:6}}>
            <b>Acompte à la réservation :</b> {prestation.acompte_percent ? `${prestation.acompte_percent}%` : "Non renseigné"}
          </div>
          <div style={{fontSize:15, color:'#444'}}>
            <b>Équipements :</b> {prestation.equipement}
          </div>

          {prestation.actif === false && (
            <div style={{
              marginTop: 10,
              color: '#d9534f',
              fontWeight: 600,
              fontSize: 15
            }}>
              Désactivée
            </div>
          )}
        </div>
      </div>
    )
  }

  // Pop-up d'ajout/modification/aperçu de prestation
  function AddPrestationModal({ open, onClose, prestation }) {
    const isEdit = !!prestation;
    const [form, setForm] = useState({
      titre: '',
      type: '',
      categorie: '',
      ville: '',
      description: '',
      tarif_unit: '',
      unit_tarif: '',
      prix_fixe: false,
      acompte_percent: '',
      photos: [],
      modeles: [],
      conditions: '',
      categories: []
    });

    const [categoriesList, setCategoriesList] = useState([]);
    const [villesList, setVillesList] = useState([]);

    useEffect(() => {
      const fetchCategories = async () => {
        const { data, error } = await supabase
          .from('prestations')
          .select('nom')
          .neq('nom', null);
        if (!error && data) {
          const uniques = [...new Set(data.map(d => d.nom).filter(Boolean))];
          setCategoriesList(uniques);
        }
      };
      const fetchVilles = async () => {
        const { data, error } = await supabase
          .from('villes')
          .select('ville');
        if (!error && data) {
          setVillesList(data.map(v => v.ville));
        }
      };
      fetchCategories();
      fetchVilles();
    }, []);

    useEffect(() => {
      if (isEdit && prestation) {
        setForm({
          titre: prestation.titre || '',
          type: prestation.prestationType || prestation.type || '',
          categorie: prestation.categorie || '',
          ville: prestation.ville || '',
          description: prestation.description || '',
          tarif_unit: prestation.tarif_unit || '',
          unit_tarif: prestation.unit_tarif || '',
          prix_fixe: prestation.prix_fixe || false,
          acompte_percent: prestation.acompte_percent || '',
          photos: prestation.photos || [],
          modeles: prestation.modeles || [],
          conditions: prestation.conditions || '',
          categories: prestation.categories || []
        });
      }
    }, [prestation, isEdit]);

    // Conversion fichier en base64
    const fileToBase64 = file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

    const handleCheckbox = (cat) => {
      setForm(f => ({
        ...f,
        categories: f.categories.includes(cat)
          ? f.categories.filter(c => c !== cat)
          : [...f.categories, cat]
      }))
    }

    if (!open) return null
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {/* Modal principal élargi pour meilleure visibilité */}
        <div style={{
          background: '#fdf6ec',
          borderRadius: 18,
          padding: 38,
          minWidth: 680,
          maxWidth: 900,
          maxHeight: '90vh',
          boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
          position: 'relative',
          fontSize: 13,
          overflowY: 'auto' // Ajout du curseur vertical
        }}>
          <button
            onClick={() => {
              setSelectedPrestation(null);
              onClose();
            }}
            style={{
              position: 'absolute', top: 18, right: 18, background: 'none', border: 'none',
              fontSize: 26, color: '#bfa046', cursor: 'pointer', fontWeight: 700
            }}
            aria-label="Fermer"
          >×</button>
          <h1 style={{fontWeight:700, fontSize:18, marginBottom:18}}>
            {isEdit ? "Aperçu / Modifier la prestation" : "Ajouter une prestation"}
          </h1>
          {/* Sélection du nom de la prestation */}
          <select
            value={form.titre}
            onChange={async e => {
              const nom = e.target.value;
              setForm(f => ({ ...f, titre: nom }));
              // Cherche le type correspondant en background
              const { data, error } = await supabase
                .from('prestations')
                .select('type')
                .eq('nom', nom)
                .single();
              if (!error && data) {
                setForm(f => ({ ...f, type: data.type }));
              } else {
                setForm(f => ({ ...f, type: '' }));
              }
            }}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', marginBottom: 12, fontSize: 13, background: '#fff' }}
            disabled={isEdit}
          >
            <option value="">Type de prestation</option>
            {categoriesList && categoriesList.map(nom => (
              <option key={nom} value={nom}>{nom}</option>
            ))}
          </select>

          {/* Champs dynamiques selon le type sélectionné */}
          {form.type === 'service' && (
            <>
              {/* Prix fixe */}
              <div style={{marginBottom: 12}}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.prix_fixe}
                    onChange={e => setForm(f => ({ ...f, prix_fixe: e.target.checked }))}
                    disabled={isEdit}
                    style={{marginRight: 8}}
                  />
                  Prix fixe ?
                </label>
              </div>
              {/* Bloc ville pour service */}
              <div style={{display:'flex', gap:10, marginBottom:12}}>
                <select
                  value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  style={{ flex:1, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  disabled={isEdit}
                >
                  <option value="">Ville</option>
                  {villesList.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              {/* Bloc description pour service */}
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 12, background: '#fff', minHeight: 40, resize: 'vertical' }}
                disabled={isEdit}
              />
              {/* Tarification et unité si prix fixe */}
              {form.prix_fixe && (
                <>
                  <input
                    type="text"
                    placeholder="Tarif unitaire"
                    value={form.tarif_unit}
                    onChange={e => setForm(f => ({ ...f, tarif_unit: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 10, background: '#fff' }}
                    required
                    disabled={isEdit}
                  />
                  <input
                    type="text"
                    placeholder="Unité du tarif (ex: heure, jour, prestation...)"
                    value={form.unit_tarif}
                    onChange={e => setForm(f => ({ ...f, unit_tarif: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 10, background: '#fff' }}
                    required
                    disabled={isEdit}
                  />
                </>
              )}
              {/* Pourcentage acompte */}
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Pourcentage d'acompte à la réservation (%)"
                value={form.acompte_percent}
                onChange={e => setForm(f => ({ ...f, acompte_percent: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 10, background: '#fff' }}
                disabled={isEdit}
              />
              {/* Bloc équipements pour service */}
              <input
                type="text"
                placeholder="Équipements"
                value={form.equipements}
                onChange={e => setForm(f => ({ ...f, equipements: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 10, background: '#fff' }}
                disabled={isEdit}
              />
              {/* Bloc photos pour service */}
              <div style={{marginBottom: 10}}>
                <label>Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async e => {
                    const files = Array.from(e.target.files);
                    const base64Photos = [];
                    for (let file of files) {
                      const base64 = await fileToBase64(file);
                      base64Photos.push(base64);
                    }
                    setForm(f => ({ ...f, photos: base64Photos }));
                  }}
                  disabled={isEdit}
                />
                <div style={{display:'flex', gap:6, marginTop:8}}>
                  {form.photos && form.photos.map((b64, idx) => (
                    <img key={idx} src={`data:image/*;base64,${b64}`} alt="photo" style={{width:48, height:48, objectFit:'cover', borderRadius:8}} />
                  ))}
                </div>
              </div>
            </>
          )}
          {form.type === 'produit' && (
            <>
              {/* Bloc ville pour produit */}
              <div style={{display:'flex', gap:10, marginBottom:12}}>
                <select
                  value={form.ville}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  style={{ flex:1, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  disabled={isEdit}
                >
                  <option value="">Ville</option>
                  {villesList.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              {/* Description du produit */}
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 10, background: '#fff', minHeight: 50, resize: 'vertical' }}
                maxLength={120}
                disabled={isEdit}
              />
              {/* Photos du produit */}
              <div style={{marginBottom: 10}}>
                <label>Photos (base64)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async e => {
                    const files = Array.from(e.target.files);
                    const base64Photos = [];
                    for (let file of files) {
                      const base64 = await fileToBase64(file);
                      base64Photos.push(base64);
                    }
                    setForm(f => ({ ...f, photos: base64Photos }));
                  }}
                  disabled={isEdit}
                />
                <div style={{display:'flex', gap:6, marginTop:8}}>
                  {form.photos && form.photos.map((b64, idx) => (
                    <img key={idx} src={`data:image/*;base64,${b64}`} alt="photo" style={{width:48, height:48, objectFit:'cover', borderRadius:8}} />
                  ))}
                </div>
              </div>
              {/* Modèles proposés */}
              <div style={{fontWeight:600, fontSize:14, marginBottom:8}}>
                Modèles proposés ({form.modeles && form.modeles.length ? `${form.modeles.length} créé${form.modeles.length > 1 ? 's' : ''}` : 'aucun'})
              </div>
              {/* Ligne 1 : titre, description, prix */}
              <div style={{display:'flex', gap:12, marginBottom:8}}>
                <input
                  type="text"
                  placeholder="Titre du modèle"
                  value={form.modeleDraft?.titre || ''}
                  onChange={e => setForm(f => ({ ...f, modeleDraft: {...f.modeleDraft, titre: e.target.value} }))}
                  style={{ flex:1, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  maxLength={30}
                  disabled={isEdit}
                />
                <input
                  type="text"
                  placeholder="Description du modèle"
                  value={form.modeleDraft?.description || ''}
                  onChange={e => setForm(f => ({ ...f, modeleDraft: {...f.modeleDraft, description: e.target.value} }))}
                  style={{ flex:2, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  maxLength={60}
                  disabled={isEdit}
                />
                <input
                  type="numeric"
                  placeholder="prix du modèle (MAD)"
                  value={form.modeleDraft?.prix || '0'}
                  onChange={e => setForm(f => ({ ...f, modeleDraft: {...f.modeleDraft, prix: e.target.value} }))}
                  style={{ flex:1, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  maxLength={30}
                  disabled={isEdit}
                />
              </div>
              {/* Ligne 2 : PJ et bouton ajouter */}
              <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16}}>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files);
                      setForm(f => ({
                        ...f,
                        modeleDraft: {
                          ...f.modeleDraft,
                          photos: files
                        }
                      }));
                    }}
                  />
                  {/* Preview des photos */}
                  <div style={{display:'flex', gap:6, marginTop:8}}>
                    {form.modeleDraft?.photos && form.modeleDraft.photos.map((file, idx) => (
                      <img key={idx} src={typeof file === 'string' ? file : URL.createObjectURL(file)} alt="photo modèle" style={{width:48, height:48, objectFit:'cover', borderRadius:8}} />
                    ))}
                  </div>
                </div>
                <button
                  style={{background:'#f8e1ea', color:'#222', border:'none', borderRadius:10, padding:'8px 18px', fontWeight:600, fontSize:14, cursor:'pointer'}}
                  onClick={async () => {
                    // Upload des photos du modèle
                    let photoUrls = [];
                    const files = form.modeleDraft?.photos || [];
                    for (let file of files) {
                      if (file && typeof file !== 'string') {
                        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
                        const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
                        if (!error && data) {
                          const { publicUrl } = supabase.storage.from('photos').getPublicUrl(fileName).data;
                          photoUrls.push(publicUrl);
                        }
                      } else if (typeof file === 'string') {
                        photoUrls.push(file);
                      }
                    }
                    // Sauvegarde dans la table modeles
                    await supabase.from('modeles').insert([
                      {
                        annonce_id: prestation?.id,
                        titre: form.modeleDraft?.titre || '',
                        description: form.modeleDraft?.description || '',
                        photo_url: photoUrls
                      }
                    ]);
                    // Ajoute le modèle à la liste locale
                    setForm(f => ({
                      ...f,
                      modeles: [...(f.modeles || []), {
                        titre: f.modeleDraft?.titre || '',
                        description: f.modeleDraft?.description || '',
                        photos: photoUrls
                      }],
                      modeleDraft: { titre: '', description: '', photos: [] }
                    }));
                  }}
                >Ajouter ce modèle</button>
              </div>
              {/* Conditions d'annulation */}
              <textarea
                placeholder="Conditions d'annulation"
                value={form.conditions}
                onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, marginBottom: 16, background: '#fff', minHeight: 40, resize: 'vertical' }}
                maxLength={80}
                disabled={isEdit}
              />
            </>
          )}
  
          <div style={{display:'flex', justifyContent:'space-between', marginTop:18}}>
            {prestation ? (
              <button
                style={{
                  background:'#bfa046',
                  color:'#fff',
                  border:'none',
                  borderRadius:12,
                  padding:'13px 38px',
                  fontWeight:600,
                  fontSize:18,
                  cursor:'pointer'
                }}
                onClick={async () => {
                  // --- Récupération de l'id de la prestation sélectionnée (depuis la table prestations) ---
                  let prestationId = null
                  let prestationType = ''
                  if (form.titre) {
                    const { data: prestationData } = await supabase
                      .from('prestations')
                      .select('id, type')
                      .eq('nom', form.titre)
                      .single()
                    prestationId = prestationData?.id || null // <-- ici on récupère l'id
                    prestationType = prestationData?.type || ''
                  }

                  // Récupérer l'id de la ville
                  let villeId = null
                  if (form.ville) {
                    const { data: villeData } = await supabase
                      .from('villes')
                      .select('id')
                      .eq('ville', form.ville)
                      .single()
                    villeId = villeData?.id || null
                  }

                  // Upload des photos (stockage Supabase)
                  let photoUrls = []
                  for (let i = 0; i < form.photos.length; i++) {
                    const file = form.photos[i]
                    if (file && typeof file !== 'string') {
                      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`
                      const { data, error } = await supabase.storage
                        .from('photos')
                        .upload(fileName, file)
                      if (!error && data) {
                        const { publicUrl } = supabase
                          .storage
                          .from('photos')
                          .getPublicUrl(fileName).data
                        photoUrls.push(publicUrl)
                      }
                    } else if (typeof file === 'string') {
                      photoUrls.push(file)
                    }
                  }

                  // Mise à jour de l'annonce existante
                  const { error: updateError } = await supabase
                    .from('annonces')
                    .update({
                      titre: form.titre,
                      prestation: prestationId,
                      ville: villeId,
                      description: form.description,
                      photos: photoUrls,
                      tarification: form.tarification,
                      equipement: form.equipements
                    })
                    .eq('id', prestation.id)

                  if (!updateError) {
                    setSelectedPrestation(null)
                    onClose()
                  } else {
                    alert("Erreur lors de la mise à jour : " + updateError.message)
                  }
                }}
              >Sauvegarder</button>
            ) : (
              <button
                style={{
                  background:'#bfa046',
                  color:'#fff',
                  border:'none',
                  borderRadius:12,
                  padding:'13px 38px',
                  fontWeight:600,
                  fontSize:18,
                  cursor:'pointer'
                }}
                onClick={async () => {
                  // Récupérer l'id de la prestation (type)
                  let prestationId = null;
                  if (form.categories.length > 0) {
                    const { data: prestationData } = await supabase
                      .from('prestations')
                      .select('id')
                      .eq('nom', form.categories[0])
                      .single();
                    prestationId = prestationData?.id || null;
                  }

                  // Récupérer l'id de la ville
                  let villeId = null;
                  if (form.ville) {
                    const { data: villeData } = await supabase
                      .from('villes')
                      .select('id')
                      .eq('ville', form.ville)
                      .single();
                    villeId = villeData?.id || null;
                  }

                  // Ajout dans la table annonces avec les nouveaux champs
                  if (!prestationId) {
                    alert("Erreur : aucune prestation sélectionnée.");
                    return;
                  }

                  // Validation des champs obligatoires si prix_fixe
                  if (form.type === 'service' && form.prix_fixe) {
                    if (!form.tarif_unit || !form.unit_tarif) {
                      alert("Veuillez renseigner le tarif unitaire et son unité.");
                      return;
                    }
                  }

                  const { error: insertError } = await supabase
                    .from('annonces')
                    .insert([{
                      titre: form.titre,
                      prestation: prestationId,
                      ville: villeId,
                      description: form.description,
                      photos: form.photos, // tableau de base64
                      tarif_unit: form.tarif_unit,
                      unit_tarif: form.unit_tarif,
                      prix_fixe: form.prix_fixe,
                      acompte_percent: form.acompte_percent,
                      equipement: form.equipements,
                      prestataire: userId
                    }]);

                  if (!insertError) {
                    setForm({
                      titre: '',
                      categories: [],
                      ville: '',
                      description: '',
                      tarif_unit: '',
                      unit_tarif: '',
                      prix_fixe: false,
                      acompte_percent: '',
                      equipements: '',
                      photos: []
                    });
                    onClose();
                  } else {
                    alert("Erreur lors de l'ajout : " + insertError.message);
                  }
                }}
              >Ajouter</button>
            )}
            <button
              style={{
                background:'#bfa046',
                color:'#fff',
                border:'none',
                borderRadius:12,
                padding:'13px 38px',
                fontWeight:600,
                fontSize:18,
                cursor:'pointer'
              }}
              onClick={() => {
                setSelectedPrestation(null)
                onClose()
              }}
            >Fermer</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PrestataireHeader />
      <div style={{background:'#f8fafc', minHeight:'100vh', padding:'40px 0'}}>
        <div style={{maxWidth:1200, margin:'0 auto'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32}}>
            <h1 style={{fontWeight:700, fontSize:30}}>Mes Prestations</h1>
            <div style={{display:'flex', gap:12}}>
              <button
                style={{
                  background:'#f8e1ea',
                  color:'#222',
                  border:'none',
                  borderRadius:16,
                  padding:'8px 10px',
                  fontWeight:600,
                  fontSize:14,
                  cursor:'pointer',
                  transition:'background 0.2s'
                }}
                onClick={() => {
                  setSelectedPrestation(null)
                  setShowModal(true)
                }}
              >
                Ajouter une prestation
              </button>
              <button
                style={{
                  background: selectedIds.length > 0 ? '#d9534f' : '#e0e0e0',
                  color: selectedIds.length > 0 ? '#fff' : '#888',
                  border:'none',
                  borderRadius:16,
                  padding:'8px 18px',
                  fontWeight:600,
                  fontSize:14,
                  cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition:'background 0.2s'
                }}
                disabled={selectedIds.length === 0}
                onClick={() => setShowConfirm(true)}
              >
                Supprimer une annonce
              </button>
              <button
                style={{
                  background: selectedIds.length > 0 ? '#f0ad4e' : '#e0e0e0',
                  color: selectedIds.length > 0 ? '#fff' : '#888',
                  border:'none',
                  borderRadius:16,
                  padding:'8px 18px',
                  fontWeight:600,
                  fontSize:14,
                  cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition:'background 0.2s'
                }}
                disabled={selectedIds.length === 0}
                onClick={() => setShowDisableConfirm(true)}
              >
                {/* Si la sélection contient uniquement des désactivées, on propose de réactiver */}
                {selectedIds.length > 0 && selectedIds.every(id => {
                  const p = prestations.find(pp => pp.id === id);
                  return p && p.actif === false;
                }) ? "Réactiver une annonce" : "Désactiver une prestation"}
              </button>
            </div>
          </div>
          <div style={{
            display:'flex',
            flexWrap:'wrap',
            gap:'0 18px'
          }}>
            {prestations.map(prestation => (
              <PrestationCard key={prestation.id} prestation={prestation} />
            ))}
          </div>
        </div>
        <AddPrestationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          prestation={selectedPrestation}
        />
        {showConfirm && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              minWidth: 340,
              maxHeight: '90vh',
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              textAlign: 'center',
              overflowY: 'auto' // Ajout du curseur vertical
            }}>
              <div style={{fontSize:22, fontWeight:600, marginBottom:18}}>
                Voulez-vous vraiment supprimer {selectedIds.length > 1 ? 'ces annonces' : 'cette annonce'} ?
              </div>
              <div style={{display:'flex', justifyContent:'center', gap:18, marginTop:18}}>
                <button
                  style={{
                    background:'#d9534f',
                    color:'#fff',
                    border:'none',
                    borderRadius:10,
                    padding:'10px 32px',
                    fontWeight:600,
                    fontSize:16,
                    cursor:'pointer'
                  }}
                  onClick={handleDelete}
                >
                  Oui
                </button>
                <button
                  style={{
                    background:'#e0e0e0',
                    color:'#222',
                    border:'none',
                    borderRadius:10,
                    padding:'10px 32px',
                    fontWeight:600,
                    fontSize:16,
                    cursor:'pointer'
                  }}
                  onClick={() => setShowConfirm(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
        {showDisableConfirm && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              minWidth: 340,
              maxHeight: '90vh',
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              textAlign: 'center',
              overflowY: 'auto' // Ajout du curseur vertical
            }}>
              <div style={{fontSize:22, fontWeight:600, marginBottom:18}}>
                {selectedIds.length > 0 && selectedIds.every(id => {
                  const p = prestations.find(pp => pp.id === id);
                  return p && p.actif === false;
                })
                  ? `Voulez-vous vraiment réactiver ${selectedIds.length > 1 ? 'ces prestations' : 'cette prestation'} ?`
                  : `Voulez-vous vraiment désactiver ${selectedIds.length > 1 ? 'ces prestations' : 'cette prestation'} ?`
                }
              </div>
              <div style={{display:'flex', justifyContent:'center', gap:18, marginTop:18}}>
                <button
                  style={{
                    background: '#f0ad4e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 32px',
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    // Si tout est désactivé, on réactive, sinon on désactive
                    if (selectedIds.every(id => {
                      const p = prestations.find(pp => pp.id === id);
                      return p && p.actif === false;
                    })) {
                      handleReactivate();
                    } else {
                      handleDisable();
                    }
                  }}
                >
                  Oui
                </button>
                <button
                  style={{
                    background:'#e0e0e0',
                    color:'#222',
                    border:'none',
                    borderRadius:10,
                    padding:'10px 32px',
                    fontWeight:600,
                    fontSize:16,
                    cursor:'pointer'
                  }}
                  onClick={() => setShowDisableConfirm(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
