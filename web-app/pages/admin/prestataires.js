import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import * as photographerService from  '../../../lib/photographerService';
import {
  CheckCircle, XCircle, Eye, Search,
  ChevronLeft, ChevronRight, User, FileText,
  MapPin, Phone, Mail, AlertTriangle, X, Download
} from 'lucide-react';

const STATUT = {
  en_attente: { label: 'En attente',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  valide:     { label: 'Validé',      cls: 'bg-green-100  text-green-800  border-green-200' },
  refuse:     { label: 'Refusé',      cls: 'bg-red-100    text-red-800    border-red-200' },
  suspendu:   { label: 'Suspendu',    cls: 'bg-gray-100   text-gray-700   border-gray-200' },
};

const DOCS = [
  { column: 'document_identite_recto_url', label: 'CNI / Passeport (recto)' },
  { column: 'document_identite_verso_url', label: 'CNI (verso)' },
  { column: 'documents_siret',             label: 'Justificatif SIRET' },
  { column: 'documents_kbis',              label: 'Extrait Kbis' },
  { column: 'documents_assurance',         label: 'Assurance professionnelle' },
];

const PAGE_SIZE = 20;

export default function AdminPrestataires() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows]                   = useState([]);
  const [search, setSearch]               = useState('');
  const [filterStatut, setFilterStatut]   = useState('all');
  const [page, setPage]                   = useState(0);
  const [total, setTotal]                 = useState(0);
  const [fetching, setFetching]           = useState(false);
  const [selected, setSelected]           = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [motifRefus, setMotifRefus]       = useState('');
  const [previewDoc, setPreviewDoc]       = useState(null);

  const fetchRows = async () => {
    setFetching(true);
    let query = supabase
      .from('profils_prestataire')
      .select(`
        id, statut_validation, identite_verifiee, entreprise_verifiee, categories, specialisations,
        tarif_horaire_min, tarif_horaire_max, note_moyenne, nb_avis, created_at,
        bio, mobile, agence_adresse, nom_entreprise,
        document_identite_recto_url, document_identite_verso_url,
        documents_siret, documents_kbis, documents_assurance,
        profiles(nom, email, telephone, avatar_url, ville)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatut !== 'all') query = query.eq('statut_validation', filterStatut);

    const { data, count, error } = await query;
    if (error) {
      console.error('fetchRows error:', error);
    } else {
      let filtered = data || [];
      if (search) filtered = filtered.filter(r => r.profiles?.nom?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(search.toLowerCase()));
      setRows(filtered);
      setTotal(count || 0);
    }
    setFetching(false);
  };

  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, page, filterStatut, search]);

  const handleValidation = async (id, statut) => {
    setActionLoading(true);
    const updates = { statut_validation: statut };
    if (statut === 'refuse' && motifRefus) updates.motif_refus = motifRefus;
    await photographerService.upsertPhotographerProfile(id, updates);
    setActionLoading(false);
    setSelected(null);
    setMotifRefus('');
    fetchRows();
  };

  const handleVerify = async (id, field, value) => {
    setActionLoading(true);
    await photographerService.upsertPhotographerProfile(id, { [field]: value });
    setSelected(prev => ({ ...prev, [field]: value }));
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setActionLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  return (
    <AdminLayout title="Prestataires">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Prestataire</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Docs</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Inscrit le</th>
                <th className="px-4 py-3 font-semibold">Détails</th>
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
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-gray-600">{(row.categories || [])[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${docsCount === 0 ? 'text-red-500' : docsCount < 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {docsCount}/{DOCS.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.note_moyenne ? `${Number(row.note_moyenne).toFixed(1)} ★ (${row.nb_avis})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(row); setMotifRefus(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
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

      {/* ── Panneau latéral détail ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selected.profiles?.avatar_url
                  ? <img src={selected.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-5 h-5 text-indigo-500" /></div>
                }
                <div>
                  <h2 className="font-bold text-gray-900">{selected.profiles?.nom}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${(STATUT[selected.statut_validation] || STATUT.en_attente).cls}`}>
                    {(STATUT[selected.statut_validation] || STATUT.en_attente).label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
              {/* Contact */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</h2>
                <div className="space-y-2">
                  {[
                    { icon: Mail,  val: selected.profiles?.email },
                    { icon: Phone, val: selected.profiles?.telephone || selected.mobile },
                    { icon: MapPin, val: [selected.profiles?.ville, selected.agence_adresse].filter(Boolean).join(', ') },
                  ].filter(i => i.val).map(({ icon: Icon, val }, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />{val}
                    </div>
                  ))}
                </div>
              </div>

              {/* Activité */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activité</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Catégorie',       val: (selected.categories || []).join(', ') || '—' },
                    { label: 'Spécialisation',  val: (selected.specialisations || []).join(', ') || '—' },
                    { label: 'Tarif horaire',   val: selected.tarif_horaire_min != null ? `${selected.tarif_horaire_min}${selected.tarif_horaire_max ? ' – ' + selected.tarif_horaire_max : ''} MAD` : '—' },
                    { label: 'Note / Avis',     val: selected.note_moyenne ? `${Number(selected.note_moyenne).toFixed(1)} ★ (${selected.nb_avis})` : 'Aucun avis' },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-medium text-sm text-gray-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio */}
              {selected.bio && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bio</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{selected.bio}</p>
                </div>
              )}

              {selected.nom_entreprise && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nom entreprise</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.nom_entreprise}</p>
                </div>
              )}

              {/* Documents */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents justificatifs</h2>
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
              </div>

              {/* Vérifications indépendantes */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vérifications admin</h2>
                <div className="grid grid-cols-2 gap-3">
                  {/* Identité */}
                  <div className={`rounded-xl border-2 p-3 ${selected.identite_verifiee ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {selected.identite_verifiee
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <AlertTriangle className="w-4 h-4 text-gray-400" />}
                      <span className="text-sm font-semibold text-gray-700">Identité</span>
                    </div>
                    <p className={`text-xs mb-2 font-medium ${selected.identite_verifiee ? 'text-green-700' : 'text-gray-400'}`}>
                      {selected.identite_verifiee ? 'Vérifiée ✓' : 'Non vérifiée'}
                    </p>
                    <button
                      onClick={() => handleVerify(selected.id, 'identite_verifiee', !selected.identite_verifiee)}
                      disabled={actionLoading}
                      className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        selected.identite_verifiee
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {selected.identite_verifiee ? 'Annuler' : 'Vérifier'}
                    </button>
                  </div>
                  {/* Entreprise */}
                  <div className={`rounded-xl border-2 p-3 ${selected.entreprise_verifiee ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {selected.entreprise_verifiee
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <AlertTriangle className="w-4 h-4 text-gray-400" />}
                      <span className="text-sm font-semibold text-gray-700">Entreprise</span>
                    </div>
                    <p className={`text-xs mb-2 font-medium ${selected.entreprise_verifiee ? 'text-green-700' : 'text-gray-400'}`}>
                      {selected.entreprise_verifiee ? 'Vérifiée ✓' : 'Non vérifiée'}
                    </p>
                    <button
                      onClick={() => handleVerify(selected.id, 'entreprise_verifiee', !selected.entreprise_verifiee)}
                      disabled={actionLoading}
                      className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        selected.entreprise_verifiee
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {selected.entreprise_verifiee ? 'Annuler' : 'Vérifier'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Motif de refus */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Motif de refus / note interne</h2>
                <textarea
                  value={motifRefus}
                  onChange={e => setMotifRefus(e.target.value)}
                  rows={2}
                  placeholder="Ex: Pièces manquantes, profil incomplet..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 space-y-2">
              <div className="flex gap-2">
                {selected.statut_validation !== 'valide' && (
                  <button
                    onClick={() => handleValidation(selected.id, 'valide')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approuver
                  </button>
                )}
                {selected.statut_validation !== 'refuse' && (
                  <button
                    onClick={() => handleValidation(selected.id, 'refuse')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Refuser
                  </button>
                )}
              </div>
              {selected.statut_validation !== 'suspendu' && (
                <button
                  onClick={() => handleValidation(selected.id, 'suspendu')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5" />Suspendre le compte
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview document */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">{previewDoc.label}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.src}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#130183] text-white rounded-lg text-xs font-medium hover:bg-indigo-800 transition-colors"
                  title="Télécharger le document"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
              {previewDoc.src.match(/\.(jpg|jpeg|png|gif|webp)/i) || previewDoc.src.startsWith('data:image') ? (
                <img src={previewDoc.src} alt={previewDoc.label} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
              ) : previewDoc.src.match(/\.pdf/i) || previewDoc.src.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.src} className="w-full h-[65vh] rounded-lg" title={previewDoc.label} />
              ) : (
                <a href={previewDoc.src} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700">
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
