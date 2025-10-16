import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Bell, LogOut, MessageCircle, Menu, Calendar, Star, AlertTriangle } from "lucide-react";

const GOLD = "#FFD600";

function IconButton({ children, onClick, className = "" }) {
  return (
    <button
      className={`w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-yellow-400 text-white hover:text-slate-900 transition-colors shadow ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function Header() {
  const [profile, setProfile] = useState(null);
  const [nbUnread, setNbUnread] = useState(0); // Ajout du state
  const router = useRouter();

  // Déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);
    
    // Récupère le nombre de conversations non lues
          const { data: unreadConvs, error: unreadError } = await supabase
            .from("conversations")
            .select("id")
            .eq("client_id", user.id)
            .eq("lu", false);
          if (!unreadError && unreadConvs) {
            setNbUnread(unreadConvs.length);
          } else {
            setNbUnread(0);
          }
    };
    checkAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        router.replace("/login");
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo & Titre */}
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold tracking-tight text-slate-700">ArtYzana</span>
          <span className="ml-4 text-base text-slate-400 hidden sm:block">Espace client</span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <IconButton onClick={() => router.push("/particuliers/menu")}
            className="bg-slate-700 hover:bg-slate-800 text-white">
            <Menu className="w-5 h-5" />
          </IconButton>
          <NotificationsPopup router={router} />
          <div className="relative">
            <IconButton onClick={() => router.push("/particuliers/messages")}
                        className="bg-slate-700 hover:bg-slate-800 text-white">
                        <MessageCircle className="w-5 h-5" />
                      </IconButton>
                      {nbUnread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                          {nbUnread}
                        </span>
                      )}
          </div>
          <IconButton onClick={handleLogout} className="bg-slate-700 hover:bg-slate-800 text-white">
            <LogOut className="w-5 h-5" />
          </IconButton>
          <button
            className="ml-2 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white border-2 border-slate-700 overflow-hidden hover:border-slate-800 transition-colors"
            onClick={() => router.push("/particuliers/profil")}
            type="button"
          >
            {profile?.photos ? (
              <img
                src={profile.photos}
                alt={profile.nom}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>{profile?.nom ? profile.nom[0].toUpperCase() : "?"}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// Pop-up notifications
function NotificationsPopup({ router }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      setUserId(authData?.user?.id);
      if (!authData?.user?.id) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchUserAndNotifications();
  }, []);

  // Marquer toutes les notifications comme lues
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
      case 'avis': return <Star className="w-5 h-5 text-purple-500" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={async () => {
          setOpen(!open);
          if (!open) await markAllAsRead();
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-yellow-400 text-white hover:text-slate-900 transition-colors shadow"
      >
        <Bell className="w-5 h-5" />
        {notifications.filter((n) => !n.lu).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {notifications.filter((n) => !n.lu).length}
          </span>
        )}
      </button>
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
                  onClick={() => {
                    if (notif.type === 'avis') {
                      // Pour les notifications d'avis, rediriger vers menu.js avec un paramètre
                      setOpen(false);
                      router.push(`/particuliers/menu?openAvis=${notif.id}`);
                    } else if (notif.type === 'message') {
                      setOpen(false);
                      router.push('/particuliers/messages');
                    } else {
                      setOpen(false);
                      router.push('/particuliers/notification');
                    }
                  }}
                  className={`flex items-start gap-3 p-4 border-b border-slate-50 ${notif.lu ? "bg-white" : "bg-pink-50"} hover:bg-slate-100 cursor-pointer transition ${notif.type === 'avis' ? 'hover:bg-purple-50' : ''}`}
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
              className="text-pink-600 font-semibold hover:underline"
              onClick={() => { setOpen(false); router.push("/particuliers/notification"); }}
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}