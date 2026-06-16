import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, ChevronLeft, ChevronRight, Eye, MapPin, Euro, CalendarDays, Tag, Users, Clock, X, XCircle, EyeOff } from 'lucide-react';
import { masquerDemande } from '../../lib/moderationService';
import * as notificationService from '../../lib/notificationService';

const PAGE_SIZE = 20;

const STATUT = {
  ouverte:  { label: 'Ouverte',   cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  fermee:   { label: 'Fermée',    cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  acceptee: { label: 'Acceptée',  cls: 'bg-green-100 text-green-800 border-green-200' },
  annulee:  { label: 'Annulée',   cls: 'bg-red-100 text-red-800 border-red-200' },
};

export default function AdminDemandes() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows]           = useState([]);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilter] = useState('all');
  const [page, setPage]           = useState(0);
  const [total, setTotal]         = useState(0);
  const [fetching, setFetching]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [matchings, setMatchings] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [motifMasquage, setMotifMasquage] = useState('');

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('demandes_client')
      .select(`
        id, titre, statut, budget_max, date_souhaitee, heure_debut, created_at,
        description, categorie, type_prestation, lieu, ville,
        nb_personnes, duree_estimee_heures, instructions_speciales, langues_souhaitees,
        pourvue_at, fermee_at,
        profiles!demandes_client_client_id_fkey(nom, email, telephone, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatut !== 'all') query = query.eq('statut', filterStatut);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data || [];
      if (search) filtered = filtered.filter(r =>
        r.titre?.toLowerCase().includes(search.toLowerCase()) ||
        r.profiles?.nom?.toLowerCase().includes(search.toLowerCase())
      );
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  const openDetail = async (dem) => {
    setSelected(dem);
    setMatchings([]);
    const { data } = await supabase
      .from('matchings')
      .select('id, statut, score, profils_prestataire!prestataire_id(profiles!inner(nom, email))')
      .eq('demande_id', dem.id)
      .order('score', { ascending: false })
      .limit(5);
    setMatchings(data || []);
  };

  const closeDemande = async (id) => {
    setActionLoading(true);
    await supabase.from('demandes_client').update({ statut: 'fermee', fermee_at: new Date().toISOString() }).eq('id', id);
    setActionLoading(false);
    setSelected(null);
    fetchRows();
  };

  const handleMasquer = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const clientId = selected.profiles?.id || selected.client_id;
      await masquerDemande(selected.id, clientId, motifMasquage);
    } catch(e) { console.error(e); }
    notificationService.notifyDemandeMasquee(selected.client_id,selected.id, motifMasquage);
    setActionLoading(false);
    setMotifMasquage('');
    setSelected(null);
    fetchRows();
  };

  const handleRendre = async () => {
    if (!selected) return;
    setActionLoading(true);
    await supabase.from('demandes_client').update({ actif: true, suspension_reason: null }).eq('id', selected.id);
    setActionLoading(false);
    setSelected(null);
    fetchRows();
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, filterStatut, search]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  return (
    <AdminLayout title="Demandes clients">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par titre ou client..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Toutes'], ['ouverte','Ouvertes'], ['acceptee','Acceptées'], ['fermee','Fermées'], ['annulee','Annulées']].map(([val, lbl]) => (
            <button key={val} onClick={() => { setFilter(val); setPage(0); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                filterStatut === val ? 'bg-[#130183] text-white border-[#130183]' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Titre</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Date souhaitée</th>
                <th className="px-4 py-3 font-semibold">Créée le</th>
                <th className="px-4 py-3 font-semibold">Détails</th>
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
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{row.titre || '—'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{row.profiles?.nom || '—'}</p>
                        <p className="text-xs text-gray-400">{row.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.categorie || row.type_prestation || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.budget_max ? `Max ${row.budget_max} MAD` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {row.date_souhaitee ? new Date(row.date_souhaitee).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(row)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} demande{total !== 1 ? 's' : ''}</span>
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
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-bold text-gray-900 text-base">{selected.titre || 'Demande sans titre'}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${(STATUT[selected.statut] || STATUT.ouverte).cls}`}>
                  {(STATUT[selected.statut] || STATUT.ouverte).label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
              {/* Client */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</h2>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">{selected.profiles?.nom?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selected.profiles?.nom}</p>
                    <p className="text-xs text-gray-400">{selected.profiles?.email} {selected.profiles?.telephone ? `· ${selected.profiles.telephone}` : ''}</p>
                  </div>
                </div>
              </div>

              {/* Infos clés */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Détails de la demande</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Tag,          label: 'Catégorie',         val: selected.categorie },
                    { icon: Tag,          label: 'Type prestation',    val: selected.type_prestation },
                    { icon: MapPin,       label: 'Lieu',               val: [selected.lieu, selected.ville].filter(Boolean).join(', ') },
                    { icon: CalendarDays, label: 'Date souhaitée',     val: selected.date_souhaitee ? new Date(selected.date_souhaitee).toLocaleDateString('fr-FR') : null },
                    { icon: Clock,        label: 'Heure souhaitée',    val: selected.heure_debut || null },
                    { icon: Euro,         label: 'Budget max',         val: selected.budget_max ? `${selected.budget_max} MAD` : null },
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
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-line">{selected.description}</p>
                </div>
              )}

              {/* Notes client */}
              {selected.instructions_speciales && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Instructions spéciales</h2>
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-4 leading-relaxed whitespace-pre-line">{selected.instructions_speciales}</p>
                </div>
              )}

              {/* Matchings */}
              {matchings.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prestataires matchés ({matchings.length})</h2>
                  <div className="space-y-2">
                    {matchings.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                        <p className="text-sm font-medium text-gray-800">{m.profils_prestataire?.profiles?.nom || 'Inconnu'}</p>
                        <div className="flex items-center gap-2">
                          {m.score && <span className="text-xs text-indigo-700 font-semibold">Score: {m.score}</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-600">{m.statut}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 space-y-2">
              {selected.statut === 'ouverte' && (
                <button
                  onClick={() => closeDemande(selected.id)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Fermer la demande
                </button>
              )}
              {selected.actif !== false ? (
                <div className="space-y-2">
                  <input
                    value={motifMasquage}
                    onChange={e => setMotifMasquage(e.target.value)}
                    placeholder="Raison du masquage..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={handleMasquer}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-200 text-orange-700 rounded-xl text-sm hover:bg-orange-50 disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4" /> Masquer la demande
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRendre}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-xl text-sm hover:bg-green-50 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" /> Rendre visible
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
