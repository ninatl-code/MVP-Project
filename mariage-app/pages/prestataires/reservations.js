import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'
import { Calendar, Clock, MapPin, Users, Mail, Phone, CheckCircle, X, Eye, TrendingUp } from 'lucide-react'

export default function ReservationsPrestataire() {
  const [reservations, setReservations] = useState([])
  const [annonces, setAnnonces] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [annonceFilter, setAnnonceFilter] = useState('all')
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    const statusConfig = {
      pending: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'En attente' },
      confirmed: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Confirmé' },
      accepted: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Confirmé' },
      refused: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejetée' },
      cancelled: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Annulée' }
    }
    
    const config = statusConfig[status] || statusConfig.confirmed
    
    return (
      <span className={`${config.bg} ${config.color} ${config.border} border px-3 py-1 rounded-full text-sm font-medium`}>
        {config.label}
      </span>
    )
  }

  // Fonction pour filtrer les réservations
  const filteredReservations = reservations.filter(reservation => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter
    const matchesAnnonce = annonceFilter === 'all' || reservation.annonce_id === annonceFilter
    const matchesSearch = searchTerm === '' || 
      reservation.profiles?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.annonces?.titre?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesAnnonce && matchesSearch
  })

  function ReservationCard({ r, isSelected, onClick }) {
    return (
      <div 
        onClick={() => onClick(r)}
        className={`bg-white rounded-lg shadow-sm p-6 mb-4 border transition-all cursor-pointer hover:shadow-md ${
          isSelected ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
            {r.profiles?.nom ? r.profiles.nom.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-slate-800 truncate">{r.profiles?.nom || 'Nom inconnu'}</h2>
              <StatusBadge status={r.status} />
            </div>
            
            <p className="text-slate-500 text-sm mb-2">{r.profiles?.email}</p>
            
            {r.annonces?.titre && (
              <p className="text-emerald-600 text-sm font-medium mb-3">
                Annonce : {r.annonces.titre}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : 'Date non définie'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {r.heure ? `${r.heure}:00` : 'Heure non définie'}
              </span>
              {r.nb_personnes && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {r.nb_personnes} personnes
                </span>
              )}
            </div>
          </div>
          
          {r.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleUpdate(r.id, 'confirmed')
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Confirmer
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleUpdate(r.id, 'refused')
                }}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm border border-red-200"
              >
                <X className="w-4 h-4 inline mr-1" />
                Décliner
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Sélectionner automatiquement la première réservation filtrée
  useEffect(() => {
    if (filteredReservations.length > 0 && !selectedReservation) {
      setSelectedReservation(filteredReservations[0])
    } else if (filteredReservations.length === 0) {
      setSelectedReservation(null)
    } else if (selectedReservation && !filteredReservations.find(r => r.id === selectedReservation.id)) {
      setSelectedReservation(filteredReservations[0])
    }
  }, [filteredReservations, selectedReservation])

  return (
    <>
      <PrestataireHeader />
      <div className="bg-slate-50 min-h-screen">
        {/* Header avec statistiques */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold mb-2">Gestion des Réservations</h3>
                <p className="text-slate-300">Gérez toutes vos réservations en un seul endroit</p>
              </div>
              
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{reservations.length}</div>
                  <div className="text-slate-300 text-sm">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {reservations.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-slate-300 text-sm">En attente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {reservations.filter(r => r.status === 'confirmed' || r.status === 'accepted').length}
                  </div>
                  <div className="text-slate-300 text-sm">Confirmées</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-8">
            {/* Liste des réservations */}
            <div className="flex-1">
              {/* Barre de recherche et filtres */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="Rechercher par nom, email ou annonce..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmées</option>
                    <option value="refused">Refusées</option>
                    <option value="cancelled">Annulées</option>
                  </select>
                  
                  <select
                    value={annonceFilter}
                    onChange={e => setAnnonceFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all">Toutes les annonces</option>
                    {annonces.map(a => (
                      <option key={a.id} value={a.id}>{a.titre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Liste des réservations */}
              <div className="space-y-1">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map(r => (
                    <ReservationCard 
                      key={r.id} 
                      r={r} 
                      isSelected={selectedReservation?.id === r.id}
                      onClick={setSelectedReservation}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-slate-600 mb-2">Aucune réservation trouvée</h2>
                    <p className="text-slate-500">
                      {searchTerm || statusFilter !== 'all' || annonceFilter !== 'all' 
                        ? 'Essayez de modifier vos filtres de recherche'
                        : 'Les nouvelles réservations apparaîtront ici'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panneau de détail à droite */}
            <div className="w-96">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                {selectedReservation ? (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl">
                        {selectedReservation.profiles?.nom ? 
                          selectedReservation.profiles.nom.split(' ').map(n=>n[0]).join('').toUpperCase() : '?'
                        }
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          {selectedReservation.profiles?.nom || 'Nom inconnu'}
                        </h2>
                        <StatusBadge status={selectedReservation.status} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Mail className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Email</div>
                          <div className="font-medium">{selectedReservation.profiles?.email || 'Non renseigné'}</div>
                        </div>
                      </div>

                      {selectedReservation.annonces?.titre && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                          <Eye className="w-5 h-5 text-emerald-600" />
                          <div>
                            <div className="text-sm text-emerald-600">Annonce réservée</div>
                            <div className="font-medium text-emerald-700">{selectedReservation.annonces.titre}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Date et heure</div>
                          <div className="font-medium">
                            {selectedReservation.date ? 
                              new Date(selectedReservation.date).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric' 
                              }) : 'Date non définie'
                            }
                            {selectedReservation.heure && ` à ${selectedReservation.heure}:00`}
                          </div>
                        </div>
                      </div>

                      {selectedReservation.endroit && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-slate-500" />
                          <div>
                            <div className="text-sm text-slate-500">Lieu</div>
                            <div className="font-medium">{selectedReservation.endroit}</div>
                          </div>
                        </div>
                      )}

                      {selectedReservation.nb_personnes && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Users className="w-5 h-5 text-slate-500" />
                          <div>
                            <div className="text-sm text-slate-500">Nombre de personnes</div>
                            <div className="font-medium">{selectedReservation.nb_personnes} personnes</div>
                          </div>
                        </div>
                      )}

                      {selectedReservation.notes && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-sm text-slate-500 mb-1">Notes</div>
                          <div className="text-slate-700">{selectedReservation.notes}</div>
                        </div>
                      )}
                    </div>

                    {selectedReservation.status === 'pending' && (
                      <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                        <button
                          onClick={() => handleUpdate(selectedReservation.id, 'confirmed')}
                          className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmer
                        </button>
                        <button
                          onClick={() => handleUpdate(selectedReservation.id, 'refused')}
                          className="flex-1 bg-red-50 text-red-600 py-3 px-4 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">Sélectionnez une réservation</h3>
                    <p className="text-slate-500">Cliquez sur une réservation pour voir ses détails</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
