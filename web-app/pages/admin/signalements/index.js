import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/layout/AdminLayout';
import { Search, ChevronLeft, ChevronRight, Flag, X, CheckCircle, XCircle, ExternalLink, AlertTriangle, Star, Shield } from 'lucide-react';
import { cloturerSignalement, avertirUtilisateur } from '../../../lib/moderationService';
const PAGE_SIZE = 20;

const STATUS_LABELS = {
  open: { label: 'Ouvert', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Clôturé', className: 'bg-blue-100 text-blue-700' },
  dismissed: { label: 'Ignoré', className: 'bg-gray-100 text-gray-500' },
};

const TARGET_LABELS = {
  user: 'Utilisateur',
  avis: 'Avis',
  demande: 'Demande',
  message: 'Message',
};

export default function AdminSignalements() {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [avertissementSeverity, setAvertissementSeverity] = useState('warning');
  const [targetHistory, setTargetHistory] = useState([]);
  const [targetPreview, setTargetPreview] = useState(null);
  const [showAvertirModal, setShowAvertirModal] = useState(false);
  const [avertirMessage, setAvertirMessage] = useState('');
  const [showCloturerModal, setShowCloturerModal] = useState(false);
  const [cloturerComment, setCloturerComment] = useState('');


  const loadTargetPreview = async (targetType, targetId) => {
    if (targetType === 'avis') {
      const { data } = await supabase
        .from('reviews_presta')
        .select('comment, rating, created_at')
        .eq('id', targetId).single();
      setTargetPreview(data ? { type: 'avis', ...data } : null);
    } else if (targetType === 'message') {
      const { data } = await supabase
        .from('messages')
        .select('contenu, created_at')
        .eq('id', targetId).single();
      setTargetPreview(data ? { type: 'message', ...data } : null);
    } else {
      setTargetPreview(null);
    }
  };
  
  const loadTargetHistory = async (targetId) => {
    const { data } = await supabase
      .from('signalements')
      .select('id, reason, status, created_at, reporter:profiles!signalements_reporter_id_fkey(nom)')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(5);
    setTargetHistory(data || []);
  };

  const resolveTargetUserId = async (targetType, targetId) => {
    if (targetType === 'user') return targetId;
    if (targetType === 'message') {
      const { data } = await supabase.from('messages').select('sender_id').eq('id', targetId).single();
      return data?.sender_id || null;
    }
    if (targetType === 'avis') {
      const { data } = await supabase.from('reviews_presta').select('client_id').eq('id', targetId).single();
      return data?.client_id || null;
    }
    if (targetType === 'demande') {
      const { data } = await supabase.from('demandes_client').select('client_id').eq('id', targetId).single();
      return data?.client_id || null;
    }
    return null;
  };

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('signalements')
      .select(`
        id, target_type, target_id, reason, description, status,
        admin_comment, created_at, updated_at,
        reporter:profiles!signalements_reporter_id_fkey(id, nom, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (search) query = query.ilike('reason', `%${search}%`);

    const { data, count } = await query;
    setRows(data || []);
    setTotal(count || 0);
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, search, filterStatus]);

  const handleCloturer = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await supabase
        .from('signalements')
        .update({
          status: 'closed',
          admin_comment: cloturerComment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      // Mettre à jour la ligne dans la liste sans la retirer
      setRows(prev => prev.map(r =>
        r.id === selected.id
          ? { ...r, status: 'closed', admin_comment: cloturerComment.trim() || null }
          : r
      ));
      setSelected(prev => ({ ...prev, status: 'closed', admin_comment: cloturerComment.trim() || null }));
      setShowCloturerModal(false);
      setCloturerComment('');
    } catch (e) {
      console.error(e);
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvertir = async () => {
    if (!selected || !avertirMessage.trim()) return;
    setActionLoading(true);
    try {
      const userId = await resolveTargetUserId(selected.target_type, selected.target_id);
      if (!userId) throw new Error('Utilisateur introuvable');
      const adminUser = (await supabase.auth.getUser()).data.user;
      await avertirUtilisateur(
        userId,
        avertirMessage.trim(),
        avertissementSeverity,
        adminUser?.id
      );
      setShowAvertirModal(false);
      setAvertirMessage('');
    } catch (e) {
      console.error(e);
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnorer = async () => {
    if (!selected) return;
    setActionLoading(true);
    await supabase
      .from('signalements')
      .update({ status: 'dismissed', admin_comment: adminComment || 'Signalement ignoré', updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setActionLoading(false);
    setAdminComment('');
    setSelected(null);
    fetchRows();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );



  return (
    <AdminLayout title="Signalements">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par raison..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tous</option>
          <option value="open">Ouverts</option>
          <option value="closed">Clôturés</option>
          <option value="dismissed">Ignorés</option> 
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Auteur</th>
                <th className="px-6 py-3 font-semibold">Cible</th>
                <th className="px-6 py-3 font-semibold">Raison</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">Aucun signalement trouvé</td></tr>
              ) : rows.map(row => {
                const statusCfg = STATUS_LABELS[row.status] || STATUS_LABELS.open;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{row.reporter?.nom || '—'}</p>
                      <p className="text-xs text-gray-400">{row.reporter?.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {TARGET_LABELS[row.target_type] || row.target_type}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{row.target_id?.slice(0, 8)}…</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-[160px]">
                      <p className="truncate text-xs">{row.reason || '—'}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => { setSelected(row); setAdminComment(row.admin_comment || ''); loadTargetHistory(row.target_id); loadTargetPreview(row.target_type, row.target_id);}}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} signalement{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-600 px-2">Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Panneau détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-orange-500" />
                <h2 className="font-bold text-gray-900">Signalement #{selected.id?.toString().slice(0, 8)}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(STATUS_LABELS[selected.status] || STATUS_LABELS.open).className}`}>
                  {(STATUS_LABELS[selected.status] || STATUS_LABELS.open).label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
              {/* Rapporteur */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-500 font-semibold uppercase mb-1">Signalé par</p>
                <p className="font-bold text-sm text-gray-900">{selected.reporter?.nom || '—'}</p>
                <p className="text-xs text-gray-500">{selected.reporter?.email}</p>
              </div>

              {/* Cible */}
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cible signalée</h2>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                    {TARGET_LABELS[selected.target_type] || selected.target_type}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{selected.target_id}</span>
                  {selected.target_type === 'user' && (
                  <div className="ml-auto flex gap-2">
                    <a
                      href={`/client/photographes/${selected.target_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Voir profil public
                    </a>
                    <a
                      href={`/admin/prestataire/${selected.target_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5" /> Fiche admin
                    </a>
                  </div>
                )}
                </div>
              </div>

              {/* Bloc à ajouter dans le panneau, après la section "Cible signalée" */}
              {targetHistory.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    Historique ({targetHistory.length} signalement{targetHistory.length > 1 ? 's' : ''} au total)
                  </h2>
                  <div className="space-y-1.5">
                    {targetHistory.map(h => (
                      <div key={h.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs border ${
                        h.id === selected.id ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${(STATUS_LABELS[h.status] || STATUS_LABELS.open).className}`}>
                          {(STATUS_LABELS[h.status] || STATUS_LABELS.open).label}
                        </span>
                        <span className="text-gray-600 truncate flex-1">{h.reason}</span>
                        <span className="text-gray-400 flex-shrink-0">par {h.reporter?.nom || '?'}</span>
                        <span className="text-gray-400 flex-shrink-0">{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raison */}
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Raison</h2>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-6 py-3 font-medium">{selected.reason || '—'}</p>
              </div>

              {/* Bloc à ajouter après "Raison" */}
              {targetPreview && (
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Contenu signalé
                  </h2>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {targetPreview.type === 'avis' && (
                      <>
                        <div className="flex items-center gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-3 h-3 ${i <= targetPreview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-700 italic">"{targetPreview.comment}"</p>
                      </>
                    )}
                    {targetPreview.type === 'message' && (
                      <p className="text-sm text-gray-700 italic">"{targetPreview.contenu}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{new Date(targetPreview.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-6 py-3 leading-relaxed whitespace-pre-line">{selected.description}</p>
                </div>
              )}

              {/* Commentaire admin existant */}
              {selected.admin_comment && selected.status !== 'open' && (
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Décision admin</h2>
                  <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-xl px-6 py-3 italic">{selected.admin_comment}</p>
                </div>
              )}

              <p className="text-xs text-gray-400">Signalé le {new Date(selected.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              {/* Zone commentaire admin */}
              {selected.status === 'open' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Commentaire admin (optionnel)</label>
                    <textarea
                      value={adminComment}
                      onChange={e => setAdminComment(e.target.value)}
                      rows={3}
                      placeholder="Explication de la décision..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sévérité de l'avertissement</label>
                    <select
                      value={avertissementSeverity}
                      onChange={e => setAvertissementSeverity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="info">ℹ️ Information</option>
                      <option value="warning">⚠️ Avertissement</option>
                      <option value="severe">🚨 Avertissement grave</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {selected.status === 'open' && (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 space-y-2">
                <button
                  onClick={() => setShowCloturerModal(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl font-medium text-sm hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Clôturer le signalement
                </button>
                <button
                  onClick={() => setShowAvertirModal(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-medium text-sm hover:bg-orange-100 disabled:opacity-50 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Avertir l'utilisateur
                </button>
                <button
                  onClick={handleIgnorer}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Ignorer
                </button>
              </div>
            )}
          </div>
          {showAvertirModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowAvertirModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                
                {/* Header */}
                <button
                  onClick={() => setShowAvertirModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Flag className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Avertir l'utilisateur</h2>
                    <p className="text-xs text-gray-400">Cette action sera visible par l'utilisateur</p>
                  </div>
                </div>

                {/* Sévérité */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Sévérité
                  </label>
                  <select
                    value={avertissementSeverity}
                    onChange={e => setAvertissementSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  >
                    <option value="info">ℹ️ Information</option>
                    <option value="warning">⚠️ Avertissement</option>
                    <option value="severe">🚨 Avertissement grave</option>
                  </select>
                </div>

                {/* Message */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Message envoyé à l'utilisateur *
                  </label>
                  <textarea
                    value={avertirMessage}
                    onChange={e => setAvertirMessage(e.target.value)}
                    rows={4}
                    placeholder="Ex : Votre comportement ne respecte pas les conditions d'utilisation..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{avertirMessage.length} caractère{avertirMessage.length > 1 ? 's' : ''}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAvertirModal(false); setAvertirMessage(''); }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAvertir}
                    disabled={!avertirMessage.trim() || actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Flag className="w-4 h-4" /> Envoyer l'avertissement</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
          {showCloturerModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCloturerModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

                {/* Header */}
                <button
                  onClick={() => setShowCloturerModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Clôturer le signalement</h2>
                    <p className="text-xs text-gray-400">Le statut passera à "Clôturé"</p>
                  </div>
                </div>

                {/* Commentaire */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Commentaire admin (optionnel)
                  </label>
                  <textarea
                    value={cloturerComment}
                    onChange={e => setCloturerComment(e.target.value)}
                    rows={4}
                    placeholder="Ex : Signalement traité, aucune violation constatée..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{cloturerComment.length} caractère{cloturerComment.length > 1 ? 's' : ''}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCloturerModal(false); setCloturerComment(''); }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCloturer}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><CheckCircle className="w-4 h-4" /> Confirmer la clôture</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
