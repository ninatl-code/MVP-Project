import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import AdminLayout from '../../../components/layout/AdminLayout';
import {
  Search, ChevronLeft, ChevronRight, User, Eye, Mail, Phone, Calendar,
  FileText, X, ShieldOff, ShieldCheck, AlertTriangle, Clock, Info,
  CheckCircle, XCircle, ChevronRight as Arrow
} from 'lucide-react';
import { getClientDemandes } from '../../../lib/demandeService';
import * as reservationService from '../../../lib/reservationService';
import { suspendreutilisateur, reactiverUtilisateur, avertirUtilisateur } from '../../../lib/moderationService';
import * as notificationService from '../../../lib/notificationService';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';

const PAGE_SIZE = 20;

// ── Petits composants utilitaires ─────────────────────────────────────────────

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

function StatusBadge({ suspendu }) {
  if (suspendu) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Suspendu
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle className="w-3 h-3" /> Actif
    </span>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AdminClients() {
  const { isAdmin, loading } = useAdminGuard();
  const { profileId: adminId } = useAuth();
  const router = useRouter();

  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [fetching, setFetching] = useState(false);

  // Panneau détail
  const [selected, setSelected]         = useState(null);
  const [detail, setDetail]             = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelTab, setPanelTab]         = useState('info'); // 'info' | 'actions' | 'history'

  // États des modals
  const [modal, setModal] = useState(null); // null | 'suspend' | 'warn' | 'reactivate'
  const [actionLoading, setActionLoading] = useState(false);

  // Champs des formulaires dans les modals
  const [motifSuspension, setMotifSuspension]       = useState('');
  const [motifAvertissement, setMotifAvertissement] = useState('');
  const [severite, setSeverite]                     = useState('warning');

  // ── Fetch liste ───────────────────────────────────────────────────────────

  const fetchRows = async () => {
    setFetching(true);
    const { data, count, error } = await supabase
      .from('profiles')
      .select('id, nom, email, telephone, created_at, avatar_url, suspendu, suspension_reason, date_suspension', { count: 'exact' })
      .eq('role', 'particulier')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!error) {
      let filtered = data || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r =>
          r.nom?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
        );
      }
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, search]);

  // ── Ouverture panneau détail ───────────────────────────────────────────────

  const openDetail = async (client, tab = 'info') => {
    setSelected(client);
    setPanelTab(tab);
    setDetail(null);
    setLoadingDetail(true);

    const [
      { count: nbDemandes },
      { count: nbDevis },
      { count: nbReservations },
      { data: demandes },
      { data: reservations },
    ] = await Promise.all([
      supabase.from('demandes_client').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      supabase.from('devis').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      getClientDemandes(client.id, 5),
      reservationService.getClientReservations(client.id, null, 5),
    ]);

    setDetail({
      nbDemandes,
      nbDevis,
      nbReservations,
      demandes: demandes || [],
      reservations: reservations || [],
    });
    setLoadingDetail(false);
  };

  const closePanel = () => { setSelected(null); setDetail(null); };

  // ── Actions de modération ─────────────────────────────────────────────────

  const handleSuspendre = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await suspendreutilisateur(selected.id, motifSuspension, 'particulier');
      notificationService.notifyCompteSuspendu(selected.id, motifSuspension);
    } catch (e) { console.error(e); }
    setActionLoading(false);
    setMotifSuspension('');
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleReactiver = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await reactiverUtilisateur(selected.id, 'particulier', 'approved');
      notificationService.notifyCompteReactive(selected.id);
    } catch (e) { console.error(e); }
    setActionLoading(false);
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleAvertir = async () => {
    if (!selected || !motifAvertissement.trim()) return;
    setActionLoading(true);
    try {
      await avertirUtilisateur(selected.id, motifAvertissement, severite, adminId);
      notificationService.notifyAvertissement(selected.id, motifAvertissement, severite);
    } catch (e) { console.error(e); }
    setActionLoading(false);
    setMotifAvertissement('');
    setModal(null);
  };

  // ── Constantes de style ───────────────────────────────────────────────────

  const STATUT_RESA = {
    confirmee:  'bg-green-100 text-green-800',
    en_attente: 'bg-yellow-100 text-yellow-800',
    annulee:    'bg-red-100 text-red-800',
    terminee:   'bg-gray-100 text-gray-700',
  };
  const STATUT_DEM = {
    ouverte:  'bg-blue-100 text-blue-800',
    fermee:   'bg-gray-100 text-gray-600',
    acceptee: 'bg-green-100 text-green-800',
    annulee:  'bg-red-100 text-red-700',
  };
  const SEVERITE_LABEL = { info: 'Info', warning: 'Avertissement', severe: 'Grave' };
  const SEVERITE_COLOR = {
    info:    'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    severe:  'bg-red-100 text-red-700',
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Clients">

      {/* Barre de recherche */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-6 py-3 font-semibold">Téléphone</th>
                <th className="px-6 py-3 font-semibold">Inscrit le</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">Aucun client trouvé</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {row.avatar_url
                        ? <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-indigo-500" />
                          </div>
                      }
                      <span className="font-medium text-gray-900">{row.nom || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.email}</td>
                  <td className="px-6 py-3 text-gray-600">{row.telephone || '—'}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{fmt(row.created_at)}</td>
                  <td className="px-6 py-3"><StatusBadge suspendu={row.suspendu} /></td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Voir infos */}
                      <button
                        onClick={() => openDetail(row, 'info')}
                        title="Voir le profil"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                      {/* Actions directes */}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} client{total !== 1 ? 's' : ''}</span>
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
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">

            {/* Header panneau */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-500" />
                    </div>
                }
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">{selected.nom}</h2>
                    <StatusBadge suspendu={selected.suspendu} />
                  </div>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {[
                { key: 'info',    label: 'Informations', icon: Info },
                { key: 'actions', label: 'Actions',      icon: ShieldOff },
                { key: 'history', label: 'Historique',   icon: Clock },
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
            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
                </div>
              ) : (

                <>
                  {/* ── Onglet Info ── */}
                  {panelTab === 'info' && detail && (
                    <div className="px-6 py-5 space-y-6">

                      {/* Alerte suspension */}
                      {selected.suspendu && (
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

                      {/* Coordonnées */}
                      <div>
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Coordonnées</h2>
                        <div className="space-y-2">
                          {[
                            { icon: Mail,     val: selected.email },
                            { icon: Phone,    val: selected.telephone },
                            { icon: Calendar, val: `Inscrit le ${fmt(selected.created_at)}` },
                          ].filter(i => i.val).map(({ icon: Icon, val }, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" /> {val}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div>
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistiques</h2>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Demandes',     val: detail.nbDemandes },
                            { label: 'Devis reçus',  val: detail.nbDevis },
                            { label: 'Réservations', val: detail.nbReservations },
                          ].map(({ label, val }) => (
                            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                              <p className="text-xl font-bold text-gray-900">{val ?? 0}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dernières demandes */}
                      {detail.demandes.length > 0 && (
                        <div>
                          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dernières demandes</h2>
                          <div className="space-y-2">
                            {detail.demandes.map(d => (
                              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <p className="text-sm font-medium text-gray-800 truncate">{d.titre || 'Sans titre'}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                  {d.budget_max && <span className="text-xs text-gray-500">{d.budget_max} MAD</span>}
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_DEM[d.statut] || 'bg-gray-100 text-gray-600'}`}>{d.statut}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dernières réservations */}
                      {detail.reservations.length > 0 && (
                        <div>
                          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dernières réservations</h2>
                          <div className="space-y-2">
                            {detail.reservations.map(r => (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {r.date_prestation ? fmt(r.date_prestation) : 'Date inconnue'}
                                  </p>
                                  <p className="text-xs text-gray-400">{r.montant_total ? `${r.montant_total} MAD` : '—'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_RESA[r.statut] || 'bg-gray-100 text-gray-600'}`}>{r.statut}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lien profil complet */}
                      <button
                        onClick={() => router.push(`/admin/client/${selected.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all text-sm"
                      >
                        Voir le profil complet <Arrow className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* ── Onglet Actions ── */}
                  {panelTab === 'actions' && (
                    <div className="px-6 py-5 space-y-4">
                      <p className="text-xs text-gray-400">Actions de modération appliquées à <span className="font-semibold text-gray-700">{selected.nom}</span>.</p>

                      {/* Avertir */}
                      <div className="border border-yellow-200 rounded-xl p-4 space-y-2 bg-yellow-50/40">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-semibold text-yellow-800">Envoyer un avertissement</span>
                        </div>
                        <p className="text-xs text-yellow-700">Le client recevra une notification avec votre message.</p>
                        <button
                          onClick={() => setModal('warn')}
                          className="w-full mt-1 px-4 py-2 border border-yellow-400 text-yellow-700 bg-white rounded-lg text-sm font-medium hover:bg-yellow-50 transition-colors"
                        >
                          Rédiger un avertissement
                        </button>
                      </div>

                      {/* Suspendre / Réactiver */}
                      {!selected.suspendu ? (
                        <div className="border border-red-200 rounded-xl p-4 space-y-2 bg-red-50/40">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldOff className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-800">Suspendre le compte</span>
                          </div>
                          <p className="text-xs text-red-700">Le client ne pourra plus se connecter ni utiliser la plateforme.</p>
                          <button
                            onClick={() => setModal('suspend')}
                            className="w-full mt-1 px-4 py-2 border border-red-400 text-red-700 bg-white rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
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
                          <p className="text-xs text-green-700">Le client pourra à nouveau se connecter et utiliser la plateforme.</p>
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
                    <div className="px-6 py-5 space-y-4">
                      <p className="text-xs text-gray-400">Historique des actions de modération sur ce compte.</p>

                      {/* Statut actuel */}
                      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut actuel</h4>
                        <div className="flex items-center gap-2">
                          <StatusBadge suspendu={selected.suspendu} />
                          {selected.suspendu && selected.date_suspension && (
                            <span className="text-xs text-gray-500">depuis le {fmt(selected.date_suspension)}</span>
                          )}
                        </div>
                        {selected.suspendu && selected.suspension_reason && (
                          <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <span className="font-medium text-gray-700">Raison de suspension :</span><br />
                            {selected.suspension_reason}
                          </div>
                        )}
                      </div>

                      {/* Informations du compte */}
                      <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Informations du compte</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          Inscrit le {fmt(selected.created_at)}
                        </div>
                        {selected.date_suspension && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Clock className="w-4 h-4 text-red-400" />
                            Suspendu le {fmt(selected.date_suspension)}
                          </div>
                        )}
                      </div>

                      {!selected.suspendu && !selected.date_suspension && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          Aucune action de modération enregistrée.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals de confirmation ────────────────────────────────────────── */}

      {/* Suspendre */}
      {modal === 'suspend' && (
        <ConfirmModal
          title="Suspendre ce compte ?"
          description={`Le compte de ${selected?.nom} sera désactivé immédiatement. L'utilisateur recevra une notification.`}
          confirmLabel="Confirmer la suspension"
          confirmClass="bg-red-600 hover:bg-red-700"
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
              placeholder="Décrivez la raison de la suspension (visible dans les logs)…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-300 focus:outline-none"
            />
          </div>
        </ConfirmModal>
      )}

      {/* Réactiver */}
      {modal === 'reactivate' && (
        <ConfirmModal
          title="Réactiver ce compte ?"
          description={`Le compte de ${selected?.nom} sera réactivé et l'utilisateur pourra se reconnecter immédiatement.`}
          confirmLabel="Confirmer la réactivation"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleReactiver}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {/* Avertir */}
      {modal === 'warn' && (
        <ConfirmModal
          title="Envoyer un avertissement ?"
          description={`${selected?.nom} recevra une notification contenant votre message.`}
          confirmLabel="Envoyer l'avertissement"
          confirmClass="bg-yellow-500 hover:bg-yellow-600"
          onConfirm={handleAvertir}
          onCancel={() => { setModal(null); setMotifAvertissement(''); }}
          loading={actionLoading}
        >
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message <span className="text-red-500">*</span></label>
              <textarea
                value={motifAvertissement}
                onChange={e => setMotifAvertissement(e.target.value)}
                rows={3}
                placeholder="Rédigez votre message d'avertissement…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-yellow-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sévérité</label>
              <div className="flex gap-2">
                {Object.entries(SEVERITE_LABEL).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSeverite(key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      severite === key
                        ? `${SEVERITE_COLOR[key]} border-current`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}

    </AdminLayout>
  );
}