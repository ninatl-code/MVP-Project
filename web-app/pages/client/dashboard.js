import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderParti';
import { 
  Search, FileText, Calendar, MessageSquare, Star, Bell,
  User, Settings, CreditCard, HelpCircle, ChevronRight,
  Camera, Clock, CheckCircle, TrendingUp, Plus
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

export default function ClientDashboard() {
  const router = useRouter();
  const { user, profile, profileId, logout } = useAuth();
  const [stats, setStats] = useState({
    activeRequests: 0,
    pendingDevis: 0,
    upcomingReservations: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      fetchDashboardData();
    }
  }, [profileId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats in parallel
      const [
        { count: activeRequests },
        { count: pendingDevis },
        { count: upcomingReservations },
        { count: unreadMessages },
        { count: unreadNotifications },
      ] = await Promise.all([
        supabase
          .from('demandes_client')
          .select('*', { count: 'exact', head: true })
          .eq('particulier_id', profileId)
          .eq('status', 'active'),
        supabase
          .from('devis')
          .select('*, demande:demandes_client!inner(particulier_id)', { count: 'exact', head: true })
          .eq('demande.particulier_id', profileId)
          .eq('statut', 'en_attente'),
        supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', profileId)
          .eq('statut', 'confirmee')
          .gte('date_prestation', new Date().toISOString().split('T')[0]),
        supabase
          .from('messages')
          .select('*, conversation:conversations!inner(client_id, photographe_id)', { count: 'exact', head: true })
          .or(`conversation.client_id.eq.${profileId},conversation.photographe_id.eq.${profileId}`)
          .eq('lu', false)
          .neq('expediteur_id', profileId),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId)
          .eq('lu', false),
      ]);

      setStats({
        activeRequests: activeRequests || 0,
        pendingDevis: pendingDevis || 0,
        upcomingReservations: upcomingReservations || 0,
        unreadMessages: unreadMessages || 0,
        unreadNotifications: unreadNotifications || 0,
      });

      // Fetch recent reservations for activity
      const { data: recentReservations } = await supabase
        .from('reservations')
        .select(`
          *,
          photographe:profils_photographe(
            nom_entreprise,
            photo_profil,
            profile:profiles(nom, prenom)
          )
        `)
        .eq('client_id', profileId)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentActivity(recentReservations || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Search,
      label: 'Trouver un photographe',
      description: 'Rechercher par spécialité, lieu...',
      href: '/client/search',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: Plus,
      label: 'Nouvelle demande',
      description: 'Créer une demande de prestation',
      href: '/client/demandes/create',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: FileText,
      label: 'Mes demandes',
      description: `${stats.activeRequests} demande${stats.activeRequests > 1 ? 's' : ''} active${stats.activeRequests > 1 ? 's' : ''}`,
      href: '/client/demandes',
      badge: stats.pendingDevis > 0 ? `${stats.pendingDevis} devis` : null,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Calendar,
      label: 'Mes réservations',
      description: `${stats.upcomingReservations} à venir`,
      href: '/client/reservations',
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  const menuItems = [
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/client/messages',
      badge: stats.unreadMessages > 0 ? stats.unreadMessages : null,
    },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/client/notification',
      badge: stats.unreadNotifications > 0 ? stats.unreadNotifications : null,
    },
    {
      icon: Star,
      label: 'Mes avis',
      href: '/client/avis',
    },
    {
      icon: CreditCard,
      label: 'Paiements',
      href: '/client/paiements',
    },
    {
      icon: User,
      label: 'Mon profil',
      href: '/client/profil',
    },
    {
      icon: Settings,
      label: 'Paramètres',
      href: '/client/settings',
    },
    {
      icon: HelpCircle,
      label: 'Aide & Support',
      href: '/support',
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''} 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Que souhaitez-vous faire aujourd'hui ?
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5" />
                </div>
                {action.badge && (
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                    {action.badge}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {action.label}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Activité récente</h2>
                <button
                  onClick={() => router.push('/client/reservations')}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Voir tout →
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune activité récente</p>
                  <button
                    onClick={() => router.push('/client/search')}
                    className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    Trouver un photographe →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((reservation) => {
                    const photographe = reservation.photographe;
                    const profile = photographe?.profile;
                    return (
                      <div
                        key={reservation.id}
                        onClick={() => router.push(`/client/reservations/${reservation.id}`)}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                          {photographe?.photo_profil ? (
                            <img
                              src={photographe.photo_profil}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-6 h-6 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {reservation.titre || 'Prestation photo'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {photographe?.nom_entreprise || `${profile?.prenom} ${profile?.nom}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(reservation.date_prestation)}
                          </p>
                          <StatusBadge status={reservation.statut} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Menu */}
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
                  <item.icon className="w-5 h-5 text-gray-500" />
                  <span className="flex-1 text-left font-medium text-gray-700">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="w-full px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-all"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    confirmee: { label: 'Confirmée', color: 'bg-green-100 text-green-700' },
    terminee: { label: 'Terminée', color: 'bg-blue-100 text-blue-700' },
    annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
    en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-700' },
  };
  const config = configs[status] || configs.en_attente;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
