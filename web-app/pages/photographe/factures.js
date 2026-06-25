import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';

import {
  FileText, Download, Eye, Search, Calendar, Euro,
  CheckCircle, XCircle, ArrowLeft, Printer, Mail,
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
        // ✅ nouveaux champs — à ajouter dans ta table si tu veux les persister
        emetteur_nom: form.emetteur_nom || null,
        emetteur_adresse: form.emetteur_adresse || null,
        emetteur_tel: form.emetteur_tel || null,
        emetteur_ice: form.emetteur_ice || null,
        destinataire_nom: form.destinataire_nom || null,
        destinataire_email: form.destinataire_email || null,
        destinataire_adresse: form.destinataire_adresse || null,
        logo_preview: form.logo_preview || null,
        date_echeance: form.date_echeance || null,
        notes: form.notes || null,
        // sinon ils servent juste pour l'aperçu/impression
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

  const StatsCard = ({ title, value, icon, color }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center',
      flex: 1
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <div style={{ minHeight: "100vh" }} className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#130183]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#130183] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#130183]" />
                Mes Factures
              </h1>
              <p className="text-xs text-gray-500">{stats.total} facture{stats.total !== 1 ? 's' : ''} au total</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: ACCENT }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> 
          <StatsCard 
            title="Factures" 
            value={stats.total}
            icon="💳"
            color="#333"
          />
          <StatsCard 
            title="CA total" 
            value={`${stats.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`}
            icon="💶"
            color="#856404"
          />
          <StatsCard 
            title="Reservations ce mois" 
            value={stats.thisMonth}
            icon="📅"
            color="#155724"
          />
          <StatsCard 
            title="Clients" 
            value={stats.clients}
            icon="👥"
            color="#155724"
          />
        </div>

        {/* Search */}
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une facture par client ou prestation…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl focus:outline-none"
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
          <div className="space-y-3">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full md:rounded-2xl md:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #5C6BC0 100%)` }}>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Nouvelle facture</p>
                <h3 className="font-bold text-white text-lg">{form.num_facture}</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* ── SECTION 1 : Réservation liée ── */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Réservation liée</p>
                <select
                  value={form.reservation_id}
                  onChange={(e) => {
                    const resId = e.target.value;
                    const res = reservations.find(r => r.id === resId);
                    setForm(prev => ({
                      ...prev,
                      reservation_id: resId,
                      // Pré-remplissage si réservation choisie
                      destinataire_nom: res?.client?.nom || prev.destinataire_nom || '',
                      destinataire_email: res?.client?.email || prev.destinataire_email || '',
                      lignes: res ? [{
                        description: res.titre || 'Prestation',
                        quantite: 1,
                        prix_unitaire: res.montant_total || 0,
                        total: res.montant_total || 0,
                      }] : prev.lignes,
                    }));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">— Facture libre (sans réservation) —</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.titre || 'Sans titre'} — {r.client?.nom || 'Client'} ({formatDate(r.date)})
                    </option>
                  ))}
                </select>
              </div>

              {/* ── SECTION 2 : En-tête facture ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Émetteur */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Votre entreprise</p>
                  <div>
                    {/* Logo upload */}
                    <label className="block text-xs font-medium text-gray-600 mb-1">Logo (optionnel)</label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      onClick={() => document.getElementById('logo-upload').click()}
                    >
                      {form.logo_preview ? (
                        <img src={form.logo_preview} alt="Logo" className="h-12 mx-auto object-contain" />
                      ) : (
                        <div>
                          <div className="w-8 h-8 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-400">Cliquer pour ajouter un logo</p>
                        </div>
                      )}
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setForm(prev => ({ ...prev, logo_preview: ev.target.result }));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom / Raison sociale</label>
                    <input
                      type="text"
                      placeholder="Votre nom ou entreprise"
                      value={form.emetteur_nom || ''}
                      onChange={e => setForm(p => ({ ...p, emetteur_nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <textarea
                      placeholder="Adresse complète"
                      value={form.emetteur_adresse || ''}
                      onChange={e => setForm(p => ({ ...p, emetteur_adresse: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                      <input
                        type="text"
                        placeholder="+212..."
                        value={form.emetteur_tel || ''}
                        onChange={e => setForm(p => ({ ...p, emetteur_tel: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ICE / Identifiant</label>
                      <input
                        type="text"
                        placeholder="N° fiscal"
                        value={form.emetteur_ice || ''}
                        onChange={e => setForm(p => ({ ...p, emetteur_ice: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Destinataire */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Destinataire (client)</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom / Entreprise</label>
                    <input
                      type="text"
                      placeholder="Nom du client"
                      value={form.destinataire_nom || ''}
                      onChange={e => setForm(p => ({ ...p, destinataire_nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={form.destinataire_email || ''}
                      onChange={e => setForm(p => ({ ...p, destinataire_email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <textarea
                      placeholder="Adresse du client"
                      value={form.destinataire_adresse || ''}
                      onChange={e => setForm(p => ({ ...p, destinataire_adresse: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">N° Facture</label>
                      <input
                        type="text"
                        value={form.num_facture}
                        onChange={e => setForm(p => ({ ...p, num_facture: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date d'échéance</label>
                      <input
                        type="date"
                        value={form.date_echeance || ''}
                        onChange={e => setForm(p => ({ ...p, date_echeance: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 3 : Lignes ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prestations</p>
                  <button type="button" onClick={addLigne} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3" /> Ajouter une ligne
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-semibold">Description</th>
                        <th className="text-right px-3 py-2.5 text-xs text-gray-500 font-semibold w-16">Qté</th>
                        <th className="text-right px-3 py-2.5 text-xs text-gray-500 font-semibold w-28">P.U. (MAD)</th>
                        <th className="text-right px-3 py-2.5 text-xs text-gray-500 font-semibold w-24">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.lignes.map((l, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="Description de la prestation"
                              value={l.description}
                              onChange={e => updateLigne(i, 'description', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="1"
                              value={l.quantite}
                              onChange={e => updateLigne(i, 'quantite', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" step="0.01"
                              value={l.prix_unitaire}
                              onChange={e => updateLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">
                            {(parseFloat(l.total) || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {form.lignes.length > 1 && (
                              <button type="button" onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 4 : Totaux + TVA ── */}
              <div className="flex justify-end">
                <div className="w-72 bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant HT</span>
                    <span className="font-medium">{totalHT.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">TVA</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={form.taux_tva}
                        onChange={e => setForm(p => ({ ...p, taux_tva: parseFloat(e.target.value) || 0 }))}
                        className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value={0}>0%</option>
                        <option value={7}>7%</option>
                        <option value={10}>10%</option>
                        <option value={14}>14%</option>
                        <option value={20}>20%</option>
                      </select>
                      <span className="font-medium">{totalTVA.toFixed(2)} MAD</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                    <span>Total TTC</span>
                    <span style={{ color: ACCENT }}>{totalTTC.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>

              {/* ── SECTION 5 : Notes ── */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes / Conditions de paiement</label>
                <textarea
                  placeholder="Ex : Paiement par virement sous 30 jours. RIB : ..."
                  value={form.notes || ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{createError}</p>
              )}
            </form>

            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={saving}
                className="px-6 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition-opacity flex items-center gap-2"
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
                        <th className="text-left px-6 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Description</th>
                        <th className="text-right px-6 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Qté</th>
                        <th className="text-right px-6 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">P.U.</th>
                        <th className="text-right px-6 py-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.facture.map((l, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-6 py-2.5 text-gray-700">{l.description}</td>
                          <td className="px-6 py-2.5 text-right text-gray-500">{l.quantite}</td>
                          <td className="px-6 py-2.5 text-right text-gray-500">{l.prix_unitaire} MAD</td>
                          <td className="px-6 py-2.5 text-right font-semibold text-gray-800">{(parseFloat(l.total) || 0).toFixed(2)} MAD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                <div className="flex justify-between px-6 py-2.5 text-sm">
                  <span className="text-gray-500">Montant HT</span>
                  <span className="text-gray-700 font-medium">{(parseFloat(selectedInvoice.montant_ht) || 0).toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between px-6 py-2.5 text-sm">
                  <span className="text-gray-500">TVA</span>
                  <span className="text-gray-700 font-medium">{(parseFloat(selectedInvoice.montant_tva) || 0).toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between px-6 py-3 font-bold" style={{ background: `linear-gradient(135deg, ${ACCENT}10, #5C6BC015)` }}>
                  <span className="text-gray-800">Total TTC</span>
                  <span className="text-xl" style={{ color: ACCENT }}>{(parseFloat(selectedInvoice.montant_ttc) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} MAD</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t bg-gray-50/80 flex gap-3 justify-end">
              <button onClick={() => window.print()} className="px-6 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
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
