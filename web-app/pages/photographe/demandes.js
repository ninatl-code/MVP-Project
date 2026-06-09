import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { findMatchingDemandes } from '../../lib/matchingService';
import {notifyNewDevis} from '../../lib/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { categories } from '../../constants/categories';
import { getStatusDemandes } from '../../lib/demandeService';

import {
  ClipboardList,
  MapPin,
  Calendar,
  Banknote,
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
  FileText,
  Plus,
  Eye,
} from 'lucide-react';



const STATUT_COLORS = {
  ouverte: { bg: '#D1FAE5', text: '#065F46', label: 'Ouverte' },
  pourvue: { bg: '#DBEAFE', text: '#1E40AF', label: 'Pourvue' },
  fermee: { bg: '#F3F4F6', text: '#6B7280', label: 'Fermée' },
};
const normalizeDate = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};
const today = new Date();
today.setHours(0, 0, 0, 0);

function DetailModal({ demande, onClose }) {
  if (!demande) return null;
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non précisée';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: 'white', borderRadius: '20px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">Détail de la demande</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          {demande.type_prestation?.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Spécialité recherchée</p>
              <div className="flex flex-wrap gap-2">
                {demande.type_prestation.filter(Boolean).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#EDE9FE', color: '#7A1600' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {demande.details?.langages && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Langages de développement</p>
              <p className="text-sm text-gray-700">{demande.details.langages}</p>
            </div>
          )}
          {(demande.details?.matiere || demande.details?.niveau) && (
            <div className="grid grid-cols-2 gap-4">
              {demande.details.matiere && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Matière</p>
                  <p className="text-sm text-gray-700">{demande.details.matiere}</p>
                </div>
              )}
              {demande.details.niveau && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Niveau</p>
                  <p className="text-sm text-gray-700">{demande.details.niveau}</p>
                </div>
              )}
            </div>
          )}
          {demande.categorie && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Catégorie</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#EDE9FE', color: '#7A1600' }}>
                <Tag className="w-3 h-3" />
                {categories.find(c => c.value === demande.categorie)?.label || demande.categorie}
              </span>
            </div>
          )}
          {demande.description && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{demande.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {(demande.ville || demande.lieu) && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lieu</p>
                <p className="text-sm text-gray-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{demande.ville || demande.lieu}</p>
              </div>
            )}
            {demande.date_souhaitee && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date souhaitée</p>
                <p className="text-sm text-gray-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(demande.date_souhaitee)}</p>
              </div>
            )}
            {demande.budget_max && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Budget maximum</p>
                <p className="text-sm font-semibold text-green-600 flex items-center gap-1"><Banknote className="w-3.5 h-3.5" />{demande.budget_max} MAD</p>
              </div>
            )}
            {demande.duree_estimee_heures && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Durée estimée</p>
                <p className="text-sm text-gray-700 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{demande.duree_estimee_heures}h</p>
              </div>
            )}
            {demande.profiles?.nom && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Client</p>
                <p className="text-sm text-gray-700 flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-400" />{demande.profiles.nom}</p>
              </div>
            )}
          </div>
          {demande.statut && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Statut</p>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: (STATUT_COLORS[demande.statut] || STATUT_COLORS.ouverte).bg, color: (STATUT_COLORS[demande.statut] || STATUT_COLORS.ouverte).text }}>
                {(STATUT_COLORS[demande.statut] || STATUT_COLORS.ouverte).label}
              </span>
            </div>
          )}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm">Fermer</button>
        </div>
      </div>
    </div>
  );
}

function DevisModal({ demande, photographeId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    titre: '',
    description: '',
    tarif_base: '',
    frais_deplacement: '',
    acompte_percent: 0,
    duree_prestation_heures: demande.duree_estimee_heures || '',
    services_inclus: [],
    newService: '',
    horaires_proposes: '',
    modalites_paiement: [],
    message_personnalise: '',
    delai_validite_jours: 7,
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const montantTotal = (parseFloat(form.tarif_base) || 0) + (parseFloat(form.frais_deplacement) || 0);
  const acompteMontant = form.acompte_percent > 0 ? (montantTotal * form.acompte_percent / 100) : 0;

  const addService = () => {
    const val = form.newService.trim();
    if (!val) return;
    setForm({ ...form, services_inclus: [...form.services_inclus, val], newService: '' });
  };

  const removeService = (idx) => {
    setForm({ ...form, services_inclus: form.services_inclus.filter((_, i) => i !== idx) });
  };

  const toggleModalite = (m) => {
    setForm(prev => ({
      ...prev,
      modalites_paiement: prev.modalites_paiement.includes(m)
        ? prev.modalites_paiement.filter(x => x !== m)
        : [...prev.modalites_paiement, m],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tarif_base || isNaN(parseFloat(form.tarif_base))) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from('devis').insert({
        demande_id: demande.id,
        prestataire_id: photographeId,
        client_id: demande.client_id,
        titre: form.titre.trim() || `Devis – ${demande.titre || demande.categorie || 'prestation'}`,
        description: form.description || '',
        tarif_base: parseFloat(form.tarif_base),
        frais_deplacement: parseFloat(form.frais_deplacement) || 0,
        montant_total: montantTotal,
        acompte_percent: form.acompte_percent || null,
        acompte_montant: acompteMontant > 0 ? acompteMontant : null,
        duree_prestation_heures: parseFloat(form.duree_prestation_heures) || 0,
        services_inclus: form.services_inclus.length > 0 ? form.services_inclus : null,
        horaires_proposes: form.horaires_proposes.trim() ? { detail: form.horaires_proposes.trim() } : null,
        modalites_paiement: form.modalites_paiement.length > 0 ? form.modalites_paiement : null,
        message_personnalise: form.message_personnalise || null,
        duree_validite_jours: parseInt(form.delai_validite_jours),
        statut: 'envoye',
      })
      .select('id')
      .single();
      if (error) throw error;
      // Notifier le client
      await notifyNewDevis(demande.client_id, data.id, data.prestataire_id, demande.id);
     
      
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (err) {
      console.error('Erreur envoi devis:', err);
      alert(`Erreur : ${err?.message || JSON.stringify(err)}`);
    } finally {
      setSending(false);
    }
  };

  const SectionTitle = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4" style={{ color: '#7A1600' }} />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: 'white', borderRadius: '20px', maxWidth: '560px', width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête sticky */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Envoyer un devis</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{demande.titre}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Devis envoyé !</h2>
            <p className="text-gray-500">Le client sera notifié de votre proposition.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* ── 1. IDENTIFICATION ── */}
            <div className="space-y-3">
              <SectionTitle icon={FileText} label="Identification" />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre du devis</label>
                <input
                  type="text"
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  placeholder={`Devis – ${demande.titre || demande.categorie || 'prestation'}`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Détaillez la prestation proposée, les livrables, la méthodologie..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── 2. TARIFICATION ── */}
            <div className="space-y-3">
              <SectionTitle icon={Banknote} label="Tarification" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Tarif de base (MAD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number" min="0" step="0.01" required
                      value={form.tarif_base}
                      onChange={(e) => setForm({ ...form, tarif_base: e.target.value })}
                      placeholder="300"
                      className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Frais de déplacement (MAD)</label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number" min="0" step="0.01"
                      value={form.frais_deplacement}
                      onChange={(e) => setForm({ ...form, frais_deplacement: e.target.value })}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Total calculé */}
              {montantTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: '#F5F3FF' }}>
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-lg font-bold" style={{ color: '#7A1600' }}>{montantTotal.toFixed(2)} MAD</span>
                </div>
              )}
              {demande.budget_max && (
                <p className="text-xs text-gray-500">Budget du client : jusqu'à <strong>{demande.budget_max} MAD</strong></p>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Acompte demandé</label>
                <select
                  value={form.acompte_percent}
                  onChange={(e) => setForm({ ...form, acompte_percent: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                >
                  <option value={0}>Aucun acompte</option>
                  <option value={20}>20 %</option>
                  <option value={30}>30 %</option>
                  <option value={50}>50 %</option>
                </select>
                {acompteMontant > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Acompte : <strong>{acompteMontant.toFixed(2)} MAD</strong></p>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── 3. PRESTATION ── */}
            <div className="space-y-3">
              <SectionTitle icon={Clock} label="Prestation" />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Durée estimée (heures)</label>
                <input
                  type="number" min="0.5" step="0.5"
                  value={form.duree_prestation_heures}
                  onChange={(e) => setForm({ ...form, duree_prestation_heures: e.target.value })}
                  placeholder="Ex : 3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Services inclus</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={form.newService}
                    onChange={(e) => setForm({ ...form, newService: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService(); } }}
                    placeholder="Ex : 50 photos retouchées, galerie en ligne..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center gap-1 shrink-0"
                    style={{ backgroundColor: '#7A1600' }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                {form.services_inclus.length > 0 && (
                  <ul className="space-y-1.5">
                    {form.services_inclus.map((s, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 text-sm">
                        <span className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          {s}
                        </span>
                        <button type="button" onClick={() => removeService(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── 4. HORAIRES & PAIEMENT ── */}
            <div className="space-y-3">
              <SectionTitle icon={Calendar} label="Horaires & Paiement" />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horaires proposés</label>
                <textarea
                  value={form.horaires_proposes}
                  onChange={(e) => setForm({ ...form, horaires_proposes: e.target.value })}
                  rows={2}
                  placeholder="Ex : Disponible le matin à partir de 9h, samedi 14 juin ou dimanche 15 juin..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modalités de paiement</label>
                <div className="flex flex-wrap gap-2">
                  {['Virement bancaire', 'Carte bancaire', 'Espèces', 'Chèque', 'PayPal'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleModalite(m)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={form.modalites_paiement.includes(m)
                        ? { backgroundColor: '#7A1600', color: 'white', borderColor: '#7A1600' }
                        : { backgroundColor: 'white', color: '#6B7280', borderColor: '#D1D5DB' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Validité du devis</label>
                <select
                  value={form.delai_validite_jours}
                  onChange={(e) => setForm({ ...form, delai_validite_jours: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                >
                  <option value={3}>3 jours</option>
                  <option value={7}>7 jours</option>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── 5. MESSAGE ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message personnalisé</label>
              <textarea
                value={form.message_personnalise}
                onChange={(e) => setForm({ ...form, message_personnalise: e.target.value })}
                rows={4}
                placeholder="Présentez votre approche, votre expérience pour ce type de prestation..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors text-sm"
                style={{ backgroundColor: sending ? '#9CA3AF' : '#7A1600' }}
              >
                {sending ? <span>Envoi...</span> : <><Send className="w-4 h-4" />Envoyer le devis</>}
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
  const [loadError, setLoadError] = useState(null);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [detailDemande, setDetailDemande] = useState(null);
  const [devisEnvoyes, setDevisEnvoyes] = useState(new Set());
  const [matchings, setMatchings] = useState([]);
  const [loadingMatchings, setLoadingMatchings] = useState(true);
  const [matchError, setMatchError] = useState(null);

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
    loadMatchings();
  }, [user, authLoading]);

  const loadDemandes = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await getStatusDemandes('ouverte');

      if (error) { setLoadError(error.message); throw error; }
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

  const loadMatchings = async () => {
    if (!user) return;
    setLoadingMatchings(true);
    setMatchError(null);
    try {
      const { data, error } = await supabase
        .from('matchings')
        .select(`
          match_score,
          match_reasons,
          demandes_client!inner(
            id, titre, description, categorie, date_souhaitee,
            lieu, ville, budget_max, duree_estimee_heures,
            type_prestation, details, statut, created_at, client_id,
            profiles!demandes_client_client_id_fkey(nom, avatar_url)
          )
        `)
        .eq('prestataire_id', user.id)
        .gte('match_score', 55)
        .order('match_score', { ascending: false });

      if (error) { setMatchError(error.message); return; }

      const now = new Date();
      const suggestions = (data || [])
        .map(m => ({
          ...m.demandes_client,
          matchScore: m.match_score,
          matchReasons: m.match_reasons || [],
        }))
        // Exclure les demandes pourvues, fermées, annulées ou expirées
        .filter(d =>
          d.statut === 'ouverte' &&
          (!d.date_souhaitee || normalizeDate(d.date_souhaitee) >= today)
        );

      setMatchings(suggestions);
    } catch (err) {
      console.error('Erreur chargement matchings:', err);
      setMatchError(err.message || 'Erreur inattendue');
    } finally {
      setLoadingMatchings(false);
    }
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
                ? { backgroundColor: '#7A1600', color: 'white' }
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
            loadingMatchings ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : matchError ? (
              <div className="text-center py-16">
                <p className="text-red-500 font-medium text-sm">Erreur : {matchError}</p>
              </div>
            ) : matchings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                  style={{ backgroundColor: '#EEF2FF' }}>
                  <Zap className="w-8 h-8" style={{ color: '#130183' }} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune mission pour l'instant</h2>
                <p className="text-gray-500 max-w-sm mx-auto">
                  La plateforme vous proposera des missions adaptées à votre profil dès qu'une demande correspondante sera publiée.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchings.map((demande) => {
                  const dejaEnvoye = devisEnvoyes.has(demande.id);
                  const score = demande.matchScore || 0;
                  const scoreColor = score >= 80 ? '#1E823A' : (score >= 70 && score <= 75) ? '#D97706' : '#6B7280';
                  return (
                    <div
                      key={demande.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span
                              className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-default group"
                              style={{ backgroundColor: scoreColor + '1A', color: scoreColor }}
                            >
                              <Sparkles className="w-3 h-3" />
                              Match {score}%
                              {demande.matchReasons?.length > 0 && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] rounded-xl bg-gray-900 text-white text-xs px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                  <span className="block font-semibold mb-1 text-gray-300">Pourquoi ce match ?</span>
                                  {demande.matchReasons.map((r, i) => <span key={i} className="block">• {r}</span>)}
                                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#111827' }} />
                                </span>
                              )}
                            </span>
                            {demande.categorie && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#EDE9FE', color: '#44338A' }}>
                                <Tag className="w-3 h-3" />
                                {categories.find(c => c.value === demande.categorie)?.label || demande.categorie}
                              </span>
                            )}
                            {dejaEnvoye ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />Devis envoyé
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Ouverte
                              </span>
                            )}
                          </div>
                          <h2 className="text-base font-bold text-gray-900 mb-1 truncate">{demande.titre}</h2>
                          {demande.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{demande.description}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {(demande.ville || demande.lieu) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{demande.ville || demande.lieu}</span>}
                            {demande.date_souhaitee && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(demande.date_souhaitee)}</span>}
                            {demande.budget_max && <span className="flex items-center gap-1 text-green-600 font-medium"><Banknote className="w-3.5 h-3.5" />Budget : jusqu'à {demande.budget_max} MAD</span>}
                            {demande.duree_estimee_heures && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{demande.duree_estimee_heures}h estimées</span>}
                            {demande.profiles?.nom && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{demande.profiles.nom}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(demande.created_at)}</span>
                          <button
                            onClick={() => setDetailDemande(demande)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />Voir le détail
                          </button>
                          <button
                            onClick={() => setSelectedDemande(demande)}
                            disabled={dejaEnvoye}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                            style={{ backgroundColor: dejaEnvoye ? '#9CA3AF' : '#130183', cursor: dejaEnvoye ? 'default' : 'pointer' }}
                          >
                            {dejaEnvoye ? <><CheckCircle className="w-4 h-4" />Envoyé</> : <><Send className="w-4 h-4" />Envoyer un devis</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
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
                {categories.map((c) => (
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
          ) : loadError ? (
            <div className="text-center py-16">
              <p className="text-red-500 font-medium text-sm">Erreur : {loadError}</p>
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
                              style={{ backgroundColor: '#EDE9FE', color: '#44338A' }}
                            >
                              <Tag className="w-3 h-3" />
                              {categories.find(c => c.value === demande.categorie)?.label || demande.categorie}
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

                        <h2 className="text-base font-bold text-gray-900 mb-1 truncate">
                          {demande.titre}
                        </h2>

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
                              <Banknote className="w-3.5 h-3.5" />
                              Budget : jusqu'à {demande.budget_max} MAD
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
                          onClick={() => setDetailDemande(demande)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />Voir le détail
                        </button>
                        <button
                          onClick={() => setSelectedDemande(demande)}
                          disabled={dejaEnvoye}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                          style={{
                            backgroundColor: dejaEnvoye ? '#5D5E63' : '#7A1600',
                            cursor: dejaEnvoye ? 'default' : 'pointer'
                          }}
                        >
                          {dejaEnvoye ? (
                            <><CheckCircle className="w-4 h-4" />Envoyé</>
                          ) : (
                            <><Send className="w-4 h-4" />Envoyer un devis</>
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

      {/* Modal détail */}
      {detailDemande && (
        <DetailModal demande={detailDemande} onClose={() => setDetailDemande(null)} />
      )}

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
