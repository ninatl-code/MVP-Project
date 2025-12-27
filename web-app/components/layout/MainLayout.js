import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Search, Calendar, MessageCircle, User, Menu, X,
  Camera, FileText, Euro, Settings, LogOut, Bell, Star,
  LayoutDashboard, Package, BarChart3, Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MainLayout({ children }) {
  const router = useRouter();
  const { user, activeRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isPhotographe = activeRole === 'photographe' || activeRole === 'prestataire';
  const isClient = activeRole === 'particulier' || activeRole === 'client';

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCounts();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchUnreadCounts = async () => {
    try {
      // Unread messages
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      setUnreadMessages(msgCount || 0);

      // Unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadNotifications(notifCount || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('layout-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadNotifications(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const photographeNavItems = [
    { href: '/photographe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/photographe/demandes', label: 'Demandes', icon: FileText },
    { href: '/photographe/reservations', label: 'Réservations', icon: Calendar },
    { href: '/photographe/devis', label: 'Devis', icon: Euro },
    { href: '/photographe/packages', label: 'Packages', icon: Package },
    { href: '/photographe/agenda', label: 'Agenda', icon: Calendar },
    { href: '/photographe/revenus', label: 'Revenus', icon: Wallet },
    { href: '/photographe/statistiques', label: 'Statistiques', icon: BarChart3 },
  ];

  const clientNavItems = [
    { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/demandes', label: 'Mes demandes', icon: FileText },
    { href: '/client/reservations', label: 'Réservations', icon: Calendar },
    { href: '/client/devis', label: 'Devis reçus', icon: Euro },
    { href: '/recherche', label: 'Rechercher', icon: Search },
  ];

  const commonNavItems = [
    { href: '/shared/messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages },
    { href: '/shared/avis', label: 'Avis', icon: Star },
  ];

  const navItems = isPhotographe ? photographeNavItems : clientNavItems;

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <Camera className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Shooty</span>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {isPhotographe ? 'Photographe' : 'Client'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase">
                Général
              </p>
              {commonNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="px-3 py-4 border-t space-y-1">
            <Link
              href="/shared/profil/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
              Paramètres
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="w-7 h-7 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">Shooty</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/shared/messages" className="relative p-2">
              <MessageCircle className="w-6 h-6 text-gray-600" />
              {unreadMessages > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold text-gray-900">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t">
                {commonNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </span>
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className="pt-4 mt-4 border-t">
                <Link
                  href="/shared/profil/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="w-5 h-5" />
                  Paramètres
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Déconnexion
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex justify-around py-2">
          {(isPhotographe ? [
            { href: '/photographe/dashboard', icon: Home, label: 'Accueil' },
            { href: '/photographe/demandes', icon: FileText, label: 'Demandes' },
            { href: '/photographe/reservations', icon: Calendar, label: 'Réservations' },
            { href: '/photographe/agenda', icon: Calendar, label: 'Agenda' },
            { href: '/shared/profil/settings', icon: User, label: 'Profil' },
          ] : [
            { href: '/client/dashboard', icon: Home, label: 'Accueil' },
            { href: '/client/demandes', icon: FileText, label: 'Demandes' },
            { href: '/recherche', icon: Search, label: 'Rechercher' },
            { href: '/client/reservations', icon: Calendar, label: 'Réservations' },
            { href: '/shared/profil/settings', icon: User, label: 'Profil' },
          ]).map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 ${
                  isActive ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
