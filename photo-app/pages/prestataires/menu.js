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
  TrendingUp,
  Package,
  Settings,
  MapPin,
  Camera,
  Users,
  Briefcase,
  BarChart3,
  Plus,
  ArrowRight,
  Send,
  HelpCircle,
} from "lucide-react";

// Palette Shooty - Variables CSS
const COLORS = {
  primary: 'var(--primary)',     // #635BFF
  secondary: 'var(--secondary)', // #FFD369
  accent: 'var(--accent)',       // #FF7F50
  background: 'var(--background)', // #F8F9FB
  text: 'var(--text)',           // #1C1C1E
};

// Composant Card moderne
function Card({ className = "", children, hover = false }) {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${hover ? 'hover:shadow-md transition-all duration-200 hover:-translate-y-1' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function CardContent({ className = "", children }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

// Composant Button moderne avec couleurs Shooty
function Button({ className = "", children, variant = "primary", size = "md", ...props }) {
  const baseStyles = "font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center gap-2";
  
  const sizeStyles = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variantStyles = {
    primary: "text-white shadow-sm",
    secondary: "text-white shadow-sm",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
    ghost: "hover:bg-gray-100"
  };

  const getButtonStyle = () => {
    switch(variant) {
      case 'primary':
        return { backgroundColor: COLORS.primary, color: 'white' };
      case 'secondary':
        return { backgroundColor: COLORS.secondary, color: COLORS.text };
      case 'accent':
        return { backgroundColor: COLORS.accent, color: 'white' };
      default:
        return {};
    }
  };

  const handleMouseEnter = (e) => {
    if (variant === 'primary') e.target.style.backgroundColor = COLORS.accent;
    if (variant === 'secondary') e.target.style.backgroundColor = '#f0c65a';
    if (variant === 'accent') e.target.style.backgroundColor = '#ff6b3d';
  };

  const handleMouseLeave = (e) => {
    if (variant === 'primary') e.target.style.backgroundColor = COLORS.primary;
    if (variant === 'secondary') e.target.style.backgroundColor = COLORS.secondary;
    if (variant === 'accent') e.target.style.backgroundColor = COLORS.accent;
  };

  return (
    <button 
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      style={getButtonStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
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
              className="font-semibold hover:underline"
              style={{ color: COLORS.primary }}
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

      // Créer un menu de partage personnalisé moderne
    const shareMenu = document.createElement('div');
    shareMenu.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.12);
      padding: 24px; z-index: 1000; max-width: 340px; width: 90%;
      border: 1px solid ${COLORS.background};
    `;
    
    shareMenu.innerHTML = `
      <h3 style="margin: 0 0 20px 0; font-weight: 600; color: ${COLORS.text}; font-size: 18px; text-align: center;">Partager cette annonce</h3>
      ${shareOptions.map(option => 
        `<a href="${option.url}" target="_blank" style="
          display: flex; align-items: center; gap: 15px; padding: 14px 18px;
          text-decoration: none; color: white; background: ${option.color};
          border-radius: 12px; margin-bottom: 10px; font-weight: 500;
          transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(${option.color}40);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(${option.color}60)';" 
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(${option.color}40)';">
          <span style="font-size: 16px;">${option.name}</span>
        </a>`
      ).join('')}
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button onclick="navigator.clipboard.writeText('${url}').then(() => { 
          const btn = this; 
          const originalText = btn.innerHTML; 
          btn.innerHTML = '✓ Copié !'; 
          btn.style.background = '${COLORS.primary}'; 
          btn.style.color = 'white'; 
          setTimeout(() => { btn.innerHTML = originalText; btn.style.background = '${COLORS.background}'; btn.style.color = '${COLORS.text}'; }, 2000); 
        });" style="
          flex: 1; padding: 12px; background: ${COLORS.background}; border: 1px solid #e5e7eb;
          border-radius: 10px; color: ${COLORS.text}; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#f3f4f6';" onmouseout="this.style.background='${COLORS.background}';">
          📋 Copier le lien
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          flex: 1; padding: 12px; background: #f87171; border: none; color: white;
          border-radius: 10px; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#ef4444';" onmouseout="this.style.background='#f87171';">
          Fermer
        </button>
      </div>
    `;    document.body.appendChild(shareMenu);
    
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
    <div 
      className="rounded-2xl p-6 mb-8 border relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}15)`,
        borderColor: COLORS.primary + '30'
      }}
    >
      {/* Bouton fermer */}
      <button
        onClick={onHide}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-blue-100 transition-colors"
      >
        <X className="w-4 h-4 text-blue-600" />
      </button>

      <div className="mb-6">
        <h3 
          className="text-xl font-bold mb-2 flex items-center gap-3"
          style={{ color: COLORS.text }}
        >
          <span className="text-2xl">🚀</span>
          Lancez votre activité Shooty
        </h3>
        <p 
          className="text-sm mb-4"
          style={{ color: COLORS.text + 'CC' }}
        >
          Complétez ces étapes essentielles pour attirer vos premiers clients et maximiser vos réservations.
        </p>
        
        {/* Barre de progression */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div 
              className="w-full rounded-full h-2" 
              style={{ backgroundColor: COLORS.background }}
            >
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`
                }}
              ></div>
            </div>
          </div>
          <span 
            className="text-xs font-semibold"
            style={{ color: COLORS.primary }}
          >
            {completedCount}/{totalCount - 1}
          </span>
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

// Composant Formulaire de Support
function SupportModal({ isOpen, onClose, userProfile }) {
  const [formData, setFormData] = useState({
    objet: '',
    description: '',
    nom: userProfile?.nom || '',
    email: userProfile?.email || ''
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Envoyer la demande de support à l'API
      const response = await fetch('/api/support/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: userProfile?.id,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFormData({
            objet: '',
            description: '',
            nom: userProfile?.nom || '',
            email: userProfile?.email || ''
          });
        }, 4000);
      } else {
        alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div 
          style={{
            padding: '24px',
            borderBottom: `1px solid ${COLORS.background}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                backgroundColor: COLORS.primary + '20',
                padding: '10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HelpCircle style={{ width: '24px', height: '24px', color: COLORS.primary }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: COLORS.text, margin: 0 }}>
                Contactez le Support
              </h2>
              <p style={{ fontSize: '13px', color: COLORS.text + 'AA', margin: '4px 0 0 0' }}>
                Décrivez votre problème, nous vous répondrons rapidement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.background}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <X style={{ width: '20px', height: '20px', color: COLORS.text }} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {success ? (
            <div 
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#10b981'
              }}
            >
              <CheckCircle style={{ width: '64px', height: '64px', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                Message envoyé !
              </h3>
              <p style={{ color: COLORS.text + 'CC' }}>
                Nous avons bien reçu votre demande. Un email de confirmation vous a été envoyé.
              </p>
            </div>
          ) : (
            <>
              {/* Nom */}
              <div style={{ marginBottom: '20px' }}>
                <label 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: COLORS.text 
                  }}
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid #e5e7eb`,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: COLORS.text 
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid #e5e7eb`,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Objet */}
              <div style={{ marginBottom: '20px' }}>
                <label 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: COLORS.text 
                  }}
                >
                  Objet de la demande
                </label>
                <select
                  value={formData.objet}
                  onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid #e5e7eb`,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  <option value="">Sélectionnez un sujet</option>
                  <option value="probleme_technique">Problème technique</option>
                  <option value="question_facturation">Question sur la facturation</option>
                  <option value="gestion_compte">Gestion de compte</option>
                  <option value="probleme_reservation">Problème avec une réservation</option>
                  <option value="question_paiement">Question sur les paiements</option>
                  <option value="amelioration">Suggestion d'amélioration</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label 
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: COLORS.text 
                  }}
                >
                  Description détaillée
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  placeholder="Décrivez votre problème ou votre question en détail..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid #e5e7eb`,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    color: COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = COLORS.background}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: sending ? '#9CA3AF' : COLORS.primary,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => !sending && (e.target.style.backgroundColor = COLORS.accent)}
                  onMouseLeave={(e) => !sending && (e.target.style.backgroundColor = COLORS.primary)}
                >
                  {sending ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send style={{ width: '16px', height: '16px' }} />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
  const [showSupportModal, setShowSupportModal] = useState(false);
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
      title: "Devis",
      desc: "Gérer et suivre vos devis clients",
      icon: FileText,
      onClick: () => router.push("/prestataires/devis"),
      gradient: `linear-gradient(135deg, #3d3d3d)`, // Primary gradient
      iconBg: '#820615'
    },
    {
      title: "Réservations",
      desc: "Gérer vos réservations et confirmations",
      icon: Calendar,
      onClick: () => router.push("/prestataires/reservations"),
      gradient: `linear-gradient(135deg, #3d3d3d)`, // Accent gradient
      iconBg: '#820615'
    },
    {
      title: "Mes annonces",
      desc: "Créer et gérer vos annonces",
      icon: Images,
      onClick: () => router.push("/prestataires/prestations"),
      gradient: `linear-gradient(135deg,#3d3d3d)`, // Secondary gradient
      iconBg: '#820615'
    },
    {
      title: "Planning",
      desc: "Visualiser votre calendrier",
      icon: ClipboardList,
      onClick: () => router.push("/prestataires/calendrier"),
      gradient: `linear-gradient(135deg, #3d3d3d)`, // Primary to Accent
      iconBg: '#820615'
    },
  ];

  return (
    <>
      <Header />
      <div 
        style={{ 
          minHeight: "100vh", 
          background: COLORS.background,
          color: COLORS.text 
        }}
      >
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 24px",
          }}
        >
          {/* En-tête de bienvenue moderne */}
          <div
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8"
          >
            <div className="flex items-center gap-4">
              <div>
                <h1 
                  className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3"
                  style={{ color: COLORS.text }}
                >
                  Bonjour {profile?.nom ? profile.nom.split(" ")[0] : ""}
                  <span className="text-4xl">👋</span>
                </h1>
                <p 
                  className="text-lg"
                  style={{ color: COLORS.text + 'CC' }}
                >
                  Voici votre tableau de bord professionnel Shooty.
                </p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex gap-3">
              <Button 
                variant="primary" 
                size="md"
                onClick={() => router.push("/prestataires/prestations")}
                className="hidden lg:flex"
              >
                <Plus className="w-4 h-4" />
                Nouvelle annonce
              </Button>
            </div>
          </div>

          {/* Checklist de démarrage */}
          {showChecklist && userId && (
            <StartupChecklist 
              userId={userId} 
              onHide={hideChecklistPermanently} 
            />
          )}

          {/* Statistiques modernes */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            {/* Annonces actives */}
            <Card hover={true}>
              <CardContent className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: COLORS.primary + '20' }}
                    >
                      <TrendingUp className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: COLORS.text + 'CC' }}>
                      Annonces actives
                    </p>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: COLORS.text }}>
                    {nbActivePrestations}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Devis */}
            <Card hover={true}>
              <CardContent className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: COLORS.secondary + '40' }}
                    >
                      <Package className="w-5 h-5" style={{ color: COLORS.text }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: COLORS.text + 'CC' }}>
                      Devis en attente
                    </p>
                  </div>
                  <p className="text-3xl font-bold mb-1" style={{ color: COLORS.text }}>
                    {nbDevisPending}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.text + '80' }}>
                    Acceptés : <span className="font-semibold">{nbDevisAccepted}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Réservations */}
            <Card hover={true} className="md:col-span-2 lg:col-span-1">
              <CardContent className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: COLORS.accent + '20' }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: COLORS.accent }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: COLORS.text + 'CC' }}>
                      Réservations confirmées
                    </p>
                  </div>
                  <p className="text-3xl font-bold mb-1" style={{ color: COLORS.text }}>
                    {nbAccepted}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.text + '80' }}>
                    En attente : <span className="font-semibold">{nbPending}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Chiffre d'affaires */}
            <Card hover={true}>
              <CardContent className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: COLORS.primary + '20' }}
                    >
                      <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: COLORS.text + 'CC' }}>
                      CA ce mois
                    </p>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: COLORS.text }}>
                    -
                  </p>
                  <p className="text-xs" style={{ color: COLORS.text + '80' }}>
                    Bientôt disponible
                  </p>
                </div>
              </CardContent>
            </Card>
            
          </section>

          {/* Actions principales - 2 par ligne */}
          <section className="mb-8">
            <h2 
              className="text-xl font-bold mb-6"
              style={{ color: COLORS.text }}
            >
              Actions rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tiles.map((tile, idx) => (
                <motion.div
                  key={tile.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx, duration: 0.3 }}
                  onClick={tile.onClick}
                  className="cursor-pointer"
                >
                  <Card hover={true} className="group h-full">
                    <CardContent className="flex items-center gap-4 p-8">
                      <div
                        className="p-4 rounded-2xl transition-all duration-200 group-hover:scale-110"
                        style={{
                          background: tile.gradient,
                          boxShadow: '0 4px 12px rgba(99, 91, 255, 0.15)'
                        }}
                      >
                        {tile.icon && (
                          <tile.icon className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 
                          className="text-xl font-bold mb-1.5 group-hover:opacity-80 transition-all"
                          style={{ color: COLORS.text }}
                        >
                          {tile.title}
                        </h3>
                        <p 
                          className="text-sm leading-relaxed"
                          style={{ color: COLORS.text + 'AA' }}
                        >
                          {tile.desc}
                        </p>
                      </div>
                      <ArrowRight 
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200"
                        style={{ color: COLORS.primary }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Section Raccourcis professionnels */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-xl font-bold"
                style={{ color: COLORS.text }}
              >
                Raccourcis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Raccourci Zones d'intervention */}
              <Card hover={true} className="group cursor-pointer" onClick={() => router.push("/prestataires/profil#zones")}>
                <CardContent className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: COLORS.primary + '20' }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1" style={{ color: COLORS.text }}>
                      Zones d'intervention
                    </h4>
                    <p className="text-xs" style={{ color: COLORS.text + 'CC' }}>
                      Définir où vous intervenez
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>

              {/* Raccourci Gestion documents */}
              <Card hover={true} className="group cursor-pointer" onClick={() => router.push("/prestataires/profil#documents")}>
                <CardContent className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: COLORS.secondary + '40' }}
                  >
                    <Briefcase className="w-5 h-5" style={{ color: COLORS.text }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1" style={{ color: COLORS.text }}>
                      Documents professionnels
                    </h4>
                    <p className="text-xs" style={{ color: COLORS.text + 'CC' }}>
                      Gérer vos certifications
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Footer avec déconnexion */}
          <section className="pt-8 border-t" style={{ borderColor: COLORS.background }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                  Shooty Business
                </p>
                <p className="text-xs" style={{ color: COLORS.text + '80' }}>
                  Votre plateforme professionnelle de photographie
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSupportModal(true)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Aide & Support
              </Button>

           </div>
          </section>
        </main>

        {/* Modal de support */}
        <SupportModal 
          isOpen={showSupportModal}
          onClose={() => setShowSupportModal(false)}
          userProfile={profile ? { ...profile, id: userId } : null}
        />
      </div>
    </>
  );
}
                  