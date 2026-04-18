import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import {
  ClipboardList,
  MapPin,
  Calendar,
  Euro,
  Clock,
  ChevronRight,
  Filter,
  Search,
  Tag,
  User,
  ArrowLeft,
  Send,
  X,
  CheckCircle,
  Zap,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'mariage', label: 'Mariage' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'evenement', label: 'Événement' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'famille', label: 'Famille' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'mode', label: 'Mode' },
  { value: 'autre', label: 'Autre' },
];

const STATUT_COLORS = {
  ouverte: { bg: '#D1FAE5', text: '#065F46', label: 'Ouverte' },
  pourvue: { bg: '#DBEAFE', text: '#1E40AF', label: 'Pourvue' },
  fermee: { bg: '#F3F4F6', text: '#6B7280', label: 'Fermée' },
};

function DevisModal({ demande, photographeId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    montant_total: '',
    message_personnalise: '',
    delai_validite_jours: 7,
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant_total || isNaN(parseFloat(form.montant_total))) return;
    setSending(true);
    try {
      const { error } = await supabase.from('devis').insert({
        demande_id: demande.id,
        prestataire_id: photographeId,
        client_id: demande.client_id,
        montant_total: parseFloat(form.montant_total),
        message_personnalise: form.message_personnalise,
        delai_validite_jours: parseInt(form.delai_validite_jours),
        statut: 'en_attente',
      });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erreur envoi devis:', err);
      alert('Erreur lors de l\'envoi du devis. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white', borderRadius: '20px',
          maxWidth: '520px', width: '100%',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Envoyer un devis</h2>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{demande.titre}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Devis envoyé !</h3>
            <p className="text-gray-500">Le client sera notifié de votre proposition.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Montant */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Montant total (€) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Euro className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={form.montant_total}
                  onChange={(e) => setForm({ ...form, montant_total: e.target.value })}
                  placeholder="Ex: 350"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {demande.budget_max && (
                <p className="text-xs text-gray-500 mt-1">
                  Budget client : jusqu'à {demande.budget_max} €
                </p>
              )}
            </div>

            {/* Délai de validité */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Validité du devis
              </label>
              <select
                value={form.delai_validite_jours}
                onChange={(e) => setForm({ ...form, delai_validite_jours: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value={3}>3 jours</option>
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message personnalisé
              </label>
              <textarea
                value={form.message_personnalise}
                onChange={(e) => setForm({ ...form, message_personnalise: e.target.value })}
                rows={5}
                placeholder="Présentez votre approche, votre expérience pour ce type de prestation, les livrables inclus..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: sending ? '#9CA3AF' : '#7C3AED' }}
              >
                {sending ? (
                  <span>Envoi...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer le devis
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DemandesClients() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'plateforme'
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [devisEnvoyes, setDevisEnvoyes] = useState(new Set());

  // Lire le tab depuis l'URL
  useEffect(() => {
    if (router.query.tab === 'plateforme') setActiveTab('plateforme');
    else if (router.query.tab === 'clients') setActiveTab('clients');
  }, [router.query.tab]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadDemandes();
    loadDevisEnvoyes();
  }, [user, authLoading]);

  const loadDemandes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demandes_client')
        .select(`
          id,
          titre,
          description,
          categorie,
          date_souhaitee,
          lieu,
          ville,
          budget_max,
          duree_estimee_heures,
          type_prestation,
          statut,
          created_at,
          client_id,
          profiles!demandes_client_client_id_fkey(nom, avatar_url)
        `)
        .eq('statut', 'ouverte')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemandes(data || []);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDevisEnvoyes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('devis')
      .select('demande_id')
      .eq('prestataire_id', user.id);
    setDevisEnvoyes(new Set((data || []).map((d) => d.demande_id)));
  };

  const filtered = demandes.filter((d) => {
    const matchCat = !filterCategorie || d.categorie === filterCategorie;
    const matchSearch =
      !filterSearch ||
      d.titre?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      d.description?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      d.ville?.toLowerCase().includes(filterSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date non précisée';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'il y a moins d\'1h';
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'hier';
    return `il y a ${days} jours`;
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* En-tête */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/photographe/menu')}
              className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Demandes
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {activeTab === 'clients'
                  ? `${filtered.length} demande${filtered.length !== 1 ? 's' : ''} client${filtered.length !== 1 ? 's' : ''} ouverte${filtered.length !== 1 ? 's' : ''}`
                  : 'Missions proposées par la plateforme'}
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
            <button
              onClick={() => setActiveTab('clients')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={activeTab === 'clients'
                ? { backgroundColor: '#7C3AED', color: 'white' }
                : { color: '#6B7280' }}
            >
              <ClipboardList className="w-4 h-4" />
              Demandes clients
            </button>
            <button
              onClick={() => setActiveTab('plateforme')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={activeTab === 'plateforme'
                ? { backgroundColor: '#130183', color: 'white' }
                : { color: '#6B7280' }}
            >
              <Zap className="w-4 h-4" />
              Plateforme
            </button>
          </div>

          {/* Contenu onglet Plateforme */}
          {activeTab === 'plateforme' && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ backgroundColor: '#EEF2FF' }}>
                <Zap className="w-8 h-8" style={{ color: '#130183' }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Missions plateforme</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                La plateforme ServiDaba vous proposera bientôt des missions adaptées à votre profil et votre localisation.
              </p>
              <p className="text-gray-400 text-sm mt-2">Fonctionnalité à venir</p>
            </div>
          )}

          {/* Contenu onglet Clients — Filtres */}
          {activeTab === 'clients' && (
          <>
          {/* Filtres */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par titre, description, ville..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            {/* Catégorie */}
            <div className="relative sm:w-56">
              <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white appearance-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucune demande trouvée</p>
              <p className="text-gray-400 text-sm mt-1">Revenez plus tard ou modifiez vos filtres</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((demande) => {
                const statut = STATUT_COLORS[demande.statut] || STATUT_COLORS.ouverte;
                const dejaEnvoye = devisEnvoyes.has(demande.id);
                return (
                  <div
                    key={demande.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* En-tête de la carte */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {demande.categorie && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}
                            >
                              <Tag className="w-3 h-3" />
                              {CATEGORIES.find(c => c.value === demande.categorie)?.label || demande.categorie}
                            </span>
                          )}
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: statut.bg, color: statut.text }}
                          >
                            {statut.label}
                          </span>
                          {dejaEnvoye && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Devis envoyé
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                          {demande.titre}
                        </h3>

                        {demande.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {demande.description}
                          </p>
                        )}

                        {/* Détails */}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {(demande.ville || demande.lieu) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {demande.ville || demande.lieu}
                            </span>
                          )}
                          {demande.date_souhaitee && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(demande.date_souhaitee)}
                            </span>
                          )}
                          {demande.budget_max && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <Euro className="w-3.5 h-3.5" />
                              Budget : jusqu'à {demande.budget_max} €
                            </span>
                          )}
                          {demande.duree_estimee_heures && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {demande.duree_estimee_heures}h estimées
                            </span>
                          )}
                          {demande.profiles?.nom && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {demande.profiles.nom}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {timeAgo(demande.created_at)}
                        </span>
                        <button
                          onClick={() => setSelectedDemande(demande)}
                          disabled={dejaEnvoye}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                          style={{
                            backgroundColor: dejaEnvoye ? '#9CA3AF' : '#7C3AED',
                            cursor: dejaEnvoye ? 'default' : 'pointer'
                          }}
                        >
                          {dejaEnvoye ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Envoyé
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Envoyer un devis
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Modal devis */}
      {selectedDemande && (
        <DevisModal
          demande={selectedDemande}
          photographeId={user?.id}
          onClose={() => setSelectedDemande(null)}
          onSuccess={() => {
            setDevisEnvoyes((prev) => new Set([...prev, selectedDemande.id]));
          }}
        />
      )}
    </>
  );
}
