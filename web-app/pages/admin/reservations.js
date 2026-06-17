import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, ChevronLeft, ChevronRight, Eye, CalendarDays, User, X } from 'lucide-react';
import * as notificationService from '../../lib/notificationService';

const PAGE_SIZE = 20;

const STATUT = {
  en_attente:  { label: 'En attente',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmee:   { label: 'Confirmée',   cls: 'bg-green-100  text-green-800  border-green-200' },
  annulee:     { label: 'Annulée',     cls: 'bg-red-100    text-red-800    border-red-200' },
  terminee:    { label: 'Terminée',    cls: 'bg-gray-100   text-gray-700   border-gray-200' },
  en_cours:    { label: 'En cours',    cls: 'bg-blue-100   text-blue-800   border-blue-200' },
  remboursee:  { label: 'Remboursée', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export default function AdminReservations() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows]           = useState([]);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilter] = useState('all');
  const [page, setPage]           = useState(0);
  const [total, setTotal]         = useState(0);
  const [fetching, setFetching]   = useState(false);
  const [selected, setSelected]   = useState(null);

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('reservations')
      .select(`
        id, statut, montant_total, acompte_montant, date, created_at,
        adresse_complete, notes_client, devis_id, categorie, lieu, ville,
        profiles!reservations_client_id_fkey(nom, email, telephone),
        profiles!reservations_prestataire_id_fkey(nom, email, telephone)
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
          r['profiles!reservations_client_id_fkey']?.nom?.toLowerCase().includes(q) ||
          r['profiles!reservations_prestataire_id_fkey']?.nom?.toLowerCase().includes(q)
        );
      }
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, filterStatut, search]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  return (
    <AdminLayout title="Réservations">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client ou prestataire..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            ['all', 'Toutes'],
            ['en_attente', 'En attente'],
            ['confirmee', 'Confirmées'],
            ['en_cours', 'En cours'],
            ['terminee', 'Terminées'],
            ['annulee', 'Annulées'],
          ].map(([val, lbl]) => (
            <button key={val} onClick={() => { setFilter(val); setPage(0); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium border transition-all ${
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
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Prestataire</th>
                <th className="px-6 py-3 font-semibold">Montant</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Date prestation</th>
                <th className="px-6 py-3 font-semibold">Créée le</th>
                <th className="px-6 py-3 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fetching ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Aucune réservation trouvée</td></tr>
              ) : rows.map(row => {
                const s = STATUT[row.statut] || { label: row.statut, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{row['profiles!reservations_client_id_fkey']?.nom || '—'}</p>
                          <p className="text-xs text-gray-400">{row['profiles!reservations_client_id_fkey']?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{row['profiles!reservations_prestataire_id_fkey']?.nom || '—'}</p>
                        <p className="text-xs text-gray-400">{row.categorie || row.ville}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-900 text-sm">
                      {row.montant_total ? `${Number(row.montant_total).toLocaleString('fr-FR')} MAD` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {row.date ? (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(row.date).toLocaleDateString('fr-FR')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-3">
                      <button onClick={() => setSelected(row)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">{total} réservation{total !== 1 ? 's' : ''}</span>
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
                <h2 className="font-bold text-gray-900">Réservation #{selected.id?.slice(0, 8)}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${(STATUT[selected.statut] || { cls: 'bg-gray-100 text-gray-600 border-gray-200' }).cls}`}>
                  {(STATUT[selected.statut] || { label: selected.statut }).label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-500 font-semibold mb-2 uppercase tracking-wide">Client</p>
                  <p className="font-bold text-gray-900 text-sm">{selected['profiles!reservations_client_id_fkey']?.nom || '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selected['profiles!reservations_client_id_fkey']?.email}</p>
                  {selected['profiles!reservations_client_id_fkey']?.telephone && <p className="text-xs text-gray-500">{selected['profiles!reservations_client_id_fkey'].telephone}</p>}
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs text-indigo-500 font-semibold mb-2 uppercase tracking-wide">Prestataire</p>
                  <p className="font-bold text-gray-900 text-sm">{selected['profiles!reservations_prestataire_id_fkey']?.nom || '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selected['profiles!reservations_prestataire_id_fkey']?.email}</p>
                  {selected.categorie && <p className="text-xs text-gray-400">{selected.categorie}</p>}
                </div>
              </div>

              {/* Montants */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Finances</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Montant total',  val: selected.montant_total ? `${Number(selected.montant_total).toLocaleString('fr-FR')} MAD` : '—' },
                    { label: 'Acompte',         val: selected.acompte_montant ? `${Number(selected.acompte_montant).toLocaleString('fr-FR')} MAD` : '—' },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-bold text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Planning</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Date de prestation', val: selected.date ? new Date(selected.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                    { label: 'Réservée le',         val: new Date(selected.created_at).toLocaleDateString('fr-FR') },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-medium text-sm text-gray-800 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adresse */}
              {(selected.adresse_complete || selected.lieu || selected.ville) && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lieu de prestation</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.adresse_complete || [selected.lieu, selected.ville].filter(Boolean).join(', ')}</p>
                </div>
              )}

              {/* Notes client */}
              {selected.notes_client && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes du client</h2>
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed whitespace-pre-line">{selected.notes_client}</p>
                </div>
              )}

              {/* ID devis */}
              {selected.devis_id && (
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Devis associé</span>
                  <span className="text-xs font-mono text-gray-700">{selected.devis_id.slice(0, 12)}…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
