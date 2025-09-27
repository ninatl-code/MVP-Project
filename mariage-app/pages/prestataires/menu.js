import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import Header from '../../components/HeaderPresta';

import {
  Calendar,
  Images,
  MessageCircle,
  ClipboardList,
  Bell,
  LogOut,
  Search,
} from "lucide-react";

// Palette Wedoria
const GOLD = "#D4AF37";
const SAGE = "#A3B18A";
const ROSE = "#F6DCE8";

// Composant Card simple
function Card({ className = "", children }) {
  return (
    <div className={`bg-white shadow-sm ${className}`} style={{ borderRadius: 16 }}>
      {children}
    </div>
  );
}
function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

// Composant Button simple
function Button({ className = "", children, variant, ...props }) {
  let base =
    "px-4 py-2 font-semibold rounded-xl transition-colors focus:outline-none";
  let color =
    variant === "outline"
      ? "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100"
      : "bg-[#D4AF37] text-white hover:bg-[#c7a13a]";
  return (
    <button className={`${base} ${color} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Notification Popup
function NotificationsPopup({ userId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notification")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error) setNotifications(data || []);
    };
    fetchNotifications();
  }, [userId, open]);

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

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
        style={{ background: "#fff" }}
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {/* Badge */}
        <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {notifications.filter((n) => !n.lu).length}
        </span>
      </button>

      {/* Pop-up notifications */}
      {open && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-lg text-gray-800">
              Notifications
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 border-b border-gray-50 ${
                    notif.lu ? "bg-white" : "bg-pink-50"
                  } hover:bg-gray-50 cursor-pointer transition`}
                >
                  <div>{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{notif.type === "reservation" ? "Réservation" : notif.type === "message" ? "Message" : notif.type === "review" ? "Avis" : notif.type === "alert" ? "Alerte" : "Notification"}</p>
                    <p className="text-sm text-gray-600">{notif.contenu}</p>
                    <span className="text-xs text-gray-400">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 text-center">
            <button
              className="text-pink-600 font-semibold hover:underline"
              onClick={() => {
                setOpen(false);
                router.push("/prestataires/notification");
              }}
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProviderHomeMenu() {
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(null);
  const [nbAccepted, setNbAccepted] = useState(0);
  const [nbPending, setNbPending] = useState(0);
  const [nbUnread, setNbUnread] = useState(0);
  const [nbActivePrestations, setNbActivePrestations] = useState(0);
  const [nbDevisPending, setNbDevisPending] = useState(0);
  const [nbDevisAccepted, setNbDevisAccepted] = useState(0);
  const [nbCommandesPending, setNbCommandesPending] = useState(0);
  const [nbCommandesShipped, setNbCommandesShipped] = useState(0);
  const router = useRouter();

  // Déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Récupération du profil utilisateur
  useEffect(() => {
    const fetchProfileAndStats = async () => {
      // Récupère l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupère le profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nom, photos")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Nb réservations acceptées
      const { count: acceptedCount } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed");
      setNbAccepted(acceptedCount || 0);

      // Nb réservations en attente
      const { count: pendingCount } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setNbPending(pendingCount || 0);

      // Nb devis en attente
      const { count: devisPending } = await supabase
        .from("devis")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", user.id)
        .eq("status", "pending");
      setNbDevisPending(devisPending || 0);

      // Nb devis acceptés
      const { count: devisAccepted } = await supabase
        .from("devis")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", user.id)
        .eq("status", "accepted");
      setNbDevisAccepted(devisAccepted || 0);


      // Nb prestations actives
      const { count: activeCount } = await supabase
        .from("annonces")
        .select("*", { count: "exact", head: true })
        .eq("actif", true);
      setNbActivePrestations(activeCount || 0);

      // Nb commandes en attente
      const { count: commandesPending } = await supabase
        .from("commandes")
        .select("*", { count: "exact", head: true })
        .eq("prestataire_id", user.id)
        .in("status", ["paid", "confirmed"]);
      setNbCommandesPending(commandesPending || 0);

      // Nb commandes expédiées
      const { count: commandesShipped } = await supabase
        .from("commandes")
        .select("*", { count: "exact", head: true })
        .eq("prestataire_id", user.id)
        .eq("status", "shipped");
      setNbCommandesShipped(commandesShipped || 0);
    };
    fetchProfileAndStats();
  }, []);

  const tiles = [
    {
      title: "Mes annonces",
      desc: "Gérer vos annonces",
      icon: Images,
      onClick: () => router.push("/prestataires/prestations"),
    },
    {
      title: "Devis",
      desc: "Gérer vos devis",
      icon: ClipboardList,
      onClick: () => router.push("/prestataires/devis"),
    },
    {
      title: "Réservations",
      desc: "Gérer vos réservations",
      icon: ClipboardList,
      onClick: () => router.push("/prestataires/reservations"),
    },
    {
      title: "Commandes",
      desc: "Gérer vos commandes",
      icon: ClipboardList,
      onClick: () => router.push("/prestataires/commandes"),
    },
  ];

  return (
    <>
      <Header />
      <div style={{ minHeight: "100vh", background: "#F9F9F9", color: "#222" }}>
        <main
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "40px 0 0 0",
          }}
        >
          {/* Welcome & search */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 36,
            }}
          >
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                Bonjour {profile?.nom ? profile.nom.split(" ")[0] : ""}
                <span> 👋</span>
              </h1>
              <p style={{ color: "#666" }}>
                Voici un aperçu de votre activité aujourd'hui.
              </p>
            </div>
          </div>

          {/* Stats */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
              marginBottom: 36,
            }}
          >
            <Card>
              <CardContent
                className="p-5 flex items-center justify-between"
                style={{
                  padding: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 15, color: "#888" }}>Annonces actives</p>
                  <p style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                    {nbActivePrestations}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent
                className="p-5 flex items-center justify-between"
                style={{
                  padding: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 15, color: "#888" }}>Devis en attente</p>
                  <p style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                    {nbDevisPending}
                  </p>
                  <p style={{ fontSize: 15, color: "#888", marginTop: 8 }}>Devis acceptés : <b>{nbDevisAccepted}</b></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent
                className="p-5 flex items-center justify-between"
                style={{
                  padding: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 15, color: "#888" }}>Réservations acceptées</p>
                  <p style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                    {nbAccepted}
                  </p>
                  <p style={{ fontSize: 15, color: "#888", marginTop: 8 }}>Réservations en attente : <b>{nbPending}</b></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent
                className="p-5 flex items-center justify-between"
                style={{
                  padding: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 15, color: "#888" }}>Commandes expédiées</p>
                  <p style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                    {nbCommandesShipped}
                  </p>
                  <p style={{ fontSize: 15, color: "#888", marginTop: 8 }}>Commandes en attente : <b>{nbCommandesPending}</b></p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Tiles (boutons) */}
          <section
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(2, 1fr)",
              marginBottom: 36,
            }}
          >
            {tiles.map((t, idx) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                style={{ textDecoration: "none", cursor: "pointer" }}
                onClick={t.onClick}
              >
                <Card className="hover:shadow-lg transition-shadow group">
                  <CardContent
                    className="p-5 flex items-start gap-4"
                    style={{
                      padding: 32,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        background: ROSE,
                        flexShrink: 0,
                      }}
                    >
                      {t.icon && (
                        <t.icon style={{ width: 28, height: 28, color: GOLD }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          fontWeight: 400,
                          fontSize: 18,
                          marginBottom: 2,
                          textDecoration: "none",
                          color: "#222", // Titre en noir
                        }}
                        className="group-hover:underline"
                      >
                        {t.title}
                      </h2>
                      <p style={{ fontSize: 15, color: "#666" }}>{t.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </section>

          {/* Calendrier en dessous des boutons */}
          <section
            style={{
              marginBottom: 36,
              width: "100%",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{ textDecoration: "none", cursor: "pointer", width: "100%" }}
              onClick={() => router.push("/prestataires/calendrier")}
            >
              <Card className="hover:shadow-lg transition-shadow group" style={{ marginBottom: 10 }}>
                <CardContent
                  className="p-5 flex items-start gap-4"
                  style={{
                    padding: 24,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: ROSE,
                      flexShrink: 0,
                    }}
                  >
                    <Calendar style={{ width: 28, height: 28, color: GOLD }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        fontWeight: 400,
                        fontSize: 18,
                        marginBottom: 2,
                        textDecoration: "none",
                        color: "#222", // Titre en noir
                      }}
                      className="group-hover:underline"
                    >
                      Mon calendrier
                    </h2>
                    <p style={{ fontSize: 15, color: "#666" }}>Gérer vos disponibilités</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* Conseil élargi */}
          <section
            style={{
              marginBottom: 36,
              gridColumn: "1 / span 2",
            }}
          >
            <Card>
              <CardContent style={{ padding: 24 }}>
                <h4 style={{ fontWeight: 600, marginBottom: 10 }}>Conseil</h4>
                <p style={{ fontSize: 15, color: "#444", marginBottom: 14 }}>
                  Ajoutez jusqu’à 5 photos par prestation. Les annonces avec 3+ photos reçoivent plus de demandes.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <footer
            style={{
              padding: "24px 0 40px 0",
              fontSize: 13,
              color: "#888",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <a href="#" style={{ textDecoration: "underline" }}>
              Support
            </a>
            <a href="#" style={{ textDecoration: "underline" }}>
              Centre d’aide
            </a>
            <a href="#" style={{ textDecoration: "underline" }}>
              CGU
            </a>
            <span style={{ marginLeft: "auto" }}>
              © {new Date().getFullYear()} Wedoria
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
