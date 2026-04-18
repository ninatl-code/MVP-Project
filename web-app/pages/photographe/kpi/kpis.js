import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/router';
import HeaderPresta from '../../../components/HeaderPresta';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  ShoppingCart, 
  Calendar, 
  Star, 
  DollarSign,
  Users,
  Target,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  Award,
  AlertCircle
} from 'lucide-react';

export default function KPIs() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalDevis: 0,
    totalReservations: 0,
    chiffreAffaires: 0,
    devisAcceptes: 0,
    devisEnAttente: 0,
    reservationsTerminees: 0,
  });

  const [filterTitre, setFilterTitre] = useState('');
  const [filteredDevis, setFilteredDevis] = useState([]);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadKPIs(user.id);
  }, [user, authLoading]);

  const loadKPIs = async (userId) => {
    setLoading(true);
    try {
      const [
        { data: devis, error: devisErr },
        { data: reservations, error: resErr },
      ] = await Promise.all([
        supabase
          .from('devis')
          .select('id, statut, montant_total, created_at, demande_id')
          .eq('prestataire_id', userId),
        supabase
          .from('reservations')
          .select('id, statut, montant_total, created_at')
          .eq('prestataire_id', userId),
      ]);

      if (devisErr) console.error('Erreur devis:', devisErr.message);
      if (resErr) console.error('Erreur reservations:', resErr.message);

      const devisList = devis || [];
      const reservationsList = reservations || [];

      const totalDevis = devisList.length;
      const devisAcceptes = devisList.filter(d => d.statut === 'accepte' || d.statut === 'accepté').length;
      const devisEnAttente = devisList.filter(d => d.statut === 'en_attente').length;

      const totalReservations = reservationsList.length;
      const reservationsTerminees = reservationsList.filter(r =>
        r.statut === 'termine' || r.statut === 'terminé' || r.statut === 'completed'
      ).length;

      const caDevis = devisList
        .filter(d => d.statut === 'accepte' || d.statut === 'accepté')
        .reduce((sum, d) => sum + (parseFloat(d.montant_total) || 0), 0);
      const caReservations = reservationsList
        .filter(r => r.statut === 'termine' || r.statut === 'terminé' || r.statut === 'completed' || r.statut === 'confirme' || r.statut === 'confirmé')
        .reduce((sum, r) => sum + (parseFloat(r.montant_total) || 0), 0);
      const chiffreAffaires = caDevis + caReservations;

      setKpis({ totalDevis, totalReservations, chiffreAffaires, devisAcceptes, devisEnAttente, reservationsTerminees });
      setFilteredDevis(devisList);

      console.log('✅ KPIs chargés:', { totalDevis, totalReservations, chiffreAffaires });
    } catch (error) {
      console.error('Erreur chargement KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const handleFilterChange = (value) => {
    setFilterTitre(value);
  };

  return (
    <div>
      <HeaderPresta />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Tableau de bord KPIs
            </h1>
            <p className="text-gray-600 mt-2">Suivez vos devis et réservations</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Chargement de vos statistiques...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(kpis.chiffreAffaires)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Devis envoyés</p>
                    <p className="text-2xl font-bold text-blue-600">{kpis.totalDevis}</p>
                    <p className="text-xs text-gray-500">{kpis.devisAcceptes} acceptés · {kpis.devisEnAttente} en attente</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Réservations</p>
                    <p className="text-2xl font-bold text-purple-600">{kpis.totalReservations}</p>
                    <p className="text-xs text-gray-500">{kpis.reservationsTerminees} terminées</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}