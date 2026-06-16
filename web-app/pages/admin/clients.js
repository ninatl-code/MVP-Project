import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, ChevronLeft, ChevronRight, User, Eye, Mail, Phone, Calendar, FileText, X, ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getClientDemandes } from '../../lib/demandeService';
import * as reservationService from  '../../lib/reservationService';
import { suspendreutilisateur, reactiverUtilisateur, avertirUtilisateur } from '../../lib/moderationService';
import { useAuth } from '../../contexts/AuthContext';
const PAGE_SIZE = 20;

export default function AdminClients() {
  const { isAdmin, loading } = useAdminGuard();
  const { profileId: adminId } = useAuth();
  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [motifSuspension, setMotifSuspension] = useState('');
  const [motifAvertissement, setMotifAvertissement] = useState('');
  const [severite, setSeverite] = useState('warning');
  const [showWarnForm, setShowWarnForm] = useState(false);

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('profiles')
      .select('id, nom, email, telephone, created_at, avatar_url', { count: 'exact' })
      .eq('role', 'particulier')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data || [];
      if (search) filtered = filtered.filter(r => r.nom?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()));
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  const openDetail = async (client) => {
    setSelected(client);
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
      getClientDemandes(client.id,5),
      reservationService.getClientReservations(client.id, null, 5),
    ]);
    setDetail({ nbDemandes, nbDevis, nbReservations, demandes: demandes || [], reservations: reservations || [] });
    setLoadingDetail(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, search]);

  const handleSuspendre = async () => {
    if (!selected) return;
    setActionLoading(true);
    try { await suspendreutilisateur(selected.id, motifSuspension, 'particulier'); } catch(e) { console.error(e); }
    setActionLoading(false);
    setMotifSuspension('');
    setSelected(null);
    fetchRows();
  };

  const handleReactiver = async () => {
    if (!selected) return;
    setActionLoading(true);
    try { await reactiverUtilisateur(selected.id, 'particulier'); } catch(e) { console.error(e); }
    setActionLoading(false);
    setSelected(null);
    fetchRows();
  };

  const handleAvertir = async () => {
    if (!selected || !motifAvertissement.trim()) return;
    setActionLoading(true);
    try { await avertirUtilisateur(selected.id, motifAvertissement, severite, adminId); } catch(e) { console.error(e); }
    setActionLoading(false);
    setMotifAvertissement('');
    setShowWarnForm(false);
  };

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
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  return (
    <AdminLayout title="Clients">
      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 font-semibold">Inscrit le</th>
                <th className="px-4 py-3 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={5} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400">Aucun client trouvé</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.avatar_url
                        ? <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-blue-500" /></div>
                      }
                      <span className="font-medium text-gray-900">{row.nom || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.email}</td>
                  <td className="px-4 py-3 text-gray-600">{row.telephone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {row.suspendu && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Suspendu</span>}
                      <button
                        onClick={() => openDetail(row)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
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

      {/* Panneau détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-5 h-5 text-blue-500" /></div>
                }
                <div>
                  <h2 className="font-bold text-gray-900">{selected.nom}</h2>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

              {loadingDetail ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
              </div>
            ) : detail && (
              <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
                {/* Statut suspension */}
                {selected.suspendu && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <ShieldOff className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Compte suspendu</p>
                      {selected.suspension_reason && <p className="text-xs text-red-600 mt-0.5">{selected.suspension_reason}</p>}
                    </div>
                  </div>
                )}
                {/* Infos */}
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations</h2>
                  <div className="space-y-2">
                    {[
                      { icon: Mail,     val: selected.email },
                      { icon: Phone,    val: selected.telephone },
                      { icon: Calendar, val: `Inscrit le ${new Date(selected.created_at).toLocaleDateString('fr-FR')}` },
                    ].filter(i => i.val).map(({ icon: Icon, val }, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />{val}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statistiques</h2>
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
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dernières demandes</h2>
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
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dernières réservations</h2>
                    <div className="space-y-2">
                      {detail.reservations.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {r.date_prestation ? new Date(r.date_prestation).toLocaleDateString('fr-FR') : 'Date inconnue'}
                            </p>
                            <p className="text-xs text-gray-400">{r.montant_total ? `${r.montant_total} MAD` : '—'}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_RESA[r.statut] || 'bg-gray-100 text-gray-600'}`}>{r.statut}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions bar */}
            {!loadingDetail && selected && (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 space-y-3">
                {/* Avertissement */}
                {showWarnForm ? (
                  <div className="space-y-2">
                    <textarea
                      value={motifAvertissement}
                      onChange={e => setMotifAvertissement(e.target.value)}
                      rows={2}
                      placeholder="Raison de l'avertissement..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <select value={severite} onChange={e => setSeverite(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                      <option value="info">Info</option>
                      <option value="warning">Avertissement</option>
                      <option value="severe">Grave</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setShowWarnForm(false)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                      <button onClick={handleAvertir} disabled={actionLoading || !motifAvertissement.trim()} className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
                        Envoyer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowWarnForm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-xl text-sm hover:bg-yellow-50">
                    <AlertTriangle className="w-4 h-4" /> Avertir l'utilisateur
                  </button>
                )}

                {/* Suspension */}
                {!selected.suspendu ? (
                  <div className="space-y-2">
                    <input
                      value={motifSuspension}
                      onChange={e => setMotifSuspension(e.target.value)}
                      placeholder="Raison de la suspension..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400"
                    />
                    <button onClick={handleSuspendre} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50">
                      <ShieldOff className="w-4 h-4" /> Suspendre le compte
                    </button>
                  </div>
                ) : (
                  <button onClick={handleReactiver} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-xl text-sm hover:bg-green-50 disabled:opacity-50">
                    <ShieldCheck className="w-4 h-4" /> Réactiver le compte
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}