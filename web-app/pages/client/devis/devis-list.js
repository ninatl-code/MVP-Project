import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import {
  FileText, CheckCircle, XCircle, Clock, Search,
  ArrowLeft, Eye, Euro, Calendar, ChevronRight
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  accepte:    { label: 'Accepté',    bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  refuse:     { label: 'Refusé',     bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
  expire:     { label: 'Expiré',     bg: 'bg-gray-100',   text: 'text-gray-700',   icon: XCircle },
};

export default function DevisListPage() {
  const router = useRouter();
  const { profileId } = useAuth();
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedId, setResolvedId] = useState(null);

  // Résoudre l'ID sans attendre l'AuthContext
  useEffect(() => {
    const resolveId = async () => {
      if (profileId) { setResolvedId(profileId); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setResolvedId(user.id);
      else router.push('/login');
    };
    resolveId();
  }, [profileId]);

  useEffect(() => {
    if (resolvedId) fetchDevis();
  }, [resolvedId, filter]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('devis')
        .select(`
          *,
          photographe:profils_prestataire(
            id, nom_entreprise, note_moyenne, identite_verifiee,
            profile:profiles(nom)
          ),
          demande:demandes_client(id, titre, categorie, date_souhaitee, lieu)
        `)
        .eq('client_id', resolvedId)
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/client/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes devis</h1>
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
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">⏳ En attente</option>
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
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/client/devis/${d.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">
                          {photographeName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{photographeName}</p>
                          {d.demande?.titre && (
                            <p className="text-sm text-gray-500 truncate">Pour : {d.demande.titre}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <StatusBadge statut={d.statut} />
                        {d.montant && (
                          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: COLORS.accent }}>
                            <Euro className="w-4 h-4" />
                            {Number(d.montant).toLocaleString('fr-FR')} €
                          </span>
                        )}
                        {d.created_at && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
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
