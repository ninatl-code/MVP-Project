import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/router';
import HeaderPresta from '../../../components/HeaderPresta';
import { useAuth } from '../../../contexts/AuthContext';
import {
  FileText, Download, Eye, Search, Calendar, Euro,
  CheckCircle, XCircle, ArrowLeft, Printer, Mail,
  Plus, Trash2, X, TrendingUp, Users, RefreshCw
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────── */
const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 100));

const PERIODS = [
  { key: 'week',  label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year',  label: 'Année' },
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

/* ── sub-components ───────────────────────────────────────── */

function HeroCard({ label, value, sub, iconClass, accent }) {
  const accents = {
    green:  { icon: 'bg-[#EAF3DE] text-[#3B6D11]', value: 'text-[#3B6D11]' },
    purple: { icon: 'bg-[#EEEDFE] text-[#3C3489]', value: 'text-[#3C3489]' },
    teal:   { icon: 'bg-[#E1F5EE] text-[#085041]', value: 'text-[#085041]' },
  };
  const a = accents[accent] || accents.green;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${a.icon}`}>
        <i className={`ti ${iconClass}`} aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.05em] mb-1">{label}</p>
        <p className={`text-2xl font-medium leading-tight ${a.value}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-[0.04em] mb-0.5">{label}</p>
      <p className={`text-lg font-medium ${color || 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium">
          {value} <span className="font-normal text-gray-400">({w}%)</span>
        </span>
      </div>
      <div className="w-full h-[5px] bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function RingKpi({ label, pct: p, detail, badge, badgeColor }) {
  const r = 29;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - p / 100);
  const ringColors = {
    purple: { stroke: '#7F77DD', text: '#3C3489' },
    green:  { stroke: '#639922', text: '#3B6D11' },
    amber:  { stroke: '#EF9F27', text: '#854F0B' },
    red:    { stroke: '#E24B4A', text: '#A32D2D' },
  };
  const badgeColors = {
    green: 'bg-[#EAF3DE] text-[#3B6D11]',
    amber: 'bg-[#FAEEDA] text-[#854F0B]',
    red:   'bg-[#FCEBEB] text-[#A32D2D]',
  };
  const rc = ringColors[badgeColor] || ringColors.purple;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 text-center flex flex-col items-center gap-1">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.05em]">{label}</p>
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#F3F4F6" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={rc.stroke} strokeWidth="7"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" fontSize="14" fontWeight="500" fill={rc.text}>{p}%</text>
      </svg>
      <p className="text-xs text-gray-400">{detail}</p>
      {badge && (
        <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeColors[badgeColor] || badgeColors.amber}`}>
          {badge}
        </span>
      )}
    </div>
  
  );
}

/* ── page ─────────────────────────────────────────────────── */
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
      return new Date(item.created_at || item.date) >= start;
    };

    const d = rawDevis.filter(inPeriod);
    const r = rawReservations.filter(inPeriod);

    const totalDevis            = d.length;
    const devisAcceptes         = d.filter(x => x.statut === 'accepte').length;
    const devisRefuses          = d.filter(x => x.statut === 'refuse').length;
    const devisExpires          = d.filter(x => x.statut === 'expire').length;
    const devisEnAttente        = d.filter(x => ['envoye', 'lu'].includes(x.statut)).length;
    const tauxConvDevis         = pct(devisAcceptes, totalDevis);

    const totalRes              = r.length;
    const resConfirmees         = r.filter(x => x.statut === 'confirmed').length;
    const resEnCours            = r.filter(x => x.statut === 'in_progress').length;
    const resTerminees          = r.filter(x => x.statut === 'completed').length;
    const resAnnulees           = r.filter(x => x.statut === 'cancelled').length;
    const resEnAttente          = r.filter(x => x.statut === 'pending').length;
    const tauxAnnulation        = pct(resAnnulees, totalRes);
    const tauxTerminees         = pct(resTerminees, totalRes);

    const caRealise             = r.filter(x => x.statut === 'completed').reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);
    const caPrevisionnel        = r.filter(x => x.statut === 'confirmed').reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);
    const caTotal               = caRealise + caPrevisionnel;
    const montantMoyen          = resTerminees > 0 ? caRealise / resTerminees : 0;
    const montantDevisEnAttente = d.filter(x => ['envoye', 'en_attente', 'lu'].includes(x.statut)).reduce((s, x) => s + (parseFloat(x.montant_total) || 0), 0);

    return {
      totalDevis, devisAcceptes, devisRefuses, devisExpires, devisEnAttente, tauxConvDevis,
      totalRes, resConfirmees, resEnCours, resTerminees, resAnnulees, resEnAttente,
      tauxAnnulation, tauxTerminees,
      caRealise, caPrevisionnel, caTotal, montantMoyen, montantDevisEnAttente,
    };
  }, [rawDevis, rawReservations, period]);

  const fmt = (n) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n || 0);

  const periodLabel = () => {
    const now = new Date();
    if (period === 'month') return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (period === 'week')  return 'Cette semaine';
    if (period === 'year')  return String(now.getFullYear());
    return 'Toute la période';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <HeaderPresta />
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin h-7 w-7 border-b-2 border-[#534AB7] rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <HeaderPresta />



        {/* ── Page header ───────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#130183]" />
              </button>
            
              <h1 className="text-2xl font-bold text-[#130183] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Tableau de bord
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 capitalize">{periodLabel()}</p>
              </div>
            {/* Period tabs */}
            <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1 self-start">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === key
                      ? 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CA ────────────────────────────────────────────── */}

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <section>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.06em] mb-3">Chiffre d'affaires</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HeroCard
              label="CA réalisé"
              value={fmt(kpis.caRealise)}
              sub={`${kpis.resTerminees} prestation${kpis.resTerminees !== 1 ? 's' : ''} terminée${kpis.resTerminees !== 1 ? 's' : ''}`}
              iconClass="ti-check"
              accent="green"
            />
            <HeroCard
              label="CA prévisionnel"
              value={fmt(kpis.caPrevisionnel)}
              sub={`${kpis.resConfirmees + kpis.resEnCours} réservation${kpis.resConfirmees + kpis.resEnCours !== 1 ? 's' : ''} confirmée${kpis.resConfirmees + kpis.resEnCours !== 1 ? 's' : ''}`}
              iconClass="ti-trending-up"
              accent="purple"
            />
            <HeroCard
              label="CA total"
              value={fmt(kpis.caTotal)}
              sub={`Panier moyen : ${fmt(kpis.montantMoyen)}`}
              iconClass="ti-cash"
              accent="teal"
            />
          </div>
        </section>

        {/* ── Devis + Réservations côte à côte ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Devis */}
          <section>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.06em] mb-3">Devis</p>
            <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-5">
              <div className="grid grid-cols-4 gap-3">
                <MiniStat label="Envoyés"   value={kpis.totalDevis}    />
                <MiniStat label="Acceptés"  value={kpis.devisAcceptes} color="text-[#3B6D11]" />
                <MiniStat label="Attente"   value={kpis.devisEnAttente} color="text-[#854F0B]" />
                <MiniStat label="Refusés"   value={kpis.devisRefuses}  color="text-[#A32D2D]" />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex flex-col gap-3">
                <BarRow label="Acceptés"  value={kpis.devisAcceptes}  max={kpis.totalDevis} color="bg-[#639922]" />
                <BarRow label="En attente" value={kpis.devisEnAttente} max={kpis.totalDevis} color="bg-[#EF9F27]" />
                <BarRow label="Refusés"   value={kpis.devisRefuses}   max={kpis.totalDevis} color="bg-[#E24B4A]" />
                <BarRow label="Expirés"   value={kpis.devisExpires}   max={kpis.totalDevis} color="bg-[#888780]" />
              </div>
              {kpis.montantDevisEnAttente > 0 && (
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-600">{fmt(kpis.montantDevisEnAttente)}</span> en attente de réponse
                </p>
              )}
            </div>
          </section>

          {/* Réservations */}
          <section>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.06em] mb-3">Réservations</p>
            <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-5">
              <div className="grid grid-cols-4 gap-3">
                <MiniStat label="Total"      value={kpis.totalRes}      />
                <MiniStat label="Confirmées" value={kpis.resConfirmees} color="text-[#3C3489]" />
                <MiniStat label="Terminées"  value={kpis.resTerminees}  color="text-[#3B6D11]" />
                <MiniStat label="Annulées"   value={kpis.resAnnulees}   color="text-[#A32D2D]" />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex flex-col gap-3">
                <BarRow label="Terminées"   value={kpis.resTerminees}  max={kpis.totalRes} color="bg-[#639922]" />
                <BarRow label="Confirmées"  value={kpis.resConfirmees} max={kpis.totalRes} color="bg-[#7F77DD]" />
                <BarRow label="En cours"    value={kpis.resEnCours}    max={kpis.totalRes} color="bg-[#1D9E75]" />
                <BarRow label="En attente"  value={kpis.resEnAttente}  max={kpis.totalRes} color="bg-[#EF9F27]" />
                <BarRow label="Annulées"    value={kpis.resAnnulees}   max={kpis.totalRes} color="bg-[#E24B4A]" />
              </div>
            </div>
          </section>
        </div>

        {/* ── Indicateurs clés ──────────────────────────────── */}
        <section>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.06em] mb-3">Indicateurs clés</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RingKpi
              label="Taux de conversion"
              pct={kpis.tauxConvDevis}
              detail={`${kpis.devisAcceptes} acceptés / ${kpis.totalDevis} envoyés`}
              badgeColor="purple"
            />
            <RingKpi
              label="Taux de réalisation"
              pct={kpis.tauxTerminees}
              detail={`${kpis.resTerminees} terminées / ${kpis.totalRes} réservations`}
              badgeColor="green"
            />
            <RingKpi
              label="Taux d'annulation"
              pct={kpis.tauxAnnulation}
              detail={`${kpis.resAnnulees} annulées / ${kpis.totalRes} réservations`}
              badge={kpis.tauxAnnulation > 20 ? 'Taux élevé' : 'Sous contrôle'}
              badgeColor={kpis.tauxAnnulation > 20 ? 'red' : 'amber'}
            />
          </div>
        </section>

      </main>
    </div>
  );
}