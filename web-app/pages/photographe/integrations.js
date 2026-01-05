import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { 
  ChevronLeft,
  Calendar,
  CreditCard,
  Share2,
  Calculator,
  Users,
  MessageSquare,
  Video,
  Check,
  X,
  Settings,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Zap,
  Link2,
  ToggleLeft,
  ToggleRight,
  ChevronRight
} from 'lucide-react';

// Définition des intégrations disponibles
const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'google_calendar',
    type: 'calendar',
    name: 'Google Calendar',
    description: 'Synchronisez vos réservations avec Google Calendar',
    icon: 'calendar',
    color: '#4285F4',
    features: ['Synchronisation bidirectionnelle', 'Sync auto des réservations', 'Blocage des disponibilités'],
  },
  {
    provider: 'outlook_calendar',
    type: 'calendar',
    name: 'Outlook Calendar',
    description: 'Synchronisez avec Microsoft Outlook',
    icon: 'calendar',
    color: '#0078D4',
    features: ['Sync calendrier', 'Planification réunions', 'Rappels'],
  },
  {
    provider: 'stripe',
    type: 'payment',
    name: 'Stripe',
    description: 'Acceptez les paiements en ligne avec Stripe',
    icon: 'credit-card',
    color: '#635BFF',
    features: ['Paiements sécurisés', 'Transferts instantanés', 'Multi-devises'],
  },
  {
    provider: 'paypal',
    type: 'payment',
    name: 'PayPal',
    description: 'Acceptez les paiements PayPal',
    icon: 'credit-card',
    color: '#00457C',
    features: ['Portefeuille PayPal', 'Protection acheteur', 'Portée mondiale'],
  },
  {
    provider: 'facebook',
    type: 'social',
    name: 'Facebook',
    description: 'Partagez vos services sur Facebook',
    icon: 'share',
    color: '#1877F2',
    features: ['Publication auto', 'Intégration page', 'Messenger'],
  },
  {
    provider: 'instagram',
    type: 'social',
    name: 'Instagram',
    description: 'Présentez votre portfolio sur Instagram',
    icon: 'share',
    color: '#E4405F',
    features: ['Partage Stories', 'Sync portfolio', 'Profil business'],
  },
  {
    provider: 'quickbooks',
    type: 'accounting',
    name: 'QuickBooks',
    description: 'Synchronisez factures et dépenses',
    icon: 'calculator',
    color: '#2CA01C',
    features: ['Sync factures', 'Suivi dépenses', 'Rapports'],
  },
  {
    provider: 'hubspot',
    type: 'crm',
    name: 'HubSpot',
    description: 'Gérez vos relations clients',
    icon: 'users',
    color: '#FF7A59',
    features: ['Sync contacts', 'Suivi deals', 'Analytics'],
  },
  {
    provider: 'slack',
    type: 'messaging',
    name: 'Slack',
    description: 'Recevez des notifications dans Slack',
    icon: 'message',
    color: '#4A154B',
    features: ['Alertes réservation', 'Notifications équipe', 'Mises à jour statut'],
  },
  {
    provider: 'zoom',
    type: 'video',
    name: 'Zoom',
    description: 'Planifiez des réunions vidéo',
    icon: 'video',
    color: '#2D8CFF',
    features: ['Création auto réunions', 'Sync calendrier', 'Enregistrement'],
  },
];

const TYPES = [
  { id: 'all', label: 'Tout', icon: Zap },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'payment', label: 'Paiement', icon: CreditCard },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'accounting', label: 'Comptabilité', icon: Calculator },
  { id: 'crm', label: 'CRM', icon: Users },
];

export default function Integrations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [connectingProvider, setConnectingProvider] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    loadIntegrations(user.id);
  };

  const loadIntegrations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (provider) => {
    return integrations.find(i => i.provider === provider);
  };

  const toggleIntegration = async (provider, currentlyActive) => {
    if (!user) return;

    const existing = getIntegrationStatus(provider);
    setConnectingProvider(provider);

    try {
      if (existing) {
        // Mettre à jour l'existant
        const { error } = await supabase
          .from('integrations')
          .update({
            is_active: !currentlyActive,
            status: !currentlyActive ? 'active' : 'paused',
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Créer nouvelle intégration
        const integrationConfig = AVAILABLE_INTEGRATIONS.find(i => i.provider === provider);
        if (!integrationConfig) return;

        const { error } = await supabase.from('integrations').insert({
          user_id: user.id,
          provider,
          integration_type: integrationConfig.type,
          is_active: true,
          status: 'pending_auth',
          configuration: {},
          credentials: {},
          metadata: {
            name: integrationConfig.name,
          },
        });

        if (error) throw error;

        // Simuler l'ouverture du flux OAuth
        alert(`Vous serez redirigé vers ${integrationConfig.name} pour autoriser l'intégration.`);
      }

      await loadIntegrations(user.id);
    } catch (error) {
      console.error('Error toggling integration:', error);
      alert('Erreur lors de la mise à jour de l\'intégration');
    } finally {
      setConnectingProvider(null);
    }
  };

  const disconnectIntegration = async (integration) => {
    if (!confirm(`Êtes-vous sûr de vouloir déconnecter ${integration.metadata?.name || integration.provider} ? Cela arrêtera toute synchronisation de données.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;
      await loadIntegrations(user.id);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Erreur lors de la déconnexion');
    }
  };

  const getFilteredIntegrations = () => {
    if (selectedType === 'all') return AVAILABLE_INTEGRATIONS;
    return AVAILABLE_INTEGRATIONS.filter(i => i.type === selectedType);
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'calendar': return Calendar;
      case 'credit-card': return CreditCard;
      case 'share': return Share2;
      case 'calculator': return Calculator;
      case 'users': return Users;
      case 'message': return MessageSquare;
      case 'video': return Video;
      default: return Link2;
    }
  };

  const connectedCount = integrations.filter(i => i.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const filteredIntegrations = getFilteredIntegrations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-7 h-7 text-indigo-600" />
                Intégrations
              </h1>
              <p className="text-sm text-gray-500">Connectez vos outils favoris</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Automatisez votre activité</h2>
              <p className="text-white/80">
                Connectez vos outils pour gagner du temps et éviter les erreurs manuelles
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-xs text-white/80">Connectées</p>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
                <p className="text-2xl font-bold">{AVAILABLE_INTEGRATIONS.length}</p>
                <p className="text-xs text-white/80">Disponibles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Type Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedType === type.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredIntegrations.map((config) => {
            const status = getIntegrationStatus(config.provider);
            const isConnected = !!status;
            const isActive = status?.is_active || false;
            const Icon = getIcon(config.icon);
            const isConnecting = connectingProvider === config.provider;

            return (
              <div
                key={config.provider}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  isConnected && isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''
                }`}
              >
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{config.name}</h3>
                        {isConnected && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {isActive ? (
                              <>
                                <Check className="w-3 h-3" />
                                Connecté
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                En pause
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{config.description}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {config.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600"
                      >
                        <Check className="w-3 h-3 text-green-500" />
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Status Info */}
                  {isConnected && status?.error_message && (
                    <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      Erreur de connexion
                    </div>
                  )}

                  {isConnected && status?.last_sync_at && !status?.error_message && (
                    <div className="mt-3 flex items-center gap-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
                      <RefreshCw className="w-4 h-4" />
                      Dernière sync: {new Date(status.last_sync_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => toggleIntegration(config.provider, isActive)}
                        disabled={isConnecting}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {isActive ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-green-500" />
                            Activé
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                            Désactivé
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Paramètres"
                        >
                          <Settings className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => disconnectIntegration(status)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Déconnecter"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleIntegration(config.provider, false)}
                      disabled={isConnecting}
                      className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      style={{ 
                        backgroundColor: config.color, 
                        color: 'white',
                        opacity: isConnecting ? 0.7 : 1
                      }}
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        <>
                          Connecter
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Link2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Besoin d'une intégration ?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Si vous utilisez un outil qui n'est pas encore disponible, faites-le nous savoir ! 
                Nous ajoutons régulièrement de nouvelles intégrations.
              </p>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                Suggérer une intégration
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 p-4 bg-gray-100 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                <strong>Sécurité :</strong> Vos données sont protégées par un chiffrement de bout en bout. 
                Nous ne stockons jamais vos mots de passe de services tiers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
