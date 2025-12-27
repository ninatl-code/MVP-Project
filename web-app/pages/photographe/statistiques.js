import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  BarChart3, TrendingUp, Eye, FileText, Calendar, Star,
  Users, Euro, Clock, ArrowUp, ArrowDown, Percent
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, subMonths, 
  eachDayOfInterval, parseISO 
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StatistiquesPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState({
    profileViews: 0,
    devisSent: 0,
    devisAccepted: 0,
    conversionRate: 0,
    reservationsCompleted: 0,
    totalRevenue: 0,
    avgRating: 0,
    reviewsCount: 0,
    newClients: 0,
    responseTime: 0
  });
  const [chartData, setChartData] = useState([]);
  const [comparison, setComparison] = useState({});

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchStats();
    }
  }, [photographeProfile, period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate, endDate, prevStartDate, prevEndDate;

      if (period === 'month') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        prevStartDate = startOfMonth(subMonths(now, 1));
        prevEndDate = endOfMonth(subMonths(now, 1));
      } else if (period === 'quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart;
        endDate = now;
        prevStartDate = subMonths(quarterStart, 3);
        prevEndDate = subMonths(now, 3);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }

      // Fetch profile views
      const { count: viewsCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch previous period views
      const { count: prevViewsCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      // Fetch devis
      const { data: devisData } = await supabase
        .from('devis')
        .select('id, statut, created_at')
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const devisList = devisData || [];
      const devisAccepted = devisList.filter(d => d.statut === 'accepte').length;

      // Previous devis
      const { data: prevDevisData } = await supabase
        .from('devis')
        .select('id, statut')
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      // Fetch reservations
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select('id, statut, montant_total, created_at')
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const reservations = reservationsData || [];
      const completedReservations = reservations.filter(r => r.statut === 'termine');
      const totalRevenue = completedReservations.reduce((sum, r) => sum + (r.montant_total || 0), 0);

      // Previous reservations
      const { data: prevReservationsData } = await supabase
        .from('reservations')
        .select('montant_total, statut')
        .eq('photographe_id', photographeProfile.id)
        .eq('statut', 'termine')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      const prevRevenue = (prevReservationsData || []).reduce((sum, r) => sum + (r.montant_total || 0), 0);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('avis')
        .select('note, created_at')
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const reviews = reviewsData || [];
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.note, 0) / reviews.length 
        : 0;

      // Calculate chart data (daily views for the period)
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const { data: dailyViews } = await supabase
        .from('profile_views')
        .select('created_at')
        .eq('photographe_id', photographeProfile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const viewsByDay = {};
      (dailyViews || []).forEach(v => {
        const day = format(parseISO(v.created_at), 'yyyy-MM-dd');
        viewsByDay[day] = (viewsByDay[day] || 0) + 1;
      });

      const chartDataArray = days.map(day => ({
        date: format(day, 'dd/MM'),
        views: viewsByDay[format(day, 'yyyy-MM-dd')] || 0
      }));

      setChartData(chartDataArray);

      // Set stats
      setStats({
        profileViews: viewsCount || 0,
        devisSent: devisList.length,
        devisAccepted: devisAccepted,
        conversionRate: devisList.length > 0 ? Math.round((devisAccepted / devisList.length) * 100) : 0,
        reservationsCompleted: completedReservations.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewsCount: reviews.length,
        newClients: reservations.length,
        responseTime: 2.5 // Mock - would need message timestamps
      });

      // Set comparison
      setComparison({
        views: prevViewsCount > 0 ? Math.round(((viewsCount - prevViewsCount) / prevViewsCount) * 100) : 0,
        revenue: prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0,
        devis: (prevDevisData || []).length > 0 
          ? Math.round(((devisList.length - prevDevisData.length) / prevDevisData.length) * 100) 
          : 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { key: 'month', label: 'Ce mois' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Année' },
  ];

  const StatCard = ({ icon: Icon, label, value, suffix = '', comparison: comp, color = 'indigo' }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={`w-5 h-5 text-${color}-500`} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}{suffix}</p>
      {comp !== undefined && comp !== 0 && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${
          comp > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {comp > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          <span>{comp > 0 ? '+' : ''}{comp}% vs période précédente</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
            <p className="text-gray-600 mt-1">
              Analysez vos performances
            </p>
          </div>
          
          <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                icon={Eye} 
                label="Vues du profil" 
                value={stats.profileViews}
                comparison={comparison.views}
                color="blue"
              />
              <StatCard 
                icon={FileText} 
                label="Devis envoyés" 
                value={stats.devisSent}
                comparison={comparison.devis}
                color="purple"
              />
              <StatCard 
                icon={Percent} 
                label="Taux de conversion" 
                value={stats.conversionRate}
                suffix="%"
                color="green"
              />
              <StatCard 
                icon={Euro} 
                label="Chiffre d'affaires" 
                value={stats.totalRevenue}
                suffix="€"
                comparison={comparison.revenue}
                color="emerald"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Note moyenne</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.avgRating > 0 ? stats.avgRating : '—'}/5
                    </p>
                    <p className="text-xs text-gray-400">{stats.reviewsCount} avis</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prestations terminées</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.reservationsCompleted}</p>
                    <p className="text-xs text-gray-400">sur la période</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nouveaux clients</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.newClients}</p>
                    <p className="text-xs text-gray-400">sur la période</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-6">Activité du profil</h3>
              
              {chartData.length > 0 ? (
                <div className="h-48">
                  <div className="flex items-end justify-between h-full gap-1">
                    {chartData.map((day, index) => {
                      const maxViews = Math.max(...chartData.map(d => d.views), 1);
                      const height = (day.views / maxViews) * 100;
                      return (
                        <div 
                          key={index}
                          className="flex-1 flex flex-col items-center justify-end"
                        >
                          <div 
                            className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.date}: ${day.views} vues`}
                          ></div>
                          {index % 5 === 0 && (
                            <span className="text-xs text-gray-400 mt-2">{day.date}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-400">Pas assez de données</p>
                </div>
              )}
            </div>

            {/* Performance Summary */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4">Résumé des performances</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-indigo-100 text-sm">Devis acceptés</p>
                  <p className="text-3xl font-bold">{stats.devisAccepted}/{stats.devisSent}</p>
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Revenu moyen par prestation</p>
                  <p className="text-3xl font-bold">
                    {stats.reservationsCompleted > 0 
                      ? Math.round(stats.totalRevenue / stats.reservationsCompleted)
                      : 0}€
                  </p>
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Vues → Contact</p>
                  <p className="text-3xl font-bold">
                    {stats.profileViews > 0 
                      ? Math.round((stats.devisSent / stats.profileViews) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
