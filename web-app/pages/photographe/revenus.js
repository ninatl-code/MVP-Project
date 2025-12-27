import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Euro, TrendingUp, TrendingDown, Calendar, Download,
  ArrowRight, Clock, Check, AlertCircle, CreditCard
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const PLATFORM_FEE = 0.15; // 15%

export default function RevenusPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalRevenu: 0,
    pendingPayout: 0,
    completedPayouts: 0,
    transactionsCount: 0,
    averageTransaction: 0,
    growth: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stripeAccount, setStripeAccount] = useState(null);

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchRevenusData();
      fetchStripeAccount();
    }
  }, [photographeProfile, currentMonth, selectedPeriod]);

  const fetchStripeAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('profils_photographe')
        .select('stripe_account_id, stripe_account_status')
        .eq('id', photographeProfile.id)
        .single();

      if (!error && data) {
        setStripeAccount(data);
      }
    } catch (error) {
      console.error('Error fetching Stripe account:', error);
    }
  };

  const fetchRevenusData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (selectedPeriod === 'month') {
        startDate = startOfMonth(currentMonth);
        endDate = endOfMonth(currentMonth);
      } else if (selectedPeriod === 'year') {
        startDate = new Date(currentMonth.getFullYear(), 0, 1);
        endDate = new Date(currentMonth.getFullYear(), 11, 31);
      } else {
        // All time
        startDate = new Date('2020-01-01');
        endDate = new Date();
      }

      // Fetch transactions/paiements
      const { data: paiements, error } = await supabase
        .from('paiements')
        .select(`
          *,
          reservation:reservation_id (
            id,
            date_prestation,
            client:client_id (prenom, nom)
          )
        `)
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(paiements || []);

      // Calculate stats
      const successfulPayments = (paiements || []).filter(p => p.statut === 'complete' || p.statut === 'succeeded');
      const pendingPayments = (paiements || []).filter(p => p.statut === 'pending' || p.statut === 'en_attente');

      const totalRevenu = successfulPayments.reduce((sum, p) => {
        const amount = p.montant || 0;
        return sum + (amount * (1 - PLATFORM_FEE)); // After platform fee
      }, 0);

      const pendingTotal = pendingPayments.reduce((sum, p) => {
        const amount = p.montant || 0;
        return sum + (amount * (1 - PLATFORM_FEE));
      }, 0);

      // Fetch previous period for growth
      const prevStartDate = subMonths(startDate, 1);
      const prevEndDate = subMonths(endDate, 1);
      
      const { data: prevPaiements } = await supabase
        .from('paiements')
        .select('montant')
        .eq('photographe_id', photographeProfile.id)
        .eq('statut', 'complete')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      const prevTotal = (prevPaiements || []).reduce((sum, p) => sum + (p.montant || 0) * (1 - PLATFORM_FEE), 0);
      const growth = prevTotal > 0 ? ((totalRevenu - prevTotal) / prevTotal * 100) : 0;

      setStats({
        totalRevenu: Math.round(totalRevenu * 100) / 100,
        pendingPayout: Math.round(pendingTotal * 100) / 100,
        completedPayouts: successfulPayments.length,
        transactionsCount: (paiements || []).length,
        averageTransaction: successfulPayments.length > 0 
          ? Math.round((totalRevenu / successfulPayments.length) * 100) / 100 
          : 0,
        growth: Math.round(growth * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching revenus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupStripe = async () => {
    try {
      const res = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photographeId: photographeProfile.id })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error setting up Stripe:', error);
    }
  };

  const periods = [
    { key: 'month', label: 'Ce mois' },
    { key: 'year', label: 'Cette année' },
    { key: 'all', label: 'Tout' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes revenus</h1>
            <p className="text-gray-600 mt-1">
              Suivez vos gains et paiements
            </p>
          </div>
        </div>

        {/* Stripe Account Status */}
        {(!stripeAccount?.stripe_account_id || stripeAccount?.stripe_account_status !== 'active') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">
                  Configurez votre compte bancaire
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Pour recevoir vos paiements, vous devez configurer votre compte Stripe Connect.
                </p>
                <button
                  onClick={handleSetupStripe}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition-all inline-flex items-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Configurer maintenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {periods.map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {selectedPeriod === 'month' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ←
              </button>
              <span className="font-medium capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="p-1 hover:bg-gray-100 rounded"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Revenus nets</span>
              <Euro className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRevenu}€</p>
            {stats.growth !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                stats.growth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.growth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{stats.growth > 0 ? '+' : ''}{stats.growth}%</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">En attente</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingPayout}€</p>
            <p className="text-sm text-gray-500 mt-2">Paiements en cours</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Transactions</span>
              <Check className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedPayouts}</p>
            <p className="text-sm text-gray-500 mt-2">Paiements reçus</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Panier moyen</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.averageTransaction}€</p>
            <p className="text-sm text-gray-500 mt-2">Par prestation</p>
          </div>
        </div>

        {/* Platform Fee Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Note :</strong> Les montants affichés sont nets après déduction de la commission plateforme de {PLATFORM_FEE * 100}%.
          </p>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Historique des transactions</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Euro className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune transaction sur cette période</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map(transaction => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TransactionRow({ transaction }) {
  const statusConfig = {
    'complete': { label: 'Payé', color: 'bg-green-100 text-green-700' },
    'succeeded': { label: 'Payé', color: 'bg-green-100 text-green-700' },
    'pending': { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    'en_attente': { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    'failed': { label: 'Échoué', color: 'bg-red-100 text-red-700' },
    'refunded': { label: 'Remboursé', color: 'bg-gray-100 text-gray-600' },
  };

  const status = statusConfig[transaction.statut] || statusConfig['pending'];
  const netAmount = Math.round((transaction.montant || 0) * (1 - PLATFORM_FEE) * 100) / 100;

  return (
    <div className="p-4 hover:bg-gray-50 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Euro className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {transaction.reservation?.client?.prenom} {transaction.reservation?.client?.nom}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {transaction.reservation?.date_prestation && (
                <span>
                  Prestation du {format(parseISO(transaction.reservation.date_prestation), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            <div>
              <p className="font-bold text-gray-900">{netAmount}€</p>
              <p className="text-xs text-gray-400">
                {transaction.montant}€ - {PLATFORM_FEE * 100}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
