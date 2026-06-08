import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';

import ReservationCard from '../../../components/ReservationCard';
import { notifyReservationConfirmed, notifyReservationCancelled } from '../../../lib/notificationService';
import {
  Calendar, MapPin, Clock, User, Search,
  ChevronRight, CheckCircle, XCircle,
  AlertCircle, Camera, MessageSquare,
  Filter, Phone, Check, X, SlidersHorizontal,
  CalendarDays, Inbox
} from 'lucide-react';

/* =========================
   STATUTS UNIQUEMENT COHÉRENTS
========================= */
const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Camera },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  litige: { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: AlertCircle }
};

export default function PhotographerReservationsPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptComment, setAcceptComment] = useState('');
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseComment, setRefuseComment] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [acceptedReservation, setAcceptedReservation] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    num_facture: '',
    taux_tva: 0,
    montant_ht: 0,
    montant_tva: 0,
    montant_ttc: 0,
    lignes: [{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }],
  });

  /* =========================
     FETCH SAFE
  ========================= */
  const fetchReservations = async () => {
    if (!photographeProfile?.id) return;

    setLoading(true);

    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          client:profiles!reservations_client_id_fkey(
            id, nom, email, avatar_url, ville
          ),
          package:packages_types(id, titre)
        `)
        .eq('prestataire_id', photographeProfile.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      const today = new Date().toISOString().split('T')[0];

      if (timeFilter === 'upcoming') {
        query = query.gte('date', today);
      }

      if (timeFilter === 'past') {
        query = query.lt('date', today);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReservations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [photographeProfile?.id, filter, timeFilter]);

  /* =========================
     SEARCH FILTER SAFE
  ========================= */
  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return reservations.filter((r) => {
      const clientName = r.client?.nom || '';
      const title = r.titre || r.package?.titre || '';
      const lieu = r.lieu || '';

      return (
        clientName.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        lieu.toLowerCase().includes(q)
      );
    });
  }, [reservations, searchQuery]);

  /* =========================
     GROUP BY MONTH SAFE
  ========================= */
  const groupedReservations = useMemo(() => {
    return filteredReservations.reduce((groups, r) => {
      const raw = r.date_prestation || r.date;

      let date = null;
      if (raw) {
        const parsed = new Date(raw);
        if (!isNaN(parsed)) date = parsed;
      }

      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : 'unknown';

      const label = date
        ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        : 'Date inconnue';

      if (!groups[key]) {
        groups[key] = { label, items: [] };
      }

      groups[key].items.push(r);
      return groups;
    }, {});
  }, [filteredReservations]);

  /* =========================
     ACTIONS SAFE
  ========================= */
  const openAcceptModal = (r) => { setPendingReservation(r); setAcceptComment(''); setShowAcceptModal(true); };
  const openRefuseModal = (r) => { setPendingReservation(r); setRefuseComment(''); setShowRefuseModal(true); };

  const handleAcceptSubmit = async () => {
    if (!pendingReservation) return;
    setActionLoading(true);
    try {
      await supabase.from('reservations').update({
        statut: 'confirmed',
        notes_prestataire: acceptComment || null,
        date_confirmation: new Date().toISOString(),
      }).eq('id', pendingReservation.id);
      await notifyReservationConfirmed (pendingReservation.client_id, pendingReservation.date, pendingReservation.id, pendingReservation.demande_id, pendingReservation.prestataire_id);
      
      const montant = parseFloat(pendingReservation.montant_total) || 0;
      setInvoiceData({
        num_facture: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        taux_tva: 0,
        montant_ht: montant,
        montant_tva: 0,
        montant_ttc: montant,
        lignes: [{
          description: pendingReservation.titre || pendingReservation.package?.titre || 'Prestation photographique',
          quantite: 1,
          prix_unitaire: montant,
          total: montant,
        }],
      });
      setAcceptedReservation(pendingReservation);
      setShowAcceptModal(false);
      setShowInvoiceModal(true);
      fetchReservations();
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleRefuseSubmit = async () => {
    if (!pendingReservation) return;
    setActionLoading(true);
    try {
      await supabase.from('reservations').update({
        statut: 'cancelled',
        motif_annulation: refuseComment || 'Refusé par le prestataire',
        annule_par: photographeProfile?.id,
        date_annulation: new Date().toISOString(),
      }).eq('id', pendingReservation.id);
      await notifyReservationCancelled(pendingReservation.client_id, "photographe", pendingReservation.id,pendingReservation.prestataire_id, pendingReservation.demande_id);
      setShowRefuseModal(false);
      fetchReservations();
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleRequestInfo = (r) => {
    if (!r?.client?.id) return;
    router.push(`/shared/messages?client=${r.client.id}&reservation=${r.id}`);
  };

  const updateLigne = (i, field, val) => {
    const lignes = invoiceData.lignes.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: val };
      if (field === 'quantite' || field === 'prix_unitaire') {
        updated.total = (parseFloat(field === 'quantite' ? val : updated.quantite) || 0)
                      * (parseFloat(field === 'prix_unitaire' ? val : updated.prix_unitaire) || 0);
      }
      return updated;
    });
    const ht = lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);
    const tva = Math.round(ht * invoiceData.taux_tva) / 100;
    setInvoiceData(prev => ({ ...prev, lignes, montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva }));
  };

  const addLigne = () => setInvoiceData(prev => ({
    ...prev,
    lignes: [...prev.lignes, { description: '', quantite: 1, prix_unitaire: 0, total: 0 }],
  }));

  const removeLigne = (i) => {
    const lignes = invoiceData.lignes.filter((_, idx) => idx !== i);
    const ht = lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);
    const tva = Math.round(ht * invoiceData.taux_tva) / 100;
    setInvoiceData(prev => ({ ...prev, lignes, montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva }));
  };

  const updateTVA = (taux) => {
    const tva = Math.round(invoiceData.montant_ht * taux) / 100;
    setInvoiceData(prev => ({ ...prev, taux_tva: taux, montant_tva: tva, montant_ttc: prev.montant_ht + tva }));
  };

  const handleInvoiceSubmit = async () => {
    if (!acceptedReservation) return;
    setActionLoading(true);
    try {
      await supabase.from('factures').insert({
        reservation_id: acceptedReservation.id,
        prestataire_id: photographeProfile?.id,
        num_facture: invoiceData.num_facture,
        montant_ht: parseFloat(invoiceData.montant_ht) || 0,
        montant_tva: parseFloat(invoiceData.montant_tva) || 0,
        montant_ttc: parseFloat(invoiceData.montant_ttc) || 0,
        facture: invoiceData.lignes,
        pdf_url: null
      });
      setShowInvoiceModal(false);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  /* =========================
     UI
  ========================= */

  const statusCounts = useMemo(() => {
    const counts = { all: reservations.length };
    reservations.forEach((r) => {
      const s = r.statut || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [reservations]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {reservations.length} réservation{reservations.length !== 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par client, prestation, lieu…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: 'upcoming', label: 'À venir' },
              { key: 'all',      label: 'Toutes' },
              { key: 'past',     label: 'Passées' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}

            <div className="ml-auto">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Tous les statuts {statusCounts.all ? `(${statusCounts.all})` : ''}</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label} {statusCounts[k] ? `(${statusCounts[k]})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Aucune réservation trouvée</p>
            <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReservations)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, group]) => (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="font-semibold text-gray-700 capitalize">{group.label}</h2>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{group.items.length}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="space-y-3">
                    {group.items.map((r) => (
                      <ReservationCard
                        key={r.id}
                        reservation={r}
                        onClick={() => router.push(`/photographe/reservations/${r.id}`)}
                        onConfirm={() => openAcceptModal(r)}
                        onRefuse={() => openRefuseModal(r)}
                        onRequestInfo={() => handleRequestInfo(r)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Modal Accepter */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Accepter cette réservation ?</h2>
            <p className="text-gray-500 text-sm mb-4">Le client recevra une notification de confirmation.</p>
            <textarea
              value={acceptComment}
              onChange={(e) => setAcceptComment(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-green-500 text-sm"
              rows={3}
              placeholder="Message pour le client (optionnel)"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAcceptModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Annuler</button>
              <button disabled={actionLoading} onClick={handleAcceptSubmit}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
                {actionLoading ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Créer la facture</h2>
              <p className="text-sm text-gray-500 mt-0.5">La facture sera transmise au client et attachée à la réservation.</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">N° Facture</label>
                  <input value={invoiceData.num_facture} onChange={e => setInvoiceData(prev => ({ ...prev, num_facture: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client</label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-700 truncate">
                    {acceptedReservation?.client?.nom || 'Client'}{acceptedReservation?.client?.email ? ` — ${acceptedReservation.client.email}` : ''}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Prestations</label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Description</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-16">Qté</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-32">Prix unit. (MAD)</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium w-24">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.lignes.map((l, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <input value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm" placeholder="Description" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right" />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{(parseFloat(l.total) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-center">
                            {invoiceData.lignes.length > 1 && (
                              <button onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 px-3 py-2">
                    <button onClick={addLigne} className="text-indigo-600 text-xs font-medium hover:underline">+ Ajouter une ligne</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant HT</span>
                    <span className="font-medium">{(parseFloat(invoiceData.montant_ht) || 0).toFixed(2)} MAD</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">TVA</span>
                    <div className="flex items-center gap-2">
                      <select value={invoiceData.taux_tva} onChange={e => updateTVA(parseFloat(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value={0}>0%</option>
                        <option value={7}>7%</option>
                        <option value={10}>10%</option>
                        <option value={14}>14%</option>
                        <option value={20}>20%</option>
                      </select>
                      <span className="font-medium">{(parseFloat(invoiceData.montant_tva) || 0).toFixed(2)} MAD</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                    <span>Total TTC</span>
                    <span className="text-indigo-700 text-base">{(parseFloat(invoiceData.montant_ttc) || 0).toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 text-sm">
                Passer (plus tard)
              </button>
              <button disabled={actionLoading} onClick={handleInvoiceSubmit}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm">
                {actionLoading ? 'Envoi...' : 'Envoyer la facture au client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refuser */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Refuser cette réservation ?</h2>
            <p className="text-gray-500 text-sm mb-4">Le client sera notifié du refus.</p>
            <textarea
              value={refuseComment}
              onChange={(e) => setRefuseComment(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-red-500 text-sm"
              rows={3}
              placeholder="Raison du refus (optionnel)"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRefuseModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Annuler</button>
              <button disabled={actionLoading} onClick={handleRefuseSubmit}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'En cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
