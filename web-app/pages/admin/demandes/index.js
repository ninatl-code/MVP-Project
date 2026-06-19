import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import AdminLayout from '../../../components/layout/AdminLayout';
import { useRouter } from 'next/router';
import {
  Search, ChevronLeft, ChevronRight, Eye, MapPin, CalendarDays,
  Tag, Users, Clock, X, XCircle, EyeOff, Info, ShieldOff, History,
  CheckCircle, ChevronRight as Arrow
} from 'lucide-react';
import { masquerDemande, reactiverDemande } from '../../../lib/moderationService';

const PAGE_SIZE = 20;

const STATUT = {
  ouverte:  { label: 'Ouverte',  cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  fermee:   { label: 'Fermée',   cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  acceptee: { label: 'Acceptée', cls: 'bg-green-100 text-green-800 border-green-200' },
  annulee:  { label: 'Annulée',  cls: 'bg-red-100 text-red-800 border-red-200' },
};

// ── Modal de confirmation réutilisable ────────────────────────────────────────

function ConfirmModal({ title, description, confirmLabel, confirmClass, onConfirm, onCancel, loading, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
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

export default function AdminDemandes() {
  const { isAdmin, loading } = useAdminGuard();
  const router = useRouter();

  const [rows, setRows]           = useState([]);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilter] = useState('all');
  const [page, setPage]           = useState(0);
  const [total, setTotal]         = useState(0);
  const [fetching, setFetching]   = useState(false);

  // Panneau latéral
  const [selected, setSelected]   = useState(null);
  const [matchings, setMatchings] = useState([]);
  const [panelTab, setPanelTab]   = useState('info'); // 'info' | 'actions' | 'history'
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [modal, setModal]               = useState(null); // null | 'close' | 'mask' | 'unmask'
  const [motifMasquage, setMotifMasquage] = useState('');
  const [motifFermeture, setMotifFermeture] = useState('');

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';


  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('demandes_client')
      .select(`
        id, titre, statut, budget_max, date_souhaitee, heure_debut, created_at,
        description, categorie, type_prestation, lieu, ville, actif,
        nb_personnes, duree_estimee_heures, instructions_speciales, langues_souhaitees,
        pourvue_at, fermee_at, suspension_reason, date_suspension, client_id,
        profiles!demandes_client_client_id_fkey(id, nom, email, telephone, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatut !== 'all') query = query.eq('statut', filterStatut);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r =>
          r.titre?.toLowerCase().includes(q) ||
          r.profiles?.nom?.toLowerCase().includes(q)
        );
      }
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, filterStatut, search]);

  // ── Panneau ───────────────────────────────────────────────────────────────

  const openDetail = async (dem, tab = 'info') => {
    setSelected(dem);
    setPanelTab(tab);
    setMatchings([]);
    setMotifMasquage('');
    setMotifFermeture('');
    const { data } = await supabase
      .from('matchings')
      .select('id, statut, score, profils_prestataire!prestataire_id(profiles!inner(nom, email))')
      .eq('demande_id', dem.id)
      .order('score', { ascending: false })
      .limit(5);
    setMatchings(data || []);
  };

  const closePanel = () => { setSelected(null); setModal(null); };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleClose = async () => {
    setActionLoading(true);
    await supabase
      .from('demandes_client')
      .update({ statut: 'fermee', fermee_at: new Date().toISOString() })
      .eq('id', selected.id);
    setActionLoading(false);
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleMasquer = async () => {
    setActionLoading(true);
    try {
      const clientId = selected.profiles?.id || selected.client_id;
      await masquerDemande(selected.id, clientId, motifMasquage);
    } catch (e) { console.error(e); }
    setActionLoading(false);
    setMotifMasquage('');
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const handleRendre = async () => {
    setActionLoading(true);
    try {
      const clientId = selected.profiles?.id || selected.client_id;
      await reactiverDemande(selected.id, clientId);
    } catch (e) { console.error(e); }
    setActionLoading(false);
    setModal(null);
    setSelected(null);
    fetchRows();
  };

  const isMasquee = (row) => row?.actif === false;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w- border-b-2 border-[#130183]" />
    </div>
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Demandes clients">

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par titre ou client…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Toutes'], ['ouverte','Ouvertes'], ['acceptee','Acceptées'], ['fermee','Fermées'], ['annulee','Annulées']].map(([val, lbl]) => (
            <button key={val} onClick={() => { setFilter(val); setPage(0); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                filterStatut === val
                  ? 'bg-[#130183] text-white border-[#130183]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="min-w-[1400px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Titre</th>
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Catégorie</th>
                <th className="px-6 py-3 font-semibold">Budget</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Visibilité</th>
                <th className="px-6 py-3 font-semibold">Créée le</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">Aucune demande trouvée</td></tr>
              ) : rows.map(row => {
                const s = STATUT[row.statut] || STATUT.ouverte;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-[160px] truncate">{row.titre || '—'}</td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{row.profiles?.nom || '—'}</p>
                      <p className="text-xs text-gray-400">{row.profiles?.email}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">{row.categorie || row.type_prestation || '—'}</td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {row.budget_max ? `Max ${row.budget_max} MAD` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-6 py-3">
                      {isMasquee(row) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          <EyeOff className="w-3 h-3" /> Masquée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{fmt(row.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openDetail(row, 'info')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Voir
                        </button>
                        <button
                          onClick={() => openDetail(row, 'actions')}
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
          <span className="text-sm text-gray-500">{total} demande{total !== 1 ? 's' : ''}</span>
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
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-900 text-base">{selected.titre || 'Demande sans titre'}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${(STATUT[selected.statut] || STATUT.ouverte).cls}`}>
                    {(STATUT[selected.statut] || STATUT.ouverte).label}
                  </span>
                  {isMasquee(selected) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                      <EyeOff className="w-3 h-3" /> Masquée
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">par {selected.profiles?.nom}</p>
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

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Onglet Info ── */}
              {panelTab === 'info' && (
                <>
                  {/* Alerte masquage */}
                  {isMasquee(selected) && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <EyeOff className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-700">Demande masquée</p>
                        {selected.suspension_reason && (
                          <p className="text-xs text-orange-600 mt-1">Raison : {selected.suspension_reason}</p>
                        )}
                        {selected.date_suspension && (
                          <p className="text-xs text-orange-500 mt-0.5">Depuis le {fmt(selected.date_suspension)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Client */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</h3>
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">{selected.profiles?.nom?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selected.profiles?.nom}</p>
                        <p className="text-xs text-gray-400">
                          {selected.profiles?.email}
                          {selected.profiles?.telephone ? ` · ${selected.profiles.telephone}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Détails */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Détails de la demande</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Tag,          label: 'Catégorie',         val: selected.categorie },
                        { icon: Tag,          label: 'Type prestation',    val: Array.isArray(selected.type_prestation) ? selected.type_prestation.join(', ') : selected.type_prestation },
                        { icon: MapPin,       label: 'Lieu',               val: [selected.lieu, selected.ville].filter(Boolean).join(', ') },
                        { icon: CalendarDays, label: 'Date souhaitée',     val: selected.date_souhaitee ? fmt(selected.date_souhaitee) : null },
                        { icon: Clock,        label: 'Heure souhaitée',    val: selected.heure_debut || null },
                        { icon: Tag,          label: 'Budget max',         val: selected.budget_max ? `${selected.budget_max} MAD` : null },
                        { icon: Users,        label: 'Nb personnes',       val: selected.nb_personnes },
                        { icon: Tag,          label: 'Langues souhaitées', val: selected.langues_souhaitees?.length ? selected.langues_souhaitees.join(', ') : null },
                      ].filter(i => i.val).map(({ icon: Icon, label, val }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-gray-400">{label}</p>
                          </div>
                          <p className="font-medium text-sm text-gray-800">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {selected.description && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-line">{selected.description}</p>
                    </div>
                  )}

                  {selected.instructions_speciales && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Instructions spéciales</h3>
                      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-4 leading-relaxed whitespace-pre-line">{selected.instructions_speciales}</p>
                    </div>
                  )}

                  {/* Matchings */}
                  {matchings.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Prestataires matchés ({matchings.length})
                      </h3>
                      <div className="space-y-2">
                        {matchings.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                            <p className="text-sm font-medium text-gray-800">{m.profils_prestataire?.profiles?.nom || 'Inconnu'}</p>
                            <div className="flex items-center gap-2">
                              {m.score && <span className="text-xs text-indigo-700 font-semibold">Score : {m.score}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-600">{m.statut}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lien profil complet */}
                  <button
                    onClick={() => router.push(`/admin/demandes/${selected.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all text-sm"
                  >
                    Voir la demande complète <Arrow className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* ── Onglet Actions ── */}
              {panelTab === 'actions' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Actions de modération sur la demande <span className="font-semibold text-gray-700">"{selected.titre}"</span>.
                  </p>

                  {/* Fermer */}
                  {selected.statut === 'ouverte' && (
                    <div className="border border-red-200 rounded-xl p-4 space-y-2 bg-red-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Fermer la demande</span>
                      </div>
                      <p className="text-xs text-red-700">La demande sera clôturée et les prestataires ne pourront plus y répondre.</p>
                      <button
                        onClick={() => setModal('close')}
                        className="w-full mt-1 px-4 py-2 border border-red-400 text-red-700 bg-white rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Fermer cette demande
                      </button>
                    </div>
                  )}

                  {/* Masquer / Démasquer */}
                  {!isMasquee(selected) ? (
                    <div className="border border-orange-200 rounded-xl p-4 space-y-2 bg-orange-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <EyeOff className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-800">Masquer la demande</span>
                      </div>
                      <p className="text-xs text-orange-700">La demande ne sera plus visible par les prestataires sur la plateforme.</p>
                      <button
                        onClick={() => setModal('mask')}
                        className="w-full mt-1 px-4 py-2 border border-orange-400 text-orange-700 bg-white rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                      >
                        Masquer cette demande
                      </button>
                    </div>
                  ) : (
                    <div className="border border-green-200 rounded-xl p-4 space-y-2 bg-green-50/40">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Rendre visible la demande</span>
                      </div>
                      <p className="text-xs text-green-700">La demande redeviendra visible pour les prestataires sur la plateforme.</p>
                      <button
                        onClick={() => setModal('unmask')}
                        className="w-full mt-1 px-4 py-2 border border-green-400 text-green-700 bg-white rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                      >
                        Rendre visible cette demande
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Onglet Historique ── */}
              {panelTab === 'history' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">Historique de modération et informations sur cette demande.</p>

                  {/* Statut actuel */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut actuel</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${(STATUT[selected.statut] || STATUT.ouverte).cls}`}>
                        {(STATUT[selected.statut] || STATUT.ouverte).label}
                      </span>
                      {isMasquee(selected) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          <EyeOff className="w-3 h-3" /> Masquée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      )}
                    </div>
                    {isMasquee(selected) && selected.suspension_reason && (
                      <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Raison du masquage :</span><br />
                        {selected.suspension_reason}
                      </div>
                    )}
                    {isMasquee(selected) && selected.date_suspension && (
                      <p className="text-xs text-orange-600">Masquée le {fmt(selected.date_suspension)}</p>
                    )}
                  </div>

                  {/* Chronologie */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Chronologie</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      Créée le {fmt(selected.created_at)}
                    </div>
                    {selected.date_souhaitee && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Date souhaitée : {fmt(selected.date_souhaitee)}
                      </div>
                    )}
                    {selected.fermee_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <XCircle className="w-4 h-4 text-gray-400" />
                        Fermée le {fmt(selected.fermee_at)}
                      </div>
                    )}
                    {selected.pourvue_at && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Pourvue le {fmt(selected.pourvue_at)}
                      </div>
                    )}
                    {selected.date_suspension && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <EyeOff className="w-4 h-4 text-orange-400" />
                        Masquée le {fmt(selected.date_suspension)}
                      </div>
                    )}
                  </div>

                  {!selected.fermee_at && !selected.date_suspension && !selected.pourvue_at && (
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

      {modal === 'close' && (
        <ConfirmModal
          title="Fermer cette demande ?"
          description={`La demande "${selected?.titre}" sera clôturée. Les prestataires ne pourront plus y répondre.`}
          confirmLabel="Confirmer la fermeture"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleClose}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {modal === 'mask' && (
        <ConfirmModal
          title="Masquer cette demande ?"
          description={`La demande "${selected?.titre}" ne sera plus visible par les prestataires.`}
          confirmLabel="Confirmer le masquage"
          confirmClass="bg-orange-500 hover:bg-orange-600"
          onConfirm={handleMasquer}
          onCancel={() => { setModal(null); setMotifMasquage(''); }}
          loading={actionLoading}
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Raison du masquage <span className="text-red-500">*</span></label>
            <textarea
              value={motifMasquage}
              onChange={e => setMotifMasquage(e.target.value)}
              rows={3}
              placeholder="Décrivez la raison du masquage…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
          </div>
        </ConfirmModal>
      )}

      {modal === 'unmask' && (
        <ConfirmModal
          title="Rendre visible cette demande ?"
          description={`La demande "${selected?.titre}" redeviendra visible pour tous les prestataires.`}
          confirmLabel="Confirmer la réactivation"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleRendre}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

    </AdminLayout>
  );
}