import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PrestataireHeader from '../../components/HeaderPresta'
import { 
  Calendar, Clock, Users, MapPin, Mail, CheckCircle, X, Plus, ChevronLeft, ChevronRight, 
  TrendingUp, Settings, RefreshCw, Bell, Star, CalendarDays, AlertCircle, Info, 
  Grid3x3, List, Filter, Download, Zap, Target, Activity, BarChart3, PieChart,
  Trash2, Edit3, Copy, Share, BookOpen, Coffee, Briefcase, Phone, ArrowRight, DollarSign
} from 'lucide-react'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'


// Composants modernes pour la nouvelle interface

// Composant Tooltip pour afficher les détails au survol
function EventTooltip({ event, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const formatDuration = (durationMinutes) => {
    if (durationMinutes < 60) {
      return `${durationMinutes}min`
    } else if (durationMinutes % 60 === 0) {
      return `${durationMinutes / 60}h`
    } else {
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      return `${hours}h${minutes.toString().padStart(2, '0')}`
    }
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        {children}
      </div>
      
      {showTooltip && (
        <div
          className="fixed z-[9999] bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl border border-slate-600 max-w-xs"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none'
          }}
        >
          <div className="space-y-1">
            <div className="font-semibold text-white">{event.title}</div>
            <div className="text-slate-300">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.time} - {formatDuration(event.duration)}
              </div>
            </div>
            <div className="text-slate-300">
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {event.annonce_title}
              </div>
            </div>
            {event.type === 'reservation' && event.client_name && (
              <div className="text-slate-300">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {event.client_name}
                </div>
              </div>
            )}
            {event.type === 'blocked' && event.motif && !event.is_reservation_block && (
              <div className="text-slate-300">
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {event.motif}
                </div>
              </div>
            )}
          </div>
          {/* Petite flèche vers le bas */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"
          />
        </div>
      )}
    </>
  )
}

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
    participants: 1,
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
      client_phone: '', description: '', duration: 60, participants: 1, price: '',
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
                min="08:00"
                max="20:00"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            {/* Durée */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durée (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 60})}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Ex: 60, 120, 240..."
              />
              <p className="text-xs text-slate-500 mt-1">En minutes (ex: 60 = 1h, 120 = 2h)</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de participants</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.participants}
                    onChange={(e) => setFormData({...formData, participants: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    placeholder="1"
                  />
                </div>
              </div>
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

// Modal de réservation rapide unifiée - tous les champs en une seule étape
function QuickReservationModal({ isOpen, onClose, onConfirm, annonces }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '', // en heures - champ vide
    clientNom: '',
    clientEmail: '',
    endroit: '',
    montant: '',
    montantAcompte: '0',
    description: '',
    selectedAnnonces: [],
    participants: '' // nombre de participants - champ vide
  })
  const [error, setError] = useState('')

  const handleAnnonceToggle = (annonceId) => {
    setFormData(prev => ({
      ...prev,
      selectedAnnonces: prev.selectedAnnonces.includes(annonceId)
        ? prev.selectedAnnonces.filter(id => id !== annonceId)
        : [...prev.selectedAnnonces, annonceId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation des champs obligatoires
    if (!formData.clientNom.trim()) {
      setError('Le nom du client est obligatoire')
      return
    }
    
    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      setError('Veuillez spécifier une durée valide')
      return
    }
    
    if (!formData.participants || parseInt(formData.participants) <= 0) {
      setError('Veuillez spécifier un nombre de participants valide')
      return
    }
    
    if (formData.selectedAnnonces.length === 0 && annonces && annonces.length > 0) {
      setError('Veuillez sélectionner au moins une annonce')
      return
    }

    try {
      // Créer le timestamp pour la réservation
      const dateTime = new Date(`${formData.date}T${formData.time}:00`)
      
      // Préparer les données pour la confirmation
      const reservationData = {
        actionType: 'resaManual',
        clientNom: formData.clientNom,
        clientEmail: formData.clientEmail,
        endroit: formData.endroit,
        montant: formData.montant,
        montantAcompte: formData.montantAcompte,
        description: formData.description,
        selectedAnnonces: formData.selectedAnnonces,
        duration: parseFloat(formData.duration),
        participants: parseInt(formData.participants)
      }
      
      await onConfirm(reservationData, [dateTime.toISOString()])
      onClose()
    } catch (error) {
      setError('Erreur lors de la création de la réservation')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            Créez une nouvelle réservation avec toutes les informations nécessaires
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Date et heure */}
          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="font-medium text-emerald-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date et heure
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Heure <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Durée (heures) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: 1, 1.5, 2, 3..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Annonces */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Annonces concernées <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-3">
              {annonces && annonces.length > 0 ? (
                annonces.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedAnnonces.includes(a.id)}
                      onChange={() => handleAnnonceToggle(a.id)}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-sm">{a.titre}</span>
                  </label>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">
                  <p>Aucune annonce active trouvée.</p>
                  <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer mt-2 border border-dashed border-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.selectedAnnonces.includes('temp')}
                      onChange={() => handleAnnonceToggle('temp')}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-sm italic text-gray-600">Option temporaire (test)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Informations client */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Informations client
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du client <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientNom}
                  onChange={(e) => setFormData({...formData, clientNom: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom complet du client"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email du client
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lieu de la cérémonie
                  </label>
                  <input
                    type="text"
                    value={formData.endroit}
                    onChange={(e) => setFormData({...formData, endroit: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse ou nom du lieu"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de participants <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={formData.participants}
                  onChange={(e) => setFormData({...formData, participants: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 1, 2, 50, 100..."
                />
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Montants
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Montant total (€)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.montant}
                  onChange={(e) => setFormData({...formData, montant: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  value={formData.montantAcompte}
                  onChange={(e) => setFormData({...formData, montantAcompte: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Commentaire
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Notes ou commentaires particuliers (optionnel)"
            />
          </div>

          {/* Aperçu */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-800">Aperçu de la réservation</span>
            </div>
            <p className="text-sm text-slate-700">
              <strong>{formData.clientNom || 'Client'}</strong> - {new Date(formData.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })} à {formData.time} {formData.duration ? `(${formData.duration}h)` : '(durée à définir)'}
            </p>
            {formData.montant && (
              <p className="text-sm text-slate-600 mt-1">
                Montant: {formData.montant}€ {formData.montantAcompte && formData.montantAcompte !== '0' && `(acompte: ${formData.montantAcompte}€)`}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Créer la réservation
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

// Modal de blocage rapide - interface similaire à QuickReservationModal
function QuickBlockModal({ isOpen, onClose, onConfirm, annonces }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '', // en heures - champ vide
    description: '',
    selectedAnnonces: []
  })
  const [error, setError] = useState('')

  const handleAnnonceToggle = (annonceId) => {
    setFormData(prev => ({
      ...prev,
      selectedAnnonces: prev.selectedAnnonces.includes(annonceId)
        ? prev.selectedAnnonces.filter(id => id !== annonceId)
        : [...prev.selectedAnnonces, annonceId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation des champs obligatoires
    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      setError('Veuillez spécifier une durée valide')
      return
    }
    
    if (formData.selectedAnnonces.length === 0 && annonces && annonces.length > 0) {
      setError('Veuillez sélectionner au moins une annonce')
      return
    }

    try {
      // Créer le timestamp pour le blocage
      const dateTime = new Date(`${formData.date}T${formData.time}:00`)
      
      // Préparer les données pour la confirmation
      const blockData = {
        actionType: 'blocked',
        selectedAnnonces: formData.selectedAnnonces,
        duration: parseFloat(formData.duration),
        description: formData.description
      }
      
      await onConfirm(blockData, [dateTime.toISOString()])
      onClose()
    } catch (error) {
      setError('Erreur lors du blocage des créneaux')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <X className="w-6 h-6 text-red-600" />
              Bloquer des créneaux
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-600 mt-2">
            Bloquez des créneaux pour les rendre indisponibles à la réservation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Date et heure */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date et heure de début
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Heure <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Durée (heures) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ex: 1, 1.5, 2, 3..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Sélection des annonces */}
          {annonces && annonces.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Annonces concernées <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {annonces.map(annonce => (
                  <label key={annonce.id} className="flex items-center gap-3 p-2 hover:bg-amber-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedAnnonces.includes(annonce.id)}
                      onChange={() => handleAnnonceToggle(annonce.id)}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">{annonce.titre}</span>
                    {annonce.tarif_unit && (
                      <span className="text-xs text-slate-500 ml-auto">{annonce.tarif_unit}€</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Motif/Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motif du blocage
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Congés, maintenance, formation, etc. (optionnel)"
            />
          </div>

          {/* Aperçu */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-800">Aperçu du blocage</span>
            </div>
            <p className="text-sm text-slate-700">
              <strong>Blocage</strong> - {new Date(formData.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })} à {formData.time} {formData.duration ? `(${formData.duration}h)` : '(durée à définir)'}
            </p>
            {formData.description && (
              <p className="text-sm text-slate-600 mt-1">
                Motif: {formData.description}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Bloquer les créneaux
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
function ReservationModal({ open, slots, onConfirm, onCancel, annonces, defaultActionType }) {
  const [actionType, setActionType] = useState(defaultActionType || 'resaManual'); // 'resaManual', 'blocked'
  const [clientNom, setClientNom] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAnnonces, setSelectedAnnonces] = useState([]);
  const [duration, setDuration] = useState(''); // Durée en heures - champ vide
  const [montant, setMontant] = useState('');
  const [montantAcompte, setMontantAcompte] = useState('0');
  const [endroit, setEndroit] = useState('');
  const [participants, setParticipants] = useState(''); // Nombre de participants - champ vide
  const [error, setError] = useState('');

  useEffect(() => {
    setActionType(defaultActionType || 'resaManual');
    setSelectedAnnonces([]);
    setDuration(''); // Réinitialiser à vide
    setError('');
    setMontant('');
    setMontantAcompte('0');
    setClientNom('');
    setClientEmail('');
    setParticipants(''); // Réinitialiser à vide
    setDescription('');
    setEndroit('');
    setParticipants(1)
  }, [open, defaultActionType]);

  const handleAnnonceToggle = (annonceId) => {
    setSelectedAnnonces(prev => 
      prev.includes(annonceId) 
        ? prev.filter(id => id !== annonceId)
        : [...prev, annonceId]
    );
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plus className="w-6 h-6 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-800">
            {actionType === 'resaManual' ? 'Nouvelle réservation' : 'Bloquer des créneaux'}
          </h2>
        </div>
        
        <div className="space-y-4">
          {/* Type d'action */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type d'action <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('resaManual')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  actionType === 'resaManual'
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                📅 Réservation client
              </button>
              <button
                type="button"
                onClick={() => setActionType('blocked')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  actionType === 'blocked'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                🚫 Bloquer créneaux
              </button>
            </div>
          </div>

          {/* Durée */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Durée (heures) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Ex: 1, 1.5, 2, 3..."
              required
            />
          </div>

          {/* Sélection multiple d'annonces */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Annonces concernées <span className="text-red-500">*</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 space-y-1">
              {annonces && annonces.length > 0 ? (
                <>
                  {/* Option "Toutes les annonces" */}
                  <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedAnnonces.length === annonces.length}
                      onChange={() => {
                        if (selectedAnnonces.length === annonces.length) {
                          setSelectedAnnonces([])
                        } else {
                          setSelectedAnnonces(annonces.map(a => a.id))
                        }
                      }}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-sm font-medium text-blue-600">✓ Toutes les annonces</span>
                  </label>
                  
                  {/* Annonces individuelles */}
                  {annonces.map(a => (
                    <label key={a.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAnnonces.includes(a.id)}
                        onChange={() => handleAnnonceToggle(a.id)}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <span className="text-sm">{a.titre}</span>
                    </label>
                  ))}
                </>
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">
                  <p>Aucune annonce active trouvée.</p>
                  <p className="text-xs mt-1">Créez d'abord des annonces pour pouvoir les sélectionner.</p>
                  {/* Option de secours pour tester */}
                  <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer mt-2 border border-dashed border-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedAnnonces.includes('temp')}
                      onChange={() => handleAnnonceToggle('temp')}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-sm italic text-gray-600">Option temporaire (test)</span>
                  </label>
                </div>
              )}
            </div>
            {selectedAnnonces.length === 0 && annonces && annonces.length > 0 && (
              <p className="text-red-500 text-xs mt-1">Veuillez sélectionner au moins une annonce</p>
            )}
          </div>
          
          {/* Champs spécifiques aux réservations client */}
          {actionType === 'resaManual' && (
            <>
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
                  <Users className="w-4 h-4 inline mr-1" />
                  Nombre de participants <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={participants}
                  onChange={e => setParticipants(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Ex: 1, 2, 50, 100..."
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
            </>
          )}
          
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
              if (selectedAnnonces.length === 0) {
                setError("Veuillez sélectionner au moins une annonce.");
                return;
              }
              if (!duration || parseFloat(duration) <= 0) {
                setError("Veuillez spécifier une durée valide.");
                return;
              }
              if (actionType === 'resaManual' && !clientNom.trim()) {
                setError("Veuillez indiquer le nom du client pour une réservation.");
                return;
              }
              if (actionType === 'resaManual' && (!participants || parseInt(participants) <= 0)) {
                setError("Veuillez spécifier un nombre de participants valide.");
                return;
              }
              setError('');
              onConfirm({
                actionType,
                selectedAnnonces,
                duration: parseFloat(duration),
                clientNom,
                clientEmail,
                description,
                montant,
                montantAcompte,
                endroit,
                participants: parseInt(participants) || 1
              });
            }}
            className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {actionType === 'resaManual' ? 'Créer la réservation' : 'Bloquer les créneaux'}
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
  const [quickBlockModal, setQuickBlockModal] = useState({ open: false })
  const [notification, setNotification] = useState({ open: false, type: 'info', title: '', message: '' })

  // Fonction helper pour afficher les notifications
  const showNotification = (type, title, message) => {
    setNotification({ open: true, type, title, message })
  }

  // Fonction centralisée pour créer des réservations
  const createReservation = async (reservationData, options = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      // Générer un numéro de réservation unique si demandé
      let numReservation = null
      if (options.generateNumber !== false) {
        try {
          const numberResponse = await fetch('/api/reservations/generate-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          if (numberResponse.ok) {
            const numberResult = await numberResponse.json()
            numReservation = numberResult.num_reservation
          }
        } catch (error) {
          console.warn('Erreur génération numéro réservation:', error)
        }
      }

      // Préparer les données de base
      const durationHours = reservationData.duration ? parseFloat(reservationData.duration) : 1 // Durée reçue en heures
      
      const baseData = {
        prestataire_id: user.id,
        date: reservationData.date,
        client_nom: reservationData.clientNom || reservationData.client_name,
        client_email: reservationData.clientEmail || reservationData.client_email || null,
        endroit: reservationData.endroit || reservationData.location || null,
        montant: reservationData.montant ? parseFloat(reservationData.montant) : (reservationData.price ? parseFloat(reservationData.price) : null),
        montant_acompte: reservationData.montantAcompte ? parseFloat(reservationData.montantAcompte) : 0,
        commentaire: reservationData.description || reservationData.notes || null,
        duree: durationHours, // Durée en heures pour la base de données
        participants: reservationData.participants || 1,
        status: reservationData.status || 'confirmed',
        num_reservation: numReservation
      }

      // Fonction helper pour créer les créneaux bloqués
      const createBlockedSlotsForReservation = async (startDateTime, durationHours, annonceId, reservationType = 'resaManual') => {
        const blockedSlots = []
        const startDate = new Date(startDateTime)
        
        // Créer un créneau bloqué pour chaque heure de la réservation
        for (let i = 0; i < durationHours; i++) {
          const slotTime = new Date(startDate)
          slotTime.setHours(startDate.getHours() + i)
          
          const clientName = reservationData.clientNom || reservationData.client_name || 'Client'
          const motif = `${reservationType} - ${clientName}${annonceId && annonceId !== 'temp' ? ` (Annonce ${annonceId})` : ''}`
          
          blockedSlots.push({
            prestataire_id: user.id,
            date: slotTime.toISOString(),
            motif: motif,
            annonce_id: annonceId && annonceId !== 'temp' ? parseInt(annonceId) : null
          })
        }
        
        if (blockedSlots.length > 0) {
          const { error: blockedError } = await supabase
            .from('blocked_slots')
            .insert(blockedSlots)
          
          if (blockedError) {
            console.error('Erreur création créneaux bloqués:', blockedError)
            // Ne pas faire échouer la réservation si les créneaux bloqués échouent
          }
        }
      }

      // Si plusieurs annonces sont spécifiées
      if (reservationData.selectedAnnonces && reservationData.selectedAnnonces.length > 0) {
        const results = []
        for (const annonceId of reservationData.selectedAnnonces) {
          const data = {
            ...baseData,
            annonce_id: typeof annonceId === 'string' && annonceId !== 'temp' ? parseInt(annonceId) : annonceId === 'temp' ? null : annonceId
          }
          
          const { data: result, error } = await supabase
            .from('reservations')
            .insert(data)
            .select()
          
          if (error) throw error
          
          // Créer les créneaux bloqués pour cette réservation
          await createBlockedSlotsForReservation(
            baseData.date, 
            durationHours, 
            annonceId,
            'resaManual'
          )
          
          results.push(result)
        }
        return results
      } else {
        // Une seule réservation
        const data = {
          ...baseData,
          annonce_id: reservationData.annonce_id ? parseInt(reservationData.annonce_id) : null
        }
        
        const { data: result, error } = await supabase
          .from('reservations')
          .insert(data)
          .select()
        
        if (error) throw error
        
        // Créer les créneaux bloqués pour cette réservation
        await createBlockedSlotsForReservation(
          baseData.date, 
          durationHours, 
          data.annonce_id,
          'resaManual'
        )
        
        return result
      }
    } catch (error) {
      console.error('Erreur lors de la création de réservation:', error)
      throw error
    }
  }

  // Chargement des annonces
  const loadAnnonces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ Pas d\'utilisateur connecté pour charger les annonces')
        return
      }

      console.log('📋 Chargement des annonces pour utilisateur:', user.id)

      const { data: annoncesData, error } = await supabase
        .from('annonces')
        .select('id, titre, tarif_unit')
        .eq('prestataire', user.id)
        .eq('actif', true)

      if (error) {
        console.error('❌ Erreur Supabase lors du chargement des annonces:', error)
        return
      }

      console.log('📋 Annonces chargées:', annoncesData?.length || 0, 'annonces')
      setAnnonces(annoncesData || [])
    } catch (error) {
      console.error('❌ Erreur lors du chargement des annonces:', error)
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

      // Charger les créneaux bloqués avec les informations des annonces
      const { data: blocked, error: blockedError } = await supabase
        .from('blocked_slots')
        .select(`
          id, date, motif, created_at, annonce_id,
          annonces!blocked_slots_annonce_id_fkey(titre, tarif_unit)
        `)
        .eq('prestataire_id', user.id)

      console.log('🔍 Requête blocked_slots:', { blocked, blockedError })
      
      if (blockedError) {
        console.error('❌ Erreur requête blocked_slots:', blockedError)
      }

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
            duration: (res.duree || 2) * 60, // Durée en minutes (convertir depuis heures)
            status: res.status,
            client_name: res.client_nom || res.profiles?.nom || '',
            client_email: res.client_email || res.profiles?.email || '',
            client_phone: res.profiles?.telephone || '',
            location: res.endroit || '',
            notes: res.commentaire || '',
            price: res.montant || res.annonces?.tarif_unit || 0,
            guests: res.participants || 1,
            color: 'emerald', // Couleur uniforme pour toutes les réservations
            annonce_title: res.annonces?.titre || 'Annonce inconnue',
            annonce_id: res.annonce_id
          })
        })
      }

      // Créneaux bloqués - traitement simplifié
      if (blocked && blocked.length > 0) {
        console.log('📊 Blocked slots trouvés:', blocked.length)
        console.log('📊 Détail blocked slots:', blocked)
        
        blocked.forEach(block => {
          console.log('🔍 Traitement block:', block)
          
          // Vérifier que la date est valide
          if (!block.date) {
            console.warn('⚠️ Block sans date:', block)
            return
          }
          
          try {
            // Extraire la date et l'heure du timestamp
            const dateTime = new Date(block.date)
            const dateStr = dateTime.toISOString().split('T')[0]
            const timeStr = dateTime.toTimeString().substring(0, 5)
            
            console.log('📅 Date extraite:', { dateStr, timeStr })
            
            // Titre et couleur selon le type de motif
            let title = block.motif || 'Créneau bloqué'
            let color = 'red' // Couleur par défaut pour les blocages
            
            // Si c'est un créneau bloqué pour une réservation, utiliser la couleur emerald
            if (block.motif && (block.motif.includes('resaManual') || block.motif.includes('resaAuto'))) {
              color = 'emerald' // Couleur uniforme pour les réservations
              // Titre simplifié pour les réservations
              if (block.annonces?.titre) {
                title = block.annonces.titre
              }
            }
            
            const event = {
              id: `block_${block.id}`,
              type: 'blocked',
              title: title,
              date: dateStr,
              time: timeStr,
              duration: 60, // 1 heure par défaut
              notes: block.motif || '',
              motif: block.motif,
              color: color,
              annonce_title: block.annonces?.titre || (block.annonce_id ? `Annonce ${block.annonce_id}` : 'Aucune annonce'),
              annonce_id: block.annonce_id,
              is_reservation_block: block.motif && (block.motif.includes('resaManual') || block.motif.includes('resaAuto'))
            }
            
            console.log('✅ Event créé:', event)
            allEvents.push(event)
            
          } catch (error) {
            console.error('❌ Erreur traitement block:', error, block)
          }
        })
      } else {
        console.log('⚠️ Aucun créneau bloqué trouvé')
      }

      console.log('🎯 Total events à afficher:', allEvents.length)
      console.log('📋 Breakdown:', {
        reservations: allEvents.filter(e => e.type === 'reservation').length,
        blocked: allEvents.filter(e => e.type === 'blocked').length
      })
      
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
        
        // Créer la réservation via la fonction centralisée
        await createReservation({
          date: dateTime.toISOString(),
          duration: eventData.duration,
          client_name: eventData.client_name,
          client_email: eventData.client_email,
          description: eventData.description,
          price: eventData.price,
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
            duree: formData.duration, // Durée en heures
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
        
        // D'abord récupérer les informations de la réservation pour trouver les créneaux bloqués associés
        const { data: reservation } = await supabase
          .from('reservations')
          .select('date, duree, annonce_id')
          .eq('id', id)
          .single()
        
        // Annuler la réservation
        await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', id)
          
        // Supprimer les créneaux bloqués associés si on a les informations de la réservation
        if (reservation) {
          const startDate = new Date(reservation.date)
          const durationHours = reservation.duree || 2 // Durée déjà en heures dans la DB
          
          // Générer les timestamps des créneaux à supprimer
          const slotsToDelete = []
          for (let i = 0; i < durationHours; i++) {
            const slotTime = new Date(startDate)
            slotTime.setHours(startDate.getHours() + i)
            slotsToDelete.push(slotTime.toISOString())
          }
          
          // Supprimer les créneaux bloqués correspondants
          await supabase
            .from('blocked_slots')
            .delete()
            .eq('prestataire_id', user.id)
            .in('date', slotsToDelete)
            .like('motif', `resaManual%`)
        }
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
      if (hour >= 8 && hour <= 20) { // Limité aux heures d'ouverture 8h-20h
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
    const timeSlots = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`) // 8h à 20h

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
                            <EventTooltip key={eventIndex} event={event}>
                              <div
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
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{event.title}</span>
                                  <span className="text-xs opacity-75 ml-1">{event.time}</span>
                                </div>
                              </div>
                            </EventTooltip>
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
                    const startingEvents = filteredEvents.filter(e => e.date === dateStr && e.time === time)
                    // Événements qui occupent ce créneau (commencent avant et se terminent après)
                    const occupyingEvents = filteredEvents.filter(e => e.date === dateStr && eventOccupiesSlot(e, time) && e.time !== time)
                    
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
                            <EventTooltip key={eventIndex} event={event}>
                              <div
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
                            </EventTooltip>
                          )
                        })}
                        
                        {/* Créneaux occupés avec le même style que les créneaux principaux */}
                        {occupyingEvents.length > 0 && startingEvents.length === 0 && (
                          <EventTooltip event={occupyingEvents[0]}>
                            <div 
                              className={`absolute inset-x-1 top-1 p-2 rounded text-xs font-medium cursor-pointer shadow-sm border border-opacity-20 ${
                                occupyingEvents[0].color === 'emerald' ? 'bg-emerald-500 text-white border-emerald-600' :
                                occupyingEvents[0].color === 'amber' ? 'bg-amber-500 text-white border-amber-600' :
                                occupyingEvents[0].color === 'red' ? 'bg-red-500 text-white border-red-600' :
                                'bg-blue-500 text-white border-blue-600'
                              }`}
                              style={{ height: '60px' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick(occupyingEvents[0])
                              }}
                            >
                              <div className="font-medium truncate">{occupyingEvents[0].title}</div>
                              {occupyingEvents[0].client_name && (
                                <div className="opacity-90 truncate text-xs mt-1">{occupyingEvents[0].client_name}</div>
                              )}
                              <div className="opacity-75 text-xs mt-1">Suite</div>
                            </div>
                          </EventTooltip>
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
                <h2 className="font-semibold text-slate-800">
                  {new Date(date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </h2>
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
              onClick={() => setQuickBlockModal({ open: true })}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <X className="w-4 h-4" />
              Bloquer créneaux
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

        {/* Heures d'ouverture */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Heures d'ouverture
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Lundi - Dimanche</span>
              <span className="font-semibold text-slate-800">08h00 - 20h00</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Seuls les créneaux pendant les heures d'ouverture sont disponibles pour la réservation.
            </p>
          </div>
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
                    
                    // Validation et création sécurisée du dateTime
                    try {
                      console.log('🎯 onSlotClick appelé avec:', { date, time })
                      
                      // Valider le format de date (YYYY-MM-DD)
                      if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        console.error('❌ Format de date invalide:', date)
                        showNotification('error', 'Erreur de format', 'Format de date invalide')
                        return
                      }
                      
                      // Valider le format d'heure (HH:MM)
                      if (!time || !time.match(/^\d{2}:\d{2}$/)) {
                        console.error('❌ Format d\'heure invalide:', time)
                        showNotification('error', 'Erreur de format', 'Format d\'heure invalide')
                        return
                      }
                      
                      // Créer le dateTime avec validation
                      const dateTimeStr = `${date}T${time}:00`
                      console.log('🕒 Création dateTime:', dateTimeStr)
                      
                      const dateTime = new Date(dateTimeStr)
                      
                      // Vérifier si la date est valide
                      if (isNaN(dateTime.getTime())) {
                        console.error('❌ Date/heure invalide:', dateTimeStr)
                        showNotification('error', 'Erreur de saisie', 'Date ou heure invalide')
                        return
                      }
                      
                      console.log('✅ DateTime créé:', dateTime.toISOString())
                      
                      setReservationModal({ 
                        open: true, 
                        slots: [dateTime.toISOString()],
                        defaultActionType: 'resaManual'
                      })
                    } catch (error) {
                      console.error('❌ Erreur lors de la création du slot:', error)
                      showNotification('error', 'Erreur de sélection', 'Erreur lors de la sélection du créneau: ' + error.message)
                    }
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
          defaultActionType={reservationModal.defaultActionType}
          onConfirm={async (formData) => {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              console.log('🎯 Traitement de l\'action:', formData.actionType)
              console.log('📅 Créneaux sélectionnés:', reservationModal.slots)
              console.log('📢 Annonces:', formData.selectedAnnonces)
              console.log('⏰ Durée:', formData.duration, 'heures')

              // Fonction helper pour générer tous les créneaux selon la durée
              const generateSlotsFromDuration = (startSlot, durationHours) => {
                const slots = []
                const startDate = new Date(startSlot)
                
                for (let i = 0; i < durationHours; i++) {
                  const slotTime = new Date(startDate)
                  slotTime.setHours(startDate.getHours() + i)
                  slots.push(slotTime.toISOString())
                }
                return slots
              }

              if (formData.actionType === 'blocked') {
                // Bloquer des créneaux - générer tous les créneaux selon la durée
                for (const slot of reservationModal.slots) {
                  const allSlots = generateSlotsFromDuration(slot, formData.duration)
                  
                  for (const timeSlot of allSlots) {
                    const motifText = formData.selectedAnnonces.length > 0 
                      ? `Bloqué - ${formData.selectedAnnonces.map(id => {
                          const annonce = annonces.find(a => a.id === parseInt(id))
                          return annonce ? annonce.titre : `Annonce ${id}`
                        }).join(', ')}`
                      : 'Créneaux bloqués'
                    
                    await supabase
                      .from('blocked_slots')
                      .insert({
                        prestataire_id: user.id,
                        date: timeSlot,
                        motif: motifText,
                        annonce_id: formData.selectedAnnonces.length > 0 ? parseInt(formData.selectedAnnonces[0]) : null
                      })
                  }
                }
              } else {
                // Réservation manuelle - créer UNE réservation qui générera automatiquement tous les créneaux bloqués
                for (const slot of reservationModal.slots) {
                  const dateTime = new Date(slot)
                  await createReservation({
                    date: dateTime.toISOString(),
                    clientNom: formData.clientNom,
                    clientEmail: formData.clientEmail,
                    description: formData.description,
                    montant: formData.montant,
                    montantAcompte: formData.montantAcompte,
                    endroit: formData.endroit,
                    duration: formData.duration, // en heures
                    selectedAnnonces: formData.selectedAnnonces,
                    participants: formData.participants,
                    status: 'confirmed'
                  })
                }
              }

              // Fermer la modal et recharger les événements
              setReservationModal({ open: false, slots: [] })
              loadEvents()
              
              // Afficher un message de succès
              const actionText = formData.actionType === 'resaManual' ? 'Réservations' : 'Blocages'
              showNotification('success', 'Succès', `${actionText} créé(s) avec succès !`)
              
            } catch (error) {
              console.error('❌ Erreur générale:', error)
              showNotification('error', 'Erreur de traitement', 'Erreur lors du traitement: ' + error.message)
            }
          }}
          onCancel={() => setReservationModal({ open: false, slots: [] })}
        />

        {/* Modal de réservation rapide */}
        <QuickReservationModal
          isOpen={quickReservationModal.open}
          onClose={() => setQuickReservationModal({ open: false })}
          annonces={annonces}
          onConfirm={async (formData, slots) => {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              // Créer directement la réservation avec la fonction centralisée
              for (const slot of slots) {
                const dateTime = new Date(slot)
                await createReservation({
                  date: dateTime.toISOString(),
                  clientNom: formData.clientNom,
                  clientEmail: formData.clientEmail,
                  endroit: formData.endroit,
                  montant: formData.montant,
                  montantAcompte: formData.montantAcompte,
                  description: formData.description,
                  selectedAnnonces: formData.selectedAnnonces,
                  duration: formData.duration, // en heures
                  status: 'confirmed'
                })
              }
              
              setQuickReservationModal({ open: false })
              
              // Recharger les données
              await loadEvents()
              
              showNotification('success', 'Réservation créée', 'Réservation créée avec succès!')
              
            } catch (error) {
              console.error('❌ Erreur création réservation rapide:', error)
              showNotification('error', 'Erreur de création', 'Erreur lors de la création de la réservation: ' + error.message)
            }
          }}
        />

        {/* Modal de blocage rapide */}
        <QuickBlockModal
          isOpen={quickBlockModal.open}
          onClose={() => setQuickBlockModal({ open: false })}
          annonces={annonces}
          onConfirm={async (formData, slots) => {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              console.log('🎯 Traitement du blocage:', formData.actionType)
              console.log('📅 Créneaux sélectionnés:', slots)
              console.log('📢 Annonces:', formData.selectedAnnonces)
              console.log('⏰ Durée:', formData.duration, 'heures')

              // Fonction helper pour générer tous les créneaux selon la durée
              const generateSlotsFromDuration = (startSlot, durationHours) => {
                const slotsToBlock = []
                const startDate = new Date(startSlot)
                
                for (let i = 0; i < durationHours; i++) {
                  const slotTime = new Date(startDate)
                  slotTime.setHours(startDate.getHours() + i)
                  slotsToBlock.push(slotTime.toISOString())
                }
                return slotsToBlock
              }

              // Bloquer des créneaux - générer tous les créneaux selon la durée
              for (const slot of slots) {
                const allSlots = generateSlotsFromDuration(slot, formData.duration)
                
                for (const timeSlot of allSlots) {
                  const motifText = formData.selectedAnnonces.length > 0 
                    ? `Bloqué - ${formData.selectedAnnonces.map(id => {
                        const annonce = annonces.find(a => a.id === id)
                        return annonce ? annonce.titre : `Annonce ${id}`
                      }).join(', ')}`
                    : `Créneaux bloqués${formData.description ? ` - ${formData.description}` : ''}`

                  await supabase
                    .from('blocked_slots')
                    .insert({
                      prestataire_id: user.id,
                      date: timeSlot,
                      motif: motifText,
                      annonce_id: formData.selectedAnnonces.length > 0 ? formData.selectedAnnonces[0] : null
                    })
                }
              }

              // Fermer la modal et recharger les événements
              setQuickBlockModal({ open: false })
              loadEvents()
              
              // Afficher un message de succès
              showNotification('success', 'Succès', 'Créneaux bloqués avec succès!')
              
            } catch (error) {
              console.error('❌ Erreur générale:', error)
              showNotification('error', 'Erreur de traitement', 'Erreur lors du blocage: ' + error.message)
            }
          }}
        />
      </div>

      {/* Modal de notification personnalisée */}
      {notification.open && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' :
                notification.type === 'error' ? 'bg-red-100' :
                notification.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {notification.type === 'success' && (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {notification.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={() => setNotification({ open: false, type: 'info', title: '', message: '' })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PrestataireCalendar
