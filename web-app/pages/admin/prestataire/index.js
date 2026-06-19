import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as photographerService from '../../../lib/photographerService';
import * as notificationService from '../../../lib/notificationService';
import { approuverPrestataire, refuserPrestataire, suspendreutilisateur, reactiverUtilisateur } from '../../../lib/moderationService';
import {
  CheckCircle, XCircle, Eye, Search,
  ChevronLeft, ChevronRight, User, FileText,
  MapPin, Phone, Mail, AlertTriangle, X, Download,
  ShieldOff, ShieldCheck, Clock, Info, Star, Arrow
} from 'lucide-react';
import { useRouter } from 'next/router';

const STATUT = {
  en_attente: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved:   { label: 'Approuvé',   cls: 'bg-green-100  text-green-800  border-green-200' },
  valide:     { label: 'Validé',     cls: 'bg-green-100  text-green-800  border-green-200' },
  rejected:   { label: 'Refusé',     cls: 'bg-red-100    text-red-800    border-red-200' },
  refuse:     { label: 'Refusé',     cls: 'bg-red-100    text-red-800    border-red-200' },
  suspended:  { label: 'Suspendu',   cls: 'bg-gray-100   text-gray-700   border-gray-200' },
  suspendu:   { label: 'Suspendu',   cls: 'bg-gray-100   text-gray-700   border-gray-200' },
};

const DOCS = [
  { column: 'document_identite_recto_url', label: 'CNI / Passeport (recto)' },
  { column: 'document_identite_verso_url', label: 'CNI (verso)' },
  { column: 'documents_siret',             label: 'Justificatif SIRET' },
  { column: 'documents_kbis',              label: 'Extrait Kbis' },
  { column: 'documents_assurance',         label: 'Assurance professionnelle' },
];

const PAGE_SIZE = 20;

// ── Composant modal de confirmation réutilisable ───────────────────────────────

function ConfirmModal({ title, description, confirmLabel, confirmClass, onConfirm, onCancel, loading, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
        {children}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AdminPrestataires() {
  const { isAdmin, loading } = useAdminGuard();
  const router = useRouter();

  const [rows, setRows]                   = useState([]);
  const [search, setSearch]               = useState('');
  const [filterStatut, setFilterStatut]   = useState('all');
  const [page, setPage]                   = useState(0);
  const [total, setTotal]                 = useState(0);
  const [fetching, setFetching]           = useState(false);

  // Panneau latéral
  const [selected, setSelected]           = useState(null);
  const [panelTab, setPanelTab]           = useState('info'); // 'info' | 'actions' | 'docs' | 'history'
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [modal, setModal]                 = useState(null); // null | 'approve' | 'refuse' | 'suspend' | 'reactivate'
  const [motifRefus, setMotifRefus]       = useState('');
  const [motifSuspension, setMotifSuspension] = useState('');

  // Preview document
  const [previewDoc, setPreviewDoc]       = useState(null);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('profils_prestataire')
      .select(`*,profile:profiles!profils_prestataire_id_fkey(nom, email, telephone, avatar_url, ville)`,
        { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatut !== 'all') query = query.eq('statut_validation', filterStatut);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r =>
          r.profiles?.nom?.toLowerCase().includes(q) ||
          r.profiles?.email?.toLowerCase().includes(q)
        );
      }
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, filterStatut, search]);

  // ── Ouverture panneau ─────────────────────────────────────────────────────

  const openDetail = (row, tab = 'info') => {
    setSelected(row);
    setPanelTab(tab);
    setMotifRefus('');
    setMotifSuspension('');
  };

  const closePanel = () => { setSelected(null); setModal(null); };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprouver = async () => {
    setActionLoading(true);
    try { await approuverPrestataire(selected.id); } catch (e) { console.error(e); }
    setActionLoading(false);
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleRefuser = async () => {
    setActionLoading(true);
    try { await refuserPrestataire(selected.id, motifRefus); } catch (e) { console.error(e); }
    setActionLoading(false);
    setMotifRefus('');
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleSuspendre = async () => {
    setActionLoading(true);
    try { await suspendreutilisateur(selected.id, motifSuspension, 'photographe'); } catch (e) { console.error(e); }
    setActionLoading(false);
    setMotifSuspension('');
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleReactiver = async () => {
    setActionLoading(true);
    try { await reactiverUtilisateur(selected.id, 'photographe', 'approved'); } catch (e) { console.error(e); }
    setActionLoading(false);
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleVerify = async (id, field, value) => {
    setActionLoading(true);
    await photographerService.upsertPhotographerProfile(id, { [field]: value });
    setSelected(prev => ({ ...prev, [field]: value }));
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setActionLoading(false);
  };

  const isSuspendu = (row) =>
    row?.statut_validation === 'suspended' || row?.statut_validation === 'suspendu';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Prestataires">

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Tous'], ['en_attente','En attente'], ['valide','Validés'], ['refuse','Refusés'], ['suspendu','Suspendus']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => { setFilterStatut(val); setPage(0); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                filterStatut === val
                  ? 'bg-[#130183] text-white border-[#130183]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Prestataire</th>
                <th className="px-6 py-3 font-semibold">Catégorie</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Docs</th>
                <th className="px-6 py-3 font-semibold">Note</th>
                <th className="px-6 py-3 font-semibold">Inscrit le</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Aucun prestataire trouvé</td></tr>
              ) : rows.map(row => {
                const s = STATUT[row.statut_validation] || STATUT.en_attente;
                const docsCount = DOCS.filter(d => row[d.column]).length;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {row.profiles?.avatar_url
                          ? <img src={row.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-indigo-500" /></div>
                        }
                        <div>
                          <p className="font-medium text-gray-900">{row.profiles?.nom || '—'}</p>
                          <p className="text-xs text-gray-400">{row.profiles?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{(row.categories || [])[0] || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold ${docsCount === 0 ? 'text-red-500' : docsCount < 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {docsCount}/{DOCS.length}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {row.note_moyenne ? `${Number(row.note_moyenne).toFixed(1)} ★ (${row.nb_avis})` : '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{fmt(row.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openDetail(row, 'info')}
                          title="Voir le profil"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Voir
                        </button>
                        <button
                          onClick={() => openDetail(row, 'actions')}
                          title="Actions de modération"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Gérer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} prestataire{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-2">Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panneau latéral ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selected.profiles?.avatar_url
                  ? <img src={selected.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-5 h-5 text-indigo-500" /></div>
                }
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">{selected.profiles?.nom}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${(STATUT[selected.statut_validation] || STATUT.en_attente).cls}`}>
                      {(STATUT[selected.statut_validation] || STATUT.en_attente).label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{selected.profiles?.email}</p>
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {[
                { key: 'info',    label: 'Infos',      icon: Info },
                { key: 'docs',    label: 'Documents',  icon: FileText },
                { key: 'actions', label: 'Actions',    icon: ShieldOff },
                { key: 'history', label: 'Historique', icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPanelTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                    panelTab === key
                      ? 'border-indigo-600 text-indigo-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Contenu onglets */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Onglet Info ── */}
              {panelTab === 'info' && (
                <>
                  {/* Alerte suspension */}
                  {isSuspendu(selected) && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <ShieldOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Compte suspendu</p>
                        {selected.suspension_reason && (
                          <p className="text-xs text-red-600 mt-1">Raison : {selected.suspension_reason}</p>
                        )}
                        {selected.date_suspension && (
                          <p className="text-xs text-red-500 mt-0.5">Depuis le {fmt(selected.date_suspension)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h2>
                    <div className="space-y-2">
                      {[
                        { icon: Mail,   val: selected.profiles?.email },
                        { icon: Phone,  val: selected.profiles?.telephone || selected.mobile },
                        { icon: MapPin, val: [selected.profiles?.ville, selected.agence_adresse].filter(Boolean).join(', ') },
                      ].filter(i => i.val).map(({ icon: Icon, val }, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" /> {val}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activité */}
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activité</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Catégorie',      val: (selected.categories || []).join(', ') || '—' },
                        { label: 'Spécialisation', val: (selected.specialisations || []).join(', ') || '—' },
                        { label: 'Tarif horaire',  val: selected.tarif_horaire_min != null ? `${selected.tarif_horaire_min}${selected.tarif_horaire_max ? ' – ' + selected.tarif_horaire_max : ''} MAD` : '—' },
                        { label: 'Note / Avis',    val: selected.note_moyenne ? `${Number(selected.note_moyenne).toFixed(1)} ★ (${selected.nb_avis})` : 'Aucun avis' },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className="font-medium text-sm text-gray-800">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected.bio && (
                    <div>
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</h2>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{selected.bio}</p>
                    </div>
                  )}

                  {selected.nom_entreprise && (
                    <div>
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Entreprise</h2>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.nom_entreprise}</p>
                    </div>
                  )}

                  {/* Vérifications */}
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vérifications admin</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { field: 'identite_verifiee',  label: 'Identité' },
                        { field: 'entreprise_verifiee', label: 'Entreprise' },
                      ].map(({ field, label }) => (
                        <div key={field} className={`rounded-xl border-2 p-3 ${selected[field] ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {selected[field]
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <AlertTriangle className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm font-semibold text-gray-700">{label}</span>
                          </div>
                          <p className={`text-xs mb-2 font-medium ${selected[field] ? 'text-green-700' : 'text-gray-400'}`}>
                            {selected[field] ? 'Vérifiée ✓' : 'Non vérifiée'}
                          </p>
                          <button
                            onClick={() => handleVerify(selected.id, field, !selected[field])}
                            disabled={actionLoading}
                            className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              selected[field]
                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {selected[field] ? 'Annuler' : 'Vérifier'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                      
                      {/* Lien profil complet */}
                  <div>
                    <button
                      onClick={() => router.push(`/admin/prestataire/${selected.id}`)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all text-sm"
                    >
                    Voir le profil complet 
                    <ChevronRight  className="w-4 h-4" />
                    </button>   
                  </div>
                </>
              )}

              {/* ── Onglet Documents ── */}
              {panelTab === 'docs' && (
                <>
                  <p className="text-xs text-gray-400">
                    {DOCS.filter(d => selected[d.column]).length}/{DOCS.length} documents fournis
                  </p>
                  <div className="space-y-2">
                    {DOCS.map(({ column, label }) => {
                      const val = selected[column];
                      return (
                        <div key={column} className={`flex items-center justify-between p-3 rounded-xl border ${val ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 flex-shrink-0 ${val ? 'text-green-600' : 'text-gray-300'}`} />
                            <span className={`text-sm ${val ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{label}</span>
                          </div>
                          {val ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPreviewDoc({ label, src: val })}
                                className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Voir
                              </button>
                              <a
                                href={val}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1"
                                title="Télécharger"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Non fourni</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Onglet Actions ── */}
              {panelTab === 'actions' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Actions de modération appliquées à <span className="font-semibold text-gray-700">{selected.profiles?.nom}</span>.
                  </p>

                  {/* Approuver */}
                  {selected.statut_validation !== 'approved' && selected.statut_validation !== 'valide' && (
                    <div className="border border-green-200 rounded-xl p-4 space-y-2 bg-green-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Approuver le compte</span>
                      </div>
                      <p className="text-xs text-green-700">Le prestataire sera visible sur la plateforme et pourra recevoir des demandes.</p>
                      <button
                        onClick={() => setModal('approve')}
                        className="w-full mt-1 px-4 py-2 border border-green-400 text-green-700 bg-white rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                      >
                        Approuver ce compte
                      </button>
                    </div>
                  )}

                  {/* Refuser */}
                  {selected.statut_validation !== 'rejected' && selected.statut_validation !== 'refuse' && (
                    <div className="border border-red-200 rounded-xl p-4 space-y-2 bg-red-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Refuser le compte</span>
                      </div>
                      <p className="text-xs text-red-700">Le prestataire recevra une notification de refus avec le motif indiqué.</p>
                      <button
                        onClick={() => setModal('refuse')}
                        className="w-full mt-1 px-4 py-2 border border-red-400 text-red-700 bg-white rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Refuser ce compte
                      </button>
                    </div>
                  )}

                  {/* Suspendre / Réactiver */}
                  {!isSuspendu(selected) ? (
                    <div className="border border-orange-200 rounded-xl p-4 space-y-2 bg-orange-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldOff className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-800">Suspendre le compte</span>
                      </div>
                      <p className="text-xs text-orange-700">Le prestataire ne pourra plus se connecter ni recevoir de nouvelles demandes.</p>
                      <button
                        onClick={() => setModal('suspend')}
                        className="w-full mt-1 px-4 py-2 border border-orange-400 text-orange-700 bg-white rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                      >
                        Suspendre ce compte
                      </button>
                    </div>
                  ) : (
                    <div className="border border-green-200 rounded-xl p-4 space-y-2 bg-green-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Réactiver le compte</span>
                      </div>
                      <p className="text-xs text-green-700">Le prestataire pourra à nouveau se connecter et recevoir des demandes.</p>
                      <button
                        onClick={() => setModal('reactivate')}
                        className="w-full mt-1 px-4 py-2 border border-green-400 text-green-700 bg-white rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                      >
                        Réactiver ce compte
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Onglet Historique ── */}
              {panelTab === 'history' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">Historique des actions de modération sur ce compte.</p>

                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut actuel</h4>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${(STATUT[selected.statut_validation] || STATUT.en_attente).cls}`}>
                      {(STATUT[selected.statut_validation] || STATUT.en_attente).label}
                    </span>
                    {isSuspendu(selected) && selected.date_suspension && (
                      <p className="text-xs text-gray-500">Suspendu le {fmt(selected.date_suspension)}</p>
                    )}
                    {isSuspendu(selected) && selected.suspension_reason && (
                      <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Raison :</span><br />
                        {selected.suspension_reason}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Informations du compte</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Inscrit le {fmt(selected.created_at)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className={`w-4 h-4 ${selected.identite_verifiee ? 'text-green-500' : 'text-gray-300'}`} />
                      Identité {selected.identite_verifiee ? 'vérifiée' : 'non vérifiée'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className={`w-4 h-4 ${selected.entreprise_verifiee ? 'text-green-500' : 'text-gray-300'}`} />
                      Entreprise {selected.entreprise_verifiee ? 'vérifiée' : 'non vérifiée'}
                    </div>
                    {selected.date_suspension && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <ShieldOff className="w-4 h-4 text-red-400" />
                        Suspendu le {fmt(selected.date_suspension)}
                      </div>
                    )}
                  </div>

                  {!isSuspendu(selected) && !selected.date_suspension && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Aucune action de modération enregistrée.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals de confirmation ────────────────────────────────────────── */}

      {modal === 'approve' && (
        <ConfirmModal
          title="Approuver ce compte ?"
          description={`Le profil de ${selected?.profiles?.nom} sera activé et visible sur la plateforme.`}
          confirmLabel="Confirmer l'approbation"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleApprouver}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {modal === 'refuse' && (
        <ConfirmModal
          title="Refuser ce compte ?"
          description={`${selected?.profiles?.nom} recevra une notification avec le motif de refus.`}
          confirmLabel="Confirmer le refus"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleRefuser}
          onCancel={() => { setModal(null); setMotifRefus(''); }}
          loading={actionLoading}
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Motif du refus <span className="text-red-500">*</span></label>
            <textarea
              value={motifRefus}
              onChange={e => setMotifRefus(e.target.value)}
              rows={3}
              placeholder="Ex : Pièces manquantes, profil incomplet…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-300 focus:outline-none"
            />
          </div>
        </ConfirmModal>
      )}

      {modal === 'suspend' && (
        <ConfirmModal
          title="Suspendre ce compte ?"
          description={`Le compte de ${selected?.profiles?.nom} sera désactivé immédiatement.`}
          confirmLabel="Confirmer la suspension"
          confirmClass="bg-orange-500 hover:bg-orange-600"
          onConfirm={handleSuspendre}
          onCancel={() => { setModal(null); setMotifSuspension(''); }}
          loading={actionLoading}
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Raison de la suspension <span className="text-red-500">*</span></label>
            <textarea
              value={motifSuspension}
              onChange={e => setMotifSuspension(e.target.value)}
              rows={3}
              placeholder="Décrivez la raison de la suspension…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
          </div>
        </ConfirmModal>
      )}

      {modal === 'reactivate' && (
        <ConfirmModal
          title="Réactiver ce compte ?"
          description={`Le compte de ${selected?.profiles?.nom} sera réactivé et le prestataire pourra à nouveau recevoir des demandes.`}
          confirmLabel="Confirmer la réactivation"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleReactiver}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {/* Preview document */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">{previewDoc.label}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.src}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#130183] text-white rounded-lg text-xs font-medium hover:bg-indigo-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
              {previewDoc.src.match(/\.(jpg|jpeg|png|gif|webp)/i) || previewDoc.src.startsWith('data:image') ? (
                <img src={previewDoc.src} alt={previewDoc.label} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
              ) : previewDoc.src.match(/\.pdf/i) || previewDoc.src.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.src} className="w-full h-[65vh] rounded-lg" title={previewDoc.label} />
              ) : (
                <a href={previewDoc.src} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700">
                  <FileText className="w-4 h-4" /> Ouvrir le document
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}