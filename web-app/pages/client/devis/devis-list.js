import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';

import {
  FileText, CheckCircle, XCircle, Clock, Search,
  ArrowLeft, Calendar, ChevronRight,
  MapPin, Tag, Star, MessageSquare
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente de réponse', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  lu:         { label: 'Lu',                   bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Clock },
  accepte:    { label: 'Accepté',              bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  refuse:     { label: 'Refusé',              bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
  expire:     { label: 'Expiré',              bg: 'bg-gray-100',   text: 'text-gray-700',   icon: XCircle },
};

export default function DevisListPage() {
  const router = useRouter();
  const { user, profileId, loading: authLoading } = useAuth();
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchDevis();
  }, [user, authLoading, filter]);

  const fetchDevis = async () => {
    const clientId = profileId || user?.id;
    if (!clientId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('devis')
        .select(`
          *,
          photographe:profils_prestataire(
            id, nom_entreprise, note_moyenne, identite_verifiee,
            profile:profiles(nom, avatar_url)
          ),
          demande:demandes_client(id, titre, categorie, date_souhaitee, lieu, budget_max)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDevis(data || []);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = devis.filter(d =>
    d.photographe?.nom_entreprise?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.demande?.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.titre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatusBadge = ({ statut }) => {
    const cfg = STATUS_CONFIG[statut] || STATUS_CONFIG.en_attente;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/client/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#130183]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#130183]">Mes devis</h1>
            <p className="text-gray-500 text-sm mt-0.5">{devis.length} devis reçus</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un devis..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': COLORS.accent }}
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-6 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="lu">👁️ Lu</option>
              <option value="accepte">✅ Accepté</option>
              <option value="refuse">❌ Refusé</option>
              <option value="expire">🕐 Expiré</option>
            </select>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucun devis</h2>
            <p className="text-gray-500">Postez une demande pour recevoir des devis de photographes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(d => {
              const photographeName = d.photographe?.nom_entreprise ||
                d.photographe?.profile?.nom || 'Photographe';
              const avatarUrl = d.photographe?.profile?.avatar_url;
              const note = d.photographe?.note_moyenne;
              const demande = d.demande;
              const reponduLe = d.created_at
                ? new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                : null;
              const dateSouhaitee = demande?.date_souhaitee
                ? new Date(demande.date_souhaitee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                : null;

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/client/devis/${d.id}`)}
                >
                  {/* Top strip accent if accepted */}
                  {d.statut === 'accepte' && (
                    <div className="h-1 w-full bg-green-400" />
                  )}
                  {d.statut === 'expire' && (
                    <div className="h-1 w-full bg-amber-400" />
                  )}

                  <div className="p-5">
                    {/* Row 1 : avatar + name + status + price */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={photographeName}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow">
                            {photographeName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate text-base">{photographeName}</p>
                            {note > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                <span className="text-xs text-gray-500">{Number(note).toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge statut={d.statut} />
                          </div>
                        </div>

                        {/* Prix + date réponse */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {d.montant && (
                            <span className="flex items-center gap-1 text-sm font-bold text-indigo-700">
                              {Number(d.montant).toLocaleString('fr-FR')} DH
                            </span>
                          )}
                          {reponduLe && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MessageSquare className="w-3 h-3" />
                              Répondu le {reponduLe}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                    </div>

                    {d.statut === 'expire' && (() => {
                      const today = new Date();
                      const todayStr = today.toISOString().split('T')[0];
                      const demandeExp = d.demande?.date_souhaitee ? d.demande.date_souhaitee < todayStr : false;
                      let devisValExp = false;
                      if (d.created_at && d.duree_validite_jours) {
                        const expiry = new Date(new Date(d.created_at).getTime() + d.duree_validite_jours * 86400000);
                        devisValExp = expiry < today;
                      }
                      const dateLabel = d.demande?.date_souhaitee
                        ? new Date(d.demande.date_souhaitee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : null;
                      const msg = devisValExp && demandeExp
                        ? `Ce devis a expiré : la durée de validité et la date de la demande${dateLabel ? ` (${dateLabel})` : ''} sont toutes deux dépassées.`
                        : devisValExp
                        ? 'Ce devis a expiré : la durée de validité fixée par le prestataire est dépassée.'
                        : `Ce devis a expiré car la date souhaitée de la demande est passée ou il a été annulé par le prestataire.`;
                      return (
                        <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                          <p>{msg}</p>
                        </div>
                      );
                    })()}

                    {/* Separator */}
                    {demande && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Demande concernée</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {demande.titre && (
                            <span className="flex items-center gap-1 text-sm text-gray-700 font-medium truncate max-w-xs">
                              <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              {demande.titre}
                            </span>
                          )}
                          {demande.categorie && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Tag className="w-3 h-3 text-gray-400" />
                              {demande.categorie}
                            </span>
                          )}
                          {demande.lieu && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {demande.lieu}
                            </span>
                          )}
                          {dateSouhaitee && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {dateSouhaitee}
                            </span>
                          )}
                          {demande.budget_max && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              Budget max : {Number(demande.budget_max).toLocaleString('fr-FR')} DH
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/client/demandes/${demande.id}`); }}
                            className="text-xs text-indigo-600 hover:underline font-medium"
                          >
                            Voir la demande →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
