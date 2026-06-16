import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import {
  LayoutDashboard, Users, Briefcase, FileText,
  Calendar, Star, LogOut, Menu, X, ShieldCheck, Flag
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { label: 'Dashboard',      href: '/admin',                icon: LayoutDashboard },
  { label: 'Prestataires',   href: '/admin/prestataires',   icon: Briefcase },
  { label: 'Clients',        href: '/admin/clients',        icon: Users },
  { label: 'Demandes',       href: '/admin/demandes',       icon: FileText },
  { label: 'Réservations',   href: '/admin/reservations',   icon: Calendar },
  { label: 'Avis',           href: '/admin/avis',           icon: Star },
  { label: 'Signalements',   href: '/admin/signalements',   icon: Flag },
];

export default function AdminLayout({ children, title }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Bricool</p>
            <p className="text-white/50 text-xs">Administration</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <button
              key={href}
              onClick={() => { router.push(href); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-[#130183] shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 min-h-screen bg-[#130183] fixed top-0 left-0 bottom-0 z-30">
        <Sidebar />
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex flex-col w-60 h-full bg-[#130183]">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
