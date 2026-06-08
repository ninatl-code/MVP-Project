import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/router';
import HeaderPresta from '../../../components/HeaderPresta';

import { useAuth } from '../../../contexts/AuthContext';
import {
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Banknote,
  Percent,
  ArrowUpRight,
  Eye,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */
const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 100));

function StatCard({ label, value, sub, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green:  'bg-green-50  text-green-600  border-green-100',
    blue:   'bg-blue-50   text-blue-600   border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red:    'bg-red-50    text-red-600    border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    teal:   'bg-teal-50   text-teal-600   border-teal-100',
    gray:   'bg-gray-50   text-gray-600   border-gray-100',
  };
  const cls = colors[color] || colors.indigo;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 ${cls.split(' ')[2]}`}>
      <div className={`p-3 rounded-xl ${cls.split(' ')[0]}`}>
        <Icon className={`w-5 h-5 ${cls.split(' ')[1]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${cls.split(' ')[1]}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend != null && (
          <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {trend >= 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, max, color = 'bg-indigo-500' }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value} <span className="text-gray-400">({w}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────── */
const PERIODS = [
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
  { key: 'all',   label: 'Tout' },
];

function getPeriodStart(period) {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'year')  return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default function KPIs() {
  const [loading, setLoading] = useState(true);
  const [rawDevis, setRawDevis] = useState([]);
  const [rawReservations, setRawReservations] = useState([]);
  const [period, setPeriod] = useState('month');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadData(user.id);
  }, [user, authLoading]);

  const loadData = async (userId) => {
    setLoading(true);
    try {
      const [{ data: devis = [] }, { data: reservations = [] }] = await Promise.all([
        supabase.from('devis').select('id, statut, montant_total, created_at').eq('prestataire_id', userId),
        supabase.from('reservations').select('id, statut, montant_total, created_at, date').eq('prestataire_id', userId),
      ]);
      setRawDevis(devis || []);
      setRawReservations(reservations || []);
    } catch (e) {
      console.error('Erreur KPIs:', e);
    } finally {
      setLoading(false);
    }
  };

  const kpis = useMemo(() => {
    const start = getPeriodStart(period);
    const inPeriod = (item) => {
      if (!start) return true;
      const date = new Date(item.created_at || item.date);
      return date >= start;
    };

    const d = rawDevis.filter(inPeriod);
    const r = rawReservations.filter(inPeriod);

    const totalDevis        = d.length;
    const devisAcceptes     = d.filter(x => x.statut === 'accepte').length;
    const devisRefuses      = d.filter(x => x.statut === 'refuse').length;
    const devisExpires      = d.filter(x => x.statut === 'expire').length;
    const devisEnAttente    = d.filter(x => ['envoye', 'lu'].includes(x.statut)).length;
    const tauxConvDevis     = pct(devisAcceptes, totalDevis);

    const totalRes       = r.length;
    const resConfirmees  = r.filter(x => x.statut === 'confirmed').length;
    const resEnCours     = r.filter(x => x.statut === 'in_progress').length;
    const resTerminees   = r.filter(x => x.statut === 'completed').length;
    const resAnnulees    = r.filter(x => x.statut === 'cancelled').length;
    const resEnAttente   = r.filter(x => x.statut === 'pending').length;
    const tauxAnnulation = pct(resAnnulees, totalRes);
    const tauxTerminees  = pct(resTerminees, totalRes);

    const caRealise      = r.filter(x => x.statut === 'completed').reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);
    const caPrevisionnel = r.filter(x => x.statut ==='confirmed').reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);
    const caTotal        = caRealise + caPrevisionnel;
    const montantMoyen   = resTerminees > 0 ? caRealise / resTerminees : 0;
    const montantDevisEnAttente = d.filter(x => ['envoye', 'en_attente', 'lu'].includes(x.statut)).reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);

    return {
      totalDevis, devisAcceptes, devisRefuses, devisExpires, devisEnAttente, tauxConvDevis,
      totalRes, resConfirmees, resEnCours, resTerminees, resAnnulees, resEnAttente,
      tauxAnnulation, tauxTerminees,
      caRealise, caPrevisionnel, caTotal, montantMoyen, montantDevisEnAttente,
    };
  }, [rawDevis, rawReservations, period]);

  const fmt = (n) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <HeaderPresta />
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderPresta />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-indigo-600" /> Tableau de bord
            </h1>
            <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activité</p>
          </div>
          {/* Period selector */}
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  period === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chiffre d'affaires ────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Chiffre d'affaires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="CA Réalisé" value={fmt(kpis.caRealise)} sub={`${kpis.resTerminees} prestation${kpis.resTerminees !== 1 ? 's' : ''} terminée${kpis.resTerminees !== 1 ? 's' : ''}`} icon={CheckCircle} color="green" />
            <StatCard label="CA Prévisionnel" value={fmt(kpis.caPrevisionnel)} sub={`${kpis.resConfirmees + kpis.resEnCours} réservation${kpis.resConfirmees + kpis.resEnCours !== 1 ? 's' : ''} confirmée${kpis.resConfirmees + kpis.resEnCours !== 1 ? 's' : ''}`} icon={TrendingUp} color="indigo" />
            <StatCard label="CA Total (réalisé + prévi.)" value={fmt(kpis.caTotal)} sub={`Panier moyen : ${fmt(kpis.montantMoyen)}`} icon={Banknote} color="teal" />
          </div>
        </section>

        {/* ── Devis ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Devis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Devis envoyés" value={kpis.totalDevis} icon={FileText} color="blue" />
            <StatCard label="Acceptés" value={kpis.devisAcceptes} sub={`Taux : ${kpis.tauxConvDevis}%`} icon={CheckCircle} color="green" />
            <StatCard label="En attente de réponse" value={kpis.devisEnAttente} sub={`${fmt(kpis.montantDevisEnAttente)} en jeu`} icon={Clock} color="yellow" />
            <StatCard label="Refusés / Expirés" value={`${kpis.devisRefuses} / ${kpis.devisExpires}`} icon={XCircle} color="red" />
          </div>

          {/* Répartition devis */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Percent className="w-4 h-4 text-indigo-400" /> Répartition des devis</h2>
            <div className="space-y-3">
              <ProgressBar label="Acceptés"           value={kpis.devisAcceptes}  max={kpis.totalDevis} color="bg-green-500" />
              <ProgressBar label="En attente"         value={kpis.devisEnAttente} max={kpis.totalDevis} color="bg-yellow-400" />
              <ProgressBar label="Refusés"            value={kpis.devisRefuses}   max={kpis.totalDevis} color="bg-red-400" />
              <ProgressBar label="Expirés"            value={kpis.devisExpires}   max={kpis.totalDevis} color="bg-gray-400" />
            </div>
          </div>
        </section>

        {/* ── Réservations ──────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Réservations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total réservations"    value={kpis.totalRes}      icon={Calendar}      color="purple" />
            <StatCard label="Confirmées / En cours" value={`${kpis.resConfirmees} / ${kpis.resEnCours}`} sub="À honorer" icon={CheckCircle} color="indigo" />
            <StatCard label="Terminées"             value={kpis.resTerminees}  sub={`${kpis.tauxTerminees}% du total`} icon={Activity} color="green" />
            <StatCard label="En attente"            value={kpis.resEnAttente}  sub="À traiter" icon={Clock} color="yellow" />
          </div>

          {/* Répartition réservations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Percent className="w-4 h-4 text-indigo-400" /> Répartition des réservations</h2>
            <div className="space-y-3">
              <ProgressBar label="Terminées"              value={kpis.resTerminees}  max={kpis.totalRes} color="bg-green-500" />
              <ProgressBar label="Confirmées"             value={kpis.resConfirmees} max={kpis.totalRes} color="bg-indigo-500" />
              <ProgressBar label="En cours"               value={kpis.resEnCours}    max={kpis.totalRes} color="bg-purple-500" />
              <ProgressBar label="En attente"             value={kpis.resEnAttente}  max={kpis.totalRes} color="bg-yellow-400" />
              <ProgressBar label="Annulées"               value={kpis.resAnnulees}   max={kpis.totalRes} color="bg-red-400" />
            </div>
          </div>
        </section>

        {/* ── Indicateurs clés ──────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Indicateurs clés</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Taux de conversion devis</p>
              <p className="text-4xl font-bold text-indigo-600">{kpis.tauxConvDevis}%</p>
              <p className="text-xs text-gray-400 mt-1">{kpis.devisAcceptes} acceptés / {kpis.totalDevis} envoyés</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${kpis.tauxConvDevis}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Taux de réalisation</p>
              <p className="text-4xl font-bold text-green-600">{kpis.tauxTerminees}%</p>
              <p className="text-xs text-gray-400 mt-1">{kpis.resTerminees} terminées / {kpis.totalRes} réservations</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${kpis.tauxTerminees}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Taux d'annulation</p>
              <p className={`text-4xl font-bold ${kpis.tauxAnnulation > 20 ? 'text-red-600' : 'text-gray-700'}`}>{kpis.tauxAnnulation}%</p>
              <p className="text-xs text-gray-400 mt-1">{kpis.resAnnulees} annulées / {kpis.totalRes} réservations</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className={`h-2 rounded-full ${kpis.tauxAnnulation > 20 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${kpis.tauxAnnulation}%` }} />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}