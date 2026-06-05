import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Bell, LogOut, MessageCircle, Menu, Calendar, Star, AlertTriangle, BarChart3, RefreshCcw, User } from "lucide-react";

// Palette Shooty
const COLORS = {
  primary: '#E8EAF6',     
  secondary: '#5C6BC0',    
  accent: '#130183',      
  background: '#F8F9FB',  
  text: '#1C1C1E',        // Noir - Utilisé pour les titres Devis, Réservations, Mes annonces, Planning
};

function IconButton({ children, onClick, className = "", tooltip }) {
  return (
    <div className="relative inline-flex group">
      <button
        className={`cursor-pointer w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-yellow-400 text-white hover:text-slate-900 transition-colors shadow ${className}`}
        style={{backgroundColor: COLORS.accent}}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.primary}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.accent}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
      {tooltip && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {tooltip}
        </span>
      )}
    </div>
  );
}
export default function Header() {
  const [nbUnread, setNbUnread] = useState(0);
  const router = useRouter();
  
  const { user, profileId, availableProfiles, switchProfile, loading: authLoading } = useAuth();
  const hasMultipleProfiles = availableProfiles?.length > 1;
  // Profile data already loaded by AuthContext — no extra DB call needed
  const profile = availableProfiles?.find(p => p.id === profileId) || availableProfiles?.[0];

  // Redirect if not authenticated (once auth is resolved)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Fetch unread messages count using profileId (= prestataire_id)
  useEffect(() => {
    if (!profileId) return;

    const refreshUnread = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("unread_count_prestataire")
        .eq("prestataire_id", profileId);
      const total = (convs || []).reduce((sum, c) => sum + (c.unread_count_prestataire || 0), 0);
      setNbUnread(total);
    };
    refreshUnread();

    const channel = supabase
      .channel(`header-presta-unread-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `prestataire_id=eq.${profileId}` }, refreshUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const handleSwitchToClient = async () => {
    const clientProfile = availableProfiles?.find(p => p.role === 'particulier');
    if (clientProfile) {
      await switchProfile(clientProfile.id);
      router.push('/client/menu');
    }
  };

  const handleLogout = async () => {
    router.replace("/login");
    supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo & Titre */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/photographe/menu")}>
          <img src="/ServiDaba-logo.png" alt="ServiDaba" width={120} height={40} style={{ objectFit: 'contain' }} />
          <span className="ml-4 text-base hidden sm:block" style={{color: 'var(--foreground)', opacity: 0.6}}>Espace artiste</span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Bouton Switch vers Client */}
          {hasMultipleProfiles && (
            <button
              onClick={handleSwitchToClient}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: COLORS.secondary + '20',
                color: COLORS.accent,
                border: `1px solid ${COLORS.secondary}40`
              }}
              onMouseEnter={e => {
                e.target.style.backgroundColor = COLORS.accent;
                e.target.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.target.style.backgroundColor = COLORS.secondary + '20';
                e.target.style.color = COLORS.accent;
              }}
              title="Passer en mode Client"
            >
              <RefreshCcw className="w-4 h-4" />
              <span className="hidden md:inline">Mode Client</span>
            </button>
          )}
          <IconButton onClick={() => router.push("/photographe/menu")}
            className="text-white"
            style={{backgroundColor: COLORS.primary}}
            onMouseEnter={e => e.target.style.backgroundColor = COLORS.accent}
            onMouseLeave={e => e.target.style.backgroundColor = COLORS.primary}
            tooltip="Menu">
            <Menu className="w-5 h-5" />
          </IconButton>
          <IconButton onClick={() => router.push("/photographe/kpi/kpis")}
            className="text-white"
            style={{backgroundColor: COLORS.primary}}
            onMouseEnter={e => e.target.style.backgroundColor = COLORS.accent}
            onMouseLeave={e => e.target.style.backgroundColor = COLORS.primary}
            tooltip="Statistiques">
            <BarChart3 className="w-5 h-5" />
          </IconButton>
          <NotificationsPopup router={router} userId={user?.id} />
          <div className="relative">
            <IconButton onClick={() => router.push("/shared/messages")}
              className="bg-slate-700 hover:bg-slate-800 text-white"
              tooltip="Messages">
              <MessageCircle className="w-5 h-5" />
            </IconButton>
            {nbUnread > 0 && (
              <span className="cursor-pointer absolute -top-1 -right-1 bg-red-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {nbUnread}
              </span>
            )}
          </div>
          <IconButton onClick={handleLogout} className="bg-slate-700 hover:bg-slate-800 text-white" tooltip="Déconnexion">
            <LogOut className="w-5 h-5" />
          </IconButton>
          <div className="relative inline-flex group ml-2">
            <button
              className="cursor-pointer w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white border-2 border-blue-700 overflow-hidden hover:border-slate-800 transition-colors"
              onClick={() => router.push("/photographe/profil")}
              type="button"
            >
              {(profile?.photos || profile?.avatar_url) ? (
                <img
                  src={profile.photos || profile.avatar_url}
                  alt={profile?.nom}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                profile?.nom ? (
                  <span>{profile.nom[0].toUpperCase()}</span>
                ) : (
                  <User className="w-5 h-5" />
                )
              )}
            </button>
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Mon profil
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationsPopup({ router, userId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifications();
  }, [userId]);

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('user_id', userId)
      .eq('lu', false);
    // Refresh notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data);
  };

  // Icône selon type
  const getIcon = (type) => {
    switch (type) {
      case 'reservation': return <Calendar className="w-5 h-5 text-green-500" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'review': return <Star className="w-5 h-5 text-yellow-500" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="relative inline-flex group">
      <button
        style={{backgroundColor: COLORS.accent}}
        onMouseEnter={e => e.target.style.backgroundColor = COLORS.primary}
        onMouseLeave={e => e.target.style.backgroundColor = COLORS.accent}
        onClick={async () => {
          setOpen(!open);
          if (!open) await markAllAsRead();
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-yellow-400 text-white hover:text-slate-900 transition-colors shadow"
      >
        <Bell className="w-5 h-5" />
        {notifications.filter((n) => !n.lu).length > 0 && (
          <span className="cursor-pointer absolute -top-1 -right-1 bg-red-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {notifications.filter((n) => !n.lu).length}
          </span>
        )}
      </button>
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        Notifications
      </span>
      {open && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-lg text-slate-800">Notifications</h2>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="text-center text-slate-400 py-8">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Aucune notification</div>
            ) : (
              notifications.slice(0,3).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 border-b border-slate-50 ${notif.lu ? "bg-white" : "bg-pink-50"} hover:bg-slate-100 cursor-pointer transition`}
                >
                  <div>{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}</p>
                    <p className="text-sm text-slate-600">{notif.contenu}</p>
                    <span className="text-xs text-slate-400">{new Date(notif.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 text-center">
            <button
              className="text-black-600 font-semibold hover:underline"
              onClick={() => { setOpen(false); router.push("/photographe/notification"); }}
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
