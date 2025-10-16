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
  CheckCircle,
  Circle,
  X,
  User,
  Mail,
  CreditCard,
  FileText,
  Share2,
  AlertTriangle,
  Star,
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

// Fonction utilitaire pour le partage d'annonces
const shareAnnonce = (annonceId, titre) => {
  const url = `${window.location.origin}/annonces/${annonceId}`;
  const text = `Découvrez ${titre} - Une prestation de qualité pour votre mariage !`;
  
  // Essayer d'utiliser l'API Web Share si disponible
  if (navigator.share) {
    navigator.share({
      title: titre,
      text: text,
      url: url,
    }).catch(() => {
      // Fallback si le partage échoue
      copyToClipboard(url);
    });
  } else {
    // Fallback pour les navigateurs qui ne supportent pas Web Share
    const shareOptions = [
      {
        name: 'Facebook',
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        color: '#1877F2'
      },
      {
        name: 'WhatsApp',
        url: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
        color: '#25D366'
      },
      {
        name: 'Twitter',
        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        color: '#1DA1F2'
      },
      {
        name: 'LinkedIn',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        color: '#0A66C2'
      }
    ];

    // Créer un menu de partage personnalisé
    const shareMenu = document.createElement('div');
    shareMenu.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      padding: 20px; z-index: 1000; max-width: 320px; width: 90%;
    `;
    
    shareMenu.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-weight: 600; color: #333;">Partager cette annonce</h3>
      ${shareOptions.map(option => 
        `<a href="${option.url}" target="_blank" style="
          display: flex; align-items: center; gap: 12px; padding: 12px;
          text-decoration: none; color: white; background: ${option.color};
          border-radius: 8px; margin-bottom: 8px; font-weight: 500;
        ">
          <span>${option.name}</span>
        </a>`
      ).join('')}
      <button onclick="this.parentElement.remove()" style="
        width: 100%; padding: 10px; background: #f3f4f6; border: none;
        border-radius: 6px; color: #6b7280; font-weight: 500; margin-top: 8px; cursor: pointer;
      ">Fermer</button>
      <button onclick="navigator.clipboard.writeText('${url}').then(() => alert('Lien copié !')); this.parentElement.remove();" style="
        width: 100%; padding: 10px; background: #e5e7eb; border: none;
        border-radius: 6px; color: #374151; font-weight: 500; margin-top: 4px; cursor: pointer;
      ">Copier le lien</button>
    `;

    document.body.appendChild(shareMenu);
    
    // Supprimer le menu après 10 secondes
    setTimeout(() => {
      if (shareMenu.parentElement) {
        shareMenu.remove();
      }
    }, 10000);
  }
};

// Composant Checklist de démarrage
function StartupChecklist({ userId, onHide }) {
  const [checklistData, setChecklistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    fetchChecklistData();
  }, [userId]);

  const fetchChecklistData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les données du profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("photos, bio, ville_id, email, telephone, instagram, facebook, linkedin, website, stripe_account_id")
        .eq("id", userId)
        .single();

      // Vérifier l'email confirmé
      const { data: { user } } = await supabase.auth.getUser();
      const emailConfirmed = user?.email_confirmed_at !== null;

      // Compter les annonces
      const { count: annonceCount } = await supabase
        .from("annonces")
        .select("*", { count: "exact", head: true })
        .eq("prestataire", userId);

      // Calculer le statut de chaque étape
      const profileComplete = !!(
        profile?.photos && 
        profile?.bio && 
        profile?.ville_id && 
        profile?.email && 
        profile?.telephone && 
        (profile?.instagram || profile?.facebook || profile?.linkedin || profile?.website)
      );

      const steps = [
        {
          id: 'profile',
          title: 'Compléter votre profil',
          description: 'Photo, bio, localisation, coordonnées, réseaux sociaux',
          completed: profileComplete,
          icon: User,
          action: () => router.push('/prestataires/profil'),
          actionText: 'Compléter le profil'
        },
        {
          id: 'email',
          title: 'Vérifier votre adresse e-mail',
          description: 'Confirmez votre e-mail pour recevoir les notifications',
          completed: emailConfirmed,
          icon: Mail,
          action: () => {
            if (!emailConfirmed) {
              alert('Veuillez vérifier votre boîte e-mail et cliquer sur le lien de confirmation.');
            }
          },
          actionText: emailConfirmed ? 'E-mail vérifié' : 'Vérifier l\'e-mail'
        },
        {
          id: 'stripe',
          title: 'Configurer Stripe',
          description: 'Configurez vos paiements pour recevoir des reservations',
          completed: !!profile?.stripe_account_id,
          icon: CreditCard,
          action: () => router.push('/prestataires/profil'),
          actionText: 'Configurer Stripe'
        },
        {
          id: 'annonce',
          title: 'Créer votre première annonce',
          description: 'Ajoutez au moins une prestation ou produit',
          completed: annonceCount > 0,
          icon: FileText,
          action: () => router.push('/prestataires/prestations'),
          actionText: 'Créer une annonce'
        },
        {
          id: 'share',
          title: 'Partager votre première annonce',
          description: 'Faites connaître vos services sur les réseaux sociaux',
          completed: false, // Cette étape est toujours incomplète pour encourager le partage
          icon: Share2,
          action: () => router.push('/prestataires/prestations'),
          actionText: 'Voir mes annonces'
        }
      ];

      setChecklistData({
        steps,
        completedCount: steps.filter(step => step.completed).length,
        totalCount: steps.length
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement de la checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-200">
        <div className="animate-pulse">
          <div className="h-6 bg-blue-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-blue-200 rounded w-full"></div>
            <div className="h-4 bg-blue-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!checklistData) return null;

  const { steps, completedCount, totalCount } = checklistData;
  const allCompleted = completedCount >= totalCount - 1; // -1 car le partage est toujours incomplet

  // Si tout est fait, ne pas afficher la checklist
  if (allCompleted) return null;

  const progressPercent = Math.round((completedCount / (totalCount - 1)) * 100);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200 relative">
      {/* Bouton fermer */}
      <button
        onClick={onHide}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-blue-100 transition-colors"
      >
        <X className="w-4 h-4 text-blue-600" />
      </button>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
          🚀 Commencez votre aventure
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          Complétez ces étapes pour recevoir vos premiers clients.
        </p>
        
        {/* Barre de progression */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-medium">{completedCount}/{totalCount - 1}</span>
        </div>
      </div>

      {/* Grille 2 colonnes pour les étapes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                step.completed 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-white border border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-blue-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${step.completed ? 'text-green-600' : 'text-blue-600'}`} />
                  <h4 className={`text-sm font-semibold ${step.completed ? 'text-green-900' : 'text-blue-900'} truncate`}>
                    {step.title}
                  </h4>
                </div>
                <p className={`text-xs mb-2 ${step.completed ? 'text-green-700' : 'text-blue-700'}`}>
                  {step.description}
                </p>
                
                {!step.completed && (
                  <button
                    onClick={step.action}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    {step.actionText}
                  </button>
                )}
                
                {step.completed && (
                  <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Terminé
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedCount > 0 && (
        <div className="p-3 bg-white/50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-center text-sm font-medium">
            🎉 {completedCount} étape{completedCount > 1 ? 's' : ''} complétée{completedCount > 1 ? 's' : ''} !
            {completedCount >= totalCount - 1 && " Vous êtes prêt !"}
          </p>
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
  const [showChecklist, setShowChecklist] = useState(true);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  // Vérifier si la checklist a été masquée
  useEffect(() => {
    const checklistHidden = localStorage.getItem('checklist-hidden');
    if (checklistHidden === 'true') {
      setShowChecklist(false);
    }
  }, []);

  // Fonction pour masquer définitivement la checklist
  const hideChecklistPermanently = () => {
    localStorage.setItem('checklist-hidden', 'true');
    setShowChecklist(false);
  };

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

      setUserId(user.id);

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

          {/* Checklist de démarrage */}
          {showChecklist && userId && (
            <StartupChecklist 
              userId={userId} 
              onHide={hideChecklistPermanently} 
            />
          )}

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
