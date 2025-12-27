import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Camera, Calendar, Euro, MessageSquare, Star, Bell,
  User, Settings, FileText, TrendingUp, Package,
  ChevronRight, Clock, CheckCircle, AlertCircle, Plus,
  CreditCard, BarChart3, Eye, Zap
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

export default function PhotographerDashboard() {
  const router = useRouter();
  const { user, profile, profileId, photographeProfile } = useAuth();
  const [stats, setStats] = useState({
    pendingDevis: 0,
    activeReservations: 0,
    completedThisMonth: 0,
    revenueThisMonth: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
    profileViews: 0,
    newDemandes: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recentDemandes, setRecentDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (photographeProfile?.id) {
      fetchDashboardData();
    }
  }, [photographeProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const photographeId = photographeProfile.id;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Fetch stats in parallel
      const [
        { count: pendingDevis },
        { count: activeReservations },
        { data: completedReservations },
        { count: unreadMessages },
        { count: unreadNotifications },
        { count: newDemandes },
      ] = await Promise.all([
        supabase
          .from('devis')
          .select('*', { count: 'exact', head: true })
          .eq('photographe_id', photographeId)
          .eq('statut', 'en_attente'),
        supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('photographe_id', photographeId)
          .in('statut', ['confirmee', 'en_cours']),
        supabase
          .from('reservations')
          .select('montant_total')
          .eq('photographe_id', photographeId)
          .eq('statut', 'terminee')
          .gte('date_prestation', startOfMonth.toISOString()),
        supabase
          .from('messages')
          .select('*, conversation:conversations!inner(participant_1, participant_2)', { count: 'exact', head: true })
          .or(`conversation.participant_1.eq.${profileId},conversation.participant_2.eq.${profileId}`)
          .eq('lu', false)
          .neq('expediteur_id', profileId),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId)
          .eq('lu', false),
        supabase
          .from('demandes_client')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const revenueThisMonth = completedReservations?.reduce((sum, r) => sum + (r.montant_total || 0), 0) || 0;

      setStats({
        pendingDevis: pendingDevis || 0,
        activeReservations: activeReservations || 0,
        completedThisMonth: completedReservations?.length || 0,
        revenueThisMonth,
        unreadMessages: unreadMessages || 0,
        unreadNotifications: unreadNotifications || 0,
        profileViews: photographeProfile?.vues_profil || 0,
        newDemandes: newDemandes || 0,
      });

      // Fetch upcoming bookings
      const { data: bookings } = await supabase
        .from('reservations')
        .select(`
          *,
          client:profiles!reservations_client_id_fkey(nom, prenom, photo_profil)
        `)
        .eq('photographe_id', photographeId)
        .in('statut', ['confirmee', 'en_cours'])
        .gte('date_prestation', new Date().toISOString().split('T')[0])
        .order('date_prestation', { ascending: true })
        .limit(5);

      setUpcomingBookings(bookings || []);

      // Fetch recent matching demandes
      const { data: demandes } = await supabase
        .from('demandes_client')
        .select(`
          *,
          client:profiles!demandes_client_particulier_id_fkey(nom, prenom)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentDemandes(demandes || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      icon: FileText,
      label: 'Devis en attente',
      value: stats.pendingDevis,
      color: 'bg-yellow-100 text-yellow-600',
      href: '/photographe/devis',
    },
    {
      icon: Calendar,
      label: 'Réservations actives',
      value: stats.activeReservations,
      color: 'bg-green-100 text-green-600',
      href: '/photographe/reservations',
    },
    {
      icon: Euro,
      label: 'CA du mois',
      value: `${stats.revenueThisMonth}€`,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/photographe/revenus',
    },
    {
      icon: Eye,
      label: 'Vues profil',
      value: stats.profileViews,
      color: 'bg-purple-100 text-purple-600',
      href: '/photographe/statistiques',
    },
  ];

  const menuItems = [
    {
      icon: Zap,
      label: 'Demandes clients',
      description: `${stats.newDemandes} nouvelles cette semaine`,
      href: '/photographe/demandes',
      badge: stats.newDemandes > 0 ? 'Nouveau' : null,
    },
    {
      icon: FileText,
      label: 'Mes devis',
      description: 'Gérer vos devis',
      href: '/photographe/devis',
      badge: stats.pendingDevis > 0 ? stats.pendingDevis : null,
    },
    {
      icon: Calendar,
      label: 'Mon agenda',
      description: 'Disponibilités et réservations',
      href: '/photographe/agenda',
    },
    {
      icon: Package,
      label: 'Mes forfaits',
      description: 'Gérer vos offres',
      href: '/photographe/packages',
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      description: 'Conversations avec les clients',
      href: '/photographe/messages',
      badge: stats.unreadMessages > 0 ? stats.unreadMessages : null,
    },
    {
      icon: Star,
      label: 'Mes avis',
      description: `${photographeProfile?.note_moyenne?.toFixed(1) || '-'} / 5`,
      href: '/photographe/avis',
    },
    {
      icon: CreditCard,
      label: 'Revenus',
      description: 'Paiements et factures',
      href: '/photographe/revenus',
    },
    {
      icon: BarChart3,
      label: 'Statistiques',
      description: 'Performance et analytics',
      href: '/photographe/statistiques',
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''} 📸
            </h1>
            <p className="text-gray-600 mt-1">
              Voici un aperçu de votre activité
            </p>
          </div>
          <button
            onClick={() => router.push('/photographe/profil')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Mon profil</span>
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Upcoming & Demandes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming bookings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Prochaines réservations</h2>
                <button
                  onClick={() => router.push('/photographe/reservations')}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Voir tout →
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune réservation à venir</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/photographe/reservations/${booking.id}`)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex flex-col items-center justify-center">
                        <span className="text-xs font-medium">
                          {new Date(booking.date_prestation).toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(booking.date_prestation).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {booking.titre || 'Prestation photo'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.client?.prenom} {booking.client?.nom}
                          {booking.heure_debut && ` • ${formatTime(booking.heure_debut)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{booking.montant_total}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent demandes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Demandes récentes</h2>
                <button
                  onClick={() => router.push('/photographe/demandes')}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Voir tout →
                </button>
              </div>

              {recentDemandes.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune nouvelle demande</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDemandes.map((demande) => (
                    <div
                      key={demande.id}
                      onClick={() => router.push(`/photographe/demandes/${demande.id}`)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <span className="text-lg">{getCategoryIcon(demande.categorie)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {demande.titre}
                        </p>
                        <p className="text-sm text-gray-500">
                          {demande.lieu} • Budget: {demande.budget_max}€
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/photographe/demandes/${demande.id}/devis`);
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                      >
                        Proposer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Menu */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all ${
                    index > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>

            {/* Profile completion */}
            {photographeProfile && (
              <ProfileCompletionCard profile={photographeProfile} />
            )}

            {/* Settings & Help */}
            <div className="space-y-2">
              <button
                onClick={() => router.push('/photographe/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Paramètres</span>
              </button>
              <button
                onClick={() => router.push('/support')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Aide & Support</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileCompletionCard({ profile }) {
  const checkItems = [
    { key: 'photo_profil', label: 'Photo de profil' },
    { key: 'description', label: 'Description' },
    { key: 'specialites', label: 'Spécialités', check: (v) => v?.length > 0 },
    { key: 'stripe_account_id', label: 'Compte Stripe' },
  ];

  const completedItems = checkItems.filter(item => {
    const value = profile[item.key];
    return item.check ? item.check(value) : !!value;
  });

  const completionPercent = Math.round((completedItems.length / checkItems.length) * 100);

  if (completionPercent === 100) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
      <h3 className="font-semibold mb-2">Complétez votre profil</h3>
      <p className="text-sm text-indigo-100 mb-4">
        Un profil complet attire plus de clients
      </p>
      
      <div className="w-full bg-white/20 rounded-full h-2 mb-3">
        <div 
          className="bg-white h-2 rounded-full transition-all"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
      <p className="text-sm text-indigo-100">{completionPercent}% complété</p>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    'mariage': '💒', 'portrait': '👤', 'evenement': '🎉', 'corporate': '🏢',
    'produit': '📦', 'immobilier': '🏠', 'famille': '👨‍👩‍👧‍👦', 'grossesse': '🤰',
    'nouveau-ne': '👶', 'animalier': '🐕', 'culinaire': '🍽️',
  };
  return icons[category?.toLowerCase()] || '📷';
}
