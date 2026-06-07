import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';
import {
  FileText, Download, Eye, Search, Calendar, Euro,
  CheckCircle, XCircle, ChevronLeft, Printer, Mail,
  Plus, Trash2, X, TrendingUp, Users, RefreshCw
} from 'lucide-react';

const ACCENT = '#130183';

function generateNumFacture() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `FAC-${yy}${mm}-${rand}`;
}

const emptyLigne = () => ({ description: '', quantite: 1, prix_unitaire: 0, total: 0 });

export default function Factures() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [form, setForm] = useState({
    reservation_id: '',
    num_facture: generateNumFacture(),
    taux_tva: 20,
    lignes: [emptyLigne()],
  });

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((s, i) => s + (parseFloat(i.montant_ttc) || 0), 0),
    thisMonth: invoices.filter(i => {
      const d = new Date(i.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    clients: new Set(invoices.map(i => i.reservation?.client?.nom).filter(Boolean)).size,
  };

  const fetchInvoices = useCallback(async (uid) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('factures')
        .select(`*, reservation:reservations(id, titre, date, client:profiles!reservations_client_id_fkey(nom, email))`)
        .eq('prestataire_id', uid)
        .order('created_at', { ascending: false });
      setInvoices(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async (uid) => {
    const { data } = await supabase
      .from('reservations')
      .select(`id, titre, date, statut, client:profiles!reservations_client_id_fkey(nom, email)`)
      .eq('prestataire_id', uid)
      .in('statut', ['confirmed', 'completed'])
      .order('date', { ascending: false });
    setReservations(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      fetchInvoices(user.id);
      fetchReservations(user.id);
    });
  }, [fetchInvoices, fetchReservations, router]);

  useEffect(() => {
    if (!searchTerm) { setFilteredInvoices(invoices); return; }
    const s = searchTerm.toLowerCase();
    setFilteredInvoices(invoices.filter(i =>
      i.num_facture?.toLowerCase().includes(s) ||
      i.reservation?.client?.nom?.toLowerCase().includes(s) ||
      i.reservation?.titre?.toLowerCase().includes(s)
    ));
  }, [invoices, searchTerm]);

  const updateLigne = (idx, field, val) => {
    setForm(prev => {
      const lignes = prev.lignes.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: val };
        updated.total = parseFloat(updated.quantite || 0) * parseFloat(updated.prix_unitaire || 0);
        return updated;
      });
      return { ...prev, lignes };
    });
  };
  const addLigne = () => setForm(prev => ({ ...prev, lignes: [...prev.lignes, emptyLigne()] }));
  const removeLigne = (idx) => setForm(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== idx) }));

  const totalHT = form.lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);
  const totalTVA = totalHT * (parseFloat(form.taux_tva) || 0) / 100;
  const totalTTC = totalHT + totalTVA;

  const openCreate = () => {
    setForm({ reservation_id: '', num_facture: generateNumFacture(), taux_tva: 20, lignes: [emptyLigne()] });
    setCreateError(null);
    setShowCreate(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.lignes.some(l => l.description.trim())) {
      setCreateError('Ajoutez au moins une ligne avec une description.');
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const payload = {
        prestataire_id: userId,
        reservation_id: form.reservation_id || null,
        num_facture: form.num_facture,
        montant_ht: parseFloat(totalHT.toFixed(2)),
        montant_tva: parseFloat(totalTVA.toFixed(2)),
        montant_ttc: parseFloat(totalTTC.toFixed(2)),
        facture: form.lignes.filter(l => l.description.trim()),
      };
      const { error } = await supabase.from('factures').insert(payload);
      if (error) throw error;
      setShowCreate(false);
      await fetchInvoices(userId);
    } catch (err) {
      setCreateError(err.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (s) => s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Page header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Mes Factures
              </h1>
              <p className="text-xs text-gray-500">{stats.total} facture{stats.total !== 1 ? 's' : ''} au total</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: ACCENT }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <FileText className="w-4 h-4" />, value: stats.total, label: 'Factures', color: 'text-indigo-600', border: 'border-indigo-100' },
            { icon: <Euro className="w-4 h-4" />, value: `${stats.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`, label: 'CA total', color: 'text-emerald-600', border: 'border-emerald-100' },
            { icon: <Calendar className="w-4 h-4" />, value: stats.thisMonth, label: 'Ce mois', color: 'text-blue-600', border: 'border-blue-100' },
            { icon: <Users className="w-4 h-4" />, value: stats.clients, label: 'Clients', color: 'text-violet-600', border: 'border-violet-100' },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-2xl p-4 border-2 ${s.border} flex flex-col gap-1`}>
              <span className={`${s.color} mb-1`}>{s.icon}</span>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, client ou prestation…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">{searchTerm ? 'Aucun résultat' : 'Aucune facture'}</p>
            <p className="text-sm text-gray-400 mb-6">
              {searchTerm ? 'Modifiez vos critères de recherche.' : 'Créez votre première facture en cliquant sur le bouton ci-dessus.'}
            </p>
            {!searchTerm && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ACCENT }}
              >
                <Plus className="w-4 h-4" />
                Nouvelle facture
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredInvoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                <div className="p-4 flex items-center gap-4">
                  {/* Left accent */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900">{inv.num_facture || `#${inv.id.slice(0, 8)}`}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Émise
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{inv.reservation?.client?.nom || <span className="text-gray-400 italic">Client inconnu</span>}</p>
                    <p className="text-xs text-gray-400 truncate">{inv.reservation?.titre || 'Prestation libre'} · {formatDate(inv.created_at)}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-gray-900">
                      {(parseFloat(inv.montant_ttc) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">MAD TTC</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setSelectedInvoice(inv); setShowPreview(true); }}
                      className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                      title="Aperçu"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Imprimer">
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Always-visible eye on mobile */}
                  <button
                    onClick={() => { setSelectedInvoice(inv); setShowPreview(true); }}
                    className="sm:hidden p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-500"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer total */}
        {filteredInvoices.length > 1 && (
          <div className="rounded-2xl p-6 text-white flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #5C6BC0 100%)` }}>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{filteredInvoices.length} factures affichées</p>
              <p className="text-3xl font-extrabold tracking-tight">
                {filteredInvoices.reduce((s, i) => s + (parseFloat(i.montant_ttc) || 0), 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="text-lg font-medium text-white/70">MAD</span>
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white/70" />
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full md:rounded-2xl md:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> Nouvelle facture
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Reservation selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Réservation liée <span className="text-gray-400">(optionnel)</span></label>
                <select
                  value={form.reservation_id}
                  onChange={(e) => setForm(p => ({ ...p, reservation_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">— Facture libre (sans réservation) —</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.titre || 'Sans titre'} — {r.client?.nom || 'Client'} ({formatDate(r.date)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Num + TVA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° facture</label>
                  <input
                    type="text"
                    value={form.num_facture}
                    onChange={(e) => setForm(p => ({ ...p, num_facture: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                  <input
                    type="number"
                    min="0" max="100" step="0.1"
                    value={form.taux_tva}
                    onChange={(e) => setForm(p => ({ ...p, taux_tva: parseFloat(e.target.value) || 0 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Lignes de facture</label>
                  <button type="button" onClick={addLigne} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lignes.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={l.description}
                        onChange={(e) => updateLigne(i, 'description', e.target.value)}
                        className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <input
                        type="number" min="1" placeholder="Qté"
                        value={l.quantite}
                        onChange={(e) => updateLigne(i, 'quantite', parseFloat(e.target.value) || 0)}
                        className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <input
                        type="number" min="0" step="0.01" placeholder="P.U."
                        value={l.prix_unitaire}
                        onChange={(e) => updateLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                        className="col-span-3 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="col-span-1 text-right text-sm font-medium text-gray-700 truncate">{(parseFloat(l.total) || 0).toFixed(0)}</p>
                      {form.lignes.length > 1 && (
                        <button type="button" onClick={() => removeLigne(i)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Montant HT</span>
                  <span className="font-medium">{totalHT.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA ({form.taux_tva}%)</span>
                  <span className="font-medium">{totalTVA.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t mt-1">
                  <span>Total TTC</span>
                  <span className="text-green-600">{totalTTC.toFixed(2)} MAD</span>
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
              )}
            </form>

            <div className="px-5 py-4 border-t bg-gray-50 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-100 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {showPreview && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full md:rounded-2xl md:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal header with gradient */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #5C6BC0 100%)` }}>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Aperçu facture</p>
                <h2 className="font-bold text-white text-lg">{selectedInvoice.num_facture || `#${selectedInvoice.id?.slice(0, 8)}`}</h2>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Émise le</p>
                  <p className="font-semibold text-gray-800 text-sm">{formatDate(selectedInvoice.created_at)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedInvoice.reservation?.client?.nom || '—'}</p>
                  {selectedInvoice.reservation?.client?.email && <p className="text-xs text-gray-400 truncate">{selectedInvoice.reservation.client.email}</p>}
                </div>
              </div>

              {/* Lignes */}
              {Array.isArray(selectedInvoice.facture) && selectedInvoice.facture.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Description</th>
                        <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Qté</th>
                        <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">P.U.</th>
                        <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.facture.map((l, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2.5 text-gray-700">{l.description}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{l.quantite}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{l.prix_unitaire} MAD</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{(parseFloat(l.total) || 0).toFixed(2)} MAD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-500">Montant HT</span>
                  <span className="text-gray-700 font-medium">{(parseFloat(selectedInvoice.montant_ht) || 0).toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-500">TVA</span>
                  <span className="text-gray-700 font-medium">{(parseFloat(selectedInvoice.montant_tva) || 0).toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between px-4 py-3 font-bold" style={{ background: `linear-gradient(135deg, ${ACCENT}10, #5C6BC015)` }}>
                  <span className="text-gray-800">Total TTC</span>
                  <span className="text-xl" style={{ color: ACCENT }}>{(parseFloat(selectedInvoice.montant_ttc) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t bg-gray-50/80 flex gap-3 justify-end">
              <button onClick={() => window.print()} className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                <Printer className="w-4 h-4" /> Imprimer
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ACCENT }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
