import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, ChevronLeft, ChevronRight, Eye, Star, Trash2, X } from 'lucide-react';

const PAGE_SIZE = 20;

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

export default function AdminAvis() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('reviews_presta')
      .select(`
        id, rating, comment, created_at,
        client:profiles!reviews_presta_client_id_fkey(nom, email),
        prestataire:profiles!reviews_presta_prestataire_id_fkey(nom, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r =>
          r.client?.nom?.toLowerCase().includes(q) ||
          r.prestataire?.nom?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q)
        );
      }
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cet avis ?')) return;
    setActionLoading(true);
    await supabase.from('reviews_presta').delete().eq('id', id);
    setActionLoading(false);
    setSelected(null);
    fetchRows();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  return (
    <AdminLayout title="Avis">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client, prestataire ou commentaire..."
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
                <th className="px-4 py-3 font-semibold">Prestataire</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Commentaire</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">Aucun avis trouvé</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.client?.nom || '—'}</p>
                    <p className="text-xs text-gray-400">{row.client?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.prestataire?.nom || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StarRating rating={row.rating} />
                    <span className="text-xs text-gray-400 mt-0.5 block">{row.rating}/5</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                    <p className="truncate text-xs">{row.comment || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(row)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} avis</span>
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
              <div>
                <h2 className="font-bold text-gray-900">Avis #{selected.id?.slice(0, 8)}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-500 font-semibold mb-1 uppercase">Client</p>
                  <p className="font-bold text-sm text-gray-900">{selected.client?.nom}</p>
                  <p className="text-xs text-gray-400">{selected.client?.email}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-indigo-500 font-semibold mb-1 uppercase">Prestataire</p>
                  <p className="font-bold text-sm text-gray-900">{selected.prestataire?.nom}</p>
                  <p className="text-xs text-gray-400">{selected.prestataire?.email}</p>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</h2>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <StarRating rating={selected.rating} />
                  <span className="font-bold text-gray-900">{selected.rating}/5</span>
                </div>
              </div>

              {/* Commentaire */}
              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Commentaire</h2>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-line">{selected.comment || 'Aucun commentaire'}</p>
              </div>

              <p className="text-xs text-gray-400">Publié le {new Date(selected.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => handleDelete(selected.id)}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium text-sm hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer l'avis définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
