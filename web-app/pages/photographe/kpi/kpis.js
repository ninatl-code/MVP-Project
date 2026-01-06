import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/router';
import HeaderPresta from '../../../components/HeaderPresta';
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
    totalAnnonces: 0,
    totalCommandes: 0,
    totalReservations: 0,
    chiffreAffaires: 0,
    noteMoyenne: 0,
    totalAvis: 0,
    totalVues: 0,
    topPerformances: {},
    bottomPerformances: {},
    detailsAnnonces: []
  });

  const [filterTitre, setFilterTitre] = useState('');
  const [filteredAnnonces, setFilteredAnnonces] = useState([]);

  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoadKPIs();
  }, []);

  const checkAuthAndLoadKPIs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'prestataire') {
        router.replace('/login');
        return;
      }

      await loadKPIs(user.id);
    } catch (error) {
      console.error('Erreur auth:', error);
      router.replace('/login');
    }
  };

  const loadKPIs = async (prestataireId) => {
    setLoading(true);
    try {
      // 1. Récupérer TOUTES les données nécessaires en UNE seule requête optimisée
      const [
        { data: annonces },
        { data: commandes },
        { data: reservations }
      ] = await Promise.all([
        supabase
          .from('annonces')
          .select('id, titre, tarif_unit, rate, comment, vues')
          .eq('prestataire', prestataireId),
        supabase
          .from('commandes')
          .select('id, annonce_id, montant, status')
          .eq('prestataire_id', prestataireId),
        supabase
          .from('reservations')
          .select('id, annonce_id, montant, status')
          .eq('prestataire_id', prestataireId)
      ]);

      const totalAnnonces = annonces?.length || 0;
      const totalVues = annonces?.reduce((sum, annonce) => sum + (annonce.vues || 0), 0) || 0;
      const totalCommandes = commandes?.length || 0;
      const totalReservations = reservations?.length || 0;

      // 2. Calculer le chiffre d'affaires (filtrer par statut payé)
      const commandesPayees = commandes?.filter(c => 
        c.status === 'completed' || c.status === 'delivered'
      ) || [];
      
      const reservationsPayees = reservations?.filter(r => 
        r.status === 'paid' || r.status === 'confirmed'
      ) || [];

      const caCommandes = commandesPayees.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
      const caReservations = reservationsPayees.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
      const chiffreAffaires = caCommandes + caReservations;

      // 3. Notes et avis
      const annonceAvecAvis = annonces?.filter(a => a.comment && a.comment.trim()) || [];
      const totalAvis = annonceAvecAvis.length;
      const noteMoyenne = totalAvis > 0 ? 
        annonceAvecAvis.reduce((sum, a) => sum + (a.rate || 0), 0) / totalAvis : 0;

      // 4. Analyser les performances par annonce (sans requête supplémentaire)
      const performanceResults = analyzeAnnoncesPerformances(
        annonces, 
        commandes, 
        reservations, 
        chiffreAffaires
      );

      setKpis({
        totalAnnonces,
        totalCommandes,
        totalReservations,
        chiffreAffaires,
        noteMoyenne: Math.round(noteMoyenne * 10) / 10,
        totalAvis,
        totalVues,
        topPerformances: performanceResults.topPerformances,
        bottomPerformances: performanceResults.bottomPerformances,
        detailsAnnonces: performanceResults.detailsAnnonces
      });

      setFilteredAnnonces(performanceResults.detailsAnnonces);

      console.log('✅ KPIs chargés:', {
        totalAnnonces,
        totalCommandes,
        totalReservations,
        chiffreAffaires
      });

    } catch (error) {
      console.error('Erreur chargement KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const analyzeAnnoncesPerformances = (annonces, commandes, reservations, chiffreAffairesTotal) => {
    if (!annonces || annonces.length === 0) {
      return {
        topPerformances: {},
        bottomPerformances: {},
        detailsAnnonces: []
      };
    }

    // Créer des maps pour un accès rapide
    const commandesParAnnonce = {};
    const reservationsParAnnonce = {};
    
    commandes?.forEach(c => {
      if (!commandesParAnnonce[c.annonce_id]) commandesParAnnonce[c.annonce_id] = [];
      commandesParAnnonce[c.annonce_id].push(c);
    });
    
    reservations?.forEach(r => {
      if (!reservationsParAnnonce[r.annonce_id]) reservationsParAnnonce[r.annonce_id] = [];
      reservationsParAnnonce[r.annonce_id].push(r);
    });

    // Analyser chaque annonce
    const detailsAnnonces = annonces.map(annonce => {
      const annonceCommandes = commandesParAnnonce[annonce.id] || [];
      const annonceReservations = reservationsParAnnonce[annonce.id] || [];
      
      const nbCommandes = annonceCommandes.length;
      const nbReservations = annonceReservations.length;
      const totalVentes = nbCommandes + nbReservations;

      // Calculer le CA pour cette annonce
      const caCommandes = annonceCommandes
        .filter(c => c.status === 'completed' || c.status === 'delivered')
        .reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
      
      const caReservations = annonceReservations
        .filter(r => r.status === 'paid' || r.status === 'confirmed')
        .reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);

      const caTotal = caCommandes + caReservations;
      const pourcentageCA = chiffreAffairesTotal > 0 ? (caTotal / chiffreAffairesTotal * 100) : 0;

      return {
        id: annonce.id,
        titre: annonce.titre,
        prestation: 'Prestation', // Simplifié sans requête supplémentaire
        vues: annonce.vues || 0,
        nbCommandes,
        nbReservations,
        totalVentes,
        caTotal,
        pourcentageCA: Math.round(pourcentageCA * 100) / 100,
        note: annonce.rate || 0,
        hasComment: annonce.comment && annonce.comment.trim().length > 0
      };
    });

    // Trouver les meilleures et pires performances
    const annoncesPourStats = detailsAnnonces.filter(a => a.titre);
    
    if (annoncesPourStats.length === 0) {
      return {
        topPerformances: {},
        bottomPerformances: {},
        detailsAnnonces
      };
    }

    const topPerformances = {
      plusVue: annoncesPourStats.reduce((max, a) => a.vues > max.vues ? a : max),
      plusVendue: annoncesPourStats.filter(a => a.totalVentes > 0).reduce((max, a) => a.totalVentes > max.totalVentes ? a : max, { totalVentes: 0 }),
      plusReservee: annoncesPourStats.filter(a => a.nbReservations > 0).reduce((max, a) => a.nbReservations > max.nbReservations ? a : max, { nbReservations: 0 }),
      mieuxNotee: annoncesPourStats.reduce((max, a) => a.note > max.note ? a : max)
    };

    const bottomPerformances = {
      moinsVue: annoncesPourStats.reduce((min, a) => a.vues < min.vues ? a : min),
      moinsVendue: annoncesPourStats.filter(a => a.totalVentes >= 0).reduce((min, a) => a.totalVentes < min.totalVentes ? a : min, annoncesPourStats[0] || {}),
      moinsReservee: annoncesPourStats.filter(a => a.nbReservations >= 0).reduce((min, a) => a.nbReservations < min.nbReservations ? a : min, annoncesPourStats[0] || {}),
      moinsNotee: annoncesPourStats.reduce((min, a) => a.note < min.note ? a : min)
    };

    return {
      topPerformances,
      bottomPerformances,
      detailsAnnonces
    };
  };

  // Fonction de filtrage
  const handleFilterChange = (value) => {
    setFilterTitre(value);
    if (!value.trim()) {
      setFilteredAnnonces(kpis.detailsAnnonces);
    } else {
      const filtered = kpis.detailsAnnonces.filter(annonce =>
        annonce.titre.toLowerCase().includes(value.toLowerCase()) ||
        annonce.prestation.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAnnonces(filtered);
    }
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
            <p className="text-gray-600 mt-2">
              Suivez les performances de vos annonces
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Chargement de vos statistiques...</p>
              <p className="text-gray-400 text-sm mt-2">Cette opération peut prendre quelques secondes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Chiffre d'affaires */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(kpis.chiffreAffaires)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>

              {/* Commandes */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commandes</p>
                    <p className="text-2xl font-bold text-blue-600">{kpis.totalCommandes}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Réservations */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Réservations</p>
                    <p className="text-2xl font-bold text-purple-600">{kpis.totalReservations}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              {/* Annonces */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Annonces actives</p>
                    <p className="text-2xl font-bold text-gray-900">{kpis.totalAnnonces}</p>
                  </div>
                  <Target className="w-8 h-8 text-gray-600" />
                </div>
              </div>

              {/* Note moyenne */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {kpis.noteMoyenne}/5 ⭐
                    </p>
                    <p className="text-xs text-gray-500">{kpis.totalAvis} avis</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
              </div>

              {/* Vues totales */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vues annonces</p>
                    <p className="text-2xl font-bold text-indigo-600">{kpis.totalVues}</p>
                    <p className="text-xs text-gray-500">Consultations totales</p>
                  </div>
                  <Users className="w-8 h-8 text-indigo-600" />
                </div>
              </div>

            </div>
          )}

          {!loading && kpis.detailsAnnonces.length > 0 && (
            <>
              {/* Section Top Performances */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  Meilleures performances
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Plus vue</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.topPerformances.plusVue?.titre}>
                      {kpis.topPerformances.plusVue?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-green-600">{kpis.topPerformances.plusVue?.vues || 0} vues</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Plus vendue</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.topPerformances.plusVendue?.titre}>
                      {kpis.topPerformances.plusVendue?.totalVentes > 0 ? kpis.topPerformances.plusVendue.titre : 'Aucune vente'}
                    </p>
                    <p className="text-sm text-blue-600">{kpis.topPerformances.plusVendue?.totalVentes || 0} ventes</p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Plus réservée</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.topPerformances.plusReservee?.titre}>
                      {kpis.topPerformances.plusReservee?.nbReservations > 0 ? kpis.topPerformances.plusReservee.titre : 'Aucune réservation'}
                    </p>
                    <p className="text-sm text-purple-600">{kpis.topPerformances.plusReservee?.nbReservations || 0} réservations</p>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Mieux notée</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.topPerformances.mieuxNotee?.titre}>
                      {kpis.topPerformances.mieuxNotee?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-yellow-600">{kpis.topPerformances.mieuxNotee?.note || 0}/5 ⭐</p>
                  </div>

                </div>
              </div>

              {/* Section Bottom Performances */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                  À améliorer
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  
                  <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Moins vue</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.bottomPerformances.moinsVue?.titre}>
                      {kpis.bottomPerformances.moinsVue?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-red-600">{kpis.bottomPerformances.moinsVue?.vues || 0} vues</p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Moins vendue</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.bottomPerformances.moinsVendue?.titre}>
                      {kpis.bottomPerformances.moinsVendue?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-orange-600">{kpis.bottomPerformances.moinsVendue?.totalVentes || 0} ventes</p>
                  </div>

                  <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                      <span className="text-sm font-medium text-pink-800">Moins réservée</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.bottomPerformances.moinsReservee?.titre}>
                      {kpis.bottomPerformances.moinsReservee?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-pink-600">{kpis.bottomPerformances.moinsReservee?.nbReservations || 0} réservations</p>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800">Moins notée</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate" title={kpis.bottomPerformances.moinsNotee?.titre}>
                      {kpis.bottomPerformances.moinsNotee?.titre || 'Aucune'}
                    </p>
                    <p className="text-sm text-gray-600">{kpis.bottomPerformances.moinsNotee?.note || 0}/5 ⭐</p>
                  </div>

                </div>
              </div>

              {/* Section Détails et Filtrage */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Search className="w-6 h-6 text-blue-600" />
                  Analyse détaillée
                </h2>

                {/* Barre de recherche */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre d'annonce ou prestation..."
                      value={filterTitre}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Tableau des résultats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annonce</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vues</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ventes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% CA</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CA Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAnnonces.map((annonce, index) => (
                          <tr key={annonce.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={annonce.titre}>
                                  {annonce.titre}
                                </div>
                                <div className="text-sm text-gray-500">{annonce.prestation}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {annonce.vues} vues
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {annonce.nbCommandes > 0 && <span className="text-blue-600">{annonce.nbCommandes} commandes</span>}
                                {annonce.nbCommandes > 0 && annonce.nbReservations > 0 && <span className="text-gray-400"> • </span>}
                                {annonce.nbReservations > 0 && <span className="text-purple-600">{annonce.nbReservations} réservations</span>}
                                {annonce.totalVentes === 0 && <span className="text-gray-400">Aucune vente</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(2, annonce.pourcentageCA))}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900">{annonce.pourcentageCA}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="text-sm text-gray-900">{annonce.note}/5</span>
                                {annonce.hasComment && <span className="ml-2 text-xs text-green-600">✓ Avis</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(annonce.caTotal)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredAnnonces.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {filterTitre ? 'Aucune annonce trouvée pour cette recherche' : 'Aucune annonce à afficher'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}