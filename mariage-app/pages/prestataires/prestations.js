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
  const [editingModele, setEditingModele] = useState(null) // Modèle en cours d'édition
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // ID du modèle à supprimer

  useEffect(() => {
    const fetchUserAndPrestations = async () => {
      // Récupérer l'id du prestataire connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Récupérer toutes les annonces (actives et désactivées) liées à ce prestataire
        const { data, error } = await supabase
          .from('annonces')
          .select('id, titre, description, photos, tarif_unit, unit_tarif, prix_fixe, acompte_percent, equipement, prestation, ville, actif, prestataire')
          .eq('prestataire', user.id)
          .order('created_at', { ascending: false })
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
          
          // Charger les modèles existants si c'est un produit
          let modelesExistants = [];
          if (annonceDetails?.prestations?.type === 'produit') {
            const { data: modelesData, error: modelesError } = await supabase
              .from('modeles')
              .select('*')
              .eq('annonce_id', prestation.id)
              .order('created_at', { ascending: true });
            
            if (!modelesError && modelesData) {
              modelesExistants = modelesData;
              console.log('Modèles existants chargés:', modelesExistants); // Debug
            }
          }
          
          if (!error && annonceDetails) {
            console.log('Détails annonce récupérés:', annonceDetails); // Debug
            setSelectedPrestation({
              ...annonceDetails,
              prestation: annonceDetails.prestations?.nom || annonceDetails.titre || '',
              prestationType: annonceDetails.prestations?.type || '',
              ville: annonceDetails.villes?.ville || '',
              villeId: annonceDetails.ville,
              prestationId: annonceDetails.prestation,
              modelesExistants: modelesExistants // Ajouter les modèles existants
            });
            setShowModal(true);
          } else {
            console.error('Erreur lors du chargement:', error);
            alert("Impossible de charger les détails de l'annonce: " + (error?.message || 'Erreur inconnue'));
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
              src={
                prestation.photos[0].startsWith('data:') 
                  ? prestation.photos[0] 
                  : `data:image/*;base64,${prestation.photos[0]}`
              }
              alt={prestation.titre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div style={{
            width: '100%',
            height: '100%',
            display: prestation.photos && prestation.photos.length > 0 ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bbb',
            fontSize: 24,
            fontWeight: 500
          }}>
            📷 Pas de photo
          </div>
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
      tarif_unit: '0',
      unit_tarif: '',
      prix_fixe: false,
      acompte_percent: '0',
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
        console.log('Initialisation formulaire avec:', prestation); // Debug
        setForm({
          titre: prestation.prestations?.nom || prestation.prestation || prestation.titre || '',
          type: prestation.prestations?.type || prestation.prestationType || prestation.type || '',
          categorie: prestation.categorie || '',
          ville: prestation.villes?.ville || prestation.ville || '',
          description: prestation.description || '',
          tarif_unit: prestation.tarif_unit || '',
          unit_tarif: prestation.unit_tarif || '',
          prix_fixe: Boolean(prestation.prix_fixe),
          acompte_percent: prestation.acompte_percent || '',
          equipements: prestation.equipement || '',
          photos: Array.isArray(prestation.photos) ? prestation.photos : [],
          modeles: Array.isArray(prestation.modelesExistants) ? prestation.modelesExistants : [],
          conditions: prestation.conditions || '',
          categories: prestation.categories || [],
          modeleDraft: { titre: '', description: '', prix: '', photos: [] } // Réinitialiser le draft
        });
      } else if (!isEdit) {
        // Réinitialiser le formulaire pour un nouvel ajout
        setForm({
          titre: '',
          type: '',
          categorie: '',
          ville: '',
          description: '',
          tarif_unit: '',
          unit_tarif: '',
          prix_fixe: false,
          acompte_percent: '',
          equipements: '',
          photos: [],
          modeles: [],
          conditions: '',
          categories: [],
          modeleDraft: { titre: '', description: '', prix: '', photos: [] }
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

    // Fonctions pour la gestion des modèles
    const handleEditModele = (modele) => {
      setEditingModele({
        ...modele,
        originalIndex: form.modeles.findIndex(m => m.id === modele.id)
      });
    };

    const handleSaveModele = async () => {
      if (!editingModele.titre || !editingModele.description) {
        alert('Veuillez renseigner le titre et la description du modèle.');
        return;
      }

      const { error } = await supabase
        .from('modeles')
        .update({
          titre: editingModele.titre,
          description: editingModele.description,
          prix: parseFloat(editingModele.prix) || 0,
          photos: editingModele.photos || []
        })
        .eq('id', editingModele.id);

      if (!error) {
        // Mettre à jour la liste locale
        setForm(prev => ({
          ...prev,
          modeles: prev.modeles.map(m => 
            m.id === editingModele.id ? editingModele : m
          )
        }));
        setEditingModele(null);
        alert('Modèle modifié avec succès!');
      } else {
        alert('Erreur lors de la modification: ' + error.message);
      }
    };

    const handleDeleteModele = async (modeleId) => {
      const { error } = await supabase
        .from('modeles')
        .delete()
        .eq('id', modeleId);

      if (!error) {
        // Retirer de la liste locale
        setForm(prev => ({
          ...prev,
          modeles: prev.modeles.filter(m => m.id !== modeleId)
        }));
        alert('Modèle supprimé avec succès!');
      } else {
        alert('Erreur lors de la suppression: ' + error.message);
      }
      setShowDeleteConfirm(null);
    };

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
          <h1 style={{
            fontWeight:700, 
            fontSize:18, 
            marginBottom:18,
            color: isEdit ? '#f0ad4e' : '#333',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            {isEdit ? (
              <>
                ✏️ Modifier la prestation
                <span style={{
                  fontSize: 12,
                  background: '#f0ad4e',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontWeight: 500
                }}>
                  MODE ÉDITION
                </span>
              </>
            ) : (
              <>➕ Ajouter une prestation</>
            )}
          </h1>
          
          {/* Message d'aide en mode édition */}
          {isEdit && (
            <div style={{
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: 8, 
              padding: 12, 
              marginBottom: 16,
              fontSize: 13,
              color: '#856404'
            }}>
              <div style={{fontWeight: 600, marginBottom: 4}}>💡 Mode modification :</div>
              <div>• Les champs en orange sont modifiables</div>
              <div>• Cliquez sur "Sauvegarder" pour enregistrer les modifications</div>
            </div>
          )}
          
          
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
            style={{ 
              width: '100%', 
              padding: '8px 10px', 
              borderRadius: 10, 
              border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
              marginBottom: 12, 
              fontSize: 13, 
              background: isEdit ? '#fff8f0' : '#fff',
              opacity: isEdit ? 0.8 : 1
            }}
            disabled={false}
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
                <label style={{ 
                  padding: '8px 12px', 
                  borderRadius: 8, 
                  background: isEdit ? '#fff8f0' : 'transparent',
                  border: isEdit ? '2px solid #f0ad4e' : 'none',
                  display: 'inline-block'
                }}>
                  <input
                    type="checkbox"
                    checked={form.prix_fixe}
                    onChange={e => setForm(f => ({ ...f, prix_fixe: e.target.checked }))}
                    disabled={false}
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
                  style={{ 
                    flex:1, 
                    padding: '8px 10px', 
                    borderRadius: 10, 
                    border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                    fontSize: 13, 
                    background: isEdit ? '#fff8f0' : '#fff' 
                  }}
                  disabled={false}
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
                style={{ 
                  width: '100%', 
                  padding: '8px 10px', 
                  borderRadius: 10, 
                  border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                  fontSize: 13, 
                  marginBottom: 12, 
                  background: isEdit ? '#fff8f0' : '#fff', 
                  minHeight: 40, 
                  resize: 'vertical' 
                }}
                disabled={false}
              />
              {/* Tarification et unité si prix fixe */}
              {form.prix_fixe && (
                <>
                  <input
                    type="text"
                    placeholder="Tarif unitaire"
                    value={form.tarif_unit}
                    onChange={e => setForm(f => ({ ...f, tarif_unit: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '8px 10px', 
                      borderRadius: 10, 
                      border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                      fontSize: 13, 
                      marginBottom: 10, 
                      background: isEdit ? '#fff8f0' : '#fff' 
                    }}
                    required
                    disabled={false}
                  />
                  <input
                    type="text"
                    placeholder="Unité du tarif (ex: heure, jour, prestation...)"
                    value={form.unit_tarif}
                    onChange={e => setForm(f => ({ ...f, unit_tarif: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '8px 10px', 
                      borderRadius: 10, 
                      border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                      fontSize: 13, 
                      marginBottom: 10, 
                      background: isEdit ? '#fff8f0' : '#fff' 
                    }}
                    required
                    disabled={false}
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
                style={{ 
                  width: '100%', 
                  padding: '8px 10px', 
                  borderRadius: 10, 
                  border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                  fontSize: 13, 
                  marginBottom: 10, 
                  background: isEdit ? '#fff8f0' : '#fff' 
                }}
                disabled={false}
              />
              {/* Bloc équipements pour service */}
              <input
                type="text"
                placeholder="Équipements"
                value={form.equipements}
                onChange={e => setForm(f => ({ ...f, equipements: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '8px 10px', 
                  borderRadius: 10, 
                  border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                  fontSize: 13, 
                  marginBottom: 10, 
                  background: isEdit ? '#fff8f0' : '#fff' 
                }}
                disabled={false}
              />
              {/* Bloc photos pour service */}
              <div style={{marginBottom: 10}}>
                <label>Photos {isEdit && <span style={{color: '#f0ad4e', fontSize: 12}}>- Mode modification - Vous pouvez ajouter ou supprimer</span>}</label>
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
                    // En mode édition, ajouter aux photos existantes
                    if (isEdit) {
                      setForm(f => ({ ...f, photos: [...f.photos, ...base64Photos] }));
                    } else {
                      setForm(f => ({ ...f, photos: base64Photos }));
                    }
                  }}
                  disabled={false}
                  style={{
                    border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd',
                    borderRadius: 8,
                    padding: '8px',
                    background: isEdit ? '#fff8f0' : '#fff'
                  }}
                />
                <div style={{display:'flex', gap:6, marginTop:8, flexWrap: 'wrap'}}>
                  {form.photos && form.photos.map((b64, idx) => (
                    <div key={idx} style={{position: 'relative'}}>
                      <img 
                        src={b64.startsWith('data:') ? b64 : `data:image/*;base64,${b64}`} 
                        alt="photo" 
                        style={{width:60, height:60, objectFit:'cover', borderRadius:8, border: '2px solid #ddd'}} 
                      />
                      <button
                        onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))}
                        style={{
                          position: 'absolute',
                          top: -8, right: -8,
                          background: '#d9534f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20, height: 20,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isEdit ? 0.9 : 1
                        }}
                        title={isEdit ? 'Supprimer cette photo (mode édition)' : 'Supprimer cette photo'}
                      >
                        ×
                      </button>
                    </div>
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
                  style={{ 
                    flex:1, 
                    padding: '8px 10px', 
                    borderRadius: 10, 
                    border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                    fontSize: 13, 
                    background: isEdit ? '#fff8f0' : '#fff' 
                  }}
                  disabled={false}
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
                style={{ 
                  width: '100%', 
                  padding: '8px 10px', 
                  borderRadius: 10, 
                  border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                  fontSize: 13, 
                  marginBottom: 10, 
                  background: isEdit ? '#fff8f0' : '#fff', 
                  minHeight: 50, 
                  resize: 'vertical' 
                }}
                maxLength={120}
                disabled={false}
              />
              {/* Photos du produit */}
              <div style={{marginBottom: 10}}>
                <label>Photos {isEdit}</label>
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
                    // En mode édition, ajouter aux photos existantes
                    if (isEdit) {
                      setForm(f => ({ ...f, photos: [...f.photos, ...base64Photos] }));
                    } else {
                      setForm(f => ({ ...f, photos: base64Photos }));
                    }
                  }}
                  disabled={false}
                  style={{
                    border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd',
                    borderRadius: 8,
                    padding: '8px',
                    background: isEdit ? '#fff8f0' : '#fff'
                  }}
                />
                <div style={{display:'flex', gap:6, marginTop:8, flexWrap: 'wrap'}}>
                  {form.photos && form.photos.map((b64, idx) => (
                    <div key={idx} style={{position: 'relative'}}>
                      <img 
                        src={b64.startsWith('data:') ? b64 : `data:image/*;base64,${b64}`} 
                        alt="photo" 
                        style={{width:60, height:60, objectFit:'cover', borderRadius:8, border: '2px solid #ddd'}} 
                      />
                      <button
                        onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))}
                        style={{
                          position: 'absolute',
                          top: -8, right: -8,
                          background: '#d9534f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20, height: 20,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isEdit ? 0.9 : 1
                        }}
                        title={isEdit ? 'Supprimer cette photo (mode édition)' : 'Supprimer cette photo'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Modèles existants */}
              {isEdit && form.modeles && form.modeles.length > 0 && (
                <div style={{marginBottom: 20, padding: 16, background: '#f9f9f9', borderRadius: 12, border: '1px solid #e0e0e0'}}>
                  <div style={{fontWeight:600, fontSize:14, marginBottom:12, color: '#333'}}>
                    Modèles existants ({form.modeles.length})
                  </div>
                  {form.modeles.map((modele, idx) => (
                    <div key={modele.id || idx} style={{
                      background: '#fff', 
                      borderRadius: 10, 
                      padding: 14, 
                      marginBottom: 10, 
                      border: '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#333'}}>
                          {modele.titre}
                        </div>
                        <div style={{fontSize: 12, color: '#666', marginBottom: 6}}>
                          {modele.description}
                        </div>
                        <div style={{fontSize: 12, fontWeight: 600, color: '#bfa046'}}>
                          {modele.prix} MAD
                        </div>
                        {modele.photos && modele.photos.length > 0 && (
                          <div style={{display: 'flex', gap: 4, marginTop: 8}}>
                            {modele.photos.slice(0, 3).map((photo, photoIdx) => (
                              <img 
                                key={photoIdx}
                                src={photo.startsWith('data:') ? photo : `data:image/*;base64,${photo}`} 
                                alt={`Photo ${photoIdx + 1}`}
                                style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd'}}
                              />
                            ))}
                            {modele.photos.length > 3 && (
                              <div style={{
                                width: 40, height: 40, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#f0f0f0', borderRadius: 6, border: '1px solid #ddd',
                                fontSize: 10, color: '#666'
                              }}>
                                +{modele.photos.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{display: 'flex', gap: 8, marginLeft: 12}}>
                        <button
                          style={{
                            background: '#5bc0de', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600
                          }}
                          onClick={() => handleEditModele(modele)}
                        >
                          Modifier
                        </button>
                        <button
                          style={{
                            background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600
                          }}
                          onClick={() => setShowDeleteConfirm(modele.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Modèles proposés - Section pour ajouter un nouveau modèle */}
              <div style={{fontWeight:600, fontSize:14, marginBottom:8}}>
                {isEdit ? 'Ajouter un nouveau modèle' : `Modèles proposés (${form.modeles && form.modeles.length ? `${form.modeles.length} créé${form.modeles.length > 1 ? 's' : ''}` : 'aucun'})`}
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
                  disabled={false}
                />
                <input
                  type="text"
                  placeholder="Description du modèle"
                  value={form.modeleDraft?.description || ''}
                  onChange={e => setForm(f => ({ ...f, modeleDraft: {...f.modeleDraft, description: e.target.value} }))}
                  style={{ flex:2, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  maxLength={60}
                  disabled={false}
                />
                <input
                  type="number"
                  placeholder="prix du modèle (MAD)"
                  value={form.modeleDraft?.prix || ''}
                  onChange={e => setForm(f => ({ ...f, modeleDraft: {...f.modeleDraft, prix: e.target.value} }))}
                  style={{ flex:1, padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}
                  maxLength={30}
                  disabled={false}
                />
              </div>
              {/* Ligne 2 : PJ et bouton ajouter */}
              <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16}}>
                <div>
                  <label>Photos du modèle</label>
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
                      setForm(f => ({
                        ...f,
                        modeleDraft: {
                          ...f.modeleDraft,
                          photos: base64Photos
                        }
                      }));
                    }}
                    disabled={false}
                  />
                  {/* Preview des photos */}
                  <div style={{display:'flex', gap:6, marginTop:8, flexWrap: 'wrap'}}>
                    {form.modeleDraft?.photos && form.modeleDraft.photos.map((b64, idx) => (
                      <div key={idx} style={{position: 'relative'}}>
                        <img 
                          src={b64.startsWith('data:') ? b64 : `data:image/*;base64,${b64}`} 
                          alt="photo modèle" 
                          style={{width:48, height:48, objectFit:'cover', borderRadius:8, border: '2px solid #ddd'}} 
                        />
                        {!isEdit && (
                          <button
                            onClick={() => setForm(f => ({
                              ...f,
                              modeleDraft: {
                                ...f.modeleDraft,
                                photos: f.modeleDraft.photos.filter((_, i) => i !== idx)
                              }
                            }))}
                            style={{
                              position: 'absolute',
                              top: -5, right: -5,
                              background: '#d9534f',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: 18, height: 18,
                              fontSize: 10,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  style={{background:'#f8e1ea', color:'#222', border:'none', borderRadius:10, padding:'8px 18px', fontWeight:600, fontSize:14, cursor:'pointer'}}
                  onClick={async () => {
                    if (!form.modeleDraft?.titre || !form.modeleDraft?.description) {
                      alert('Veuillez renseigner le titre et la description du modèle.');
                      return;
                    }
                    
                    // Les photos sont déjà en base64
                    const photos = form.modeleDraft?.photos || [];
                    
                    // Sauvegarde dans la table modeles avec photos base64
                    const { error } = await supabase.from('modeles').insert([
                      {
                        annonce_id: prestation?.id,
                        titre: form.modeleDraft?.titre || '',
                        description: form.modeleDraft?.description || '',
                        prix: form.modeleDraft?.prix || 0,
                        photos: photos // tableau de base64
                      }
                    ]);
                    
                    if (!error) {
                      // Récupérer le modèle ajouté avec son ID depuis la base de données
                      const { data: newModele, error: fetchError } = await supabase
                        .from('modeles')
                        .select('*')
                        .eq('annonce_id', prestation?.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                      
                      if (!fetchError && newModele) {
                        // Ajouter le modèle avec son ID à la liste locale
                        setForm(f => ({
                          ...f,
                          modeles: [...(f.modeles || []), newModele],
                          modeleDraft: { titre: '', description: '', prix: '', photos: [] }
                        }));
                      }
                      alert('Modèle ajouté avec succès!');
                    } else {
                      alert('Erreur lors de l\'ajout du modèle: ' + error.message);
                    }
                  }}
                  disabled={!form.modeleDraft?.titre || !form.modeleDraft?.description}
                >Ajouter ce modèle</button>
              </div>
              {/* Conditions d'annulation */}
              <textarea
                placeholder="Conditions d'annulation"
                value={form.conditions}
                onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '8px 10px', 
                  borderRadius: 10, 
                  border: isEdit ? '2px solid #f0ad4e' : '1px solid #ddd', 
                  fontSize: 13, 
                  marginBottom: 16, 
                  background: isEdit ? '#fff8f0' : '#fff', 
                  minHeight: 40, 
                  resize: 'vertical' 
                }}
                maxLength={80}
                disabled={false}
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
                  // Validation des champs avant mise à jour
                  if (form.type === 'service' && form.prix_fixe) {
                    if (!form.tarif_unit || !form.unit_tarif) {
                      alert("Veuillez renseigner le tarif unitaire et son unité.");
                      return;
                    }
                    // Vérifier que le tarif unitaire est un nombre valide
                    if (form.tarif_unit && isNaN(parseFloat(form.tarif_unit))) {
                      alert("Le tarif unitaire doit être un nombre valide.");
                      return;
                    }
                  }
                  
                  // Vérifier que l'acompte est un pourcentage valide
                  if (form.acompte_percent && (isNaN(parseInt(form.acompte_percent)) || parseInt(form.acompte_percent) < 0 || parseInt(form.acompte_percent) > 100)) {
                    alert("L'acompte doit être un pourcentage entre 0 et 100.");
                    return;
                  }
                  
                  // --- Récupération de l'id de la prestation sélectionnée (depuis la table prestations) ---
                  let prestationId = null
                  let prestationType = ''
                  if (form.titre) {
                    const { data: prestationData, error: prestationError } = await supabase
                      .from('prestations')
                      .select('id, type')
                      .eq('nom', form.titre)
                      .single()
                    if (!prestationError && prestationData) {
                      prestationId = parseInt(prestationData.id)
                      prestationType = prestationData.type || ''
                    } else {
                      console.error('Erreur récupération prestation:', prestationError)
                    }
                  }

                  // Récupérer l'id de la ville
                  let villeId = null
                  if (form.ville) {
                    const { data: villeData, error: villeError } = await supabase
                      .from('villes')
                      .select('id')
                      .eq('ville', form.ville)
                      .single()
                    if (!villeError && villeData) {
                      villeId = parseInt(villeData.id)
                    } else if (prestation.villeId || prestation.ville) {
                      villeId = parseInt(prestation.villeId || prestation.ville)
                    }
                  } else if (prestation.villeId || prestation.ville) {
                    villeId = parseInt(prestation.villeId || prestation.ville)
                  }

                  // Les photos sont déjà en base64, pas besoin d'upload
                  // Préparer les données en gérant les valeurs numériques
                  const updateData = {
                    titre: form.titre || null,
                    prestation: prestationId || null,
                    ville: villeId || null,
                    description: form.description || null,
                    photos: form.photos || [],
                    tarif_unit: form.tarif_unit ? parseFloat(form.tarif_unit) : null,
                    unit_tarif: form.unit_tarif || null,
                    prix_fixe: Boolean(form.prix_fixe),
                    acompte_percent: form.acompte_percent ? parseInt(form.acompte_percent) : null,
                    equipement: form.equipements || null
                  };
                  
                  console.log('Données à mettre à jour:', updateData); // Debug
                  
                  // Mise à jour de l'annonce existante
                  const { error: updateError } = await supabase
                    .from('annonces')
                    .update(updateData)
                    .eq('id', prestation.id)

                  if (!updateError) {
                    setSelectedPrestation(null)
                    onClose()
                    // Rafraîchir la liste des prestations
                    const { data, error } = await supabase
                      .from('annonces')
                      .select('id, titre, description, photos, tarif_unit, unit_tarif, prix_fixe, acompte_percent, equipement, prestation, ville, actif, prestataire')
                      .eq('prestataire', userId)
                      .order('created_at', { ascending: false });
                    if (!error) setPrestations(data || []);
                    alert('Annonce mise à jour avec succès!');
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
                  if (form.titre) {
                    const { data: prestationData, error: prestationError } = await supabase
                      .from('prestations')
                      .select('id')
                      .eq('nom', form.titre)
                      .single();
                    if (!prestationError && prestationData) {
                      prestationId = parseInt(prestationData.id);
                    }
                  }

                  // Récupérer l'id de la ville
                  let villeId = null;
                  if (form.ville) {
                    const { data: villeData, error: villeError } = await supabase
                      .from('villes')
                      .select('id')
                      .eq('ville', form.ville)
                      .single();
                    if (!villeError && villeData) {
                      villeId = parseInt(villeData.id);
                    }
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
                    // Vérifier que le tarif unitaire est un nombre valide
                    if (form.tarif_unit && isNaN(parseFloat(form.tarif_unit))) {
                      alert("Le tarif unitaire doit être un nombre valide.");
                      return;
                    }
                  }
                  
                  // Vérifier que l'acompte est un pourcentage valide
                  if (form.acompte_percent && (isNaN(parseInt(form.acompte_percent)) || parseInt(form.acompte_percent) < 0 || parseInt(form.acompte_percent) > 100)) {
                    alert("L'acompte doit être un pourcentage entre 0 et 100.");
                    return;
                  }

                  // Préparer les données d'insertion en gérant les valeurs numériques
                  const insertData = {
                    titre: form.titre || null,
                    prestation: prestationId || null,
                    ville: villeId || null,
                    description: form.description || null,
                    photos: form.photos || [],
                    tarif_unit: form.tarif_unit ? parseFloat(form.tarif_unit) : null,
                    unit_tarif: form.unit_tarif || null,
                    prix_fixe: Boolean(form.prix_fixe),
                    acompte_percent: form.acompte_percent ? parseInt(form.acompte_percent) : null,
                    equipement: form.equipements || null,
                    prestataire: userId,
                    actif: true
                  };
                  
                  console.log('Données à insérer:', insertData); // Debug
                  
                  const { error: insertError } = await supabase
                    .from('annonces')
                    .insert([insertData]);

                  if (!insertError) {
                    setForm({
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
                    onClose();
                    // Rafraîchir la liste des prestations
                    const { data, error } = await supabase
                      .from('annonces')
                      .select('id, titre, description, photos, tarif_unit, unit_tarif, prix_fixe, acompte_percent, equipement, prestation, ville, actif, prestataire')
                      .eq('prestataire', userId)
                      .order('created_at', { ascending: false });
                    if (!error) setPrestations(data || []);
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
        
        {/* Modale d'édition de modèle */}
        {editingModele && (
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
              minWidth: 500,
              maxWidth: 600,
              maxHeight: '90vh',
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              overflowY: 'auto'
            }}>
              <div style={{fontSize: 18, fontWeight: 600, marginBottom: 20}}>
                Modifier le modèle
              </div>
              
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 600}}>Titre</label>
                <input
                  type="text"
                  value={editingModele.titre || ''}
                  onChange={e => setEditingModele(prev => ({...prev, titre: e.target.value}))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #ddd', fontSize: 14
                  }}
                  maxLength={30}
                />
              </div>
              
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 600}}>Description</label>
                <input
                  type="text"
                  value={editingModele.description || ''}
                  onChange={e => setEditingModele(prev => ({...prev, description: e.target.value}))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #ddd', fontSize: 14
                  }}
                  maxLength={60}
                />
              </div>
              
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 600}}>Prix (MAD)</label>
                <input
                  type="number"
                  value={editingModele.prix || ''}
                  onChange={e => setEditingModele(prev => ({...prev, prix: e.target.value}))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid #ddd', fontSize: 14
                  }}
                />
              </div>
              
              <div style={{marginBottom: 20}}>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 600}}>Photos</label>
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
                    setEditingModele(prev => ({
                      ...prev,
                      photos: [...(prev.photos || []), ...base64Photos]
                    }));
                  }}
                  style={{marginBottom: 10}}
                />
                
                {editingModele.photos && editingModele.photos.length > 0 && (
                  <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                    {editingModele.photos.map((photo, idx) => (
                      <div key={idx} style={{position: 'relative'}}>
                        <img 
                          src={photo.startsWith('data:') ? photo : `data:image/*;base64,${photo}`} 
                          alt={`Photo ${idx + 1}`}
                          style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd'}}
                        />
                        <button
                          onClick={() => setEditingModele(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== idx)
                          }))}
                          style={{
                            position: 'absolute', top: -8, right: -8,
                            background: '#d9534f', color: 'white', border: 'none',
                            borderRadius: '50%', width: 20, height: 20,
                            fontSize: 12, cursor: 'pointer'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button
                  style={{
                    background: '#e0e0e0', color: '#222', border: 'none',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer'
                  }}
                  onClick={() => setEditingModele(null)}
                >
                  Annuler
                </button>
                <button
                  style={{
                    background: '#5bc0de', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer'
                  }}
                  onClick={handleSaveModele}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Confirmation de suppression de modèle */}
        {showDeleteConfirm && (
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
              boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
              textAlign: 'center'
            }}>
              <div style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>
                Confirmer la suppression
              </div>
              <div style={{fontSize: 14, color: '#666', marginBottom: 24}}>
                Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.
              </div>
              <div style={{display: 'flex', gap: 12, justifyContent: 'center'}}>
                <button
                  style={{
                    background: '#e0e0e0', color: '#222', border: 'none',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer'
                  }}
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Annuler
                </button>
                <button
                  style={{
                    background: '#d9534f', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer'
                  }}
                  onClick={() => handleDeleteModele(showDeleteConfirm)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
