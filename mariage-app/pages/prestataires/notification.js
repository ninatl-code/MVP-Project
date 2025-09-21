import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Bell, MessageCircle, Calendar, Star, AlertTriangle } from "lucide-react";
import Header from '../../components/HeaderPresta';

export default function NotificationsPage() {
  const [selected, setSelected] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      let query = supabase
        .from("notification")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("contenu", `%${search}%`);
      }

      const { data, error } = await query;
      if (!error) setNotifications(data || []);
    };
    fetchUserAndNotifications();
  }, [search]);

  // Icône selon type
  const getIcon = (type) => {
    if (type === "reservation")
      return <Calendar className="w-5 h-5 text-green-500" />;
    if (type === "message")
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    if (type === "review")
      return <Star className="w-5 h-5 text-yellow-500" />;
    if (type === "alert")
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    return <Bell className="w-5 h-5 text-gray-400" />;
  };

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from("notification")
      .update({ lu: true })
      .eq("user_id", userId)
      .eq("lu", false);
    // Refresh notifications
    const { data } = await supabase
      .from("notification")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
        <Header/>
        { 
    <div className="flex h-screen bg-gray-50">
      {/* Colonne gauche - Liste */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Mes notifications</h2>
          <button
            className="text-sm text-pink-600 hover:underline"
            onClick={markAllAsRead}
          >
            Tout marquer comme lu
          </button>
        </div>
        <div className="p-3">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-400">Aucune notification.</div>
          )}
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => setSelected(notif)}
              className={`flex gap-3 p-4 cursor-pointer border-b border-gray-100 ${
                notif.lu ? "bg-white" : "bg-pink-50"
              } hover:bg-gray-50 transition`}
            >
              {getIcon(notif.type)}
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  {notif.type === "reservation"
                    ? "Nouvelle réservation"
                    : notif.type === "message"
                    ? "Nouveau message"
                    : notif.type === "review"
                    ? "Nouvel avis"
                    : notif.type === "alert"
                    ? "Alerte"
                    : "Notification"}
                </p>
                <p className="text-sm text-gray-600 truncate">{notif.contenu}</p>
                <span className="text-xs text-gray-400">{formatDate(notif.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne droite - Détail */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {selected
              ? selected.type === "reservation"
                ? "Détail réservation"
                : selected.type === "message"
                ? "Détail message"
                : selected.type === "review"
                ? "Détail avis"
                : selected.type === "alert"
                ? "Détail alerte"
                : "Notification"
              : "Sélectionnez une notification"}
          </h2>
        </div>
        <div className="flex-1 p-8">
          {!selected ? (
            <div className="text-gray-400 text-center mt-24">
              Cliquez sur une notification pour voir le détail.
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                {getIcon(selected.type)}
                <span className="font-semibold text-lg text-gray-800">
                  {selected.type === "reservation"
                    ? "Nouvelle réservation"
                    : selected.type === "message"
                    ? "Nouveau message"
                    : selected.type === "review"
                    ? "Nouvel avis"
                    : selected.type === "alert"
                    ? "Alerte"
                    : "Notification"}
                </span>
              </div>
              <div className="mb-2 text-gray-600">{selected.contenu}</div>
              <div className="text-xs text-gray-400 mb-6">
                {formatDate(selected.created_at)}
              </div>
              {/* Affichage du détail complet si disponible */}
              {selected.fullDetail && (
                <pre className="bg-gray-100 rounded-lg p-4 text-sm whitespace-pre-line">
                  {selected.fullDetail}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
}
</>
  );
}