import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'
import { 
  Calendar, Clock, Users, MapPin, Mail, CheckCircle, X, Plus, ChevronLeft, ChevronRight, 
  TrendingUp, Settings, RefreshCw, Bell, Star, CalendarDays, AlertCircle, Info, 
  Grid3x3, List, Filter, Download, Zap, Target, Activity, BarChart3, PieChart,
  Trash2, Edit3, Copy, Share, BookOpen, Coffee, Briefcase, Phone, ArrowRight
} from 'lucide-react'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'


// Composants modernes pour la nouvelle interface

// Modal de création d'événement
function CreateEventModal({ isOpen, onClose, onCreateEvent, selectedDate, selectedTime }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'blocked', // blocked, reservation
    client_name: '',
    client_email: '',
    client_phone: '',
    description: '',
    duration: 60,
    price: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  })

  // Mettre à jour les dates quand selectedDate/selectedTime changent
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate || new Date().toISOString().split('T')[0],
        time: selectedTime || '09:00'
      }))
    }
  }, [isOpen, selectedDate, selectedTime])

  const eventTypes = [
    { value: 'blocked', label: 'Bloquer le créneau', color: 'bg-red-500', icon: X },
    { value: 'reservation', label: 'Nouvelle réservation', color: 'bg-emerald-500', icon: Calendar }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreateEvent(formData)
    setFormData({
      title: '', type: 'blocked', client_name: '', client_email: '', 
      client_phone: '', description: '', duration: 60, price: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00'
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Plus className="w-6 h-6" />
              Nouvel événement
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-600 mt-2">
            {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            }) : 'Date non sélectionnée'} {formData.time ? `à ${formData.time}` : ''}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type d'événement */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Type d'événement</label>
            <div className="grid grid-cols-2 gap-3">
              {eventTypes.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({...formData, type: type.value})}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.type === type.value
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-700">{type.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Titre de l'événement *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Ex: Séance photo mariage"
            />
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heure *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            {/* Durée */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durée
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h30</option>
                <option value={120}>2 heures</option>
                <option value={180}>3 heures</option>
                <option value={240}>4 heures</option>
                <option value={480}>Journée complète</option>
              </select>
            </div>
          </div>

          {/* Informations client (si réservation) */}
          {formData.type === 'reservation' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Informations client
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom du client</label>
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  placeholder="email@exemple.com"
                />
              </div>
              {formData.type === 'reservation' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes / Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              placeholder="Détails supplémentaires..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Créer l'événement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de détail/édition d'événement
function EventDetailModal({ isOpen, event, onClose, onUpdate, onDelete, annonces }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        title: event.title || '',
        description: event.notes || '',
        duration: event.duration || 60,
        client_name: event.client_name || '',
        client_email: event.client_email || '',
        client_phone: event.client_phone || '',
        price: event.price || '',
        annonce_id: event.annonce_id || '',
        location: event.location || ''
      })
      setIsEditing(false)
      setShowDeleteConfirm(false)
    }
  }, [event, isOpen])

  const handleSave = () => {
    onUpdate(event.id, formData)
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(event.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  if (!isOpen || !event) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {event.type === 'reservation' && <Calendar className="w-6 h-6 text-emerald-600" />}
              {event.type === 'blocked' && <X className="w-6 h-6 text-red-600" />}
              {isEditing ? 'Modifier l\'événement' : 'Détails de l\'événement'}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(event.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {event.time} ({event.duration} min)
            </span>
            {event.type === 'reservation' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                event.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {event.status === 'confirmed' ? 'Confirmée' : 'En attente'}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="space-y-6">
              {/* Formulaire d'édition */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Durée (minutes)</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 heures</option>
                  <option value={180}>3 heures</option>
                  <option value={240}>4 heures</option>
                  <option value={480}>Journée complète</option>
                </select>
              </div>

              {event.type === 'reservation' && (
                <>
                  {annonces && annonces.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Annonce</label>
                      <select
                        value={formData.annonce_id}
                        onChange={(e) => setFormData({...formData, annonce_id: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Sélectionnez une annonce</option>
                        {annonces.map(a => (
                          <option key={a.id} value={a.id}>{a.titre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nom du client</label>
                      <input
                        type="text"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={formData.client_phone}
                        onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Lieu</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Prix (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes / Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sauvegarder
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Affichage en lecture seule */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{event.title}</h3>
                {event.notes && (
                  <p className="text-slate-600">{event.notes}</p>
                )}
              </div>

              {event.type === 'reservation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Informations client
                    </h4>
                    {event.client_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Nom :</span>
                        <span className="font-medium">{event.client_name}</span>
                      </div>
                    )}
                    {event.client_email && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Email :</span>
                        <span className="font-medium">{event.client_email}</span>
                      </div>
                    )}
                    {event.client_phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Téléphone :</span>
                        <span className="font-medium">{event.client_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Détails de la prestation
                    </h4>
                    {event.location && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Lieu :</span>
                        <span className="font-medium">{event.location}</span>
                      </div>
                    )}
                    {event.price > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Prix :</span>
                        <span className="font-medium text-emerald-600">{event.price}€</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Invités :</span>
                      <span className="font-medium">{event.guests || 1} personne(s)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-slate-800">Confirmer la suppression</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Êtes-vous sûr de vouloir supprimer cet événement ? Cette action ne peut pas être annulée.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Modal de réservation rapide - sélection date/heure
function QuickReservationModal({ isOpen, onClose, onConfirm }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 120
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    // Créer le timestamp pour la réservation
    const dateTime = new Date(`${formData.date}T${formData.time}:00`)
    onConfirm([dateTime.toISOString()])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-600" />
              Réservation rapide
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-600 mt-2">
            Choisissez la date et l'heure pour votre nouvelle réservation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Heure *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Durée estimée
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value={60}>1 heure</option>
              <option value={90}>1h30</option>
              <option value={120}>2 heures</option>
              <option value={180}>3 heures</option>
              <option value={240}>4 heures</option>
              <option value={480}>Journée complète</option>
            </select>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-800">Aperçu</span>
            </div>
            <p className="text-sm text-emerald-700">
              {new Date(formData.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })} à {formData.time} ({formData.duration} minutes)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Continuer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
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

// Modale de réservation manuelle moderne
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plus className="w-6 h-6 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-800">Nouvelle réservation</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Annonce <span className="text-red-500">*</span>
            </label>
            <select
              value={annonceId}
              onChange={e => setAnnonceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionnez une annonce</option>
              {annonces.map(a => (
                <option key={a.id} value={a.id}>{a.titre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Nom du client
            </label>
            <input
              type="text"
              value={clientNom}
              onChange={e => setClientNom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Nom complet du client"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email du client
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="email@exemple.com (optionnel)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Lieu de la cérémonie
            </label>
            <input
              type="text"
              value={endroit}
              onChange={e => setEndroit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Adresse ou nom du lieu (optionnel)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Commentaire
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Notes ou commentaires particuliers (optionnel)"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Montant total (€)
              </label>
              <input
                type="number"
                min="0"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Acompte versé (€)
              </label>
              <input
                type="number"
                min="0"
                value={montantAcompte}
                onChange={e => setMontantAcompte(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-700">Créneaux sélectionnés</span>
            </div>
            <ul className="space-y-1">
              {slots.map(slot =>
                <li key={slot} className="text-sm text-slate-600">
                  {new Date(slot).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                </li>
              )}
            </ul>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mt-4">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}
        
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
          <button
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
            className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Créer la réservation
          </button>
          <button 
            onClick={onCancel}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
        </div>
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

function PrestataireCalendar() {
  // États pour la nouvelle interface
  const [currentView, setCurrentView] = useState('week') // week, day, month, list
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState({ date: null, time: null })
  const [filterType, setFilterType] = useState('all') // all, blocked, reservation
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    reservations: 0,
    blocked: 0,
    revenue: 0
  })
  const [annonces, setAnnonces] = useState([])
  const [reservationModal, setReservationModal] = useState({ open: false, slots: [] })
  const [eventDetailModal, setEventDetailModal] = useState({ open: false, event: null })
  const [quickReservationModal, setQuickReservationModal] = useState({ open: false })

  // Chargement des annonces
  const loadAnnonces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: annoncesData } = await supabase
        .from('annonces')
        .select('id, titre, tarif_unit')
        .eq('prestataire', user.id)
        .eq('actif', true)

      setAnnonces(annoncesData || [])
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error)
    }
  }

  // Fonction de chargement des données
  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Charger les réservations
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id, date, montant, status, participants, endroit, commentaire, duree,
          client_nom, client_email,
          profiles!reservations_particulier_id_fkey(nom, email, telephone, role),
          annonces!reservations_annonce_id_fkey(titre, tarif_unit)
        `)
        .eq('prestataire_id', user.id)
        .neq('status', 'cancelled')

      // Charger les créneaux bloqués
      const { data: blocked } = await supabase
        .from('blocked_slots')
        .select('id, date, motif, created_at')
        .eq('prestataire_id', user.id)

      // Transformer les données en format unifié
      const allEvents = []

      // Réservations
      if (reservations) {
        reservations.forEach(res => {
          // Extraire la date et l'heure du timestamp
          const dateTime = new Date(res.date)
          const dateStr = dateTime.toISOString().split('T')[0]
          const timeStr = dateTime.toTimeString().substring(0, 5)
          
          allEvents.push({
            id: `res_${res.id}`,
            type: 'reservation',
            title: res.annonces?.titre || 'Réservation',
            date: dateStr,
            time: timeStr,
            duration: res.duree || 120, // Durée en minutes
            status: res.status,
            client_name: res.client_nom || res.profiles?.nom || '',
            client_email: res.client_email || res.profiles?.email || '',
            client_phone: res.profiles?.telephone || '',
            location: res.endroit || '',
            notes: res.commentaire || '',
            price: res.montant || res.annonces?.tarif_unit || 0,
            guests: res.participants || 1,
            color: res.status === 'confirmed' ? 'emerald' : 'amber'
          })
        })
      }

      // Créneaux bloqués
      if (blocked) {
        blocked.forEach(block => {
          // Extraire la date et l'heure du timestamp
          const dateTime = new Date(block.date)
          const dateStr = dateTime.toISOString().split('T')[0]
          const timeStr = dateTime.toTimeString().substring(0, 5)
          
          allEvents.push({
            id: `block_${block.id}`,
            type: 'blocked',
            title: 'Indisponible',
            date: dateStr,
            time: timeStr,
            duration: 60, // 1 heure par défaut
            notes: block.motif || '',
            color: 'red'
          })
        })
      }

      setEvents(allEvents)
      updateStats(allEvents)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    }
  }

  // Calcul des statistiques
  const updateStats = (eventsList) => {
    const reservations = eventsList.filter(e => e.type === 'reservation' && e.status === 'confirmed')
    const blocked = eventsList.filter(e => e.type === 'blocked')
    const revenue = reservations.reduce((sum, event) => sum + (parseFloat(event.price) || 0), 0)

    setStats({
      total: eventsList.length,
      reservations: reservations.length,
      blocked: blocked.length,
      revenue
    })
  }

  // Chargement initial
  useEffect(() => {
    loadEvents()
    loadAnnonces()
  }, [])

  // Filtrage des événements
  useEffect(() => {
    let filtered = events

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType)
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.notes && event.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredEvents(filtered)
  }, [events, filterType, searchTerm])

  // Création d'un nouvel événement
  const handleCreateEvent = async (eventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (eventData.type === 'blocked') {
        // Créer un créneau bloqué - combiner date et heure en timestamp
        const dateStr = eventData.date || new Date().toISOString().split('T')[0]
        const timeStr = eventData.time || '09:00'
        const dateTime = new Date(`${dateStr}T${timeStr}:00`)
        
        // Vérifier que la date est valide
        if (isNaN(dateTime.getTime())) {
          console.error('Date invalide:', { date: eventData.date, time: eventData.time })
          return
        }
        
        await supabase
          .from('blocked_slots')
          .insert({
            prestataire_id: user.id,
            date: dateTime.toISOString(),
            motif: eventData.title + (eventData.description ? ` - ${eventData.description}` : '')
          })
      } else if (eventData.type === 'reservation') {
        // Créer une réservation manuelle avec client
        const dateStr = eventData.date || new Date().toISOString().split('T')[0]
        const timeStr = eventData.time || '09:00'
        const dateTime = new Date(`${dateStr}T${timeStr}:00`)
        
        // Vérifier que la date est valide
        if (isNaN(dateTime.getTime())) {
          console.error('Date invalide:', { date: eventData.date, time: eventData.time })
          return
        }
        
        let particulier_id = null
        
        // Si on a des infos client, essayer de créer le profil
        if (eventData.client_name || eventData.client_email) {
          try {
            // Vérifier si un profil existe déjà avec cet email
            if (eventData.client_email) {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', eventData.client_email)
                .single()
              
              if (existingProfile) {
                particulier_id = existingProfile.id
              }
            }
            
            // Si pas trouvé et qu'on a un email, créer un nouveau profil
            if (!particulier_id && eventData.client_email) {
              const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                  nom: eventData.client_name,
                  email: eventData.client_email,
                  telephone: eventData.client_phone,
                  role: 'particulier'
                })
                .select('id')
                .single()
              
              if (!profileError && newProfile) {
                particulier_id = newProfile.id
              }
            }
          } catch (error) {
            console.warn('Erreur lors de la création du profil:', error)
          }
        }
        
        // Créer la réservation
        await supabase
          .from('reservations')
          .insert({
            prestataire_id: user.id,
            particulier_id,
            date: dateTime.toISOString(),
            duree: eventData.duration,
            client_nom: eventData.client_name,
            client_email: eventData.client_email,
            commentaire: eventData.description,
            montant: eventData.price ? parseFloat(eventData.price) : null,
            status: 'confirmed',
            participants: 1
          })
      }

      // Recharger les données
      await loadEvents()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    }
  }

  // Modification d'un événement
  const handleUpdateEvent = async (eventId, formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (eventId.startsWith('block_')) {
        const id = eventId.replace('block_', '')
        await supabase
          .from('blocked_slots')
          .update({
            motif: formData.title + (formData.description ? ` - ${formData.description}` : '')
          })
          .eq('id', id)
      } else if (eventId.startsWith('res_')) {
        const id = eventId.replace('res_', '')
        
        // Mettre à jour le profil client si des informations ont changé
        const event = events.find(e => e.id === eventId)
        if (event && (formData.client_name || formData.client_email || formData.client_phone)) {
          // Rechercher le profil existant
          if (formData.client_email) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', formData.client_email)
              .single()
            
            if (existingProfile) {
              // Mettre à jour le profil existant
              await supabase
                .from('profiles')
                .update({
                  nom: formData.client_name,
                  telephone: formData.client_phone
                })
                .eq('id', existingProfile.id)
            }
          }
        }
        
        // Mettre à jour la réservation
        await supabase
          .from('reservations')
          .update({
            client_nom: formData.client_name,
            client_email: formData.client_email,
            commentaire: formData.description,
            montant: formData.price ? parseFloat(formData.price) : null,
            endroit: formData.location,
            duree: formData.duration,
            annonce_id: formData.annonce_id ? parseInt(formData.annonce_id) : null
          })
          .eq('id', id)
      }

      await loadEvents()
      setEventDetailModal({ open: false, event: null })
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
    }
  }

  // Suppression d'un événement
  const handleDeleteEvent = async (eventId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (eventId.startsWith('block_')) {
        const id = eventId.replace('block_', '')
        await supabase
          .from('blocked_slots')
          .delete()
          .eq('id', id)
      } else if (eventId.startsWith('res_')) {
        const id = eventId.replace('res_', '')
        await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', id)
      }

      await loadEvents()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  // Génération du calendrier pour l'affichage
  const generateCalendarWeeks = () => {
    const weeks = []
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    
    // Début de la première semaine (peut être le mois précédent)
    const startDate = new Date(startOfMonth)
    startDate.setDate(startDate.getDate() - startOfMonth.getDay())
    
    // Fin de la dernière semaine (peut être le mois suivant)
    const endDate = new Date(endOfMonth)
    endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()))
    
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const week = []
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
    }
    
    return weeks
  }

  // Obtenir les événements pour une date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredEvents.filter(event => event.date === dateStr)
  }

  // Calculer les créneaux horaires occupés par un événement
  const getEventTimeSlots = (event) => {
    const startTime = parseInt(event.time.split(':')[0])
    const durationHours = Math.ceil(event.duration / 60)
    const slots = []
    
    for (let i = 0; i < durationHours; i++) {
      const hour = startTime + i
      if (hour >= 8 && hour <= 19) { // Limité aux heures d'ouverture
        slots.push(`${hour.toString().padStart(2, '0')}:00`)
      }
    }
    
    return slots
  }

  // Vérifier si un événement occupe un créneau horaire spécifique
  const eventOccupiesSlot = (event, targetTime) => {
    const eventSlots = getEventTimeSlots(event)
    return eventSlots.includes(targetTime)
  }

  // Composant Vue Calendrier
  function CalendarView({ view, selectedDate, onDateChange, events, onSlotClick, onEventClick }) {
    const weeks = generateCalendarWeeks()
    const timeSlots = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`) // 8h à 19h

    if (view === 'month') {
      return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Navigation du mois */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() - 1)
                onDateChange(newDate)
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-800">
              {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setMonth(newDate.getMonth() + 1)
                onDateChange(newDate)
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grille du calendrier */}
          <div className="p-6">
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-slate-600">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Semaines */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => {
                    const dayEvents = getEventsForDate(day)
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <div
                        key={dayIndex}
                        onClick={() => onSlotClick(day.toISOString().split('T')[0], '09:00')}
                        className={`min-h-[100px] p-2 border border-slate-200 cursor-pointer transition-colors ${
                          isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-100'
                        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          {day.getDate()}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick(event)
                              }}
                              className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                                event.color === 'emerald' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                                event.color === 'amber' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                event.color === 'red' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                              title={`${event.title} - ${event.time} (${event.duration}min)`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">{event.title}</span>
                                <span className="text-xs opacity-75 ml-1">{event.time}</span>
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500">
                              +{dayEvents.length - 3} autres
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (view === 'week') {
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
      
      return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Navigation de la semaine */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setDate(newDate.getDate() - 7)
                onDateChange(newDate)
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-800">
              Semaine du {startOfWeek.getDate()} {startOfWeek.toLocaleDateString('fr-FR', { month: 'long' })}
            </h2>
            
            <button
              onClick={() => {
                const newDate = new Date(selectedDate)
                newDate.setDate(newDate.getDate() + 7)
                onDateChange(newDate)
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Vue semaine */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* En-têtes des jours */}
              <div className="grid grid-cols-8 border-b border-slate-200">
                <div className="p-4"></div> {/* Colonne des heures */}
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(startOfWeek)
                  day.setDate(startOfWeek.getDate() + i)
                  const isToday = day.toDateString() === new Date().toDateString()
                  
                  return (
                    <div key={i} className={`p-4 text-center border-l border-slate-200 ${
                      isToday ? 'bg-blue-50' : ''
                    }`}>
                      <div className="font-medium text-slate-800">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className={`text-2xl font-bold mt-1 ${
                        isToday ? 'text-blue-600' : 'text-slate-600'
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Grille horaire */}
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 border-b border-slate-100">
                  <div className="p-4 text-sm text-slate-500 font-medium border-r border-slate-200">
                    {time}
                  </div>
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = new Date(startOfWeek)
                    day.setDate(startOfWeek.getDate() + i)
                    const dateStr = day.toISOString().split('T')[0]
                    
                    // Événements qui commencent à cette heure précise
                    const startingEvents = events.filter(e => e.date === dateStr && e.time === time)
                    // Événements qui occupent ce créneau (commencent avant et se terminent après)
                    const occupyingEvents = events.filter(e => e.date === dateStr && eventOccupiesSlot(e, time) && e.time !== time)
                    
                    return (
                      <div
                        key={i}
                        onClick={() => onSlotClick(dateStr, time)}
                        className={`min-h-[60px] p-2 border-l border-slate-200 cursor-pointer relative ${
                          occupyingEvents.length > 0 ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Événements qui commencent à cette heure */}
                        {startingEvents.map((event, eventIndex) => {
                          const durationHours = Math.ceil(event.duration / 60)
                          const height = durationHours * 60 // 60px par heure
                          
                          return (
                            <div
                              key={eventIndex}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick(event)
                              }}
                              style={{ height: `${height}px` }}
                              className={`absolute inset-x-1 top-1 p-2 rounded text-xs font-medium cursor-pointer shadow-sm border border-opacity-20 ${
                                event.color === 'emerald' ? 'bg-emerald-500 text-white border-emerald-600' :
                                event.color === 'amber' ? 'bg-amber-500 text-white border-amber-600' :
                                event.color === 'red' ? 'bg-red-500 text-white border-red-600' :
                                'bg-blue-500 text-white border-blue-600'
                              }`}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              {event.client_name && (
                                <div className="opacity-90 truncate text-xs mt-1">{event.client_name}</div>
                              )}
                              <div className="opacity-75 text-xs mt-1">{event.duration}min</div>
                            </div>
                          )
                        })}
                        
                        {/* Indicateur visuel pour les créneaux occupés - même couleur que l'événement principal */}
                        {occupyingEvents.length > 0 && startingEvents.length === 0 && (
                          <div 
                            className={`absolute inset-1 rounded opacity-30 cursor-pointer ${
                              occupyingEvents[0].color === 'emerald' ? 'bg-emerald-500' :
                              occupyingEvents[0].color === 'amber' ? 'bg-amber-500' :
                              occupyingEvents[0].color === 'red' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick(occupyingEvents[0])
                            }}
                            title={`${occupyingEvents[0].title} (suite)`}
                          ></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Vue jour (similaire à la vue semaine mais pour un seul jour)
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center">Vue jour - En développement</div>
      </div>
    )
  }

  // Composant Liste des événements
  function EventList({ events, onDeleteEvent }) {
    const groupedEvents = events.reduce((groups, event) => {
      const date = event.date
      if (!groups[date]) groups[date] = []
      groups[date].push(event)
      return groups
    }, {})

    return (
      <div className="space-y-6">
        {Object.entries(groupedEvents)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .map(([date, dayEvents]) => (
            <div key={date} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">
                  {new Date(date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {dayEvents.map(event => (
                  <div key={event.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-4 h-4 rounded-full mt-1 ${
                          event.color === 'emerald' ? 'bg-emerald-500' :
                          event.color === 'amber' ? 'bg-amber-500' :
                          event.color === 'red' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`} />
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 mb-1">{event.title}</h4>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {event.time} ({event.duration}min)
                            </span>
                            
                            {event.client_name && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {event.client_name}
                              </span>
                            )}
                            
                            {event.price > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4" />
                                {event.price}€
                              </span>
                            )}
                          </div>
                          
                          {event.notes && (
                            <p className="text-sm text-slate-600">{event.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEventDetailModal({ open: true, event })}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="Voir les détails"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
                              onDeleteEvent(event.id)
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        
        {events.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Aucun événement</h3>
            <p className="text-slate-500">Créez votre premier événement pour commencer</p>
          </div>
        )}
      </div>
    )
  }



  // Composant Sidebar moderne
  const ModernSidebar = () => {
    const today = new Date()
    const todayEvents = filteredEvents.filter(event => 
      isSameDay(new Date(event.date), today)
    )
    
    const upcomingEvents = filteredEvents
      .filter(event => new Date(event.date) > today)
      .slice(0, 5)

    return (
      <div className="space-y-6">
        {/* Actions rapides */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Actions rapides
          </h2>
          <div className="space-y-3">
            <button 
              onClick={() => {
                const now = new Date()
                setSelectedSlot({ 
                  date: now.toISOString().split('T')[0], 
                  time: `${now.getHours().toString().padStart(2, '0')}:00` 
                })
                setIsCreateModalOpen(true)
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Nouvel événement
            </button>
            <button 
              onClick={() => setQuickReservationModal({ open: true })}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Calendar className="w-4 h-4" />
              Réservation rapide
            </button>
          </div>
        </div>

        {/* Événements du jour */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Aujourd'hui ({todayEvents.length})
          </h2>
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map((event, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className={`text-sm font-medium mb-1 ${
                    event.type === 'reservation' ? 'text-emerald-600' : 'text-slate-600'
                  }`}>
                    {format(new Date(event.date), 'HH:mm')}
                  </div>
                  <div className="text-sm text-slate-700">{event.title}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucun événement aujourd'hui</p>
          )}
        </div>

        {/* Événements à venir */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-purple-500" />
            À venir
          </h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">
                    {formatDistanceToNow(new Date(event.date), { locale: fr, addSuffix: true })}
                  </div>
                  <div className="text-sm font-medium text-slate-700">{event.title}</div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(event.date), 'dd MMM HH:mm', { locale: fr })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucun événement à venir</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <PrestataireHeader />
      <div className="bg-slate-50 min-h-screen">
        {/* Header moderne */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-4xl font-bold mb-3 flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Calendar className="w-8 h-8" />
                  </div>
                  Votre planning
                </h3>
                <p className="text-slate-300 text-lg">Optimisez votre temps et maximisez vos revenus</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={loadEvents}
                  className="bg-white/10 text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.reservations}</div>
                    <div className="text-slate-300 text-sm">Réservations</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.blocked}</div>
                    <div className="text-slate-300 text-sm">Indisponible</div>
                  </div>
                </div>
              </div>
              
              
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-slate-300 text-sm">Total événements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Barre de contrôles */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Vues */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium mr-2">Vue :</span>
                    {[
                      { id: 'day', label: 'Jour', icon: Calendar },
                      { id: 'week', label: 'Semaine', icon: CalendarDays },
                      { id: 'month', label: 'Mois', icon: Grid3x3 },
                      { id: 'list', label: 'Liste', icon: List }
                    ].map(view => {
                      const Icon = view.icon
                      return (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            currentView === view.id
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {view.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Recherche et filtres */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                      <div className="absolute left-3 top-2.5">
                        <Filter className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="all">Tous les événements</option>
                      <option value="reservation">Réservations</option>
                      <option value="blocked">Indisponible</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="lg:col-span-3">
              {currentView === 'list' ? (
                <EventList 
                  events={filteredEvents}
                  onDeleteEvent={handleDeleteEvent}
                />
              ) : (
                <CalendarView 
                  view={currentView}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  events={filteredEvents}
                  onSlotClick={(date, time) => {
                    setSelectedSlot({ date, time })
                    setIsCreateModalOpen(true)
                  }}
                  onEventClick={(event) => {
                    setEventDetailModal({ open: true, event })
                  }}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ModernSidebar />
            </div>
          </div>
        </div>

        {/* Modal de création */}
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateEvent={handleCreateEvent}
          selectedDate={selectedSlot.date}
          selectedTime={selectedSlot.time}
        />

        {/* Modal de détail/édition d'événement */}
        <EventDetailModal
          isOpen={eventDetailModal.open}
          event={eventDetailModal.event}
          onClose={() => setEventDetailModal({ open: false, event: null })}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          annonces={annonces}
        />

        {/* Modal de réservation manuelle */}
        <ReservationModal
          open={reservationModal.open}
          slots={reservationModal.slots}
          annonces={annonces}
          onConfirm={async (formData) => {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              // Créer les réservations pour chaque créneau sélectionné
              const reservationsData = reservationModal.slots.map(slot => {
                const dateTime = new Date(slot)
                return {
                  prestataire_id: user.id,
                  annonce_id: formData.annonceId ? parseInt(formData.annonceId) : null,
                  date: dateTime.toISOString(),
                  client_nom: formData.clientNom,
                  client_email: formData.clientEmail,
                  commentaire: formData.description,
                  montant: formData.montant ? parseFloat(formData.montant) : null,
                  montant_acompte: formData.montantAcompte ? parseFloat(formData.montantAcompte) : 0,
                  endroit: formData.endroit,
                  status: 'confirmed',
                  duree: 120, // 2h par défaut
                  participants: 1
                }
              })

              const { error } = await supabase
                .from('reservations')
                .insert(reservationsData)

              if (error) {
                console.error('Erreur lors de la création des réservations:', error)
                alert('Erreur lors de la création des réservations')
              } else {
                setReservationModal({ open: false, slots: [] })
                loadEvents()
              }
            } catch (error) {
              console.error('Erreur:', error)
            }
          }}
          onCancel={() => setReservationModal({ open: false, slots: [] })}
        />

        {/* Modal de réservation rapide */}
        <QuickReservationModal
          isOpen={quickReservationModal.open}
          onClose={() => setQuickReservationModal({ open: false })}
          onConfirm={(slots) => {
            setQuickReservationModal({ open: false })
            setReservationModal({ open: true, slots })
          }}
        />
      </div>
    </>
  )
}

export default PrestataireCalendar
